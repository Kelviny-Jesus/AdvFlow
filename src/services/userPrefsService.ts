import { supabase } from "@/integrations/supabase/client";

export type CloudUserPrefs = {
  docFontFamily?: string;
  docFontSize?: number;
  docLineSpacing?: number;
  ragEnabled?: boolean;
  ragTopK?: number;
  // assets
  letterheadUrl?: string;
  letterheadPath?: string;
  signatureUrl?: string;
  signaturePath?: string;
};

const TABLE = "user_preferences"; // opcional; se não existir, fazemos fallback silencioso

export async function getCloudUserPrefs(): Promise<CloudUserPrefs | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return null;
    const { data, error } = await supabase
      .from(TABLE as any)
      .select("prefs")
      .eq("user_id", user.user.id)
      .limit(1);
    if (error) return null;
    if (Array.isArray(data)) return (data[0] as any)?.prefs || null;
    return (data as any)?.prefs || null;
  } catch {
    return null;
  }
}

export async function saveCloudUserPrefs(prefs: CloudUserPrefs): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return;
    // merge com prefs existentes
    let current: any = {};
    try {
      const existing = await getCloudUserPrefs();
      if (existing) current = existing;
    } catch {}
    const merged = { ...current, ...prefs };
    const payload = { user_id: user.user.id, prefs: merged, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from(TABLE as any)
      .upsert(payload, { onConflict: "user_id" } as any);
    if (error) {
      // tabela pode não existir no ambiente – ignorar
      // eslint-disable-next-line no-console
      console.warn("saveCloudUserPrefs warning:", error.message);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("saveCloudUserPrefs failed", e);
  }
}


