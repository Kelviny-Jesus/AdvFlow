/**
 * Sistema avançado de upload com chunks e compressão
 */

import { logger, PerformanceMonitor } from './logger';
import { withErrorHandling, StorageError } from './errors';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

export interface ChunkUploadOptions {
  chunkSize?: number;
  maxRetries?: number;
  concurrency?: number;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

export interface FileCompressionOptions {
  quality?: number; // 0.1 to 1.0 for images
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

export class FileProcessor {
  /**
   * Detectar tipo de arquivo baseado na extensão e MIME type
   */
  static detectFileType(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Imagens
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    }

    // Documentos PDF
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf';
    }

    // Documentos Office
    if (mimeType.includes('word') || mimeType.includes('document') || ['doc', 'docx'].includes(extension || '')) {
      return 'docx';
    }

    if (mimeType.includes('sheet') || mimeType.includes('excel') || ['xls', 'xlsx'].includes(extension || '')) {
      return 'xlsx';
    }

    // Áudio
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension || '')) {
      return 'audio';
    }

    // Vídeo
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension || '')) {
      return 'video';
    }

    return 'other';
  }

  /**
   * Comprimir imagem
   */
  static async compressImage(file: File, options: FileCompressionOptions = {}): Promise<File> {
    return withErrorHandling(async () => {
      if (!file.type.startsWith('image/')) {
        return file;
      }

      const {
        quality = 0.8,
        maxWidth = 1920,
        maxHeight = 1080,
        format = 'jpeg'
      } = options;

      logger.info('Starting image compression', {
        originalSize: file.size,
        quality,
        maxWidth,
        maxHeight,
        format
      }, 'FileProcessor');

      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();

        img.onload = () => {
          // Calcular novas dimensões mantendo aspect ratio
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para blob
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: `image/${format}`,
                lastModified: Date.now(),
              });

              logger.info('Image compression completed', {
                originalSize: file.size,
                compressedSize: compressedFile.size,
                compressionRatio: ((file.size - compressedFile.size) / file.size * 100).toFixed(2) + '%'
              }, 'FileProcessor');

              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, `image/${format}`, quality);
        };

        img.onerror = () => resolve(file);
        img.src = URL.createObjectURL(file);
      });
    }, 'FileProcessor.compressImage');
  }

  /**
   * Validar arquivo antes do upload
   */
  static validateFile(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { valid: boolean; error?: string } {
    const {
      maxSize = 100 * 1024 * 1024, // 100MB
      allowedTypes = [],
      allowedExtensions = []
    } = options;

    // Verificar tamanho
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Arquivo muito grande. Máximo: ${(maxSize / (1024 * 1024)).toFixed(0)}MB`
      };
    }

    // Verificar tipo MIME
    if (allowedTypes.length > 0 && !allowedTypes.some(type => file.type.includes(type))) {
      return {
        valid: false,
        error: `Tipo de arquivo não permitido: ${file.type}`
      };
    }

    // Verificar extensão
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: `Extensão não permitida: ${extension}`
        };
      }
    }

    return { valid: true };
  }
}

export class ChunkedUploader {
  private file: File;
  private options: Required<ChunkUploadOptions>;
  private uploadStartTime: number = 0;
  private uploadedBytes: number = 0;

  constructor(file: File, options: ChunkUploadOptions = {}) {
    this.file = file;
    this.options = {
      chunkSize: options.chunkSize || 5 * 1024 * 1024, // 5MB chunks
      maxRetries: options.maxRetries || 3,
      concurrency: options.concurrency || 3,
      onProgress: options.onProgress || (() => {}),
      onChunkComplete: options.onChunkComplete || (() => {}),
    };
  }

  /**
   * Upload com chunks paralelos
   */
  async upload(uploadFn: (chunk: Blob, chunkIndex: number, totalChunks: number) => Promise<string>): Promise<string[]> {
    return withErrorHandling(async () => {
      const operation = `chunkedUpload-${this.file.name}`;
      PerformanceMonitor.startTimer(operation);
      
      this.uploadStartTime = Date.now();
      this.uploadedBytes = 0;

      const totalChunks = Math.ceil(this.file.size / this.options.chunkSize);
      const chunks: Blob[] = [];

      logger.info('Starting chunked upload', {
        fileName: this.file.name,
        fileSize: this.file.size,
        chunkSize: this.options.chunkSize,
        totalChunks,
        concurrency: this.options.concurrency
      }, 'ChunkedUploader');

      // Dividir arquivo em chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.options.chunkSize;
        const end = Math.min(start + this.options.chunkSize, this.file.size);
        chunks.push(this.file.slice(start, end));
      }

      // Upload paralelo com controle de concorrência
      const results: string[] = new Array(totalChunks);
      const semaphore = new Semaphore(this.options.concurrency);

      const uploadPromises = chunks.map(async (chunk, index) => {
        await semaphore.acquire();
        
        try {
          const result = await this.uploadChunkWithRetry(chunk, index, totalChunks, uploadFn);
          results[index] = result;
          
          this.uploadedBytes += chunk.size;
          this.updateProgress();
          this.options.onChunkComplete(index, totalChunks);
          
          return result;
        } finally {
          semaphore.release();
        }
      });

      await Promise.all(uploadPromises);
      
      PerformanceMonitor.endTimer(operation);
      logger.info('Chunked upload completed', {
        fileName: this.file.name,
        totalChunks,
        uploadTime: Date.now() - this.uploadStartTime
      }, 'ChunkedUploader');

      return results;
    }, 'ChunkedUploader.upload');
  }

  private async uploadChunkWithRetry(
    chunk: Blob,
    index: number,
    totalChunks: number,
    uploadFn: (chunk: Blob, chunkIndex: number, totalChunks: number) => Promise<string>
  ): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        logger.debug('Uploading chunk', {
          index,
          attempt: attempt + 1,
          size: chunk.size
        }, 'ChunkedUploader');

        return await uploadFn(chunk, index, totalChunks);
      } catch (error) {
        lastError = error as Error;
        
        logger.warn('Chunk upload failed', {
          index,
          attempt: attempt + 1,
          error: lastError.message
        }, 'ChunkedUploader');

        if (attempt < this.options.maxRetries - 1) {
          // Delay exponencial
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new StorageError(`Falha no upload do chunk ${index} após ${this.options.maxRetries} tentativas: ${lastError?.message}`);
  }

  private updateProgress(): void {
    const elapsed = Date.now() - this.uploadStartTime;
    const speed = this.uploadedBytes / (elapsed / 1000); // bytes per second
    const percentage = (this.uploadedBytes / this.file.size) * 100;
    const timeRemaining = (this.file.size - this.uploadedBytes) / speed;

    const progress: UploadProgress = {
      loaded: this.uploadedBytes,
      total: this.file.size,
      percentage,
      speed,
      timeRemaining: isFinite(timeRemaining) ? timeRemaining : 0,
    };

    this.options.onProgress(progress);
  }
}

/**
 * Semáforo para controle de concorrência
 */
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }
}

/**
 * Utilitários para formatação
 */
export class UploadUtils {
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '--';
    
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    return `${minutes}m ${remainingSeconds}s`;
  }

  static formatSpeed(bytesPerSecond: number): string {
    return `${this.formatFileSize(bytesPerSecond)}/s`;
  }
}
