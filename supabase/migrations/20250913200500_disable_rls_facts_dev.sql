-- Development-only: disable RLS on facts and fact_documents to allow inserts without JWT
ALTER TABLE public.facts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_documents DISABLE ROW LEVEL SECURITY;


