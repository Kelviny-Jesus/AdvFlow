-- Create table: user_preferences
create table if not exists public.user_preferences (
  user_id uuid primary key,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If your project stores users in public.users with UUID PK, keep FK below.
-- If you prefer auth.users, switch the referenced relation accordingly.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  ) then
    alter table public.user_preferences
      add constraint user_preferences_user_id_fkey
      foreign key (user_id) references public.users(id)
      on delete cascade;
  end if;
exception when duplicate_object then
  -- constraint already exists
  null;
end $$;

-- Enable Row Level Security
alter table public.user_preferences enable row level security;

-- Policies: only owner can read/write
drop policy if exists "user can read own prefs" on public.user_preferences;
create policy "user can read own prefs"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user can upsert own prefs" on public.user_preferences;
create policy "user can upsert own prefs"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user can update own prefs" on public.user_preferences;
create policy "user can update own prefs"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful index
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);


