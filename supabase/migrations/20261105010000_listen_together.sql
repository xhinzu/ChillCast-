-- ==============================================================================
-- ChillCast Supabase Database Migration: Listen Together Rooms & Queue
-- Run this in the Supabase Dashboard -> SQL Editor (or via Supabase CLI: supabase db push)
-- ==============================================================================

-- 1. Create rooms table
create table if not exists public.rooms (
  code text primary key,
  name text not null default 'ChillCast Listening Room',
  host_id text not null,
  settings jsonb not null default '{
    "controlPlayback": "host",
    "addSongs": "everyone",
    "locked": false,
    "maxMembers": 12
  }'::jsonb,
  state jsonb not null default '{
    "queueItemId": null,
    "status": "paused",
    "positionMs": 0,
    "serverTimeMs": 0,
    "version": 1
  }'::jsonb,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  ended_at timestamptz null
);

-- Index for querying active rooms
create index if not exists idx_rooms_active on public.rooms(code) where ended_at is null;
create index if not exists idx_rooms_last_active on public.rooms(last_active_at);

-- 2. Create room_queue table
create table if not exists public.room_queue (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  position int not null,
  video_id text not null,
  title text not null,
  artist text not null default '',
  thumbnail text not null default '',
  duration_sec int not null default 0,
  added_by jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now()
);

-- Index for ordering queue by room & position
create index if not exists idx_room_queue_order on public.room_queue(room_code, position);

-- 3. Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.room_queue enable row level security;

-- Policies for public.rooms:
-- Anyone can view rooms that have not ended
drop policy if exists "Anyone can view active rooms" on public.rooms;
create policy "Anyone can view active rooms"
  on public.rooms
  for select
  using (ended_at is null);

-- Full access for service_role (all authoritative mutations are verified and executed by server route handlers)
drop policy if exists "Service role has full access to rooms" on public.rooms;
create policy "Service role has full access to rooms"
  on public.rooms
  for all
  using (true)
  with check (true);

-- Policies for public.room_queue:
-- Anyone can view queue items
drop policy if exists "Anyone can view room queue" on public.room_queue;
create policy "Anyone can view room queue"
  on public.room_queue
  for select
  using (true);

-- Full access for service_role
drop policy if exists "Service role has full access to room_queue" on public.room_queue;
create policy "Service role has full access to room_queue"
  on public.room_queue
  for all
  using (true)
  with check (true);

-- 4. Enable Supabase Realtime broadcast and postgres_changes
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_queue'
  ) then
    alter publication supabase_realtime add table public.room_queue;
  end if;
end $$;

-- 5. Helper function to clean up rooms idle for over 24 hours
create or replace function public.cleanup_idle_rooms()
returns int
language plpgsql
security definer
as $$
declare
  cleaned_count int;
begin
  update public.rooms
  set ended_at = now()
  where ended_at is null
    and last_active_at < now() - interval '24 hours';

  get diagnostics cleaned_count = row_count;
  return cleaned_count;
end;
$$;

