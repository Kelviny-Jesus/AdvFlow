import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientService } from "@/services/clientService";
import type { Client } from "@/types";
import { toast } from "@/hooks/use-toast";

// Query Keys
export const clientKeys = {
  all: ["clients"] as const,
  list: () => [...clientKeys.all, "list"] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
  search: (query: string) => [...clientKeys.all, "search", query] as const,
};

/**
 * Hook para buscar todos os clientes
 */
export function useClients() {
  return useQuery({
    queryKey: clientKeys.list(),
    queryFn: ClientService.getClients,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar cliente por ID
 */
export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => ClientService.getClientById(id),
    enabled: !!id,
  });
}

/**
 * Hook para buscar clientes (search)
 */
export function useSearchClients(query: string) {
  return useQuery({
    queryKey: clientKeys.search(query),
    queryFn: () => ClientService.searchClients(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para criar cliente
 */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Client, "id" | "createdAt" | "casesCount">) =>
      ClientService.createClient(data),
    onSuccess: (newClient) => {
      // Invalidar e atualizar cache
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      
      toast({
        title: "Cliente criado",
        description: `${newClient.name} foi adicionado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar cliente
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { 
      id: string; 
      updates: Partial<Omit<Client, "id" | "createdAt">> 
    }) => ClientService.updateClient(id, updates),
    onSuccess: (updatedClient, { id }) => {
      // Atualizar cache específico
      queryClient.setQueryData(clientKeys.detail(id), updatedClient);
      
      // Invalidar lista de clientes
      queryClient.invalidateQueries({ queryKey: clientKeys.list() });
      
      toast({
        title: "Cliente atualizado",
        description: `${updatedClient.name} foi atualizado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para deletar cliente
 */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ClientService.deleteClient(id),
    onSuccess: (_, id) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: clientKeys.detail(id) });
      
      // Invalidar lista de clientes
      queryClient.invalidateQueries({ queryKey: clientKeys.list() });
      
      toast({
        title: "Cliente excluído",
        description: "Cliente foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}