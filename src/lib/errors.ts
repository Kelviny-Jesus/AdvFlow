/**
 * Sistema centralizado de tratamento de erros
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(`Erro de validação: ${message}${field ? ` (campo: ${field})` : ''}`, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} não encontrado`, 404);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Muitas requisições') {
    super(message, 429);
  }
}

export class StorageError extends AppError {
  constructor(message: string = 'Erro no armazenamento') {
    super(message, 507);
  }
}

/**
 * Handler centralizado para erros do Supabase
 */
export class SupabaseErrorHandler {
  static handle(error: any): never {
    // Erro de não encontrado
    if (error.code === 'PGRST116') {
      throw new NotFoundError();
    }

    // Erro de autenticação
    if (error.message?.includes('JWT') || error.code === 'PGRST301') {
      throw new AuthError('Sessão expirada. Faça login novamente.');
    }

    // Erro de violação de constraint única
    if (error.code === '23505') {
      throw new ConflictError('Registro já existe');
    }

    // Erro de foreign key
    if (error.code === '23503') {
      throw new ValidationError('Referência inválida');
    }

    // Erro de permissão (RLS)
    if (error.code === 'PGRST103') {
      throw new AuthError('Sem permissão para acessar este recurso');
    }

    // Erro de storage
    if (error.message?.includes('storage')) {
      throw new StorageError(error.message);
    }

    // Erro genérico
    throw new AppError(
      error.message || 'Erro interno do servidor',
      error.status || 500
    );
  }
}

/**
 * Wrapper para operações que podem gerar erros
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log do erro
    console.error(`[ERROR] ${context || 'Unknown operation'}:`, {
      error,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Se já é um AppError, apenas re-throw
    if (error instanceof AppError) {
      throw error;
    }

    // Se é erro do Supabase, usar handler específico
    if (error && typeof error === 'object' && 'code' in error) {
      SupabaseErrorHandler.handle(error);
    }

    // Erro desconhecido
    throw new AppError(
      error instanceof Error ? error.message : 'Erro desconhecido',
      500,
      false
    );
  }
}

/**
 * Hook para tratamento de erros em components React
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Erro desconhecido';
}

/**
 * Função para verificar se erro é operacional
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
