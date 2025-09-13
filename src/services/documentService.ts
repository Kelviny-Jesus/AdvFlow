import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FileItem } from "@/types";
import { withErrorHandling } from "@/lib/errors";
import { logger, PerformanceMonitor } from "@/lib/logger";
import { validateData, CreateDocumentSchema, UpdateDocumentSchema } from "@/lib/validations";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export class DocumentService {
  /**
   * Upload de arquivo para o Supabase Storage
   */
  static async uploadFile(
    file: File,
    folderPath: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return withErrorHandling(async () => {
      const operation = `uploadFile-${file.name}`;
      PerformanceMonitor.startTimer(operation);

      // Validar arquivo
      if (file.size > 100 * 1024 * 1024) { // 100MB
        throw new Error('Arquivo muito grande. Máximo: 100MB');
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${folderPath}/${fileName}`;

      logger.info('Starting file upload', {
        fileName: file.name,
        size: file.size,
        path: filePath,
      }, 'DocumentService');

      // Upload real para o storage
      const { data, error } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Simular progresso se callback fornecido
      if (onProgress) {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          if (progress >= 100) {
            clearInterval(interval);
            progress = 100;
          }
          onProgress(progress);
        }, 200);
      }

      PerformanceMonitor.endTimer(operation);
      logger.info('File upload completed', { path: data.path }, 'DocumentService');
      
      return data.path;
    }, 'DocumentService.uploadFile');
  }

  /**
   * Criar documento no banco de dados
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
    extractedData?: string | null;
  }): Promise<FileItem> {
    return withErrorHandling(async () => {
      // Validar dados de entrada
      const validData = validateData(CreateDocumentSchema, documentData);
      
      PerformanceMonitor.startTimer('createDocument');
      
      logger.info('Creating document', { 
        name: validData.name, 
        clientId: validData.clientId,
        caseId: validData.caseId,
      }, 'DocumentService');

      // Criação real no Supabase
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      // Gerar URLs do Supabase Storage
      const { data: publicUrl } = supabase.storage
        .from("documents")
        .getPublicUrl(validData.supabaseStoragePath);

      const insertData: DocumentInsert = {
        name: validData.name,
        mime_type: validData.mimeType,
        size: validData.size,
        client_id: validData.clientId || null,
        case_id: validData.caseId || null,
        folder_id: validData.folderId || null,
        type: validData.type,
        doc_number: validData.docNumber || null,
        description: validData.description || null,
        supabase_storage_path: validData.supabaseStoragePath,
        web_view_link: publicUrl.publicUrl,
        download_link: publicUrl.publicUrl,
        extracted_data: documentData.extractedData || null,
        status: "completed",
        user_id: user.user.id,
      };

      const { data, error } = await supabase
        .from("documents")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const result = this.mapDocumentRowToFileItem(data);
      
      PerformanceMonitor.endTimer('createDocument');
      logger.info('Document created successfully', { id: result.id }, 'DocumentService');
      
      return result;
    }, 'DocumentService.createDocument');
  }

  /**
   * Buscar documentos
   */
  static async getDocuments(filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
    type?: string;
  }): Promise<FileItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    let query = supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.user.id)
      .eq("status", "completed");

    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.folderId) {
      query = query.eq("folder_id", filters.folderId);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(this.mapDocumentRowToFileItem);
  }

  /**
   * Buscar documento por ID
   */
  static async getDocumentById(id: string): Promise<FileItem | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return this.mapDocumentRowToFileItem(data);
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
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const updateData: DocumentUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.docNumber !== undefined && { doc_number: updates.docNumber || null }),
      ...(updates.description !== undefined && { description: updates.description || null }),
      ...(updates.folderId !== undefined && { folder_id: updates.folderId || null }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.user.id)
      .select()
      .single();

    if (error) throw error;

    return this.mapDocumentRowToFileItem(data);
  }

  /**
   * Deletar documento
   */
  static async deleteDocument(id: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    // Buscar o documento para obter o caminho do storage
    const document = await this.getDocumentById(id);
    if (!document) throw new Error("Documento não encontrado");

    // Deletar do storage se existir
    if (document.appProperties?.supabaseStoragePath) {
      await supabase.storage
        .from("documents")
        .remove([document.appProperties.supabaseStoragePath]);
    }

    // Marcar como deletado no banco (soft delete)
    const { error } = await supabase
      .from("documents")
      .update({ status: "deleted", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.user.id);

    if (error) throw error;
  }

  /**
   * Buscar documentos por nome
   */
  static async searchDocuments(query: string, filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
  }): Promise<FileItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    let supabaseQuery = supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.user.id)
      .eq("status", "active")
      .ilike("name", `%${query}%`);

    if (filters?.clientId) {
      supabaseQuery = supabaseQuery.eq("client_id", filters.clientId);
    }
    if (filters?.caseId) {
      supabaseQuery = supabaseQuery.eq("case_id", filters.caseId);
    }
    if (filters?.folderId) {
      supabaseQuery = supabaseQuery.eq("folder_id", filters.folderId);
    }

    const { data, error } = await supabaseQuery.order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(this.mapDocumentRowToFileItem);
  }

  /**
   * Gerar URL de download temporária
   */
  static async getDownloadUrl(
    documentId: string,
    expiresIn: number = 3600,
    downloadFileName?: string
  ): Promise<string> {
    const document = await this.getDocumentById(documentId);
    if (!document?.appProperties?.supabaseStoragePath) {
      throw new Error("Caminho do arquivo não encontrado");
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.appProperties.supabaseStoragePath, expiresIn, {
        // Se fornecido, força o header Content-Disposition para baixar com este nome
        download: downloadFileName,
      });

    if (error) throw error;

    return data.signedUrl;
  }

  /**
   * Gerar próximo número de documento para um cliente
   */
  static async getNextDocNumber(clientId: string): Promise<string> {
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "completed");

    if (error) throw error;

    const nextNumber = (count || 0) + 1;
    return `DOC n. ${String(nextNumber).padStart(3, "0")}`;
  }

  /**
   * Mapear dados do banco para o tipo FileItem
   */
  private static mapDocumentRowToFileItem(row: DocumentRow): FileItem {
    return {
      id: row.id,
      name: row.name,
      docNumber: row.doc_number || undefined,
      mimeType: row.mime_type,
      size: row.size,
      clientId: row.client_id,
      caseId: row.case_id,
      type: row.type as FileItem["type"],
      webViewLink: row.web_view_link || undefined,
      downloadLink: row.download_link || undefined,
      thumbnailLink: row.thumbnail_link || undefined,
      createdAt: row.created_at,
      modifiedAt: row.updated_at,
      description: row.description || undefined,
      extractedData: row.extracted_data || undefined,
      appProperties: {
        ...((row.app_properties as Record<string, string>) || {}),
        folderId: row.folder_id || undefined,
        supabaseStoragePath: row.supabase_storage_path || undefined,
      },
    };
  }
}