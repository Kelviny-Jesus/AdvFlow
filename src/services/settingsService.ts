import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Settings } from "@/types";

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type UserSettingsInsert = Database["public"]["Tables"]["user_settings"]["Insert"];
type UserSettingsUpdate = Database["public"]["Tables"]["user_settings"]["Update"];

export class SettingsService {
  /**
   * Buscar configurações do usuário
   */
  static async getUserSettings(): Promise<Settings> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Configurações não existem, criar com padrões
        return await this.createDefaultSettings();
      }
      throw error;
    }

    return this.mapUserSettingsRowToSettings(data);
  }

  /**
   * Criar configurações padrão para novo usuário
   */
  static async createDefaultSettings(): Promise<Settings> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const defaultSettings: UserSettingsInsert = {
      user_id: user.user.id,
      naming_pattern: "DOC n. {seq} - {client} - {date}",
      uppercase_client: true,
      use_underscores: false,
      seq_reset_per_client: true,
      date_format: "dd/MM/yyyy",
      petition_template: `# Fatos INICIAL

**REQUERENTE:** {client}
**REQUERIDO:** (A ser preenchido)

## I. DOS FATOS

{facts}

## II. DOS DOCUMENTOS

{documents}

## III. DO DIREITO

(Fundamentação jurídica)

## IV. DOS PEDIDOS

Requer-se:

a) (Pedido principal)
b) (Pedidos subsidiários)

Local, {date}.

_____________________
Advogado(a)
OAB/XX nº XXXXX`,
      fact_categories: ["contratual", "processual", "probatório", "comunicação"],
      auto_extract_facts: true,
      classification_enabled: true,
      google_drive_connected: false,
    };

    const { data, error } = await supabase
      .from("user_settings")
      .insert(defaultSettings)
      .select()
      .single();

    if (error) throw error;

    return this.mapUserSettingsRowToSettings(data);
  }

  /**
   * Atualizar configurações do usuário
   */
  static async updateUserSettings(updates: Partial<Settings>): Promise<Settings> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    const updateData: UserSettingsUpdate = {
      ...(updates.naming?.pattern && { naming_pattern: updates.naming.pattern }),
      ...(updates.naming?.uppercaseClient !== undefined && { uppercase_client: updates.naming.uppercaseClient }),
      ...(updates.naming?.useUnderscores !== undefined && { use_underscores: updates.naming.useUnderscores }),
      ...(updates.naming?.seqResetPerClient !== undefined && { seq_reset_per_client: updates.naming.seqResetPerClient }),
      ...(updates.naming?.dateFormat && { date_format: updates.naming.dateFormat }),
      ...(updates.petition?.template && { petition_template: updates.petition.template }),
      ...(updates.petition?.factCategories && { fact_categories: updates.petition.factCategories }),
      ...(updates.petition?.autoExtractFacts !== undefined && { auto_extract_facts: updates.petition.autoExtractFacts }),
      ...(updates.classification?.enabled !== undefined && { classification_enabled: updates.classification.enabled }),
      ...(updates.integrations?.googleDrive?.connected !== undefined && { google_drive_connected: updates.integrations.googleDrive.connected }),
      ...(updates.integrations?.googleDrive?.lastSync && { google_drive_last_sync: updates.integrations.googleDrive.lastSync }),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_settings")
      .update(updateData)
      .eq("user_id", user.user.id)
      .select()
      .single();

    if (error) throw error;

    return this.mapUserSettingsRowToSettings(data);
  }

  /**
   * Resetar configurações para padrão
   */
  static async resetToDefaults(): Promise<Settings> {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error("Usuário não autenticado");

    // Deletar configurações existentes
    await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", user.user.id);

    // Criar novas configurações padrão
    return await this.createDefaultSettings();
  }

  /**
   * Mapear dados do banco para o tipo Settings
   */
  private static mapUserSettingsRowToSettings(row: UserSettingsRow): Settings {
    return {
      naming: {
        pattern: row.naming_pattern,
        uppercaseClient: row.uppercase_client,
        useUnderscores: row.use_underscores,
        seqResetPerClient: row.seq_reset_per_client,
        dateFormat: row.date_format,
      },
      petition: {
        template: row.petition_template || "",
        factCategories: row.fact_categories,
        autoExtractFacts: row.auto_extract_facts,
      },
      classification: {
        rules: [], // TODO: Implementar regras de classificação
        enabled: row.classification_enabled,
      },
      integrations: {
        googleDrive: {
          connected: row.google_drive_connected,
          lastSync: row.google_drive_last_sync || undefined,
        },
      },
    };
  }
}