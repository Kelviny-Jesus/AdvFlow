import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Client } from "@/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export class ClientService {
  /**
   * Buscar todos os clientes do usuário logado
   */
  static async getClients(): Promise<Client[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.user.id)
      .order("name");

    if (error) throw error;

    return data.map(this.mapClientRowToClient);
  }

  /**
   * Buscar cliente por ID
   */
  static async getClientById(id: string): Promise<Client | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return this.mapClientRowToClient(data);
  }

  /**
   * Criar novo cliente
   */
  static async createClient(clientData: Omit<Client, "id" | "createdAt" | "casesCount">): Promise<Client> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const insertData: ClientInsert = {
      name: clientData.name,
      email: clientData.email || null,
      phone: clientData.phone || null,
      user_id: user.user.id,
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return this.mapClientRowToClient(data);
  }

  /**
   * Atualizar cliente
   */
  static async updateClient(id: string, updates: Partial<Omit<Client, "id" | "createdAt">>): Promise<Client> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const updateData: ClientUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.email !== undefined && { email: updates.email || null }),
      ...(updates.phone !== undefined && { phone: updates.phone || null }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.user.id)
      .select()
      .single();

    if (error) throw error;

    return this.mapClientRowToClient(data);
  }

  /**
   * Deletar cliente
   */
  static async deleteClient(id: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.user.id);

    if (error) throw error;
  }

  /**
   * Buscar clientes por nome (busca)
   */
  static async searchClients(query: string): Promise<Client[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.user.id)
      .ilike("name", `%${query}%`)
      .order("name");

    if (error) throw error;

    return data.map(this.mapClientRowToClient);
  }

  /**
   * Contar casos do cliente
   */
  static async getClientCasesCount(clientId: string): Promise<number> {
    const { count, error } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Mapear dados do banco para o tipo Client
   */
  private static mapClientRowToClient(row: ClientRow): Client {
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      createdAt: row.created_at,
    };
  }
}