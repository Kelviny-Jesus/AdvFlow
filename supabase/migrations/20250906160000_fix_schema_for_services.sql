-- Fix DocFlow-AI Schema for Backend Services Integration
-- This migration corrects the database schema to match our TypeScript services

-- 1. Fix documents table status values to match DocumentService expectations
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE public.documents 
ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.documents 
ADD CONSTRAINT documents_status_check 
CHECK (status IN ('active', 'deleted', 'processing', 'completed', 'error'));

-- 2. Fix facts table type values to match TypeScript types with proper Portuguese
ALTER TABLE public.facts 
DROP CONSTRAINT IF EXISTS facts_type_check;

ALTER TABLE public.facts 
ADD CONSTRAINT facts_type_check 
CHECK (type IN ('contratual', 'processual', 'probatório', 'comunicação'));

-- Update existing records to use correct Portuguese
UPDATE public.facts SET type = 'probatório' WHERE type = 'probatorio';
UPDATE public.facts SET type = 'comunicação' WHERE type = 'comunicacao';

-- 3. Fix user_settings fact_categories to match TypeScript types
UPDATE public.user_settings 
SET fact_categories = ARRAY['contratual', 'processual', 'probatório', 'comunicação']
WHERE fact_categories = ARRAY['contratual', 'processual', 'probatorio', 'comunicacao'];

-- Update default value for new records
ALTER TABLE public.user_settings 
ALTER COLUMN fact_categories SET DEFAULT ARRAY['contratual', 'processual', 'probatório', 'comunicação'];

-- 4. Create performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON public.documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_client_id ON public.folders(client_id);
CREATE INDEX IF NOT EXISTS idx_folders_case_id ON public.folders(case_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);

CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

CREATE INDEX IF NOT EXISTS idx_petitions_client_id ON public.petitions(client_id);
CREATE INDEX IF NOT EXISTS idx_petitions_case_id ON public.petitions(case_id);
CREATE INDEX IF NOT EXISTS idx_petitions_user_id ON public.petitions(user_id);

CREATE INDEX IF NOT EXISTS idx_facts_petition_id ON public.facts(petition_id);
CREATE INDEX IF NOT EXISTS idx_facts_user_id ON public.facts(user_id);

-- 5. Create storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 6. Create storage policies for documents bucket
CREATE POLICY "Users can upload their own documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. Enable realtime for main tables (optional but recommended)
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.petitions;

-- 8. Create helpful functions for the application

-- Function to get next document number for a client
CREATE OR REPLACE FUNCTION public.get_next_doc_number(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Count active documents for the client
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO next_number
  FROM public.documents
  WHERE client_id = p_client_id 
    AND status = 'active'
    AND user_id = auth.uid();
  
  -- Return formatted document number
  RETURN 'DOC n. ' || LPAD(next_number::TEXT, 3, '0');
END;
$$;

-- Function to create folder path
CREATE OR REPLACE FUNCTION public.build_folder_path(p_parent_id UUID, p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_path TEXT;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN p_name;
  END IF;
  
  SELECT path INTO parent_path
  FROM public.folders
  WHERE id = p_parent_id
    AND user_id = auth.uid();
    
  IF parent_path IS NULL THEN
    RETURN p_name;
  END IF;
  
  RETURN parent_path || '/' || p_name;
END;
$$;

-- Function to update folder counts (trigger function)
CREATE OR REPLACE FUNCTION public.update_folder_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function would update folder counts when documents/subfolders are added/removed
  -- For now, we'll calculate counts dynamically in the services
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant storage permissions
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

-- 10. Create sample data insertion function for testing
CREATE OR REPLACE FUNCTION public.create_sample_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sample_client_id UUID;
  sample_case_id UUID;
  sample_folder_id UUID;
BEGIN
  -- Only create if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Create sample client
  INSERT INTO public.clients (user_id, name, email, phone)
  VALUES (auth.uid(), 'Cliente Exemplo', 'exemplo@email.com', '(11) 99999-9999')
  RETURNING id INTO sample_client_id;
  
  -- Create sample case
  INSERT INTO public.cases (user_id, client_id, name, reference, description, status)
  VALUES (
    auth.uid(), 
    sample_client_id, 
    'Processo Trabalhista Exemplo', 
    '5005719-85.2024.4.03.6109',
    'Ação trabalhista por rescisão indireta - dados de exemplo',
    'active'
  )
  RETURNING id INTO sample_case_id;
  
  -- Create sample client folder
  INSERT INTO public.folders (user_id, client_id, name, kind, path)
  VALUES (
    auth.uid(),
    sample_client_id,
    'Cliente Exemplo',
    'client',
    'Cliente Exemplo'
  )
  RETURNING id INTO sample_folder_id;
  
  -- Create sample case folder
  INSERT INTO public.folders (user_id, client_id, case_id, parent_id, name, kind, path)
  VALUES (
    auth.uid(),
    sample_client_id,
    sample_case_id,
    sample_folder_id,
    'Processo Trabalhista Exemplo',
    'case',
    'Cliente Exemplo/Processo Trabalhista Exemplo'
  );
  
  -- Create sample user settings
  INSERT INTO public.user_settings (user_id, naming_pattern, petition_template)
  VALUES (
    auth.uid(),
    'DOC n. {seq} - {client} - {date}',
    E'# PETIÇÃO INICIAL\n\n**REQUERENTE:** {client}\n**REQUERIDO:** (A ser preenchido)\n\n## I. DOS FATOS\n\n{facts}\n\n## II. DOS DOCUMENTOS\n\n{documents}\n\n## III. DO DIREITO\n\n(Fundamentação jurídica)\n\n## IV. DOS PEDIDOS\n\nRequer-se:\n\na) (Pedido principal)\nb) (Pedidos subsidiários)\n\nLocal, {date}.\n\n_____________________\nAdvogado(a)\nOAB/XX nº XXXXX'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
END;
$$;

-- Add helpful comments
COMMENT ON TABLE public.clients IS 'Clientes do escritório de advocacia';
COMMENT ON TABLE public.cases IS 'Casos jurídicos associados aos clientes';
COMMENT ON TABLE public.folders IS 'Estrutura hierárquica de pastas para organização';
COMMENT ON TABLE public.documents IS 'Documentos armazenados no sistema';
COMMENT ON TABLE public.petitions IS 'Petições geradas automaticamente';
COMMENT ON TABLE public.facts IS 'Fatos extraídos dos documentos para petições';
COMMENT ON TABLE public.user_settings IS 'Configurações personalizadas do usuário';

COMMENT ON FUNCTION public.get_next_doc_number(UUID) IS 'Gera o próximo número sequencial de documento para um cliente';
COMMENT ON FUNCTION public.build_folder_path(UUID, TEXT) IS 'Constrói o caminho completo de uma pasta baseado na hierarquia';
COMMENT ON FUNCTION public.create_sample_data() IS 'Cria dados de exemplo para testes (apenas para usuário autenticado)';