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
import { aiRenamingService } from "./aiRenamingService";
import { imageConverterService } from "./imageConverterService";
import jsPDF from 'jspdf';

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];

export class DocumentFolderService {
  // Fila para processar renomeações sequencialmente
  private static renamingQueue: Array<() => Promise<void>> = [];
  private static isProcessingQueue = false;
  
  // Controle de concorrência por cliente
  private static clientProcessingLocks = new Map<string, Promise<void>>();
  /**
   * Converter JPG para PDF automaticamente usando jsPDF
   */
  private static async convertJpgToPdfIfNeeded(file: File): Promise<{ file: File; converted: boolean; originalName?: string }> {
    // Verificar se é uma imagem JPG
    const isJpg = file.type === 'image/jpeg' || file.type === 'image/jpg' || 
                  file.name.toLowerCase().endsWith('.jpg') || 
                  file.name.toLowerCase().endsWith('.jpeg');

    if (!isJpg) {
      return { file, converted: false };
    }

    try {
      console.log('🔄 Convertendo JPG para PDF automaticamente:', file.name);
      
      // Converter imagem para base64
      const base64Image = await this.fileToBase64(file);
      
      // Criar PDF com jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Obter dimensões da imagem
      const img = new Image();
      img.src = base64Image;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      console.log('🖼️ Dimensões da imagem:', img.width, 'x', img.height);
      
      // Calcular dimensões para ajustar à página A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = img.width;
      const imgHeight = img.height;
      
      console.log('📄 Dimensões da página PDF:', pdfWidth, 'x', pdfHeight);
      
      // Calcular escala para ajustar à página (deixar margem de 10mm)
      const margin = 10;
      const availableWidth = pdfWidth - (2 * margin);
      const availableHeight = pdfHeight - (2 * margin);
      const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
      // Centralizar na página
      const x = (pdfWidth - scaledWidth) / 2;
      const y = (pdfHeight - scaledHeight) / 2;
      
      console.log('📐 Posição e escala:', { x, y, scaledWidth, scaledHeight, scale });
      
      // Adicionar imagem ao PDF
      pdf.addImage(base64Image, 'JPEG', x, y, scaledWidth, scaledHeight);
      
      // Gerar PDF como blob
      const pdfBlob = pdf.output('blob');
      
      // Criar arquivo PDF
      const pdfFile = new File([pdfBlob], file.name.replace(/\.(jpg|jpeg)$/i, '.pdf'), {
        type: 'application/pdf'
      });

      console.log('✅ Conversão JPG->PDF concluída:', pdfFile.name);
      console.log('📊 Tamanho original:', file.size, 'bytes');
      console.log('📊 Tamanho PDF:', pdfFile.size, 'bytes');
      console.log('🔍 Tipo MIME do PDF:', pdfFile.type);
      console.log('🔍 Nome do arquivo PDF:', pdfFile.name);
      
      return { 
        file: pdfFile, 
        converted: true, 
        originalName: file.name 
      };

    } catch (error) {
      console.log('❌ Erro na conversão JPG->PDF:', error);
      return { file, converted: false };
    }
  }

  /**
   * Converter arquivo para base64
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

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

      // 1. Converter JPG para PDF se necessário
      const conversionResult = await this.convertJpgToPdfIfNeeded(file);
      const fileToUpload = conversionResult.file;
      const wasConverted = conversionResult.converted;
      const originalFileName = conversionResult.originalName;

      if (wasConverted) {
        console.log('📄 Arquivo convertido de JPG para PDF:', originalFileName, '->', fileToUpload.name);
        logger.info('File converted from JPG to PDF', {
          originalName: originalFileName,
          newName: fileToUpload.name,
          originalType: file.type,
          newType: fileToUpload.type
        }, 'DocumentFolderService');
      }

      logger.info('Starting document upload to folder', {
        fileName: fileToUpload.name,
        originalFileName: wasConverted ? originalFileName : undefined,
        fileSize: fileToUpload.size,
        folderId: folder.id,
        folderName: folder.name,
        folderKind: folder.kind,
        wasConverted
      }, 'DocumentFolderService');

      // 2. Gerar nome único para o arquivo
      const timestamp = Date.now();
      const sanitizedFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
      
      console.log('📝 Nome único gerado:', uniqueFileName);

      // 2. Definir caminho no storage baseado na hierarquia da pasta
      const storagePath = this.generateStoragePath(folder, uniqueFileName);
      
      logger.info('Generated storage path', { storagePath }, 'DocumentFolderService');

      // 3. Upload para o Supabase Storage
      console.log('📤 Fazendo upload para storage:');
      console.log('📄 Arquivo original:', file.name, file.type, file.size);
      console.log('📄 Arquivo para upload:', fileToUpload.name, fileToUpload.type, fileToUpload.size);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, fileToUpload, {
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
        name: fileToUpload.name,
        mime_type: fileToUpload.type,
        size: fileToUpload.size,
        client_id: finalClientId,
        case_id: finalCaseId,
        folder_id: folder.id,
        type: detectFileType(fileToUpload.name),
        doc_number: docNumber,
        supabase_storage_path: storagePath,
        web_view_link: publicUrl.publicUrl,
        download_link: downloadUrl?.signedUrl || publicUrl.publicUrl,
        status: "completed",
        user_id: user.user.id,
      };

      // Log dos dados que serão salvos no banco
      console.log('💾 Dados que serão salvos no banco:');
      console.log('📄 Nome:', documentData.name);
      console.log('📄 Tipo MIME:', documentData.mime_type);
      console.log('📄 Tamanho:', documentData.size);
      console.log('📄 Tipo detectado:', documentData.type);
      console.log('🔄 Foi convertido?', wasConverted);
      if (wasConverted) {
        console.log('📄 Nome original:', originalFileName);
      }

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
      this.processDocumentExtraction(result, publicUrl.publicUrl, fileToUpload.type)
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
      console.log('🔍 Verificando se tipo de arquivo é suportado:', mimeType);
      
      // Se for PDF (convertido de JPG), sempre permitir extração
      const isPdfConverted = mimeType === 'application/pdf';
      
      if (!extractionService.isSupportedMimeType(mimeType) && !isPdfConverted) {
        console.log('❌ Tipo de arquivo NÃO suportado para extração:', mimeType);
        logger.info('Document type not supported for extraction', {
          documentId: document.id,
          mimeType
        }, 'DocumentFolderService');
        return;
      }
      
      if (isPdfConverted) {
        console.log('✅ PDF (convertido de JPG) - Iniciando extração...');
      } else {
        console.log('✅ Tipo de arquivo suportado! Iniciando extração...');
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

      // 9. Processar renomeação AI se temos dados extraídos
      if (extractedData && aiRenamingService.isConfigured() && document.clientId) {
        // Usar sistema de lock por cliente para evitar condições de corrida
        await this.processAIRenamingWithLock(document, extractedData);
      }

    }, 'DocumentFolderService.processDocumentExtraction');
  }

  /**
   * Processar renomeação AI com controle de concorrência por cliente
   */
  private static async processAIRenamingWithLock(document: FileItem, extractedData: string): Promise<void> {
    const clientId = document.clientId!;
    
    // Verificar se já existe um processamento em andamento para este cliente
    const existingLock = this.clientProcessingLocks.get(clientId);
    if (existingLock) {
      console.log('⏳ Aguardando processamento anterior do cliente:', clientId);
      await existingLock;
    }
    
    // Criar novo lock para este cliente
    const processingPromise = this.processAIRenamingForClient(document, extractedData);
    this.clientProcessingLocks.set(clientId, processingPromise);
    
    try {
      await processingPromise;
    } finally {
      // Remover lock quando terminar
      this.clientProcessingLocks.delete(clientId);
      console.log('🔓 Lock removido para cliente:', clientId);
    }
  }

  /**
   * Processar renomeação AI para um cliente específico
   */
  private static async processAIRenamingForClient(document: FileItem, extractedData: string): Promise<void> {
    const clientId = document.clientId!;
    
    console.log('🔒 Iniciando processamento com lock para cliente:', clientId);
    console.log('📄 Documento:', document.name);
    
    // Verificar se é o primeiro documento do cliente
    const lastDocument = await this.getLastRenamedDocument(clientId);
    
    if (!lastDocument) {
      // Primeiro documento - processar imediatamente
      console.log('🚀 PRIMEIRO DOCUMENTO - Processando imediatamente:', document.name);
      console.log('👤 Cliente ID:', clientId);
      
      logger.info('Processing first document immediately (no queue)', {
        documentId: document.id,
        clientId: clientId
      }, 'DocumentFolderService');
      
      await this.processAIRenaming(document, extractedData);
    } else {
      // Documentos subsequentes - adicionar à fila
      console.log('📋 DOCUMENTO SUBSEQUENTE - Adicionando à fila:', document.name);
      console.log('🔢 Último número:', lastDocument.number, '| Próximo:', lastDocument.number + 1);
      
      logger.info('Adding subsequent document to queue', {
        documentId: document.id,
        clientId: clientId,
        lastDocumentNumber: lastDocument.number
      }, 'DocumentFolderService');
      
      this.addToRenamingQueue(document, extractedData);
    }
  }

  /**
   * Adicionar documento à fila de renomeação sequencial
   */
  private static addToRenamingQueue(document: FileItem, extractedData: string): void {
    const renamingTask = async () => {
      logger.info('Starting AI renaming task', {
        documentId: document.id,
        queuePosition: this.renamingQueue.length + 1
      }, 'DocumentFolderService');
      
      // Delay de 1 segundo entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return this.processAIRenaming(document, extractedData);
    };

    this.renamingQueue.push(renamingTask);
    
    logger.info('Added document to renaming queue', {
      documentId: document.id,
      queueSize: this.renamingQueue.length
    }, 'DocumentFolderService');
    
    this.processRenamingQueue();
  }

  /**
   * Processar fila de renomeação sequencialmente
   */
  private static async processRenamingQueue(): Promise<void> {
    if (this.isProcessingQueue || this.renamingQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    logger.info('Starting sequential renaming queue processing', {
      queueSize: this.renamingQueue.length
    }, 'DocumentFolderService');

    while (this.renamingQueue.length > 0) {
      const task = this.renamingQueue.shift();
      if (task) {
        try {
          await task();
          logger.info('Completed renaming task', {
            remainingInQueue: this.renamingQueue.length
          }, 'DocumentFolderService');
        } catch (error) {
          logger.error('Error processing renaming task', error instanceof Error ? error : new Error('Unknown error'), {}, 'DocumentFolderService');
        }
      }
    }

    this.isProcessingQueue = false;
    
    logger.info('Finished sequential renaming queue processing', {}, 'DocumentFolderService');
  }

  /**
   * Processar renomeação AI do documento
   */
  private static async processAIRenaming(
    document: FileItem,
    extractedData: string
  ): Promise<void> {
    return withErrorHandling(async () => {
      logger.info('Starting AI document renaming', {
        documentId: document.id,
        fileName: document.name,
        extractedDataLength: extractedData.length
      }, 'DocumentFolderService');

      // Buscar informações do cliente e caso se disponíveis
      const clientName = document.clientId ? await this.getClientName(document.clientId) : undefined;
      const caseReference = document.caseId ? await this.getCaseReference(document.caseId) : undefined;

      // Buscar último documento renomeado do cliente para numeração sequencial
      const lastDocument = document.clientId ? await this.getLastRenamedDocument(document.clientId) : null;

      // Chamar o serviço de renomeação AI
      const suggestedName = await aiRenamingService.suggestDocumentName({
        documentId: document.id,
        fileName: document.name,
        extractedData,
        clientName,
        caseReference,
        lastDocument
      });

      if (!suggestedName) {
        logger.info('No AI renaming suggestion received', {
          documentId: document.id
        }, 'DocumentFolderService');
        return;
      }

      // Validar o nome sugerido
      let finalSuggestedName = suggestedName;
      if (!aiRenamingService.validateSuggestedName(suggestedName)) {
        console.log('⚠️ Nome sugerido não segue o formato correto:', suggestedName);
        console.log('🔄 Tentando corrigir automaticamente...');
        
        // Tentar corrigir o formato automaticamente
        const correctedName = await this.attemptNameCorrection(suggestedName, document.clientId);
        if (correctedName) {
          console.log('✅ Nome corrigido automaticamente:', correctedName);
          finalSuggestedName = correctedName;
        } else {
          console.log('❌ Não foi possível corrigir o nome automaticamente');
          logger.warn('AI suggested name does not follow format', {
            documentId: document.id,
            suggestedName
          }, 'DocumentFolderService');
          return;
        }
      }

      // Atualizar nome do documento no banco
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        logger.error('User not authenticated during AI renaming update', {
          documentId: document.id
        }, 'DocumentFolderService');
        return;
      }

      const { error: updateError } = await supabase
        .from("documents")
        .update({
          name: finalSuggestedName,
          updated_at: new Date().toISOString()
        })
        .eq("id", document.id)
        .eq("user_id", user.user.id);

      if (updateError) {
        logger.error('Failed to update document name with AI suggestion', {
          documentId: document.id,
          suggestedName: finalSuggestedName,
          error: updateError.message
        }, 'DocumentFolderService');
        throw updateError;
      }

      console.log('🎉 RENOMEAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('📄 Documento ID:', document.id);
      console.log('📝 Nome original:', document.name);
      console.log('🆕 Nome novo:', finalSuggestedName);
      
      logger.info('AI document renaming completed successfully', {
        documentId: document.id,
        originalName: document.name,
        newName: finalSuggestedName
      }, 'DocumentFolderService');

    }, 'DocumentFolderService.processAIRenaming');
  }

  /**
   * Tentar corrigir automaticamente o nome sugerido pela IA
   */
  private static async attemptNameCorrection(suggestedName: string, clientId?: string): Promise<string | null> {
    try {
      // Extrair partes do nome sugerido
      const parts = suggestedName.split(/[_\s]+/);
      
      // Procurar por padrões conhecidos
      const docMatch = suggestedName.match(/DOC\s*n\.?\s*(\d{3})/i);
      const number = docMatch ? docMatch[1] : '001';
      
      // Extrair tipo de documento (última parte antes da data)
      const dateMatch = suggestedName.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
      const date = dateMatch ? dateMatch[1].replace(/[-_]/g, '-') : new Date().toISOString().split('T')[0];
      
      // Procurar por tipo de documento conhecido
      const recognizedTypes = aiRenamingService.getRecognizedDocumentTypes();
      let documentType = 'DOCUMENTO_LEGAL';
      
      for (const type of recognizedTypes) {
        if (suggestedName.toUpperCase().includes(type)) {
          documentType = type;
          break;
        }
      }
      
      // Buscar nome real do cliente/pasta
      let clientName = 'CLIENTE_NAO_IDENTIFICADO';
      if (clientId) {
        try {
          const realClientName = await this.getClientName(clientId);
          if (realClientName) {
            // Converter nome para formato adequado (maiúsculas, underscores)
            clientName = realClientName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
            console.log('👤 Nome real do cliente encontrado:', realClientName, '→', clientName);
          } else {
            console.log('⚠️ Nome do cliente não encontrado, usando padrão');
            clientName = 'CLIENTE_' + clientId.substring(0, 8).toUpperCase();
          }
        } catch (error) {
          console.log('❌ Erro ao buscar nome do cliente:', error);
          clientName = 'CLIENTE_' + clientId.substring(0, 8).toUpperCase();
        }
      }
      
      // Construir nome corrigido
      const correctedName = `DOC n. ${number} + ${clientName} + ${documentType} + ${date}`;
      
      console.log('🔧 Correção automática aplicada:');
      console.log('   Original:', suggestedName);
      console.log('   Corrigido:', correctedName);
      
      return correctedName;
      
    } catch (error) {
      console.log('❌ Erro na correção automática:', error);
      return null;
    }
  }

  /**
   * Buscar nome do cliente por ID
   */
  private static async getClientName(clientId: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();

      if (error || !data) return undefined;
      return data.name;
    } catch (error) {
      logger.error('Failed to get client name', { clientId, error }, 'DocumentFolderService');
      return undefined;
    }
  }

  /**
   * Buscar referência do caso por ID
   */
  private static async getCaseReference(caseId: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("reference")
        .eq("id", caseId)
        .single();

      if (error || !data) return undefined;
      return data.reference;
    } catch (error) {
      logger.error('Failed to get case reference', { caseId, error }, 'DocumentFolderService');
      return undefined;
    }
  }

  /**
   * Buscar último documento renomeado do cliente
   */
  private static async getLastRenamedDocument(clientId: string): Promise<{ name: string; number: number } | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return null;

      console.log('🔍 Buscando último documento renomeado para cliente:', clientId);

      // Buscar documentos do cliente que foram renomeados (começam com "DOC n.")
      const { data, error } = await supabase
        .from("documents")
        .select("name, created_at")
        .eq("client_id", clientId)
        .eq("user_id", user.user.id)
        .eq("status", "completed")
        .like("name", "DOC n.%")
        .order("created_at", { ascending: false });

      if (error) {
        console.log('❌ Erro ao buscar último documento:', error.message);
        logger.info('No previous renamed documents found for client', { clientId }, 'DocumentFolderService');
        return null;
      }

      if (!data || data.length === 0) {
        console.log('📝 Nenhum documento renomeado encontrado para este cliente');
        logger.info('No previous renamed documents found for client', { clientId }, 'DocumentFolderService');
        return null;
      }

      console.log('📋 Documentos encontrados:', data.length);
      data.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.name} (${doc.created_at})`);
      });

      const lastDocument = data[0];
      
      // Extrair número do nome do documento
      const match = lastDocument.name.match(/DOC n\. (\d{3})/);
      if (!match) {
        console.log('❌ Não foi possível extrair número do nome:', lastDocument.name);
        logger.warn('Could not extract number from document name', { 
          clientId, 
          documentName: lastDocument.name 
        }, 'DocumentFolderService');
        return null;
      }

      const lastNumber = parseInt(match[1], 10);
      
      console.log('🎯 Último documento:', lastDocument.name, '| Número:', lastNumber);
      
      logger.info('Found last renamed document for client', {
        clientId,
        lastDocumentName: lastDocument.name,
        lastNumber
      }, 'DocumentFolderService');

      return {
        name: lastDocument.name,
        number: lastNumber
      };

    } catch (error) {
      logger.error('Failed to get last renamed document', { clientId, error }, 'DocumentFolderService');
      return null;
    }
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
