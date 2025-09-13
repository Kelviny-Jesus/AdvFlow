import { supabase } from "@/integrations/supabase/client";
import { withErrorHandling } from "@/lib/errors";

export class FactStoreService {
  static async saveSynthesisFact(text: string, documentIds: string[]): Promise<string> {
    return withErrorHandling(async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error('Usuário não autenticado');

      const { data: fact, error } = await supabase
        .from('facts')
        .insert({
          petition_id: null,
          type: 'comunicação',
          text,
          user_id: user.user.id,
        })
        .select('*')
        .single();
      if (error) throw error;

      const factId = fact.id as string;
      if (documentIds && documentIds.length > 0) {
        const rows = documentIds.map((docId) => ({ fact_id: factId, document_id: docId }));
        const { error: linkErr } = await supabase.from('fact_documents').insert(rows);
        if (linkErr) throw linkErr;
      }

      return factId;
    }, 'FactStoreService.saveSynthesisFact');
  }
}


