import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderService } from "@/services/folderService";
import type { FolderItem } from "@/types";
import { toast } from "@/hooks/use-toast";

// Query Keys
export const folderKeys = {
  all: ["folders"] as const,
  list: (parentId?: string) => [...folderKeys.all, "list", parentId] as const,
  detail: (id: string) => [...folderKeys.all, "detail", id] as const,
  search: (query: string) => [...folderKeys.all, "search", query] as const,
};

/**
 * Hook para buscar pastas
 */
export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: folderKeys.list(parentId),
    queryFn: () => FolderService.getFolders(parentId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar pasta por ID
 */
export function useFolder(id: string) {
  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: () => FolderService.getFolderById(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar pastas (search)
 */
export function useSearchFolders(query: string) {
  return useQuery({
    queryKey: folderKeys.search(query),
    queryFn: () => FolderService.searchFolders(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para criar pasta
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      kind: "client" | "case" | "subfolder";
      parentId?: string;
      clientId?: string;
      caseId?: string;
      path: string;
    }) => FolderService.createFolder(data),
    onSuccess: (newFolder) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      
      toast({
        title: "Pasta criada",
        description: `${newFolder.name} foi criada com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar pasta
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        path: string;
      }>;
    }) => FolderService.updateFolder(id, updates),
    onSuccess: (updatedFolder, { id }) => {
      // Atualizar cache específico
      queryClient.setQueryData(folderKeys.detail(id), updatedFolder);
      
      // Invalidar listas de pastas
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      
      toast({
        title: "Pasta atualizada",
        description: `${updatedFolder.name} foi atualizada com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para deletar pasta
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FolderService.deleteFolder(id),
    onSuccess: (_, id) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: folderKeys.detail(id) });
      
      // Invalidar listas de pastas
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      
      toast({
        title: "Pasta excluída",
        description: "Pasta foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir pasta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}