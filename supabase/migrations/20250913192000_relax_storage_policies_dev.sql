-- Relax storage RLS for dev: allow paths starting with the hardcoded DEV user id
-- Keep original rule for authenticated users

-- Drop previous storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Change this to your DEV user id when needed (matches client DEV_USER_ID)
DO $$
DECLARE
  dev_user CONSTANT TEXT := '48b07eba-b1a8-456f-b124-c46a149eb62a';
BEGIN
  -- INSERT
  EXECUTE $$
  CREATE POLICY "documents_insert_dev_or_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] = $$ || quote_literal(dev_user) || $$
    )
  );
  $$;

  -- SELECT
  EXECUTE $$
  CREATE POLICY "documents_select_dev_or_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] = $$ || quote_literal(dev_user) || $$
    )
  );
  $$;

  -- UPDATE
  EXECUTE $$
  CREATE POLICY "documents_update_dev_or_owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] = $$ || quote_literal(dev_user) || $$
    )
  );
  $$;

  -- DELETE
  EXECUTE $$
  CREATE POLICY "documents_delete_dev_or_owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] = $$ || quote_literal(dev_user) || $$
    )
  );
  $$;
END $$;


