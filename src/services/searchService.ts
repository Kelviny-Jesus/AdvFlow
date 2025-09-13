import { supabase } from "@/integrations/supabase/client";
import type { FolderItem, FileItem, Petition, Fact } from "@/types";

export type GlobalSearchResult = {
  folders: FolderItem[];
  documents: FileItem[];
  petitions: Petition[];
  facts: (Fact & { petitionId?: string })[];
};

export class SearchService {
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

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      parentId: row.parent_id || undefined,
      kind: row.kind,
      itemsCount: 0,
      documentsCount: 0,
      subfolderCount: 0,
      createdAt: row.created_at,
      clientId: row.client_id || undefined,
      caseId: row.case_id || undefined,
      path: row.path,
    }));
  }

  static async searchDocuments(query: string): Promise<FileItem[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.user.id)
      .eq("status", "completed")
      .or(`name.ilike.%${query}%,doc_number.ilike.%${query}%`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      docNumber: row.doc_number || undefined,
      mimeType: row.mime_type,
      size: row.size,
      clientId: row.client_id,
      caseId: row.case_id,
      type: row.type,
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
    }));
  }

  static async searchPetitions(query: string): Promise<Petition[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("petitions")
      .select("*")
      .eq("user_id", user.user.id)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      clientId: row.client_id,
      caseId: row.case_id,
      documentIds: [],
      content: row.content,
      template: row.template || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
    }));
  }

  static async searchFacts(query: string): Promise<(Fact & { petitionId?: string })[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("facts")
      .select("*")
      .eq("user_id", user.user.id)
      .ilike("text", `%${query}%`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      type: row.type,
      text: row.text,
      documentRefs: undefined,
      tags: row.tags || undefined,
      confidence: row.confidence || undefined,
      petitionId: row.petition_id || undefined,
    }));
  }

  static async searchAll(query: string): Promise<GlobalSearchResult> {
    const [folders, documents, petitions, facts] = await Promise.all([
      this.searchFolders(query),
      this.searchDocuments(query),
      this.searchPetitions(query),
      this.searchFacts(query),
    ]);
    return { folders, documents, petitions, facts };
  }
}


