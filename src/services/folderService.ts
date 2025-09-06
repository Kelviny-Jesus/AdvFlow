import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FolderItem } from "@/types";

type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
type FolderInsert = Database["public"]["Tables"]["folders"]["Insert"];
type FolderUpdate = Database["public"]["Tables"]["folders"]["Update"];

export class FolderService {
  /**
   * Buscar todas as pastas do usuário logado
   */
  static async getFolders(parentId?: string): Promise<FolderItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    let query = supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.user.id);

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query.order("name");

    if (error) throw error;

    // Contar itens para cada pasta
    const foldersWithCounts = await Promise.all(
      data.map(async (folder) => {
        const [subfolderCount, documentsCount] = await Promise.all([
          this.getSubfolderCount(folder.id),
          this.getDocumentsCount(folder.id),
        ]);

        return this.mapFolderRowToFolderItem(folder, {
          subfolderCount,
          documentsCount,
          itemsCount: subfolderCount + documentsCount,
        });
      })
    );

    return foldersWithCounts;
  }

  /**
   * Buscar pasta por ID
   */
  static async getFolderById(id: string): Promise<FolderItem | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    const [subfolderCount, documentsCount] = await Promise.all([
      this.getSubfolderCount(data.id),
      this.getDocumentsCount(data.id),
    ]);

    return this.mapFolderRowToFolderItem(data, {
      subfolderCount,
      documentsCount,
      itemsCount: subfolderCount + documentsCount,
    });
  }

  /**
   * Criar nova pasta
   */
  static async createFolder(folderData: {
    name: string;
    kind: "client" | "case" | "subfolder";
    parentId?: string;
    clientId?: string;
    caseId?: string;
    path: string;
  }): Promise<FolderItem> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

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

    return this.mapFolderRowToFolderItem(data, {
      subfolderCount: 0,
      documentsCount: 0,
      itemsCount: 0,
    });
  }

  /**
   * Atualizar pasta
   */
  static async updateFolder(id: string, updates: Partial<{
    name: string;
    path: string;
  }>): Promise<FolderItem> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const updateData: FolderUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.path && { path: updates.path }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("folders")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.user.id)
      .select()
      .single();

    if (error) throw error;

    const [subfolderCount, documentsCount] = await Promise.all([
      this.getSubfolderCount(data.id),
      this.getDocumentsCount(data.id),
    ]);

    return this.mapFolderRowToFolderItem(data, {
      subfolderCount,
      documentsCount,
      itemsCount: subfolderCount + documentsCount,
    });
  }

  /**
   * Deletar pasta
   */
  static async deleteFolder(id: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.user.id);

    if (error) throw error;
  }

  /**
   * Buscar pastas por nome (busca)
   */
  static async searchFolders(query: string): Promise<FolderItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.user.id)
      .or(`name.ilike.%${query}%,path.ilike.%${query}%`)
      .order("name");

    if (error) throw error;

    const foldersWithCounts = await Promise.all(
      data.map(async (folder) => {
        const [subfolderCount, documentsCount] = await Promise.all([
          this.getSubfolderCount(folder.id),
          this.getDocumentsCount(folder.id),
        ]);

        return this.mapFolderRowToFolderItem(folder, {
          subfolderCount,
          documentsCount,
          itemsCount: subfolderCount + documentsCount,
        });
      })
    );

    return foldersWithCounts;
  }

  /**
   * Contar subpastas
   */
  private static async getSubfolderCount(folderId: string): Promise<number> {
    const { count, error } = await supabase
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", folderId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Contar documentos na pasta
   */
  private static async getDocumentsCount(folderId: string): Promise<number> {
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", folderId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Mapear dados do banco para o tipo FolderItem
   */
  private static mapFolderRowToFolderItem(
    row: FolderRow,
    counts: { subfolderCount: number; documentsCount: number; itemsCount: number }
  ): FolderItem {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id || undefined,
      kind: row.kind as "client" | "case" | "subfolder",
      itemsCount: counts.itemsCount,
      documentsCount: counts.documentsCount,
      subfolderCount: counts.subfolderCount,
      createdAt: row.created_at,
      clientId: row.client_id || undefined,
      caseId: row.case_id || undefined,
      path: row.path,
    };
  }
}