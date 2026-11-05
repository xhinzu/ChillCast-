-- ============================================================
-- Fix RLS Policies for ChillCast Together Rooms & Queue
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/drtakajdrpcuklkrjdye/sql
-- ============================================================

-- 1. Policies for public.rooms:
drop policy if exists "Authenticated users can create rooms" on public.rooms;
create policy "Authenticated users can create rooms"
  on public.rooms
  for insert
  to authenticated
  with check (auth.uid() = host_id);

drop policy if exists "Hosts can update own rooms" on public.rooms;
create policy "Hosts can update own rooms"
  on public.rooms
  for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

drop policy if exists "Hosts can delete own rooms" on public.rooms;
create policy "Hosts can delete own rooms"
  on public.rooms
  for delete
  to authenticated
  using (auth.uid() = host_id);

-- 2. Policies for public.room_queue:
drop policy if exists "Users can insert queue items" on public.room_queue;
create policy "Users can insert queue items"
  on public.room_queue
  for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Users can update queue items" on public.room_queue;
create policy "Users can update queue items"
  on public.room_queue
  for update
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "Users can delete queue items" on public.room_queue;
create policy "Users can delete queue items"
  on public.room_queue
  for delete
  to authenticated, anon
  using (true);
