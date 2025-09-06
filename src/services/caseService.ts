import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Case } from "@/types";

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];
type CaseInsert = Database["public"]["Tables"]["cases"]["Insert"];
type CaseUpdate = Database["public"]["Tables"]["cases"]["Update"];

export class CaseService {
  /**
   * Buscar todos os casos do usuário logado
   */
  static async getCases(clientId?: string): Promise<Case[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    let query = supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.user.id);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(this.mapCaseRowToCase);
  }

  /**
   * Buscar caso por ID
   */
  static async getCaseById(id: string): Promise<Case | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return this.mapCaseRowToCase(data);
  }

  /**
   * Criar novo caso
   */
  static async createCase(caseData: Omit<Case, "id" | "createdAt" | "documentsCount">): Promise<Case> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const insertData: CaseInsert = {
      name: caseData.name,
      client_id: caseData.clientId,
      reference: caseData.reference || null,
      description: caseData.description || null,
      status: caseData.status,
      user_id: user.user.id,
    };

    const { data, error } = await supabase
      .from("cases")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return this.mapCaseRowToCase(data);
  }

  /**
   * Atualizar caso
   */
  static async updateCase(id: string, updates: Partial<Omit<Case, "id" | "createdAt">>): Promise<Case> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const updateData: CaseUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.clientId && { client_id: updates.clientId }),
      ...(updates.reference !== undefined && { reference: updates.reference || null }),
      ...(updates.description !== undefined && { description: updates.description || null }),
      ...(updates.status && { status: updates.status }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("cases")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.user.id)
      .select()
      .single();

    if (error) throw error;

    return this.mapCaseRowToCase(data);
  }

  /**
   * Deletar caso
   */
  static async deleteCase(id: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("cases")
      .delete()
      .eq("id", id)
      .eq("user_id", user.user.id);

    if (error) throw error;
  }

  /**
   * Buscar casos por nome (busca)
   */
  static async searchCases(clientId: string, query: string): Promise<Case[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.user.id)
      .eq("client_id", clientId)
      .ilike("name", `%${query}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(this.mapCaseRowToCase);
  }

  /**
   * Contar documentos do caso
   */
  static async getCaseDocumentsCount(caseId: string): Promise<number> {
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Mapear dados do banco para o tipo Case
   */
  private static mapCaseRowToCase(row: CaseRow): Case {
    return {
      id: row.id,
      name: row.name,
      clientId: row.client_id,
      reference: row.reference || undefined,
      description: row.description || undefined,
      status: row.status as "active" | "closed" | "archived",
      createdAt: row.created_at,
    };
  }
}