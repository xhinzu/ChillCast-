-- ==============================================================================
-- ChillCast Supabase Database Migration: Profiles & Auth Triggers
-- Run this in the Supabase Dashboard -> SQL Editor (or via Supabase CLI: supabase db push)
-- ==============================================================================

-- 1. Create profiles table referencing auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Chill Listener',
  avatar_url text,
  discord_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup by Discord ID
create index if not exists idx_profiles_discord_id on public.profiles(discord_id);

-- Permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on table public.profiles to postgres, anon, authenticated, service_role;

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Row Level Security Policies
-- Users can view their own profile
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can insert their own profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can update only their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can delete their own profile
drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles
  for delete
  using (auth.uid() = id);

-- 4. Public view for future public room/session sharing (display_name and avatar_url only)
create or replace view public.public_profiles as
  select id, display_name, avatar_url
  from public.profiles;

-- Grant select permission on the public view
grant select on public.public_profiles to anon, authenticated;

-- 5. Trigger function to auto-create or update profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  raw_discord_id text;
  raw_display_name text;
  raw_avatar text;
begin
  -- Extract Discord provider id if signed in via Discord OAuth
  if new.raw_app_meta_data->>'provider' = 'discord' then
    raw_discord_id := coalesce(
      new.raw_user_meta_data->>'provider_id',
      new.raw_user_meta_data->>'sub'
    );
  else
    raw_discord_id := null;
  end if;

  -- Extract display name using safe json path traversal (using #>> or -> followed by ->>)
  raw_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data#>>'{custom_claims,global_name}'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Chill Listener'
  );

  -- Sanitize length to 2-24 characters
  if length(raw_display_name) > 24 then
    raw_display_name := substring(raw_display_name from 1 for 24);
  end if;
  if length(raw_display_name) < 2 then
    raw_display_name := 'Chill Listener';
  end if;

  -- Extract avatar URL from Discord or provider metadata
  raw_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (id, display_name, avatar_url, discord_id, created_at, updated_at)
  values (
    new.id,
    raw_display_name,
    raw_avatar,
    raw_discord_id,
    now(),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    discord_id = coalesce(excluded.discord_id, public.profiles.discord_id),
    updated_at = now();

  return new;
exception when others then
  -- Prevent database trigger error from blocking user account creation
  raise warning 'Error creating profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

-- Recreate trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
