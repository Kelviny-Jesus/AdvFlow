import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import type { TrainingDocument, TrainingDocumentInsert, StructureMetadata } from '@/types/training';

class TrainingDocumentsService {
  /**
   * Listar documentos de treinamento do usuário
   */
  async listUserTrainingDocuments(
    userId: string,
    documentType?: string,
    documentSubtype?: string
  ): Promise<TrainingDocument[]> {
    try {
      let query = (supabase as any)
        .from('training_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      if (documentSubtype) {
        query = query.eq('document_subtype', documentSubtype);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as TrainingDocument[];
    } catch (error) {
      logger.error('Failed to list training documents', error as Error, { userId, documentType, documentSubtype }, 'TrainingDocumentsService');
      throw error;
    }
  }

  /**
   * Obter documento de treinamento por ID
   */
  async getTrainingDocument(id: string): Promise<TrainingDocument | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('training_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data as TrainingDocument | null;
    } catch (error) {
      logger.error('Failed to get training document', error as Error, { id }, 'TrainingDocumentsService');
      throw error;
    }
  }

  /**
   * Sanitizar nome de arquivo removendo caracteres especiais
   */
  private sanitizeFileName(fileName: string): string {
    const nameParts = fileName.split('.');
    const ext = nameParts.pop();
    const name = nameParts.join('.');
    
    // Remove acentos e caracteres especiais
    const sanitized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/[^a-z0-9-]/g, ''); // Remove caracteres especiais
    
    return ext ? `${sanitized}.${ext}` : sanitized;
  }

  /**
   * Upload de documento de treinamento para o storage
   */
  async uploadTrainingFile(file: File, userId: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = this.sanitizeFileName(file.name);
      const path = `${userId}/training/${timestamp}-${sanitizedFileName}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      return path;
    } catch (error) {
      logger.error('Failed to upload training file', error as Error, { userId, fileName: file.name }, 'TrainingDocumentsService');
      throw new AppError('Erro ao fazer upload do arquivo', 500);
    }
  }

  /**
   * Extrair texto de arquivo (usa OCR se necessário)
   */
  async extractTextFromFile(filePath: string): Promise<string> {
    try {
      // Obter URL pública do arquivo
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) {
        throw new AppError('Erro ao obter URL do arquivo', 500);
      }

      // Se for PDF, tentar extrair texto
      if (filePath.toLowerCase().endsWith('.pdf')) {
        // TODO: Implementar extração de texto de PDF
        // Por enquanto, retornar placeholder
        return '[Conteúdo do PDF - Extração em desenvolvimento]';
      }

      // Se for imagem, usar OCR
      if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
        // TODO: Implementar OCR via backend
        // Por enquanto, retornar placeholder
        return '[Conteúdo da imagem - OCR em desenvolvimento]';
      }

      // Se for texto puro, baixar e retornar
      if (filePath.match(/\.(txt|md)$/i)) {
        const response = await fetch(data.publicUrl);
        return await response.text();
      }

      return '[Tipo de arquivo não suportado para extração automática]';
    } catch (error) {
      logger.error('Failed to extract text from file', error as Error, { filePath }, 'TrainingDocumentsService');
      throw error;
    }
  }

  /**
   * Analisar estrutura do documento usando IA (opcional para MVP)
   */
  async analyzeDocumentStructure(
    content: string,
    documentType: string,
    documentSubtype?: string
  ): Promise<StructureMetadata> {
    try {
      // TODO: Implementar análise estrutural com OpenAI
      // Por enquanto, retornar estrutura básica
      const basicStructure: StructureMetadata = {
        sections: [],
        style: 'formal',
        common_clauses: [],
        formatting_patterns: {},
        key_phrases: []
      };

      logger.info('Document structure analyzed (basic)', { documentType, documentSubtype }, 'TrainingDocumentsService');

      return basicStructure;
    } catch (error) {
      logger.error('Failed to analyze document structure', error as Error, { documentType, documentSubtype }, 'TrainingDocumentsService');
      // Retornar estrutura vazia em caso de erro
      return {};
    }
  }

  /**
   * Gerar embedding para busca semântica (opcional para MVP)
   */
  async generateEmbedding(content: string): Promise<number[] | null> {
    try {
      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured, skipping embedding generation', {}, 'TrainingDocumentsService');
        return null;
      }

      // Limitar conteúdo para não exceder limite da API
      const truncatedContent = content.substring(0, 8000);

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: truncatedContent,
        }),
      });

      if (!response.ok) {
        throw new AppError('Erro ao gerar embedding', response.status);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', error as Error, {}, 'TrainingDocumentsService');
      // Retornar null em caso de erro (não é crítico para MVP)
      return null;
    }
  }

  /**
   * Criar documento de treinamento completo
   */
  async createTrainingDocument(
    file: File,
    userId: string,
    documentType: string,
    documentSubtype?: string,
    extractedContent?: string
  ): Promise<TrainingDocument> {
    try {
      logger.info('Creating training document', { userId, documentType, documentSubtype, fileName: file.name }, 'TrainingDocumentsService');

      // 1. Upload do arquivo
      const filePath = await this.uploadTrainingFile(file, userId);

      // 2. Extrair texto (se não fornecido)
      let content = extractedContent;
      if (!content) {
        content = await this.extractTextFromFile(filePath);
      }

      // 3. Analisar estrutura
      const structureMetadata = await this.analyzeDocumentStructure(
        content,
        documentType,
        documentSubtype
      );

      // 4. Gerar embedding (opcional)
      const embedding = await this.generateEmbedding(content);

      // 5. Salvar no banco
      const insertData: TrainingDocumentInsert = {
        user_id: userId,
        document_type: documentType,
        document_subtype: documentSubtype,
        file_name: file.name,
        file_path: filePath,
        extracted_content: content,
        structure_metadata: structureMetadata,
        embedding: embedding
      };

      const { data, error } = await (supabase as any)
        .from('training_documents')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      logger.info('Training document created successfully', { id: data.id, userId, documentType }, 'TrainingDocumentsService');

      return data as TrainingDocument;
    } catch (error) {
      logger.error('Failed to create training document', error as Error, { userId, documentType, documentSubtype }, 'TrainingDocumentsService');
      throw error;
    }
  }

  /**
   * Atualizar documento de treinamento
   */
  async updateTrainingDocument(
    id: string,
    updates: Partial<Pick<TrainingDocument, 'document_type' | 'document_subtype' | 'is_active' | 'extracted_content' | 'structure_metadata'>>
  ): Promise<TrainingDocument> {
    try {
      const { data, error } = await (supabase as any)
        .from('training_documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data as TrainingDocument;
    } catch (error) {
      logger.error('Failed to update training document', error as Error, { id }, 'TrainingDocumentsService');
      throw error;
    }
  }

  /**
   * Desativar documento de treinamento (soft delete)
   */
  async deleteTrainingDocument(id: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('training_documents')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      logger.info('Training document deleted', { id }, 'TrainingDocumentsService');
    } catch (error) {
      logger.error('Failed to delete training document', error as Error, { id }, 'TrainingDocumentsService');
      throw error;
    }
  }

  /**
   * Buscar documentos de treinamento relevantes para geração
   */
  async getRelevantTrainingDocuments(
    userId: string,
    documentType: string,
    documentSubtype?: string,
    limit: number = 3
  ): Promise<TrainingDocument[]> {
    try {
      let query = (supabase as any)
        .from('training_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('document_type', documentType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (documentSubtype) {
        query = query.eq('document_subtype', documentSubtype);
      }

      const { data, error } = await query;

      if (error) throw error;

      logger.info('Retrieved relevant training documents', { 
        userId, 
        documentType, 
        documentSubtype, 
        count: data?.length || 0 
      }, 'TrainingDocumentsService');

      return (data || []) as TrainingDocument[];
    } catch (error) {
      logger.error('Failed to get relevant training documents', error as Error, { 
        userId, 
        documentType, 
        documentSubtype 
      }, 'TrainingDocumentsService');
      throw error;
    }
  }
}

export const trainingDocumentsService = new TrainingDocumentsService();

