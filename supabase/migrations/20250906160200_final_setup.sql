-- Final setup and data initialization for DocFlow-AI
-- Run this script after all migrations are applied

-- 1. Verify all tables are created correctly
DO $$
DECLARE
  missing_tables TEXT[] := '{}';
  table_name TEXT;
BEGIN
  -- Check for required tables
  FOR table_name IN 
    SELECT unnest(ARRAY['clients', 'cases', 'folders', 'documents', 'petitions', 'facts', 'user_settings', 'classification_rules', 'petition_documents', 'fact_documents', 'audit_log'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All required tables are present ✓';
  END IF;
END $$;

-- 2. Verify storage bucket exists (this will only show a notice, won't fail)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    RAISE NOTICE 'Storage bucket "documents" exists ✓';
  ELSE
    RAISE NOTICE 'Storage bucket "documents" not found - please create it manually in Supabase Dashboard';
  END IF;
END $$;

-- 3. Create default document types for classification
INSERT INTO public.classification_rules (user_id, match_pattern, document_type, priority, enabled)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '(?i)\.pdf$', 'pdf', 10, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)\.(doc|docx)$', 'docx', 10, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)\.(jpg|jpeg|png|gif|bmp)$', 'image', 10, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)\.(mp3|wav|ogg|m4a)$', 'audio', 10, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)\.(mp4|avi|mov|wmv)$', 'video', 10, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)\.(zip|rar|7z)$', 'zip', 10, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)contrato', 'pdf', 20, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)petição|peticao', 'docx', 20, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)protocolo', 'pdf', 15, true),
  ('00000000-0000-0000-0000-000000000000', '(?i)certidão|certidao', 'pdf', 15, true)
ON CONFLICT DO NOTHING;

-- 4. Create system settings template
CREATE OR REPLACE FUNCTION public.get_default_settings()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'naming', jsonb_build_object(
      'pattern', 'DOC n. {seq} - {client} - {date}',
      'uppercaseClient', true,
      'useUnderscores', false,
      'seqResetPerClient', true,
      'dateFormat', 'dd/MM/yyyy'
    ),
    'petition', jsonb_build_object(
      'template', E'# PETIÇÃO INICIAL\n\n**REQUERENTE:** {client}\n**REQUERIDO:** (A ser preenchido)\n\n## I. DOS FATOS\n\n{facts}\n\n## II. DOS DOCUMENTOS\n\n{documents}\n\n## III. DO DIREITO\n\n(Fundamentação jurídica)\n\n## IV. DOS PEDIDOS\n\nRequer-se:\n\na) (Pedido principal)\nb) (Pedidos subsidiários)\n\nLocal, {date}.\n\n_____________________\nAdvogado(a)\nOAB/XX nº XXXXX',
      'factCategories', ARRAY['contratual', 'processual', 'probatório', 'comunicação'],
      'autoExtractFacts', true
    ),
    'classification', jsonb_build_object(
      'enabled', true,
      'rules', '[]'::jsonb
    ),
    'integrations', jsonb_build_object(
      'googleDrive', jsonb_build_object(
        'connected', false,
        'lastSync', null
      )
    )
  );
$$;

-- 5. Create function to initialize user data
CREATE OR REPLACE FUNCTION public.initialize_user_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to initialize data';
  END IF;
  
  -- Create default user settings if they don't exist
  INSERT INTO public.user_settings (
    user_id,
    naming_pattern,
    uppercase_client,
    use_underscores,
    seq_reset_per_client,
    date_format,
    petition_template,
    fact_categories,
    auto_extract_facts,
    classification_enabled,
    google_drive_connected
  ) VALUES (
    auth.uid(),
    'DOC n. {seq} - {client} - {date}',
    true,
    false,
    true,
    'dd/MM/yyyy',
    E'# PETIÇÃO INICIAL\n\n**REQUERENTE:** {client}\n**REQUERIDO:** (A ser preenchido)\n\n## I. DOS FATOS\n\n{facts}\n\n## II. DOS DOCUMENTOS\n\n{documents}\n\n## III. DO DIREITO\n\n(Fundamentação jurídica)\n\n## IV. DOS PEDIDOS\n\nRequer-se:\n\na) (Pedido principal)\nb) (Pedidos subsidiários)\n\nLocal, {date}.\n\n_____________________\nAdvogado(a)\nOAB/XX nº XXXXX',
    ARRAY['contratual', 'processual', 'probatório', 'comunicação'],
    true,
    true,
    false
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'User data initialized successfully for user: %', auth.uid();
END;
$$;

-- 6. Create helpful maintenance functions
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS TABLE (
  stat_name TEXT,
  stat_value BIGINT,
  stat_description TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'total_users', COUNT(*)::BIGINT, 'Total number of users' FROM auth.users
  UNION ALL
  SELECT 'total_clients', COUNT(*)::BIGINT, 'Total number of clients' FROM public.clients
  UNION ALL
  SELECT 'total_cases', COUNT(*)::BIGINT, 'Total number of cases' FROM public.cases
  UNION ALL
  SELECT 'total_documents', COUNT(*)::BIGINT, 'Total number of documents' FROM public.documents WHERE status = 'active'
  UNION ALL
  SELECT 'total_folders', COUNT(*)::BIGINT, 'Total number of folders' FROM public.folders
  UNION ALL
  SELECT 'total_petitions', COUNT(*)::BIGINT, 'Total number of petitions' FROM public.petitions
  UNION ALL
  SELECT 'storage_size_bytes', COALESCE(SUM(size), 0)::BIGINT, 'Total storage used in bytes' FROM public.documents WHERE status = 'active'
  ORDER BY stat_name;
$$;

-- 7. Create cleanup function for test data
CREATE OR REPLACE FUNCTION public.cleanup_test_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Only allow cleanup if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Delete test documents first (to respect foreign keys)
  DELETE FROM public.documents 
  WHERE user_id = auth.uid() 
    AND (name ILIKE '%teste%' OR name ILIKE '%example%' OR name ILIKE '%demo%');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete test petitions
  DELETE FROM public.petitions 
  WHERE user_id = auth.uid() 
    AND (title ILIKE '%teste%' OR title ILIKE '%example%' OR title ILIKE '%demo%');
  
  -- Delete test folders
  DELETE FROM public.folders 
  WHERE user_id = auth.uid() 
    AND (name ILIKE '%teste%' OR name ILIKE '%example%' OR name ILIKE '%demo%');
  
  -- Delete test cases
  DELETE FROM public.cases 
  WHERE user_id = auth.uid() 
    AND (name ILIKE '%teste%' OR name ILIKE '%example%' OR name ILIKE '%demo%');
  
  -- Delete test clients
  DELETE FROM public.clients 
  WHERE user_id = auth.uid() 
    AND (name ILIKE '%teste%' OR name ILIKE '%example%' OR name ILIKE '%demo%');
  
  RETURN deleted_count;
END;
$$;

-- 8. Grant permissions on new functions
GRANT EXECUTE ON FUNCTION public.initialize_user_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_test_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_settings() TO authenticated;

-- 9. Final verification queries
SELECT 'Migration completed successfully! 🎉' as status;

-- Show summary of created objects
SELECT 
  schemaname as schema,
  tablename as table_name,
  'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'cases', 'folders', 'documents', 'petitions', 'facts', 'user_settings')

UNION ALL

SELECT 
  n.nspname as schema,
  p.proname as function_name,
  'function' as object_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_next_doc_number', 'build_folder_path', 'get_folder_stats', 'initialize_user_data')

ORDER BY object_type, table_name;

-- Add final documentation
COMMENT ON DATABASE postgres IS 'DocFlow-AI Database - Legal Document Management System';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 DocFlow-AI Database Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create the "documents" storage bucket in Supabase Dashboard';
  RAISE NOTICE '2. Apply storage policies for the documents bucket';
  RAISE NOTICE '3. Configure authentication providers if needed';
  RAISE NOTICE '4. Run: SELECT public.initialize_user_data(); after first user login';
  RAISE NOTICE '';
  RAISE NOTICE 'Test with: SELECT * FROM public.get_system_stats();';
  RAISE NOTICE '';
END $$;