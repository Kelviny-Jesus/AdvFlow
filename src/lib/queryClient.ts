/**
 * Configuração otimizada do React Query
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';
import { getErrorMessage } from './errors';

// Configurações de cache por tipo de dados
export const cacheConfig = {
  // Dados que mudam raramente
  clients: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  },
  
  // Dados que mudam com frequência moderada
  cases: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos
  },
  
  // Dados que mudam frequentemente
  documents: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  },
  
  // Dados de busca (cache curto)
  search: {
    staleTime: 30 * 1000, // 30 segundos
    cacheTime: 2 * 60 * 1000, // 2 minutos
  },
  
  // Configurações (cache longo)
  settings: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    cacheTime: 60 * 60 * 1000, // 1 hora
  },
  
  // Dados temporários (números de documento, etc.)
  temporary: {
    staleTime: 1000, // 1 segundo
    cacheTime: 5 * 60 * 1000, // 5 minutos
  },
} as const;

// Configuração do QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configurações padrão
      staleTime: 2 * 60 * 1000, // 2 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (novo nome para cacheTime)
      retry: (failureCount, error) => {
        // Não fazer retry para erros de autenticação
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes('autenticação') || errorMessage.includes('autorização')) {
          return false;
        }
        
        // Máximo 3 tentativas
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Network mode
      networkMode: 'online',
      
      // Refetch em foco/reconexão apenas se dados estão stale
      refetchOnWindowFocus: 'always',
      refetchOnReconnect: 'always',
      refetchOnMount: 'always',
    },
    mutations: {
      // Configurações para mutations
      retry: 1,
      networkMode: 'online',
      
      // Callbacks globais
      onError: (error) => {
        logger.error('Mutation error', error as Error, undefined, 'QueryClient');
      },
      onSuccess: (data, variables, context) => {
        logger.debug('Mutation success', { context }, 'QueryClient');
      },
    },
  },
});

// Event listeners para logging
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'queryAdded') {
    logger.debug('Query added to cache', { 
      queryKey: event.query.queryKey 
    }, 'QueryClient');
  }
  
  if (event?.type === 'queryRemoved') {
    logger.debug('Query removed from cache', { 
      queryKey: event.query.queryKey 
    }, 'QueryClient');
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event?.type === 'mutationAdded') {
    logger.debug('Mutation added', {
      mutationKey: event.mutation.options.mutationKey
    }, 'QueryClient');
  }
});

// Função para invalidar cache por padrão
export function invalidateQueriesByPattern(pattern: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey.join('.');
      return key.includes(pattern);
    }
  });
  
  logger.info('Invalidated queries by pattern', { pattern }, 'QueryClient');
}

// Função para limpar cache antigo
export function clearStaleCache() {
  queryClient.clear();
  logger.info('Cache cleared', undefined, 'QueryClient');
}

// Função para obter estatísticas do cache
export function getCacheStats() {
  const queryCache = queryClient.getQueryCache();
  const mutationCache = queryClient.getMutationCache();
  
  const stats = {
    queries: {
      total: queryCache.getAll().length,
      stale: queryCache.getAll().filter(q => q.isStale()).length,
      fetching: queryCache.getAll().filter(q => q.isFetching()).length,
    },
    mutations: {
      total: mutationCache.getAll().length,
      pending: mutationCache.getAll().filter(m => m.state.status === 'pending').length,
    },
  };
  
  logger.debug('Cache stats', stats, 'QueryClient');
  return stats;
}

// Hook para debug do cache (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  // Log stats periodicamente
  setInterval(() => {
    getCacheStats();
  }, 60000); // A cada minuto
}
