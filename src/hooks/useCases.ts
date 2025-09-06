import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CaseService } from "@/services/caseService";
import type { Case } from "@/types";
import { toast } from "@/hooks/use-toast";

// Query Keys
export const caseKeys = {
  all: ["cases"] as const,
  list: (clientId?: string) => [...caseKeys.all, "list", clientId] as const,
  detail: (id: string) => [...caseKeys.all, "detail", id] as const,
  search: (clientId: string, query: string) => [...caseKeys.all, "search", clientId, query] as const,
};

/**
 * Hook para buscar todos os casos
 */
export function useCases(clientId?: string) {
  return useQuery({
    queryKey: caseKeys.list(clientId),
    queryFn: () => CaseService.getCases(clientId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar caso por ID
 */
export function useCase(id: string) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => CaseService.getCaseById(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar casos (search)
 */
export function useSearchCases(clientId: string, query: string) {
  return useQuery({
    queryKey: caseKeys.search(clientId, query),
    queryFn: () => CaseService.searchCases(clientId, query),
    enabled: !!clientId && query.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para criar caso
 */
export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Case, "id" | "createdAt" | "documentsCount">) =>
      CaseService.createCase(data),
    onSuccess: (newCase) => {
      // Invalidar e atualizar cache
      queryClient.invalidateQueries({ queryKey: caseKeys.all });
      
      toast({
        title: "Caso criado",
        description: `${newCase.name} foi adicionado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar caso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar caso
 */
export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: string; 
      updates: Partial<Omit<Case, "id" | "createdAt">> 
    }) => CaseService.updateCase(id, updates),
    onSuccess: (updatedCase, { id }) => {
      // Atualizar cache específico
      queryClient.setQueryData(caseKeys.detail(id), updatedCase);
      
      // Invalidar lista de casos
      queryClient.invalidateQueries({ queryKey: caseKeys.list() });
      
      toast({
        title: "Caso atualizado",
        description: `${updatedCase.name} foi atualizado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar caso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para deletar caso
 */
export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CaseService.deleteCase(id),
    onSuccess: (_, id) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: caseKeys.detail(id) });
      
      // Invalidar lista de casos
      queryClient.invalidateQueries({ queryKey: caseKeys.list() });
      
      toast({
        title: "Caso excluído",
        description: "Caso foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir caso",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}