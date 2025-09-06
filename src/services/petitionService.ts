import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Petition, Fact } from "@/types";

type PetitionRow = Database["public"]["Tables"]["petitions"]["Row"];
type PetitionInsert = Database["public"]["Tables"]["petitions"]["Insert"];
type PetitionUpdate = Database["public"]["Tables"]["petitions"]["Update"];
type FactRow = Database["public"]["Tables"]["facts"]["Row"];
type FactInsert = Database["public"]["Tables"]["facts"]["Insert"];

export class PetitionService {
  /**
   * Criar nova petição
   */
  static async createPetition(petitionData: {
    title: string;
    clientId: string;
    caseId: string;
    content: string;
    documentIds: string[];
    template?: string;
    status?: "draft" | "review" | "final";
  }): Promise<Petition> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    // Criar petição
    const insertData: PetitionInsert = {
      title: petitionData.title,
      client_id: petitionData.clientId,
      case_id: petitionData.caseId,
      content: petitionData.content,
      template: petitionData.template || null,
      status: petitionData.status || "draft",
      user_id: user.user.id,
    };

    const { data: petition, error: petitionError } = await supabase
      .from("petitions")
      .insert(insertData)
      .select()
      .single();

    if (petitionError) throw petitionError;

    // Associar documentos à petição
    if (petitionData.documentIds.length > 0) {
      const documentAssociations = petitionData.documentIds.map(docId => ({
        petition_id: petition.id,
        document_id: docId,
      }));

      const { error: docsError } = await supabase
        .from("petition_documents")
        .insert(documentAssociations);

      if (docsError) throw docsError;
    }

    return this.mapPetitionRowToPetition(petition, petitionData.documentIds);
  }

  /**
   * Buscar petições do usuário
   */
  static async getPetitions(filters?: {
    clientId?: string;
    caseId?: string;
    status?: string;
  }): Promise<Petition[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    let query = supabase
      .from("petitions")
      .select(`
        *,
        petition_documents (
          document_id
        )
      `)
      .eq("user_id", user.user.id);

    if (filters?.clientId) {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.caseId) {
      query = query.eq("case_id", filters.caseId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return data.map(row => {
      const documentIds = row.petition_documents?.map(pd => pd.document_id) || [];
      return this.mapPetitionRowToPetition(row, documentIds);
    });
  }

  /**
   * Buscar petição por ID
   */
  static async getPetitionById(id: string): Promise<Petition | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("petitions")
      .select(`
        *,
        petition_documents (
          document_id
        ),
        facts (*)
      `)
      .eq("id", id)
      .eq("user_id", user.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    const documentIds = data.petition_documents?.map(pd => pd.document_id) || [];
    const facts = data.facts?.map(this.mapFactRowToFact) || [];

    return this.mapPetitionRowToPetition(data, documentIds, facts);
  }

  /**
   * Atualizar petição
   */
  static async updatePetition(
    id: string,
    updates: Partial<{
      title: string;
      content: string;
      status: "draft" | "review" | "final";
      template: string;
    }>
  ): Promise<Petition> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const updateData: PetitionUpdate = {
      ...(updates.title && { title: updates.title }),
      ...(updates.content && { content: updates.content }),
      ...(updates.status && { status: updates.status }),
      ...(updates.template !== undefined && { template: updates.template || null }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("petitions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.user.id)
      .select(`
        *,
        petition_documents (
          document_id
        ),
        facts (*)
      `)
      .single();

    if (error) throw error;

    const documentIds = data.petition_documents?.map(pd => pd.document_id) || [];
    const facts = data.facts?.map(this.mapFactRowToFact) || [];

    return this.mapPetitionRowToPetition(data, documentIds, facts);
  }

  /**
   * Deletar petição
   */
  static async deletePetition(id: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("petitions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.user.id);

    if (error) throw error;
  }

  /**
   * Adicionar fato à petição
   */
  static async addFactToPetition(petitionId: string, factData: {
    type: "contratual" | "processual" | "probatório" | "comunicação";
    text: string;
    documentRefs?: string[];
    tags?: string[];
    confidence?: number;
  }): Promise<Fact> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const insertData: FactInsert = {
      petition_id: petitionId,
      type: factData.type,
      text: factData.text,
      tags: factData.tags || null,
      confidence: factData.confidence || null,
      user_id: user.user.id,
    };

    const { data: fact, error: factError } = await supabase
      .from("facts")
      .insert(insertData)
      .select()
      .single();

    if (factError) throw factError;

    // Associar documentos ao fato se fornecidos
    if (factData.documentRefs && factData.documentRefs.length > 0) {
      const factDocAssociations = factData.documentRefs.map(docId => ({
        fact_id: fact.id,
        document_id: docId,
      }));

      const { error: docsError } = await supabase
        .from("fact_documents")
        .insert(factDocAssociations);

      if (docsError) throw docsError;
    }

    return this.mapFactRowToFact(fact, factData.documentRefs);
  }

  /**
   * Buscar fatos de uma petição
   */
  static async getPetitionFacts(petitionId: string): Promise<Fact[]> {
    const { data, error } = await supabase
      .from("facts")
      .select(`
        *,
        fact_documents (
          document_id
        )
      `)
      .eq("petition_id", petitionId)
      .order("created_at");

    if (error) throw error;

    return data.map(row => {
      const documentRefs = row.fact_documents?.map(fd => fd.document_id) || [];
      return this.mapFactRowToFact(row, documentRefs);
    });
  }

  /**
   * Exportar petição para formato específico
   */
  static async exportPetition(petitionId: string, format: "docx" | "pdf"): Promise<Blob> {
    const petition = await this.getPetitionById(petitionId);
    if (!petition) throw new Error("Petição não encontrada");

    // TODO: Implementar conversão real para DOCX/PDF
    // Por enquanto, retorna um blob de texto
    const content = petition.content;
    const mimeType = format === "pdf" 
      ? "application/pdf" 
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new Blob([content], { type: mimeType });
  }

  /**
   * Mapear dados do banco para o tipo Petition
   */
  private static mapPetitionRowToPetition(
    row: PetitionRow, 
    documentIds: string[], 
    facts?: Fact[]
  ): Petition {
    return {
      id: row.id,
      title: row.title,
      clientId: row.client_id,
      caseId: row.case_id,
      documentIds,
      content: row.content,
      facts,
      template: row.template || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status as "draft" | "review" | "final",
    };
  }

  /**
   * Mapear dados do banco para o tipo Fact
   */
  private static mapFactRowToFact(row: FactRow, documentRefs?: string[]): Fact {
    return {
      id: row.id,
      type: row.type as "contratual" | "processual" | "probatório" | "comunicação",
      text: row.text,
      documentRefs,
      tags: row.tags || undefined,
      confidence: row.confidence || undefined,
    };
  }
}