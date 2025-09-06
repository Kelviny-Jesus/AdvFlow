-- Enable RLS on existing tables that were missing it
ALTER TABLE public.user_files_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for existing tables
CREATE POLICY "Users can manage their own file logs" 
ON public.user_files_log 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tokens" 
ON public.user_google_tokens 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own profile" 
ON public.users 
FOR ALL 
USING (auth.uid() = id);

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.get_user_profile(p_wa_id_or_email text)
 RETURNS TABLE(user_id uuid, client_name text, preferred_root text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT u.id,
         COALESCE(NULLIF(u.full_name, ''), 'CLIENTE') AS client_name,
         '01_Active_Cases'::text AS preferred_root
  FROM public.users u
  WHERE u.wa_id = p_wa_id_or_email OR u.email = p_wa_id_or_email
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_token(p_wa_id text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, token_id uuid, access_token text, refresh_token text, scope text, token_type text, expiry_date timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT u.id AS user_id,
         t.id AS token_id,
         t.access_token,
         t.refresh_token,
         t.scope,
         t.token_type,
         t.expiry_date
  FROM public.users u
  JOIN public.user_google_tokens t ON t.user_id = u.id
  WHERE (p_wa_id IS NOT NULL AND u.wa_id = p_wa_id)
     OR (p_email IS NOT NULL AND u.email = p_email)
  ORDER BY t.updated_at DESC
  LIMIT 1;
$function$;