-- Advanced Features and Triggers for DocFlow-AI
-- This migration adds triggers, audit functions, and advanced features

-- 1. Create audit log table for tracking changes
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for audit log - users can only see their own actions
CREATE POLICY "Users can view their own audit log" 
ON public.audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Index for audit log performance
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- 2. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Create audit trigger function
CREATE OR REPLACE FUNCTION public.create_audit_log_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields TEXT[] := '{}';
  field_name TEXT;
BEGIN
  -- Skip if this is a system user or no auth context
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- For UPDATE operations, determine which fields changed
  IF TG_OP = 'UPDATE' THEN
    FOR field_name IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = TG_TABLE_NAME
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      -- Compare old and new values (simplified check)
      IF (to_jsonb(OLD) ->> field_name) IS DISTINCT FROM (to_jsonb(NEW) ->> field_name) THEN
        changed_fields := array_append(changed_fields, field_name);
      END IF;
    END LOOP;
  END IF;

  -- Insert audit log entry
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    user_id,
    action,
    old_data,
    new_data,
    changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN changed_fields ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Create triggers for updated_at on all main tables
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petitions_updated_at
  BEFORE UPDATE ON public.petitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classification_rules_updated_at
  BEFORE UPDATE ON public.classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create audit triggers for main tables (optional - enable if needed)
-- Uncomment these if you want detailed audit logging

/*
CREATE TRIGGER audit_clients_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_entry();

CREATE TRIGGER audit_cases_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_entry();

CREATE TRIGGER audit_documents_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.create_audit_log_entry();
*/

-- 6. Create function to clean old audit logs (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_log
  WHERE created_at < (now() - INTERVAL '1 day' * days_to_keep);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 7. Create function to get folder statistics
CREATE OR REPLACE FUNCTION public.get_folder_stats(p_folder_id UUID DEFAULT NULL)
RETURNS TABLE (
  folder_id UUID,
  folder_name TEXT,
  documents_count BIGINT,
  subfolders_count BIGINT,
  total_size BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE folder_tree AS (
    -- Base case: start with specified folder or all root folders
    SELECT f.id, f.name, f.parent_id, f.path
    FROM public.folders f
    WHERE f.user_id = auth.uid()
      AND (p_folder_id IS NULL AND f.parent_id IS NULL OR f.id = p_folder_id)
    
    UNION ALL
    
    -- Recursive case: get all subfolders
    SELECT f.id, f.name, f.parent_id, f.path
    FROM public.folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
    WHERE f.user_id = auth.uid()
  ),
  folder_stats AS (
    SELECT 
      ft.id as folder_id,
      ft.name as folder_name,
      COALESCE(COUNT(d.id), 0) as documents_count,
      COALESCE(SUM(d.size), 0) as total_size
    FROM folder_tree ft
    LEFT JOIN public.documents d ON d.folder_id = ft.id AND d.status = 'active'
    GROUP BY ft.id, ft.name
  ),
  subfolder_stats AS (
    SELECT 
      COALESCE(f.parent_id, f.id) as parent_folder_id,
      COUNT(CASE WHEN f.parent_id IS NOT NULL THEN 1 END) as subfolders_count
    FROM folder_tree f
    GROUP BY COALESCE(f.parent_id, f.id)
  )
  SELECT 
    fs.folder_id,
    fs.folder_name,
    fs.documents_count,
    COALESCE(ss.subfolders_count, 0) as subfolders_count,
    fs.total_size
  FROM folder_stats fs
  LEFT JOIN subfolder_stats ss ON ss.parent_folder_id = fs.folder_id
  ORDER BY fs.folder_name;
END;
$$;

-- 8. Create function to search documents with full text search
CREATE OR REPLACE FUNCTION public.search_documents_fulltext(
  p_search_term TEXT,
  p_client_id UUID DEFAULT NULL,
  p_case_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  doc_number TEXT,
  type TEXT,
  client_name TEXT,
  case_name TEXT,
  folder_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  relevance_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.doc_number,
    d.type,
    c.name as client_name,
    cs.name as case_name,
    COALESCE(f.path, '') as folder_path,
    d.created_at,
    -- Simple relevance scoring based on term frequency
    (
      CASE WHEN d.name ILIKE '%' || p_search_term || '%' THEN 0.5 ELSE 0 END +
      CASE WHEN d.doc_number ILIKE '%' || p_search_term || '%' THEN 0.3 ELSE 0 END +
      CASE WHEN d.description ILIKE '%' || p_search_term || '%' THEN 0.2 ELSE 0 END
    )::REAL as relevance_score
  FROM public.documents d
  INNER JOIN public.clients c ON c.id = d.client_id
  INNER JOIN public.cases cs ON cs.id = d.case_id
  LEFT JOIN public.folders f ON f.id = d.folder_id
  WHERE d.user_id = auth.uid()
    AND d.status = 'active'
    AND (
      d.name ILIKE '%' || p_search_term || '%' OR
      d.doc_number ILIKE '%' || p_search_term || '%' OR
      d.description ILIKE '%' || p_search_term || '%' OR
      c.name ILIKE '%' || p_search_term || '%' OR
      cs.name ILIKE '%' || p_search_term || '%'
    )
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
    AND (p_case_id IS NULL OR d.case_id = p_case_id)
  ORDER BY relevance_score DESC, d.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 9. Create function to validate folder hierarchy
CREATE OR REPLACE FUNCTION public.validate_folder_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent circular references in folder hierarchy
  IF NEW.parent_id IS NOT NULL THEN
    -- Check if the new parent would create a cycle
    IF EXISTS (
      WITH RECURSIVE folder_path AS (
        SELECT id, parent_id, 1 as level
        FROM public.folders
        WHERE id = NEW.parent_id AND user_id = auth.uid()
        
        UNION ALL
        
        SELECT f.id, f.parent_id, fp.level + 1
        FROM public.folders f
        INNER JOIN folder_path fp ON f.id = fp.parent_id
        WHERE fp.level < 100 -- Prevent infinite recursion
      )
      SELECT 1 FROM folder_path WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected in folder hierarchy';
    END IF;
  END IF;

  -- Auto-build path for new folders
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.name != NEW.name OR OLD.parent_id IS DISTINCT FROM NEW.parent_id)) THEN
    NEW.path := public.build_folder_path(NEW.parent_id, NEW.name);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for folder hierarchy validation
CREATE TRIGGER validate_folder_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_folder_hierarchy();

-- 10. Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_folder_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_documents_fulltext(TEXT, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs(INTEGER) TO authenticated;

-- 11. Create helpful views for common queries
CREATE VIEW public.document_summary AS
SELECT 
  d.id,
  d.name,
  d.doc_number,
  d.type,
  d.size,
  d.created_at,
  c.name as client_name,
  cs.name as case_name,
  f.path as folder_path,
  d.user_id
FROM public.documents d
INNER JOIN public.clients c ON c.id = d.client_id
INNER JOIN public.cases cs ON cs.id = d.case_id
LEFT JOIN public.folders f ON f.id = d.folder_id
WHERE d.status = 'active';

-- RLS for the view
ALTER VIEW public.document_summary SET (security_invoker = true);

-- Add comments for documentation
COMMENT ON FUNCTION public.get_folder_stats(UUID) IS 'Retorna estatísticas de uma pasta incluindo contagem de documentos e subpastas';
COMMENT ON FUNCTION public.search_documents_fulltext(TEXT, UUID, UUID, INTEGER) IS 'Busca documentos com pontuação de relevância';
COMMENT ON FUNCTION public.cleanup_old_audit_logs(INTEGER) IS 'Remove logs de auditoria antigos (padrão: 90 dias)';
COMMENT ON FUNCTION public.validate_folder_hierarchy() IS 'Valida hierarquia de pastas e previne referências circulares';

COMMENT ON TABLE public.audit_log IS 'Log de auditoria para rastrear mudanças nas tabelas principais';
COMMENT ON VIEW public.document_summary IS 'Visão resumida de documentos com informações de cliente e caso';