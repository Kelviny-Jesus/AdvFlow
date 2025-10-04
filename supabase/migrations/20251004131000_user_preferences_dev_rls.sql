-- Dev-only relaxed RLS for local anon role (allows the hardcoded DEV_USER_ID)
-- Safe in production because authenticated users não usam role 'anon'

-- Ajuste o UUID se mudar em src/integrations/supabase/client.ts (DEV_USER_ID)
do $$ begin
  -- Select
  drop policy if exists "dev anon can read own prefs" on public.user_preferences;
  create policy "dev anon can read own prefs"
    on public.user_preferences for select
    using (
      auth.role() = 'anon' and user_id = '48b07eba-b1a8-456f-b124-c46a149eb62a'::uuid
    );

  -- Insert
  drop policy if exists "dev anon can insert own prefs" on public.user_preferences;
  create policy "dev anon can insert own prefs"
    on public.user_preferences for insert
    with check (
      auth.role() = 'anon' and user_id = '48b07eba-b1a8-456f-b124-c46a149eb62a'::uuid
    );

  -- Update
  drop policy if exists "dev anon can update own prefs" on public.user_preferences;
  create policy "dev anon can update own prefs"
    on public.user_preferences for update
    using (
      auth.role() = 'anon' and user_id = '48b07eba-b1a8-456f-b124-c46a149eb62a'::uuid
    )
    with check (
      auth.role() = 'anon' and user_id = '48b07eba-b1a8-456f-b124-c46a149eb62a'::uuid
    );
end $$;


