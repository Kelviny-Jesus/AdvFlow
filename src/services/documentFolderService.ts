/**
 * Service para gerenciar documentos e suas relações com pastas
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FileItem, FolderItem } from "@/types";
import { withErrorHandling } from "@/lib/errors";
import { logger, PerformanceMonitor } from "@/lib/logger";
import { detectFileType } from "@/utils/fileUtils";
import { extractionService } from "./extractionService";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];

export class DocumentFolderService {
  /**
   * Upload de arquivo e criação de documento com relacionamento correto
   */
  static async uploadDocumentToFolder(
    file: File,
    folder: FolderItem,
    onProgress?: (progress: number) => void
  ): Promise<FileItem> {
    return withErrorHandling(async () => {
      const operation = `uploadDocumentToFolder-${file.name}`;
      PerformanceMonitor.startTimer(operation);

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      logger.info('Starting document upload to folder', {
        fileName: file.name,
        fileSize: file.size,
        folderId: folder.id,
        folderName: folder.name,
        folderKind: folder.kind,
      }, 'DocumentFolderService');

      // 1. Gerar nome único para o arquivo
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}-${sanitizedFileName}`;

      // 2. Definir caminho no storage baseado na hierarquia da pasta
      const storagePath = this.generateStoragePath(folder, uniqueFileName);
      
      logger.info('Generated storage path', { storagePath }, 'DocumentFolderService');

      // 3. Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        logger.error('Storage upload failed', uploadError, { storagePath }, 'DocumentFolderService');
        throw uploadError;
      }

      // Simular progresso
      if (onProgress) {
        onProgress(50);
      }

      // 4. Gerar URLs públicas
      const { data: publicUrl } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);

      // URL para download direto
      const { data: downloadUrl } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600); // 1 hora de validade

      // 5. Gerar número do documento
      const docNumber = await this.generateDocumentNumber(folder);

      // 6. Criar registro no banco de dados
      // Se não temos case_id, criar um caso padrão para a pasta
      let finalCaseId = folder.caseId;
      let finalClientId = folder.clientId;

      if (!finalCaseId && folder.kind === 'client') {
        // Para pastas de cliente sem caso, criar um caso padrão
        const defaultCase = await this.createDefaultCaseForClient(folder);
        finalCaseId = defaultCase.id;
        finalClientId = defaultCase.clientId;
      } else if (!finalCaseId && !finalClientId) {
        // Para outras situações, usar IDs padrão
        const defaultIds = await this.getOrCreateDefaultIds(user.user.id);
        finalClientId = defaultIds.clientId;
        finalCaseId = defaultIds.caseId;
      }

      const documentData: DocumentInsert = {
        name: file.name,
        mime_type: file.type,
        size: file.size,
        client_id: finalClientId,
        case_id: finalCaseId,
        folder_id: folder.id,
        type: detectFileType(file.name),
        doc_number: docNumber,
        supabase_storage_path: storagePath,
        web_view_link: publicUrl.publicUrl,
        download_link: downloadUrl?.signedUrl || publicUrl.publicUrl,
        status: "completed",
        user_id: user.user.id,
      };

      const { data: documentRecord, error: dbError } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();

      if (dbError) {
        // Limpar arquivo do storage se falhou no banco
        await supabase.storage.from("documents").remove([storagePath]);
        logger.error('Database insert failed', dbError, { documentData }, 'DocumentFolderService');
        throw dbError;
      }

      if (onProgress) {
        onProgress(100);
      }

      // 7. Mapear para FileItem
      const result = this.mapDocumentRowToFileItem(documentRecord);

      // 8. Iniciar extração de dados (processo assíncrono)
      this.processDocumentExtraction(result, publicUrl.publicUrl, file.type)
        .catch(error => {
          logger.error('Failed to process document extraction', {
            documentId: result.id,
            error: error.message
          }, 'DocumentFolderService');
        });

      PerformanceMonitor.endTimer(operation);
      logger.info('Document uploaded successfully', {
        id: result.id,
        name: result.name,
        folderId: folder.id,
        storagePath,
      }, 'DocumentFolderService');

      return result;
    }, 'DocumentFolderService.uploadDocumentToFolder');
  }

  /**
   * Buscar documentos de uma pasta específica
   */
  static async getDocumentsByFolder(folderId: string): Promise<FileItem[]> {
    return withErrorHandling(async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      logger.info('Fetching documents by folder', { folderId }, 'DocumentFolderService');

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("folder_id", folderId)
        .eq("user_id", user.user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const documents = data.map(this.mapDocumentRowToFileItem);
      
      logger.info('Documents fetched successfully', { 
        count: documents.length,
        folderId 
      }, 'DocumentFolderService');

      return documents;
    }, 'DocumentFolderService.getDocumentsByFolder');
  }

  /**
   * Processar extração de dados do documento via webhook
   */
  private static async processDocumentExtraction(
    document: FileItem,
    fileUrl: string,
    mimeType: string
  ): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Starting document extraction', {
        documentId: document.id,
        fileName: document.name,
        mimeType,
        fileUrl
      }, 'DocumentFolderService');

      // Verificar se o tipo de arquivo é suportado
      if (!extractionService.isSupportedMimeType(mimeType)) {
        logger.info('Document type not supported for extraction', {
          documentId: document.id,
          mimeType
        }, 'DocumentFolderService');
        return;
      }

      // Chamar o serviço de extração
      const extractedData = await extractionService.extractDocumentData({
        documentId: document.id,
        fileName: document.name,
        fileUrl,
        mimeType
      });

      // Atualizar documento com os dados extraídos
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        logger.error('User not authenticated during extraction update', {
          documentId: document.id
        }, 'DocumentFolderService');
        return;
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          extracted_data: extractedData,
          updated_at: new Date().toISOString()
        })
        .eq("id", document.id)
        .eq("user_id", user.user.id);

      if (updateError) {
        logger.error('Failed to update document with extracted data', {
          documentId: document.id,
          error: updateError.message
        }, 'DocumentFolderService');
        throw updateError;
      }

      logger.info('Document extraction completed successfully', {
        documentId: document.id,
        extractedDataLength: extractedData?.length || 0,
        hasData: !!extractedData
      }, 'DocumentFolderService');

    }, 'DocumentFolderService.processDocumentExtraction');
  }

  /**
   * Gerar caminho no storage baseado na hierarquia da pasta
   */
  private static generateStoragePath(folder: FolderItem, fileName: string): string {
    const sanitizedFolderName = folder.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    switch (folder.kind) {
      case 'client':
        return `clients/${sanitizedFolderName}/${fileName}`;
      
      case 'case':
        // Para casos, incluir o nome do cliente se disponível
        const clientPath = folder.path?.split('/')[0] || 'unknown_client';
        const sanitizedClientPath = clientPath.replace(/[^a-zA-Z0-9-_]/g, '_');
        return `clients/${sanitizedClientPath}/cases/${sanitizedFolderName}/${fileName}`;
      
      case 'subfolder':
        // Para subpastas, usar o path completo
        const pathParts = folder.path?.split('/') || [folder.name];
        const sanitizedPath = pathParts.map(part => part.replace(/[^a-zA-Z0-9-_]/g, '_')).join('/');
        return `folders/${sanitizedPath}/${fileName}`;
      
      default:
        return `general/${fileName}`;
    }
  }

  /**
   * Gerar número sequencial do documento
   */
  private static async generateDocumentNumber(folder: FolderItem): Promise<string> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    // Contar documentos existentes na pasta
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", folder.id)
      .eq("user_id", user.user.id);

    const nextNumber = (count || 0) + 1;
    const folderPrefix = folder.name.substring(0, 3).toUpperCase();
    
    return `${folderPrefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Criar caso padrão para uma pasta de cliente
   */
  private static async createDefaultCaseForClient(folder: FolderItem): Promise<{id: string, clientId: string}> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    if (!folder.clientId) {
      throw new Error("Pasta de cliente deve ter clientId");
    }

    // Criar caso padrão
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .insert({
        name: `Documentos Gerais - ${folder.name}`,
        client_id: folder.clientId,
        description: "Caso criado automaticamente para documentos gerais",
        status: "active",
        user_id: user.user.id,
      })
      .select()
      .single();

    if (caseError) throw caseError;

    return {
      id: caseData.id,
      clientId: caseData.client_id,
    };
  }

  /**
   * Obter ou criar IDs padrão para documentos órfãos
   */
  private static async getOrCreateDefaultIds(userId: string): Promise<{clientId: string, caseId: string}> {
    // Buscar cliente padrão
    let { data: defaultClient, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("name", "Documentos Gerais")
      .eq("user_id", userId)
      .single();

    if (clientError || !defaultClient) {
      // Criar cliente padrão
      const { data: newClient, error: createClientError } = await supabase
        .from("clients")
        .insert({
          name: "Documentos Gerais",
          user_id: userId,
        })
        .select()
        .single();

      if (createClientError) throw createClientError;
      defaultClient = newClient;
    }

    // Buscar caso padrão
    let { data: defaultCase, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("name", "Caso Geral")
      .eq("client_id", defaultClient.id)
      .eq("user_id", userId)
      .single();

    if (caseError || !defaultCase) {
      // Criar caso padrão
      const { data: newCase, error: createCaseError } = await supabase
        .from("cases")
        .insert({
          name: "Caso Geral",
          client_id: defaultClient.id,
          description: "Caso criado automaticamente para documentos gerais",
          status: "active",
          user_id: userId,
        })
        .select()
        .single();

      if (createCaseError) throw createCaseError;
      defaultCase = newCase;
    }

    return {
      clientId: defaultClient.id,
      caseId: defaultCase.id,
    };
  }

  /**
   * Mapear DocumentRow para FileItem
   */
  private static mapDocumentRowToFileItem(row: DocumentRow): FileItem {
    return {
      id: row.id,
      name: row.name,
      docNumber: row.doc_number || undefined,
      mimeType: row.mime_type,
      size: row.size,
      clientId: row.client_id || undefined,
      caseId: row.case_id || undefined,
      folderId: row.folder_id || undefined,
      type: row.type,
      description: row.description || undefined,
      webViewLink: row.web_view_link || undefined,
      downloadLink: row.download_link || undefined,
      thumbnailLink: row.thumbnail_link || undefined,
      extractedData: row.extracted_data || undefined,
      extractionStatus: row.extracted_data ? 'completed' : 'pending',
      createdAt: row.created_at,
      modifiedAt: row.modified_at || row.created_at,
      appProperties: (row.app_properties as Record<string, any>) || {},
    };
  }
}
