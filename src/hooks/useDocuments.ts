import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentService } from "@/services/documentService";
import type { FileItem } from "@/types";
import { toast } from "@/hooks/use-toast";

// Query Keys
export const documentKeys = {
  all: ["documents"] as const,
  list: (filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
    type?: string;
  }) => [...documentKeys.all, "list", filters] as const,
  detail: (id: string) => [...documentKeys.all, "detail", id] as const,
  search: (query: string, filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
  }) => [...documentKeys.all, "search", query, filters] as const,
};

/**
 * Hook para buscar documentos
 */
export function useDocuments(filters?: {
  clientId?: string;
  caseId?: string;
  folderId?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => DocumentService.getDocuments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para buscar documento por ID
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => DocumentService.getDocumentById(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar documentos (search)
 */
export function useSearchDocuments(query: string, filters?: {
  clientId?: string;
  caseId?: string;
  folderId?: string;
}) {
  return useQuery({
    queryKey: documentKeys.search(query, filters),
    queryFn: () => DocumentService.searchDocuments(query, filters),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para upload de documento
 */
export function useUploadDocument() {
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
      onProgress?: (progress: number) => void;
    }) => {
      // Upload do arquivo
      const storagePath = await DocumentService.uploadFile(file, folderPath, onProgress);
      
      // Criar documento no banco
      return await DocumentService.createDocument({
        ...documentData,
        supabaseStoragePath: storagePath,
      });
    },
    onSuccess: (newDocument) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      
      toast({
        title: "Upload concluído",
        description: `${newDocument.name} foi enviado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar documento
 */
export function useUpdateDocument() {
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
    }) => DocumentService.updateDocument(id, updates),
    onSuccess: (updatedDocument, { id }) => {
      // Atualizar cache específico
      queryClient.setQueryData(documentKeys.detail(id), updatedDocument);
      
      // Invalidar listas de documentos
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      
      toast({
        title: "Documento atualizado",
        description: `${updatedDocument.name} foi atualizado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para deletar documento
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DocumentService.deleteDocument(id),
    onSuccess: (_, id) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: documentKeys.detail(id) });
      
      // Invalidar listas de documentos
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      
      toast({
        title: "Documento excluído",
        description: "Documento foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir documento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para gerar URL de download
 */
export function useDocumentDownloadUrl() {
  return useMutation({
    mutationFn: ({ documentId, expiresIn = 3600 }: {
      documentId: string;
      expiresIn?: number;
    }) => DocumentService.getDownloadUrl(documentId, expiresIn),
    onSuccess: (url) => {
      // Abrir download em nova aba
      window.open(url, "_blank");
      
      toast({
        title: "Download iniciado",
        description: "O arquivo será baixado em instantes.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para gerar próximo número de documento
 */
export function useNextDocNumber(clientId: string) {
  return useQuery({
    queryKey: ["nextDocNumber", clientId],
    queryFn: () => DocumentService.getNextDocNumber(clientId),
    enabled: !!clientId,
    staleTime: 1000, // 1 segundo (sempre atual)
  });
}