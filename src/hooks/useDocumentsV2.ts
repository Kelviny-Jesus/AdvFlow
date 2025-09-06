/**
 * Hooks melhorados para documentos com cache otimizado e error handling
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentServiceV2 } from "@/services/documentServiceV2";
import type { FileItem } from "@/types";
import { toast } from "@/hooks/use-toast";
import { cacheConfig } from "@/lib/queryClient";
import { getErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { UploadProgress } from "@/lib/uploadManager";

// Query Keys otimizadas
export const documentKeysV2 = {
  all: ["documents-v2"] as const,
  list: (filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
    type?: string;
    dateRange?: { start: string; end: string };
    sizeRange?: { min: number; max: number };
  }) => [...documentKeysV2.all, "list", filters] as const,
  detail: (id: string) => [...documentKeysV2.all, "detail", id] as const,
  search: (query: string, filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
  }) => [...documentKeysV2.all, "search", query, filters] as const,
  nextDocNumber: (clientId: string) => [...documentKeysV2.all, "nextDocNumber", clientId] as const,
  downloadUrl: (documentId: string) => [...documentKeysV2.all, "downloadUrl", documentId] as const,
};

/**
 * Hook para buscar documentos com cache otimizado
 */
export function useDocumentsV2(filters?: {
  clientId?: string;
  caseId?: string;
  folderId?: string;
  type?: string;
  dateRange?: { start: string; end: string };
  sizeRange?: { min: number; max: number };
}) {
  return useQuery({
    queryKey: documentKeysV2.list(filters),
    queryFn: () => DocumentServiceV2.getDocuments(filters),
    staleTime: cacheConfig.documents.staleTime,
    gcTime: cacheConfig.documents.cacheTime,
    retry: (failureCount, error) => {
      const errorMessage = getErrorMessage(error);
      
      // Não fazer retry para erros de validação
      if (errorMessage.includes('validação') || errorMessage.includes('obrigatório')) {
        return false;
      }
      
      return failureCount < 2;
    },
    onError: (error) => {
      logger.error('Failed to fetch documents', error as Error, { filters }, 'useDocumentsV2');
    },
  });
}

/**
 * Hook para buscar documento por ID
 */
export function useDocumentV2(id: string) {
  return useQuery({
    queryKey: documentKeysV2.detail(id),
    queryFn: () => DocumentServiceV2.getDocumentById(id),
    enabled: !!id,
    staleTime: cacheConfig.documents.staleTime,
    gcTime: cacheConfig.documents.cacheTime,
    onError: (error) => {
      logger.error('Failed to fetch document', error as Error, { id }, 'useDocumentV2');
    },
  });
}

/**
 * Hook para buscar documentos (search) com debounce
 */
export function useSearchDocumentsV2(query: string, filters?: {
  clientId?: string;
  caseId?: string;
  folderId?: string;
}) {
  return useQuery({
    queryKey: documentKeysV2.search(query, filters),
    queryFn: () => DocumentServiceV2.searchDocuments(query, filters),
    enabled: query.length >= 2,
    staleTime: cacheConfig.search.staleTime,
    gcTime: cacheConfig.search.cacheTime,
    onError: (error) => {
      logger.error('Failed to search documents', error as Error, { query, filters }, 'useSearchDocumentsV2');
    },
  });
}

/**
 * Hook para upload inteligente de documento
 */
export function useSmartUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      folderPath,
      documentData,
      options,
    }: {
      file: File;
      folderPath: string;
      documentData: {
        clientId: string;
        caseId: string;
        folderId?: string;
        type: string;
        docNumber?: string;
        description?: string;
      };
      options?: {
        onProgress?: (progress: UploadProgress) => void;
        autoCompress?: boolean;
        autoDetectType?: boolean;
      };
    }) => {
      return DocumentServiceV2.smartUpload(file, folderPath, documentData, options);
    },
    onSuccess: (newDocument) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: documentKeysV2.all });
      
      // Adicionar ao cache de detalhes
      queryClient.setQueryData(documentKeysV2.detail(newDocument.id), newDocument);
      
      toast({
        title: "Upload concluído",
        description: `${newDocument.name} foi enviado com sucesso.`,
      });

      logger.info('Document uploaded successfully', { 
        id: newDocument.id, 
        name: newDocument.name 
      }, 'useSmartUploadDocument');
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Document upload failed', error, undefined, 'useSmartUploadDocument');
    },
  });
}

/**
 * Hook para upload tradicional de documento
 */
export function useUploadDocumentV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      folderPath,
      documentData,
      onProgress,
    }: {
      file: File;
      folderPath: string;
      documentData: {
        name: string;
        mimeType: string;
        size: number;
        clientId: string;
        caseId: string;
        folderId?: string;
        type: string;
        docNumber?: string;
        description?: string;
      };
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      // Upload do arquivo
      const storagePath = await DocumentServiceV2.uploadFile(file, folderPath, { onProgress });
      
      // Criar documento no banco
      return await DocumentServiceV2.createDocument({
        ...documentData,
        supabaseStoragePath: storagePath,
      });
    },
    onSuccess: (newDocument) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: documentKeysV2.all });
      
      toast({
        title: "Upload concluído",
        description: `${newDocument.name} foi enviado com sucesso.`,
      });

      logger.info('Document uploaded successfully', { 
        id: newDocument.id, 
        name: newDocument.name 
      }, 'useUploadDocumentV2');
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Document upload failed', error, undefined, 'useUploadDocumentV2');
    },
  });
}

/**
 * Hook para atualizar documento
 */
export function useUpdateDocumentV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        docNumber: string;
        description: string;
        folderId: string;
      }>;
    }) => DocumentServiceV2.updateDocument(id, updates),
    onSuccess: (updatedDocument, { id }) => {
      // Atualizar cache específico
      queryClient.setQueryData(documentKeysV2.detail(id), updatedDocument);
      
      // Invalidar listas de documentos
      queryClient.invalidateQueries({ queryKey: documentKeysV2.all });
      
      toast({
        title: "Documento atualizado",
        description: `${updatedDocument.name} foi atualizado com sucesso.`,
      });

      logger.info('Document updated successfully', { id }, 'useUpdateDocumentV2');
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro ao atualizar documento",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Document update failed', error, undefined, 'useUpdateDocumentV2');
    },
  });
}

/**
 * Hook para deletar documento
 */
export function useDeleteDocumentV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DocumentServiceV2.deleteDocument(id),
    onSuccess: (_, id) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: documentKeysV2.detail(id) });
      
      // Invalidar listas de documentos
      queryClient.invalidateQueries({ queryKey: documentKeysV2.all });
      
      toast({
        title: "Documento excluído",
        description: "Documento foi removido com sucesso.",
      });

      logger.info('Document deleted successfully', { id }, 'useDeleteDocumentV2');
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro ao excluir documento",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Document deletion failed', error, undefined, 'useDeleteDocumentV2');
    },
  });
}

/**
 * Hook para gerar URL de download
 */
export function useDocumentDownloadUrlV2() {
  return useMutation({
    mutationFn: ({ documentId, expiresIn = 3600 }: {
      documentId: string;
      expiresIn?: number;
    }) => DocumentServiceV2.getDownloadUrl(documentId, expiresIn),
    onSuccess: (url) => {
      // Abrir download em nova aba
      window.open(url, "_blank");
      
      toast({
        title: "Download iniciado",
        description: "O arquivo será baixado em instantes.",
      });

      logger.info('Download URL generated successfully', undefined, 'useDocumentDownloadUrlV2');
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro no download",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Download URL generation failed', error, undefined, 'useDocumentDownloadUrlV2');
    },
  });
}

/**
 * Hook para gerar próximo número de documento
 */
export function useNextDocNumberV2(clientId: string) {
  return useQuery({
    queryKey: documentKeysV2.nextDocNumber(clientId),
    queryFn: () => DocumentServiceV2.getNextDocNumber(clientId),
    enabled: !!clientId,
    staleTime: cacheConfig.temporary.staleTime,
    gcTime: cacheConfig.temporary.cacheTime,
    onError: (error) => {
      logger.error('Failed to get next doc number', error as Error, { clientId }, 'useNextDocNumberV2');
    },
  });
}

/**
 * Hook para múltiplos uploads simultâneos
 */
export function useBatchUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      folderPath,
      baseDocumentData,
      onProgress,
    }: {
      files: File[];
      folderPath: string;
      baseDocumentData: {
        clientId: string;
        caseId: string;
        folderId?: string;
      };
      onProgress?: (fileIndex: number, progress: UploadProgress) => void;
    }) => {
      const results: FileItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const result = await DocumentServiceV2.smartUpload(
          file,
          folderPath,
          {
            ...baseDocumentData,
            type: 'other', // Será auto-detectado
          },
          {
            onProgress: onProgress ? (progress) => onProgress(i, progress) : undefined,
            autoCompress: true,
            autoDetectType: true,
          }
        );
        
        results.push(result);
      }
      
      return results;
    },
    onSuccess: (results) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: documentKeysV2.all });
      
      toast({
        title: "Upload em lote concluído",
        description: `${results.length} arquivos foram enviados com sucesso.`,
      });

      logger.info('Batch upload completed', { count: results.length }, 'useBatchUpload');
    },
    onError: (error: Error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro no upload em lote",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Batch upload failed', error, undefined, 'useBatchUpload');
    },
  });
}
