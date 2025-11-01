/**
 * Hook melhorado para upload com criação real de pastas no Supabase
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderServiceReal } from "@/services/folderServiceReal";
import { DocumentFolderService } from "@/services/documentFolderService";
import { detectFileType } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";
import { logger, PerformanceMonitor } from "@/lib/logger";
import { playActionSfx } from "@/lib/sfx";
import { getErrorMessage } from "@/lib/errors";
import type { UploadFile, UploadDestination, Client, Case, FolderItem } from "@/types";

export function useSmartUploadReal() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [lastTargetFolder, setLastTargetFolder] = useState<FolderItem | null>(null);
  const queryClient = useQueryClient();

  const addFiles = (files: File[], destination: UploadDestination) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "pending",
      progress: 0,
      processingDate: new Date(),
      destination,
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    logger.info('Files added for upload', { count: files.length, destination }, 'useSmartUploadReal');
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileStatus = (id: string, updates: Partial<UploadFile>) => {
    setUploadFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const clearAll = () => {
    setUploadFiles([]);
  };

  // Função para resolver destino (criar pasta se necessário)
  const resolveDestination = async (destination: UploadDestination): Promise<FolderItem> => {
    logger.info('Resolving destination', { destination }, 'useSmartUploadReal');
    
    switch (destination.type) {
      case 'existing_folder':
        if (!destination.folderId) {
          logger.error('Missing folderId in destination', { destination }, 'useSmartUploadReal');
          throw new Error('ID da pasta não fornecido');
        }
        
        // Buscar pasta existente
        const folders = await FolderServiceReal.getFolders();
        logger.info('Available folders', { folderCount: folders.length, folderId: destination.folderId }, 'useSmartUploadReal');
        
        const folder = folders.find(f => f.id === destination.folderId);
        if (!folder) {
          logger.error('Folder not found', { 
            folderId: destination.folderId, 
            availableFolders: folders.map(f => ({ id: f.id, name: f.name }))
          }, 'useSmartUploadReal');
          throw new Error(`Pasta não encontrada (ID: ${destination.folderId})`);
        }
        
        logger.info('Folder resolved successfully', { folder: { id: folder.id, name: folder.name } }, 'useSmartUploadReal');
        return folder;

      case 'new_client':
        if (!destination.clientName) {
          throw new Error('Nome do cliente não fornecido');
        }
        
        // Criar cliente e pasta
        const { folder: clientFolder } = await FolderServiceReal.createClientWithFolder(destination.clientName);
        return clientFolder;

      case 'new_subfolder':
        if (!destination.subfolderName || !destination.parentFolderId) {
          throw new Error('Nome da subpasta ou pasta pai não fornecidos');
        }
        
        // Buscar pasta pai
        const parentFolders = await FolderServiceReal.getFolders();
        const parentFolder = parentFolders.find(f => f.id === destination.parentFolderId);
        if (!parentFolder) {
          throw new Error('Pasta pai não encontrada');
        }

        // Criar subpasta
        const subfolder = await FolderServiceReal.createFolder({
          name: destination.subfolderName,
          kind: 'subfolder',
          parentId: parentFolder.id,
          clientId: parentFolder.clientId,
          caseId: parentFolder.caseId,
          path: `${parentFolder.path}/${destination.subfolderName}`,
        });
        
        return subfolder;

      default:
        throw new Error('Tipo de destino inválido');
    }
  };

  // Mutation para processar uploads
  const processUploadsMutation = useMutation({
    mutationFn: async () => {
      const pendingFiles = uploadFiles.filter(f => f.status === "pending");
      
      if (pendingFiles.length === 0) {
        throw new Error('Nenhum arquivo pendente para upload');
      }

      logger.info('Starting upload process', { fileCount: pendingFiles.length }, 'useSmartUploadReal');
      PerformanceMonitor.startTimer('processUploads');

      const results: { success: number; errors: number } = { success: 0, errors: 0 };

      // Cache de destinos resolvidos (evita criar uma pasta por arquivo)
      const resolvedDestinations = new Map<string, FolderItem>();
      const pendingResolutions = new Map<string, Promise<FolderItem>>();
      const buildDestKey = (d: UploadDestination) => {
        return JSON.stringify({
          type: d.type,
          folderId: d.folderId || null,
          clientName: d.clientName || null,
          subfolderName: d.subfolderName || null,
          parentFolderId: d.parentFolderId || null,
          isContext: d.isContext || false,
        });
      };

      for (const uploadFile of pendingFiles) {
        try {
          updateFileStatus(uploadFile.id, { status: "processing" });

          // 1. Resolver destino (criar pasta se necessário)
          const cacheKey = buildDestKey(uploadFile.destination);
          let targetFolder = resolvedDestinations.get(cacheKey);

          if (!targetFolder) {
            let resolutionPromise = pendingResolutions.get(cacheKey);
            if (!resolutionPromise) {
              resolutionPromise = resolveDestination(uploadFile.destination);
              pendingResolutions.set(cacheKey, resolutionPromise);
            }
            targetFolder = await resolutionPromise;
            resolvedDestinations.set(cacheKey, targetFolder);
          }
          setLastTargetFolder(targetFolder);
          
          logger.info('Target folder resolved', { 
            folderId: targetFolder.id, 
            folderName: targetFolder.name,
            folderKind: targetFolder.kind 
          }, 'useSmartUploadReal');
          
          // 2. Pré-processamento de mídia
          let fileToUpload = uploadFile.file;
          // 2a. Se imagem, converter via backend (Google Vision OCR) para PDF extraível
          // Mantemos o arquivo original para upload (não converter imagens/PDFs aqui)

          // 2b. Se arquivo for OPUS, converter para MP3 antes do upload
          if (fileToUpload.type === 'audio/opus' || fileToUpload.name.toLowerCase().endsWith('.opus')) {
            logger.info('Converting OPUS to MP3 before upload', { fileName: fileToUpload.name }, 'useSmartUploadReal');
            try {
              // Lazy import to avoid loading ffmpeg if não necessário
              const { convertOpusToMp3 } = await import('@/lib/audioConverter');
              fileToUpload = await convertOpusToMp3(fileToUpload);
            } catch (e) {
              logger.error('OPUS conversion failed', e as Error, undefined, 'useSmartUploadReal');
            }
          }

          // 3. Upload do arquivo usando o service integrado
          logger.info('Uploading file using DocumentFolderService', { 
            fileName: fileToUpload.name,
            folderId: targetFolder.id,
            folderName: targetFolder.name,
            size: fileToUpload.size 
          }, 'useSmartUploadReal');

          const document = uploadFile.destination?.isContext
            ? await DocumentFolderService.uploadContextToFolder(
                fileToUpload,
                targetFolder,
                (progress) => {
                  updateFileStatus(uploadFile.id, { progress });
                }
              )
            : await DocumentFolderService.uploadDocumentToFolder(
                fileToUpload,
                targetFolder,
                (progress) => {
                  updateFileStatus(uploadFile.id, { progress });
                }
              );

          updateFileStatus(uploadFile.id, { 
            status: "completed", 
            progress: 100,
            uploadedAt: new Date(),
          });

          results.success++;
          logger.info('File uploaded successfully', { 
            fileName: fileToUpload.name,
            documentId: document.id,
            folderId: targetFolder.id,
          }, 'useSmartUploadReal');

        } catch (error) {
          updateFileStatus(uploadFile.id, { 
            status: "error", 
            error: getErrorMessage(error),
          });
          
          results.errors++;
          logger.error('File upload failed', error as Error, { 
            fileName: uploadFile.file.name,
            destination: uploadFile.destination
          }, 'useSmartUploadReal');
        }
      }

      PerformanceMonitor.endTimer('processUploads');
      return results;
    },
    onSuccess: (results) => {
      // Invalidar caches para atualizar interface
      queryClient.invalidateQueries({ queryKey: ['folders-real'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      toast({
        title: "Upload concluído!",
        description: `${results.success} arquivo(s) enviado(s) com sucesso. ${results.errors > 0 ? `${results.errors} erro(s).` : ''}`,
        variant: results.errors > 0 ? "destructive" : "default",
      });
      try { playActionSfx(); } catch {}

      logger.info('Upload process completed', results, 'useSmartUploadReal');
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: getErrorMessage(error),
        variant: "destructive",
      });

      logger.error('Upload process failed', error as Error, undefined, 'useSmartUploadReal');
    },
  });

  // Computed values
  const totalFiles = uploadFiles.length;
  const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
  const errorCount = uploadFiles.filter(f => f.status === 'error').length;
  const processingCount = uploadFiles.filter(f => f.status === 'processing').length;
  const totalProgress = totalFiles > 0 ? 
    uploadFiles.reduce((sum, file) => sum + file.progress, 0) / totalFiles : 0;

  return {
    // State
    uploadFiles,
    lastTargetFolder,
    
    // Actions
    addFiles,
    removeFile,
    clearAll,
    // Expor mutateAsync para permitir await até a conclusão real do upload
    processUploads: processUploadsMutation.mutateAsync,
    
    // Status
    isUploading: processUploadsMutation.isPending,
    completedCount,
    errorCount,
    processingCount,
    totalProgress,
    
    // Computed
    canUpload: totalFiles > 0 && !processUploadsMutation.isPending,
    allCompleted: totalFiles > 0 && completedCount === totalFiles,
  };
}