/**
 * Sistema de logging centralizado
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  meta?: Record<string, any>;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>, context?: string): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      meta,
    };

    // Adicionar stack trace para erros
    if (level === LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    // Armazenar log
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output no console
    this.outputToConsole(entry);

    // Em produção, enviar para serviço de logging
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, meta } = entry;
    const contextStr = context ? `[${context}] ` : '';
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    
    const logMessage = `${timestamp} ${contextStr}${message}${metaStr}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`🔍 ${logMessage}`);
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${logMessage}`);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${logMessage}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${logMessage}`);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  private async sendToLoggingService(entry: LogEntry): Promise<void> {
    // Implementar integração com serviço de logging (Sentry, LogRocket, etc.)
    // Por enquanto, apenas placeholder
    try {
      // await sendToExternalService(entry);
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, meta?: Record<string, any>, context?: string): void {
    this.log(LogLevel.DEBUG, message, meta, context);
  }

  info(message: string, meta?: Record<string, any>, context?: string): void {
    this.log(LogLevel.INFO, message, meta, context);
  }

  warn(message: string, meta?: Record<string, any>, context?: string): void {
    this.log(LogLevel.WARN, message, meta, context);
  }

  error(message: string, error?: Error, meta?: Record<string, any>, context?: string): void {
    const errorMeta = {
      ...meta,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };
    this.log(LogLevel.ERROR, message, errorMeta, context);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Singleton instance
export const logger = Logger.getInstance();

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
    logger.debug(`Started timer for operation: ${operation}`, undefined, 'Performance');
  }

  static endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn(`Timer not found for operation: ${operation}`, undefined, 'Performance');
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operation);

    logger.info(
      `Operation completed: ${operation}`,
      { duration: `${duration.toFixed(2)}ms` },
      'Performance'
    );

    // Alert para operações muito lentas
    if (duration > 5000) {
      logger.warn(
        `Slow operation detected: ${operation}`,
        { duration: `${duration.toFixed(2)}ms` },
        'Performance'
      );
    }

    return duration;
  }

  static async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(operation);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endTimer(operation);
    }
  }

  static measure<T>(operation: string, fn: () => T): T {
    this.startTimer(operation);
    try {
      return fn();
    } finally {
      this.endTimer(operation);
    }
  }
}

/**
 * Rate limiter simples
 */
export class RateLimiter {
  private static requests = new Map<string, number[]>();

  static isAllowed(
    key: string, 
    maxRequests: number = 100, 
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Obter requests existentes para esta chave
    let requests = this.requests.get(key) || [];
    
    // Filtrar requests dentro da janela de tempo
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Verificar se excedeu o limite
    if (requests.length >= maxRequests) {
      logger.warn(
        `Rate limit exceeded for key: ${key}`,
        { 
          currentRequests: requests.length, 
          maxRequests, 
          windowMs 
        },
        'RateLimit'
      );
      return false;
    }

    // Adicionar request atual
    requests.push(now);
    this.requests.set(key, requests);

    return true;
  }

  static reset(key: string): void {
    this.requests.delete(key);
    logger.info(`Rate limit reset for key: ${key}`, undefined, 'RateLimit');
  }
}
