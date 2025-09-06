import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface ExtractionRequest {
  fileUrl: string;
  mimeType: string;
  fileName: string;
  documentId: string;
}

interface ExtractionResponse {
  success: boolean;
  extractedData?: string;
  error?: string;
}

class ExtractionService {
  private readonly WEBHOOK_URL = 'https://primary-production-f2257.up.railway.app/webhook/entrada-documentos';
  private readonly TIMEOUT = 60000; // 60 segundos

  /**
   * Envia documento para extração via webhook n8n
   */
  async extractDocumentData(request: ExtractionRequest): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      logger.info('Iniciando extração de dados', {
        documentId: request.documentId,
        fileName: request.fileName,
        mimeType: request.mimeType,
        fileUrl: request.fileUrl
      });

      // Preparar payload para o webhook
      const payload = {
        fileUrl: request.fileUrl,
        mimeType: request.mimeType,
        fileName: request.fileName,
        documentId: request.documentId,
        timestamp: new Date().toISOString()
      };

      // Fazer requisição para o webhook
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DocFlow-AI/1.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(
          `Webhook retornou status ${response.status}: ${response.statusText}`,
          'EXTRACTION_ERROR'
        );
      }

      // Ler resposta como texto
      const extractedData = await response.text();

      const duration = Date.now() - startTime;
      
      logger.info('Extração concluída com sucesso', {
        documentId: request.documentId,
        duration,
        extractedDataLength: extractedData.length
      });

      return extractedData.trim() || null;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Timeout na extração de dados', {
          documentId: request.documentId,
          duration,
          timeout: this.TIMEOUT
        });
        throw new AppError('Timeout na extração de dados', 'EXTRACTION_TIMEOUT');
      }

      logger.error('Erro na extração de dados', {
        documentId: request.documentId,
        duration,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Não falhar o upload por causa da extração
      // Retorna null para indicar que a extração falhou
      return null;
    }
  }

  /**
   * Tenta reprocessar extração de um documento existente
   */
  async reprocessDocument(documentId: string, fileUrl: string, mimeType: string, fileName: string): Promise<string | null> {
    return this.extractDocumentData({
      documentId,
      fileUrl,
      mimeType,
      fileName
    });
  }

  /**
   * Verifica se o tipo de arquivo é suportado para extração
   */
  isSupportedMimeType(mimeType: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'text/html',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];

    return supportedTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Obtém status da extração baseado no extracted_data
   */
  getExtractionStatus(extractedData: string | null): 'pending' | 'completed' | 'failed' | 'not_supported' {
    if (extractedData === null) return 'failed';
    if (extractedData === '') return 'pending';
    if (extractedData.trim().length > 0) return 'completed';
    return 'failed';
  }
}

export const extractionService = new ExtractionService();
export type { ExtractionRequest, ExtractionResponse };
