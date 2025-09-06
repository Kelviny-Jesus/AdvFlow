/**
 * Hook para gerenciar pastas reais no Supabase
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderServiceReal } from "@/services/folderServiceReal";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import type { FolderItem } from "@/types";

// Query keys
export const folderKeysReal = {
  all: ["folders-real"] as const,
  list: (parentId?: string) => [...folderKeysReal.all, "list", parentId] as const,
  detail: (id: string) => [...folderKeysReal.all, "detail", id] as const,
};

/**
 * Hook para buscar pastas
 */
export function useFoldersReal(parentId?: string) {
  return useQuery({
    queryKey: folderKeysReal.list(parentId),
    queryFn: () => FolderServiceReal.getFolders(parentId),
    staleTime: 2 * 60 * 1000, // 2 minutos
    onError: (error) => {
      logger.error('Failed to fetch folders', error as Error, { parentId }, 'useFoldersReal');
    },
  });
}

/**
 * Hook para criar pasta
 */
export function useCreateFolderReal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      kind: 'client' | 'case' | 'subfolder';
      parentId?: string;
      clientId?: string;
      caseId?: string;
      path: string;
    }) => FolderServiceReal.createFolder(data),
    onSuccess: (newFolder) => {
      // Invalidar cache de pastas
      queryClient.invalidateQueries({ queryKey: folderKeysReal.all });
      
      toast({
        title: "Pasta criada",
        description: `${newFolder.name} foi criada com sucesso.`,
      });

      logger.info('Folder created successfully', { 
        id: newFolder.id, 
        name: newFolder.name 
      }, 'useCreateFolderReal');
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro ao criar pasta",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Folder creation failed', error as Error, undefined, 'useCreateFolderReal');
    },
  });
}

/**
 * Hook para criar cliente com pasta
 */
export function useCreateClientWithFolderReal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientName: string) => FolderServiceReal.createClientWithFolder(clientName),
    onSuccess: ({ client, folder }) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: folderKeysReal.all });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      toast({
        title: "Cliente criado",
        description: `${client.name} e sua pasta foram criados com sucesso.`,
      });

      logger.info('Client and folder created successfully', { 
        clientId: client.id, 
        folderId: folder.id 
      }, 'useCreateClientWithFolderReal');
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro ao criar cliente",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Client creation failed', error as Error, undefined, 'useCreateClientWithFolderReal');
    },
  });
}

/**
 * Hook para criar caso com pasta
 */
export function useCreateCaseWithFolderReal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      clientId: string;
      description?: string;
      reference?: string;
    }) => FolderServiceReal.createCaseWithFolder(data),
    onSuccess: ({ case: newCase, folder }) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: folderKeysReal.all });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      
      toast({
        title: "Caso criado",
        description: `${newCase.name} e sua pasta foram criados com sucesso.`,
      });

      logger.info('Case and folder created successfully', { 
        caseId: newCase.id, 
        folderId: folder.id 
      }, 'useCreateCaseWithFolderReal');
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      
      toast({
        title: "Erro ao criar caso",
        description: errorMessage,
        variant: "destructive",
      });

      logger.error('Case creation failed', error as Error, undefined, 'useCreateCaseWithFolderReal');
    },
  });
}
