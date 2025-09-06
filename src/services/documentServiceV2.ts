/**
 * DocumentService melhorado com adapters, validação e error handling
 */

import type { FileItem } from '@/types';
import { getDataAdapter } from '@/adapters';
import { withErrorHandling } from '@/lib/errors';
import { logger, PerformanceMonitor } from '@/lib/logger';
import { validateData, CreateDocumentSchema, UpdateDocumentSchema, DocumentFiltersSchema } from '@/lib/validations';
import { FileProcessor, ChunkedUploader, type UploadProgress } from '@/lib/uploadManager';

export class DocumentServiceV2 {
  private static adapter = getDataAdapter().documents;

  /**
   * Upload de arquivo com processamento avançado
   */
  static async uploadFile(
    file: File,
    folderPath: string,
    options: {
      onProgress?: (progress: UploadProgress) => void;
      compress?: boolean;
      useChunks?: boolean;
    } = {}
  ): Promise<string> {
    return withErrorHandling(async () => {
      const operation = `uploadFile-${file.name}`;
      PerformanceMonitor.startTimer(operation);

      // Validar arquivo
      const validation = FileProcessor.validateFile(file, {
        maxSize: 100 * 1024 * 1024, // 100MB
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      logger.info('Starting file upload', {
        fileName: file.name,
        size: file.size,
        type: file.type,
        compress: options.compress,
        useChunks: options.useChunks,
      }, 'DocumentServiceV2');

      let processedFile = file;

      // Comprimir imagem se solicitado
      if (options.compress && file.type.startsWith('image/')) {
        processedFile = await FileProcessor.compressImage(file, {
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1080,
        });

        logger.info('File compressed', {
          originalSize: file.size,
          compressedSize: processedFile.size,
          compressionRatio: ((file.size - processedFile.size) / file.size * 100).toFixed(2) + '%'
        }, 'DocumentServiceV2');
      }

      // Upload com chunks para arquivos grandes
      if (options.useChunks && processedFile.size > 10 * 1024 * 1024) { // > 10MB
        const uploader = new ChunkedUploader(processedFile, {
          chunkSize: 5 * 1024 * 1024, // 5MB chunks
          concurrency: 3,
          onProgress: options.onProgress,
        });

        const chunkResults = await uploader.upload(async (chunk, index, total) => {
          // Simular upload de chunk (implementar com adapter real)
          return `chunk-${index}-${Date.now()}`;
        });

        logger.info('Chunked upload completed', {
          fileName: processedFile.name,
          chunks: chunkResults.length,
        }, 'DocumentServiceV2');

        PerformanceMonitor.endTimer(operation);
        return chunkResults.join('|'); // Combinar chunks
      }

      // Upload normal
      const result = await this.adapter.uploadFile(
        processedFile, 
        folderPath, 
        options.onProgress ? (progress) => {
          options.onProgress!({
            loaded: (progress / 100) * processedFile.size,
            total: processedFile.size,
            percentage: progress,
            speed: 0, // Calculado pelo ChunkedUploader
            timeRemaining: 0,
          });
        } : undefined
      );

      PerformanceMonitor.endTimer(operation);
      logger.info('File upload completed', { path: result }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.uploadFile');
  }

  /**
   * Criar documento com validação completa
   */
  static async createDocument(documentData: {
    name: string;
    mimeType: string;
    size: number;
    clientId: string;
    caseId: string;
    folderId?: string;
    type: string;
    docNumber?: string;
    description?: string;
    supabaseStoragePath: string;
  }): Promise<FileItem> {
    return withErrorHandling(async () => {
      // Validar dados de entrada
      const validData = validateData(CreateDocumentSchema, documentData);
      
      PerformanceMonitor.startTimer('createDocument');
      
      logger.info('Creating document', { 
        name: validData.name, 
        clientId: validData.clientId,
        caseId: validData.caseId,
      }, 'DocumentServiceV2');

      const result = await this.adapter.createDocument(validData);
      
      PerformanceMonitor.endTimer('createDocument');
      logger.info('Document created successfully', { id: result.id }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.createDocument');
  }

  /**
   * Buscar documentos com filtros validados
   */
  static async getDocuments(filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
    type?: string;
    dateRange?: { start: string; end: string };
    sizeRange?: { min: number; max: number };
  }): Promise<FileItem[]> {
    return withErrorHandling(async () => {
      // Validar filtros se fornecidos
      if (filters) {
        validateData(DocumentFiltersSchema, filters);
      }

      PerformanceMonitor.startTimer('getDocuments');
      
      logger.debug('Fetching documents', { filters }, 'DocumentServiceV2');

      const result = await this.adapter.getDocuments(filters);
      
      PerformanceMonitor.endTimer('getDocuments');
      logger.debug('Documents fetched', { count: result.length }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.getDocuments');
  }

  /**
   * Buscar documento por ID
   */
  static async getDocumentById(id: string): Promise<FileItem | null> {
    return withErrorHandling(async () => {
      if (!id) throw new Error('ID do documento é obrigatório');

      PerformanceMonitor.startTimer('getDocumentById');
      
      logger.debug('Fetching document by ID', { id }, 'DocumentServiceV2');

      const result = await this.adapter.getDocumentById(id);
      
      PerformanceMonitor.endTimer('getDocumentById');
      logger.debug('Document fetched by ID', { id, found: !!result }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.getDocumentById');
  }

  /**
   * Atualizar documento
   */
  static async updateDocument(
    id: string,
    updates: Partial<{
      name: string;
      docNumber: string;
      description: string;
      folderId: string;
    }>
  ): Promise<FileItem> {
    return withErrorHandling(async () => {
      if (!id) throw new Error('ID do documento é obrigatório');
      
      // Validar dados de atualização
      const validUpdates = validateData(UpdateDocumentSchema, updates);

      PerformanceMonitor.startTimer('updateDocument');
      
      logger.info('Updating document', { id, updates: Object.keys(validUpdates) }, 'DocumentServiceV2');

      const result = await this.adapter.updateDocument(id, validUpdates);
      
      PerformanceMonitor.endTimer('updateDocument');
      logger.info('Document updated successfully', { id }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.updateDocument');
  }

  /**
   * Deletar documento
   */
  static async deleteDocument(id: string): Promise<void> {
    return withErrorHandling(async () => {
      if (!id) throw new Error('ID do documento é obrigatório');

      PerformanceMonitor.startTimer('deleteDocument');
      
      logger.info('Deleting document', { id }, 'DocumentServiceV2');

      await this.adapter.deleteDocument(id);
      
      PerformanceMonitor.endTimer('deleteDocument');
      logger.info('Document deleted successfully', { id }, 'DocumentServiceV2');
    }, 'DocumentServiceV2.deleteDocument');
  }

  /**
   * Buscar documentos por texto
   */
  static async searchDocuments(
    query: string,
    filters?: {
      clientId?: string;
      caseId?: string;
      folderId?: string;
    }
  ): Promise<FileItem[]> {
    return withErrorHandling(async () => {
      if (!query || query.length < 2) {
        throw new Error('Consulta deve ter pelo menos 2 caracteres');
      }

      PerformanceMonitor.startTimer('searchDocuments');
      
      logger.debug('Searching documents', { query, filters }, 'DocumentServiceV2');

      const result = await this.adapter.searchDocuments(query, filters);
      
      PerformanceMonitor.endTimer('searchDocuments');
      logger.debug('Document search completed', { query, results: result.length }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.searchDocuments');
  }

  /**
   * Gerar URL de download
   */
  static async getDownloadUrl(documentId: string, expiresIn: number = 3600): Promise<string> {
    return withErrorHandling(async () => {
      if (!documentId) throw new Error('ID do documento é obrigatório');

      PerformanceMonitor.startTimer('getDownloadUrl');
      
      logger.debug('Generating download URL', { documentId, expiresIn }, 'DocumentServiceV2');

      const result = await this.adapter.getDownloadUrl(documentId, expiresIn);
      
      PerformanceMonitor.endTimer('getDownloadUrl');
      logger.debug('Download URL generated', { documentId }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.getDownloadUrl');
  }

  /**
   * Gerar próximo número de documento
   */
  static async getNextDocNumber(clientId: string): Promise<string> {
    return withErrorHandling(async () => {
      if (!clientId) throw new Error('ID do cliente é obrigatório');

      PerformanceMonitor.startTimer('getNextDocNumber');
      
      logger.debug('Generating next doc number', { clientId }, 'DocumentServiceV2');

      const result = await this.adapter.getNextDocNumber(clientId);
      
      PerformanceMonitor.endTimer('getNextDocNumber');
      logger.debug('Next doc number generated', { clientId, docNumber: result }, 'DocumentServiceV2');
      
      return result;
    }, 'DocumentServiceV2.getNextDocNumber');
  }

  /**
   * Upload inteligente com detecção automática
   */
  static async smartUpload(
    file: File,
    folderPath: string,
    documentData: Omit<Parameters<typeof this.createDocument>[0], 'supabaseStoragePath'>,
    options: {
      onProgress?: (progress: UploadProgress) => void;
      autoCompress?: boolean;
      autoDetectType?: boolean;
    } = {}
  ): Promise<FileItem> {
    return withErrorHandling(async () => {
      const operation = `smartUpload-${file.name}`;
      PerformanceMonitor.startTimer(operation);

      logger.info('Starting smart upload', {
        fileName: file.name,
        size: file.size,
        autoCompress: options.autoCompress,
        autoDetectType: options.autoDetectType,
      }, 'DocumentServiceV2');

      // Auto-detectar tipo se solicitado
      let finalDocumentData = { ...documentData };
      if (options.autoDetectType) {
        finalDocumentData.type = FileProcessor.detectFileType(file);
      }

      // Auto-comprimir imagens se solicitado
      const shouldCompress = options.autoCompress && 
                            file.type.startsWith('image/') && 
                            file.size > 1024 * 1024; // > 1MB

      // Upload do arquivo
      const storagePath = await this.uploadFile(folderPath, file, {
        onProgress: options.onProgress,
        compress: shouldCompress,
        useChunks: file.size > 10 * 1024 * 1024, // > 10MB
      });

      // Criar documento no banco
      const result = await this.createDocument({
        ...finalDocumentData,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        supabaseStoragePath: storagePath,
      });

      PerformanceMonitor.endTimer(operation);
      logger.info('Smart upload completed', { 
        id: result.id, 
        fileName: result.name 
      }, 'DocumentServiceV2');

      return result;
    }, 'DocumentServiceV2.smartUpload');
  }
}

// Manter compatibilidade com o service antigo
export { DocumentServiceV2 as DocumentService };
