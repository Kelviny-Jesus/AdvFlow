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

      console.log('📤 Enviando para n8n webhook:', this.WEBHOOK_URL);
      console.log('📋 Payload:', JSON.stringify(payload, null, 2));

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
          500
        );
      }

      // Ler resposta como texto
      const extractedData = await response.text();

      const duration = Date.now() - startTime;
      
      console.log('✅ Resposta do n8n recebida!');
      console.log('📊 Tamanho da resposta:', extractedData.length, 'caracteres');
      console.log('⏱️ Tempo de processamento:', duration, 'ms');
      
      logger.info('Extração concluída com sucesso', {
        documentId: request.documentId,
        duration,
        extractedDataLength: extractedData.length
      });

      return extractedData.trim() || null;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Timeout na extração de dados', new Error('Timeout na extração de dados'), {
          documentId: request.documentId,
          duration,
          timeout: this.TIMEOUT
        });
        throw new AppError('Timeout na extração de dados', 408);
      }

      logger.error('Erro na extração de dados', new Error(error instanceof Error ? error.message : 'Erro desconhecido'), {
        documentId: request.documentId,
        duration,
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
      // Documentos
      'application/pdf',
      'text/plain',
      'text/html',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      
      // Imagens
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/gif',
      'image/bmp',
      'image/webp',
      
      // Áudio
      'audio/mpeg',        // MP3
      'audio/mp3',         // MP3 (alternativo)
      'audio/wav',         // WAV
      'audio/ogg',         // OGG
      'audio/opus',        // OPUS
      'audio/m4a',         // M4A
      'audio/aac',         // AAC
      'audio/flac',        // FLAC
      'audio/webm',        // WebM Audio
      
      // Vídeo
      'video/mp4',         // MP4
      'video/avi',         // AVI
      'video/mov',         // MOV
      'video/wmv',         // WMV
      'video/webm',        // WebM Video
      'video/quicktime'    // QuickTime
    ];

    const isSupported = supportedTypes.includes(mimeType.toLowerCase());
    
    console.log('🔍 Verificando tipo de arquivo:', mimeType, '| Suportado:', isSupported);
    
    return isSupported;
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
