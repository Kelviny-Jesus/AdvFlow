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

    // Cache para evitar criar múltiplas pastas/clientes para destinos idênticos
    const resolvedDestinations = new Map<string, { clientId: string; caseId: string; folderId?: string; folderPath: string }>();
    const pendingResolutions = new Map<string, Promise<{ clientId: string; caseId: string; folderId?: string; folderPath: string }>>();

    const buildDestKey = (d: UploadDestination) => {
      return JSON.stringify({
        type: d.type,
        folderId: d.folderId || null,
        clientName: d.clientName || null,
        subfolderName: d.subfolderName || null,
        parentFolderId: d.parentFolderId || null,
      });
    };

    const resolveDestination = async (destination: UploadDestination): Promise<{ clientId: string; caseId: string; folderId?: string; folderPath: string }> => {
      switch (destination?.type) {
        case "new_client":
          if (!destination.clientName) {
            throw new Error("Nome do cliente é obrigatório");
          }

          const newClient = await createClientMutation.mutateAsync({
            name: destination.clientName,
          });

          const clientFolder = await createFolderMutation.mutateAsync({
            name: newClient.name,
            kind: "client",
            clientId: newClient.id,
            path: newClient.name,
          });

          const defaultCase = await CaseService.createCase({
            name: "Documentos Gerais",
            clientId: newClient.id,
            status: "active",
          });

          return {
            clientId: newClient.id,
            caseId: defaultCase.id,
            folderId: clientFolder.id,
            folderPath: `clients/${newClient.id}`,
          };

        case "new_subfolder":
          if (!destination.subfolderName || !destination.parentFolderId) {
            throw new Error("Nome da subpasta e pasta pai são obrigatórios");
          }

          const parentFolder = await FolderService.getFolderById(destination.parentFolderId);
          if (!parentFolder?.clientId) {
            throw new Error("Pasta pai inválida");
          }

          const subFolder = await createFolderMutation.mutateAsync({
            name: destination.subfolderName,
            kind: "subfolder",
            parentId: destination.parentFolderId,
            clientId: parentFolder.clientId,
            path: `${parentFolder.path}/${destination.subfolderName}`,
          });

          const clientCases = await CaseService.getCases(parentFolder.clientId);
          const subCaseId = clientCases[0]?.id || (await CaseService.createCase({
            name: "Documentos Gerais",
            clientId: parentFolder.clientId,
            status: "active",
          })).id;

          return {
            clientId: parentFolder.clientId,
            caseId: subCaseId,
            folderId: subFolder.id,
            folderPath: `clients/${parentFolder.clientId}/${subFolder.name}`,
          };

        case "existing_folder":
          if (!destination.folderId) {
            throw new Error("Pasta de destino é obrigatória");
          }

          const existingFolder = await FolderService.getFolderById(destination.folderId);
          if (!existingFolder) {
            throw new Error("Pasta não encontrada");
          }

          let existingCaseId: string;
          if (existingFolder.kind === "case") {
            const folderCase = await CaseService.getCaseById(existingFolder.caseId!);
            existingCaseId = folderCase?.id || existingFolder.caseId!;
          } else {
            const clientCases = await CaseService.getCases(existingFolder.clientId!);
            existingCaseId = clientCases[0]?.id || (await CaseService.createCase({
              name: "Documentos Gerais",
              clientId: existingFolder.clientId!,
              status: "active",
            })).id;
          }

          return {
            clientId: existingFolder.clientId!,
            caseId: existingCaseId,
            folderId: existingFolder.id,
            folderPath: `clients/${existingFolder.clientId}/${existingFolder.name}`,
          };

        default:
          throw new Error("Tipo de destino inválido");
      }
    };

    for (const uploadFile of pendingFiles) {
      try {
        updateFileStatus(uploadFile.id, { status: "processing" });

        const cacheKey = buildDestKey(uploadFile.destination);
        let resolved = resolvedDestinations.get(cacheKey);

        if (!resolved) {
          let resolutionPromise = pendingResolutions.get(cacheKey);
          if (!resolutionPromise) {
            resolutionPromise = resolveDestination(uploadFile.destination);
            pendingResolutions.set(cacheKey, resolutionPromise);
          }
          resolved = await resolutionPromise;
          resolvedDestinations.set(cacheKey, resolved);
        }

        const { clientId, caseId, folderId, folderPath } = resolved;

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