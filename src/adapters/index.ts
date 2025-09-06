/**
 * Configuração e seleção de adapters
 */

import type { DataAdapter, AdapterConfig } from './types';
import { MockDataAdapter } from './mockAdapter';
// import { SupabaseDataAdapter } from './supabaseAdapter'; // Será criado posteriormente
import { logger } from '@/lib/logger';

// Configuração baseada no ambiente
const getAdapterConfig = (): AdapterConfig => {
  const environment = (import.meta.env.MODE as 'development' | 'production' | 'test') || 'development';
  
  // SEMPRE usar mock em desenvolvimento para evitar problemas com Supabase
  const useMockData = environment === 'development' || 
                     environment === 'test' || 
                     import.meta.env.VITE_USE_MOCK_DATA === 'true';

  return {
    environment,
    useMockData: false, // USAR DADOS REAIS
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
};

// Singleton do adapter
let adapterInstance: DataAdapter | null = null;

/**
 * Obter instância do adapter baseado na configuração
 */
export function getDataAdapter(): DataAdapter {
  if (!adapterInstance) {
    const config = getAdapterConfig();
    
    logger.info('Initializing data adapter', {
      environment: config.environment,
      useMockData: config.useMockData,
    }, 'AdapterManager');

    if (config.useMockData) {
      adapterInstance = new MockDataAdapter();
      logger.info('Using Mock Data Adapter', undefined, 'AdapterManager');
    } else {
      // TODO: Implementar SupabaseDataAdapter
      // adapterInstance = new SupabaseDataAdapter(config);
      
      // Por enquanto, usar mock como fallback
      logger.warn('Supabase adapter not implemented, falling back to mock', undefined, 'AdapterManager');
      adapterInstance = new MockDataAdapter();
    }
  }

  return adapterInstance;
}

/**
 * Resetar adapter (útil para testes)
 */
export function resetAdapter(): void {
  adapterInstance = null;
  logger.info('Adapter reset', undefined, 'AdapterManager');
}

/**
 * Verificar se está usando dados mock
 */
export function isUsingMockData(): boolean {
  const config = getAdapterConfig();
  return config.useMockData;
}

// Exportar tipos para uso externo
export type { DataAdapter, AdapterConfig } from './types';
export { MockDataAdapter } from './mockAdapter';
