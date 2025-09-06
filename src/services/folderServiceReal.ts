/**
 * Service real para gerenciamento de pastas no Supabase
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FolderItem, Client, Case } from "@/types";
import { withErrorHandling } from "@/lib/errors";
import { logger, PerformanceMonitor } from "@/lib/logger";
import { validateData } from "@/lib/validations";

type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
type FolderInsert = Database["public"]["Tables"]["folders"]["Insert"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type CaseRow = Database["public"]["Tables"]["cases"]["Row"];

export class FolderServiceReal {
  /**
   * Buscar todas as pastas (incluindo subpastas)
   */
  static async getFolders(parentId?: string): Promise<FolderItem[]> {
    return withErrorHandling(async () => {
      PerformanceMonitor.startTimer('getFolders');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      logger.info('Fetching folders', { parentId, userId: user.user.id }, 'FolderServiceReal');

      // Buscar TODAS as pastas do usuário (não apenas as raiz)
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mapear todas as pastas
      const allFolders = await Promise.all(
        data.map(async (folder) => await this.mapFolderRowToFolderItemWithCounts(folder))
      );
      
      PerformanceMonitor.endTimer('getFolders');
      logger.info('Folders fetched successfully', { count: allFolders.length }, 'FolderServiceReal');
      
      return allFolders;
    }, 'FolderServiceReal.getFolders');
  }

  /**
   * Criar nova pasta
   */
  static async createFolder(folderData: {
    name: string;
    kind: 'client' | 'case' | 'subfolder';
    parentId?: string;
    clientId?: string;
    caseId?: string;
    path: string;
  }): Promise<FolderItem> {
    return withErrorHandling(async () => {
      PerformanceMonitor.startTimer('createFolder');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      logger.info('Creating folder', { 
        name: folderData.name, 
        kind: folderData.kind,
        path: folderData.path
      }, 'FolderServiceReal');

      const insertData: FolderInsert = {
        name: folderData.name,
        kind: folderData.kind,
        parent_id: folderData.parentId || null,
        client_id: folderData.clientId || null,
        case_id: folderData.caseId || null,
        path: folderData.path,
        user_id: user.user.id,
      };

      const { data, error } = await supabase
        .from("folders")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const result = this.mapFolderRowToFolderItem(data);
      
      PerformanceMonitor.endTimer('createFolder');
      logger.info('Folder created successfully', { id: result.id, name: result.name }, 'FolderServiceReal');
      
      return result;
    }, 'FolderServiceReal.createFolder');
  }

  /**
   * Criar cliente e pasta automaticamente
   */
  static async createClientWithFolder(clientName: string): Promise<{ client: Client; folder: FolderItem }> {
    return withErrorHandling(async () => {
      PerformanceMonitor.startTimer('createClientWithFolder');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      logger.info('Creating client with folder', { clientName }, 'FolderServiceReal');

      // Criar cliente primeiro
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: clientName,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      const client: Client = {
        id: clientData.id,
        name: clientData.name,
        email: clientData.email || undefined,
        phone: clientData.phone || undefined,
        createdAt: clientData.created_at,
      };

      // Criar pasta do cliente
      const folder = await this.createFolder({
        name: clientName,
        kind: 'client',
        clientId: client.id,
        path: clientName,
      });

      PerformanceMonitor.endTimer('createClientWithFolder');
      logger.info('Client and folder created successfully', { 
        clientId: client.id, 
        folderId: folder.id 
      }, 'FolderServiceReal');

      return { client, folder };
    }, 'FolderServiceReal.createClientWithFolder');
  }

  /**
   * Criar caso e pasta automaticamente
   */
  static async createCaseWithFolder(caseData: {
    name: string;
    clientId: string;
    description?: string;
    reference?: string;
  }): Promise<{ case: Case; folder: FolderItem }> {
    return withErrorHandling(async () => {
      PerformanceMonitor.startTimer('createCaseWithFolder');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      logger.info('Creating case with folder', { 
        caseName: caseData.name, 
        clientId: caseData.clientId 
      }, 'FolderServiceReal');

      // Buscar cliente para obter o nome
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", caseData.clientId)
        .eq("user_id", user.user.id)
        .single();

      if (clientError) throw clientError;

      // Buscar pasta do cliente
      const { data: clientFolder, error: folderError } = await supabase
        .from("folders")
        .select("id")
        .eq("client_id", caseData.clientId)
        .eq("kind", "client")
        .eq("user_id", user.user.id)
        .single();

      if (folderError) throw folderError;

      // Criar caso
      const { data: caseDbData, error: caseError } = await supabase
        .from("cases")
        .insert({
          name: caseData.name,
          client_id: caseData.clientId,
          description: caseData.description || null,
          reference: caseData.reference || null,
          status: 'active',
          user_id: user.user.id,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      const case_: Case = {
        id: caseDbData.id,
        name: caseDbData.name,
        clientId: caseDbData.client_id,
        description: caseDbData.description || undefined,
        reference: caseDbData.reference || undefined,
        status: caseDbData.status as Case['status'],
        createdAt: caseDbData.created_at,
        documentsCount: 0,
      };

      // Criar pasta do caso
      const folder = await this.createFolder({
        name: caseData.name,
        kind: 'case',
        parentId: clientFolder.id,
        clientId: caseData.clientId,
        caseId: case_.id,
        path: `${clientData.name}/${caseData.name}`,
      });

      PerformanceMonitor.endTimer('createCaseWithFolder');
      logger.info('Case and folder created successfully', { 
        caseId: case_.id, 
        folderId: folder.id 
      }, 'FolderServiceReal');

      return { case: case_, folder };
    }, 'FolderServiceReal.createCaseWithFolder');
  }

  /**
   * Mapear dados do banco para FolderItem
   */
  private static mapFolderRowToFolderItem(row: FolderRow): FolderItem {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind as FolderItem['kind'],
      parentId: row.parent_id || undefined,
      clientId: row.client_id || undefined,
      caseId: row.case_id || undefined,
      path: row.path,
      createdAt: row.created_at,
      // Campos que precisariam de queries adicionais - por enquanto default
      itemsCount: 0,
      documentsCount: 0,
      subfolderCount: 0,
    };
  }

  /**
   * Mapear dados do banco para FolderItem com contadores
   */
  private static async mapFolderRowToFolderItemWithCounts(row: FolderRow): Promise<FolderItem> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    // Contar documentos
    const { count: documentsCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", row.id)
      .eq("user_id", user.user.id);

    // Contar subpastas
    const { count: subfoldersCount } = await supabase
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", row.id)
      .eq("user_id", user.user.id);

    return {
      id: row.id,
      name: row.name,
      kind: row.kind as FolderItem['kind'],
      parentId: row.parent_id || undefined,
      clientId: row.client_id || undefined,
      caseId: row.case_id || undefined,
      path: row.path,
      createdAt: row.created_at,
      itemsCount: (documentsCount || 0) + (subfoldersCount || 0),
      documentsCount: documentsCount || 0,
      subfolderCount: subfoldersCount || 0,
    };
  }

  /**
   * Contar itens em uma pasta (método auxiliar)
   */
  static async updateFolderCounts(folderId: string): Promise<void> {
    return withErrorHandling(async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Usuário não autenticado");

      // Contar documentos
      const { count: documentsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("folder_id", folderId)
        .eq("user_id", user.user.id);

      // Contar subpastas
      const { count: subfoldersCount } = await supabase
        .from("folders")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", folderId)
        .eq("user_id", user.user.id);

      logger.debug('Folder counts updated', { 
        folderId, 
        documentsCount, 
        subfoldersCount 
      }, 'FolderServiceReal');
    }, 'FolderServiceReal.updateFolderCounts');
  }
}
