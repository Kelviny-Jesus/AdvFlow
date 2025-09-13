-- Enable and set row-level security policies for facts and fact_documents

-- facts
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS facts_select_own ON public.facts;
DROP POLICY IF EXISTS facts_insert_own ON public.facts;
DROP POLICY IF EXISTS facts_update_own ON public.facts;
DROP POLICY IF EXISTS facts_delete_own ON public.facts;

CREATE POLICY facts_select_own ON public.facts
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY facts_insert_own ON public.facts
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY facts_update_own ON public.facts
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY facts_delete_own ON public.facts
FOR DELETE USING (user_id = auth.uid());

-- fact_documents
ALTER TABLE public.fact_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fact_documents_select_own ON public.fact_documents;
DROP POLICY IF EXISTS fact_documents_insert_own ON public.fact_documents;

-- A linha é visível se o usuário for dono do fato e do documento relacionados
CREATE POLICY fact_documents_select_own ON public.fact_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.facts f
    WHERE f.id = fact_documents.fact_id AND f.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = fact_documents.document_id AND d.user_id = auth.uid()
  )
);

-- Só pode inserir vínculos quando for dono do fato e do documento
CREATE POLICY fact_documents_insert_own ON public.fact_documents
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.facts f
    WHERE f.id = fact_documents.fact_id AND f.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = fact_documents.document_id AND d.user_id = auth.uid()
  )
);


