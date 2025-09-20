/**
 * Configuração centralizada da aplicação
 */

export const appConfig = {
  // Informações da aplicação
  app: {
    name: 'AdvFlow',
    version: '2.0.0',
    description: 'Sistema de gestão de documentos jurídicos com IA',
  },

  // Configurações de ambiente
  environment: {
    isDevelopment: import.meta.env.MODE === 'development',
    isProduction: import.meta.env.MODE === 'production',
    isTest: import.meta.env.MODE === 'test',
  },

  // Configurações de API
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000, // 30 segundos
    retries: 3,
  },

  // Configurações do Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // Configurações de upload
  upload: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/opus',
      'video/mp4',
      'video/avi',
      'video/mov',
    ],
    chunkSize: 5 * 1024 * 1024, // 5MB
    concurrency: 3,
    compression: {
      images: {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
      },
    },
  },

  // Configurações de cache
  cache: {
    clients: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      cacheTime: 30 * 60 * 1000, // 30 minutos
    },
    cases: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 15 * 60 * 1000, // 15 minutos
    },
    documents: {
      staleTime: 2 * 60 * 1000, // 2 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    },
    search: {
      staleTime: 30 * 1000, // 30 segundos
      cacheTime: 2 * 60 * 1000, // 2 minutos
    },
    settings: {
      staleTime: 15 * 60 * 1000, // 15 minutos
      cacheTime: 60 * 60 * 1000, // 1 hora
    },
  },

  // Configurações de logging
  logging: {
    level: import.meta.env.MODE === 'development' ? 'debug' : 'info',
    maxLogs: 1000,
    enableConsole: true,
    enableRemote: import.meta.env.MODE === 'production',
    remoteEndpoint: import.meta.env.VITE_LOGGING_ENDPOINT,
  },

  // Configurações de rate limiting
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },

  // Configurações de UI
  ui: {
    theme: {
      defaultMode: 'light' as 'light' | 'dark' | 'system',
    },
    animations: {
      enabled: true,
      duration: 200,
    },
    pagination: {
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    },
  },

  // Configurações de features
  features: {
    useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
    enableChunkedUpload: true,
    enableImageCompression: true,
    enableAutoDetectFileType: true,
    enablePerformanceMonitoring: import.meta.env.MODE === 'development',
    enableAdvancedSearch: true,
    enableBatchOperations: true,
  },

  // URLs e links
  urls: {
    documentation: 'https://docs.docflow-ai.com',
    support: 'https://support.docflow-ai.com',
    github: 'https://github.com/docflow-ai/DocFlow',
  },

  // Configurações de validação
  validation: {
    client: {
      nameMinLength: 2,
      nameMaxLength: 100,
    },
    case: {
      nameMinLength: 3,
      nameMaxLength: 200,
      descriptionMaxLength: 1000,
    },
    document: {
      nameMaxLength: 255,
      docNumberMaxLength: 20,
      descriptionMaxLength: 500,
    },
    petition: {
      titleMinLength: 5,
      titleMaxLength: 200,
      contentMinLength: 10,
    },
    fact: {
      textMinLength: 10,
      textMaxLength: 1000,
      tagMaxLength: 50,
    },
  },

  // Configurações de integração
  integrations: {
    googleDrive: {
      enabled: false,
      clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID,
      apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    },
    openai: {
      enabled: false,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      model: 'gpt-4',
    },
  },
} as const;

/**
 * Validar configurações obrigatórias
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar Supabase (apenas em produção)
  if (appConfig.environment.isProduction) {
    if (!appConfig.supabase.url) {
      errors.push('REACT_APP_SUPABASE_URL é obrigatório em produção');
    }
    if (!appConfig.supabase.anonKey) {
      errors.push('REACT_APP_SUPABASE_ANON_KEY é obrigatório em produção');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Obter configuração por ambiente
 */
export function getEnvConfig() {
  return {
    environment: import.meta.env.MODE,
    useMockData: appConfig.features.useMockData,
    supabaseConfigured: !!(appConfig.supabase.url && appConfig.supabase.anonKey),
    featuresEnabled: Object.entries(appConfig.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
  };
}
