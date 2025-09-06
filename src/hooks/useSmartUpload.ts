import { useState } from "react";
import { useUploadDocument } from "./useDocuments";
import { useCreateFolder } from "./useFolders";
import { useCreateClient } from "./useClients";
// import { useCreateCase } from "./useCases";
import { FolderService } from "@/services/folderService";
import { CaseService } from "@/services/caseService";
import { DocumentService } from "@/services/documentService";
import type { UploadFile, UploadDestination } from "@/types";
import { detectFileType } from "@/utils/fileUtils";

/**
 * Hook completo para gerenciar uploads com criação automática de estruturas
 */
export function useSmartUpload() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  
  const uploadDocumentMutation = useUploadDocument();
  const createFolderMutation = useCreateFolder();
  const createClientMutation = useCreateClient();
  // const createCaseMutation = useCreateCase();

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
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileStatus = (id: string, updates: Partial<UploadFile>) => {
    setUploadFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const processUploads = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === "pending");
    
    for (const uploadFile of pendingFiles) {
      try {
        updateFileStatus(uploadFile.id, { status: "processing" });

        let clientId: string;
        let caseId: string;
        let folderId: string | undefined;
        let folderPath: string;

        // Processar destino baseado no tipo
        switch (uploadFile.destination?.type) {
          case "new_client":
            if (!uploadFile.destination.clientName) {
              throw new Error("Nome do cliente é obrigatório");
            }

            // Criar novo cliente
            const newClient = await createClientMutation.mutateAsync({
              name: uploadFile.destination.clientName,
            });
            clientId = newClient.id;

            // Criar pasta padrão para o cliente
            const clientFolder = await createFolderMutation.mutateAsync({
              name: newClient.name,
              kind: "client",
              clientId: newClient.id,
              path: newClient.name,
            });
            folderId = clientFolder.id;
            folderPath = `clients/${newClient.id}`;

            // Criar caso padrão
            const defaultCase = await CaseService.createCase({
              name: "Documentos Gerais",
              clientId: newClient.id,
              status: "active",
            });
            caseId = defaultCase.id;
            break;

          case "new_subfolder":
            if (!uploadFile.destination.subfolderName || !uploadFile.destination.parentFolderId) {
              throw new Error("Nome da subpasta e pasta pai são obrigatórios");
            }

            // Buscar pasta pai para obter clientId
            const parentFolder = await FolderService.getFolderById(uploadFile.destination.parentFolderId);
            if (!parentFolder?.clientId) {
              throw new Error("Pasta pai inválida");
            }

            clientId = parentFolder.clientId;
            
            // Criar subpasta
            const subFolder = await createFolderMutation.mutateAsync({
              name: uploadFile.destination.subfolderName,
              kind: "subfolder",
              parentId: uploadFile.destination.parentFolderId,
              clientId: parentFolder.clientId,
              path: `${parentFolder.path}/${uploadFile.destination.subfolderName}`,
            });
            folderId = subFolder.id;
            folderPath = `clients/${clientId}/${subFolder.name}`;

            // Usar caso padrão do cliente
            const clientCases = await CaseService.getCases(clientId);
            caseId = clientCases[0]?.id || (await CaseService.createCase({
              name: "Documentos Gerais",
              clientId,
              status: "active",
            })).id;
            break;

          case "existing_folder":
            if (!uploadFile.destination.folderId) {
              throw new Error("Pasta de destino é obrigatória");
            }

            const existingFolder = await FolderService.getFolderById(uploadFile.destination.folderId);
            if (!existingFolder) {
              throw new Error("Pasta não encontrada");
            }

            clientId = existingFolder.clientId!;
            folderId = existingFolder.id;
            folderPath = `clients/${clientId}/${existingFolder.name}`;

            // Buscar caso associado ou usar o primeiro disponível
            if (existingFolder.kind === "case") {
              const folderCase = await CaseService.getCaseById(existingFolder.caseId!);
              caseId = folderCase?.id || existingFolder.caseId!;
            } else {
              const clientCases = await CaseService.getCases(clientId);
              caseId = clientCases[0]?.id || (await CaseService.createCase({
                name: "Documentos Gerais",
                clientId,
                status: "active",
              })).id;
            }
            break;

          default:
            throw new Error("Tipo de destino inválido");
        }

        // Gerar número do documento
        const docNumber = await DocumentService.getNextDocNumber(clientId);

        // Detectar tipo do arquivo
        const fileType = detectFileType(uploadFile.file.name);

        // Fazer upload do arquivo
        updateFileStatus(uploadFile.id, { status: "uploading", progress: 0 });

        const result = await uploadDocumentMutation.mutateAsync({
          file: uploadFile.file,
          folderPath,
          documentData: {
            name: uploadFile.file.name,
            mimeType: uploadFile.file.type,
            size: uploadFile.file.size,
            clientId,
            caseId,
            folderId,
            type: fileType,
            docNumber,
          },
          onProgress: (progress) => {
            updateFileStatus(uploadFile.id, { progress });
          },
        });

        updateFileStatus(uploadFile.id, { 
          status: "completed", 
          progress: 100,
          result,
        });

      } catch (error) {
        updateFileStatus(uploadFile.id, { 
          status: "error", 
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== "completed"));
  };

  const clearAll = () => {
    setUploadFiles([]);
  };

  return {
    uploadFiles,
    addFiles,
    removeFile,
    processUploads,
    clearCompleted,
    clearAll,
    isUploading: uploadFiles.some(f => f.status === "uploading" || f.status === "processing"),
    completedCount: uploadFiles.filter(f => f.status === "completed").length,
    errorCount: uploadFiles.filter(f => f.status === "error").length,
    totalProgress: uploadFiles.length > 0 
      ? uploadFiles.reduce((acc, file) => acc + file.progress, 0) / uploadFiles.length 
      : 0,
  };
}