import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';
import { canAddSong, canModifyQueueItem } from '@/lib/rooms/permissions';
import { checkRateLimit } from '@/lib/rooms/rate-limit';

const addQueueSchema = z.object({
  video_id: z.string().min(1),
  title: z.string().min(1).max(200),
  artist: z.string().max(200).default(''),
  thumbnail: z.string().default(''),
  duration_sec: z.number().int().min(0).default(0),
  playNext: z.boolean().default(false),
});

const reorderSchema = z.object({
  itemId: z.string().uuid(),
  newPosition: z.number().int().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const caller = await getRoomCaller(request, code);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized to add songs' }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`queue:${caller.id}`, 30, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient() || supabase;
  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  const { data: room } = await adminClient
    .from('rooms')
    .select('*')
    .eq('code', code)
    .is('ended_at', null)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (!canAddSong(room, caller.id)) {
    return NextResponse.json({ error: 'Only the host is allowed to add songs to this room.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = addQueueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid track payload' }, { status: 400 });
  }

  // Check queue length cap (max 100 items)
  const { data: existingQueue, count } = await adminClient
    .from('room_queue')
    .select('id, video_id, position', { count: 'exact' })
    .eq('room_code', code)
    .order('position', { ascending: true });

  const currentCount = count || existingQueue?.length || 0;
  if (currentCount >= 100) {
    return NextResponse.json({ error: 'Room queue is full (maximum 100 songs).' }, { status: 400 });
  }

  // Check duplicate warning
  const isDuplicate = Boolean(existingQueue?.some((item) => item.video_id === parsed.data.video_id));

  // Determine insert position
  let insertPosition = currentCount;
  if (parsed.data.playNext && room.state?.queueItemId && existingQueue) {
    const currentIndex = existingQueue.findIndex((i) => i.id === room.state.queueItemId);
    if (currentIndex !== -1) {
      insertPosition = currentIndex + 1;
      // Shift subsequent items down
      for (let i = existingQueue.length - 1; i >= insertPosition; i--) {
        await adminClient
          .from('room_queue')
          .update({ position: i + 1 })
          .eq('id', existingQueue[i].id);
      }
    }
  }

  const { data: newItem, error: insertError } = await adminClient
    .from('room_queue')
    .insert({
      room_code: code,
      position: insertPosition,
      video_id: parsed.data.video_id,
      title: parsed.data.title,
      artist: parsed.data.artist,
      thumbnail: parsed.data.thumbnail,
      duration_sec: parsed.data.duration_sec,
      added_by: {
        id: caller.id,
        name: caller.name,
        avatar: caller.avatar,
      },
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: 'Failed to insert track into queue' }, { status: 500 });
  }

  // If no track is currently playing, start this track immediately!
  if (!room.state?.queueItemId) {
    await adminClient
      .from('rooms')
      .update({
        state: {
          queueItemId: newItem.id,
          status: 'playing',
          positionMs: 0,
          serverTimeMs: Date.now(),
          version: (room.state?.version || 1) + 1,
        },
        last_active_at: new Date().toISOString(),
      })
      .eq('code', code);
  }

  return NextResponse.json({
    item: newItem,
    hasDuplicate: isDuplicate,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const caller = await getRoomCaller(request, code);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient() || supabase;
  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  const { data: room } = await adminClient
    .from('rooms')
    .select('*')
    .eq('code', code)
    .is('ended_at', null)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reorder payload' }, { status: 400 });
  }

  // Get item
  const { data: targetItem } = await adminClient
    .from('room_queue')
    .select('*')
    .eq('id', parsed.data.itemId)
    .eq('room_code', code)
    .single();

  if (!targetItem) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
  }

  if (!canModifyQueueItem(room, targetItem, caller.id)) {
    return NextResponse.json({ error: 'Only the host or track adder can move this item' }, { status: 403 });
  }

  // Fetch all items ordered
  const { data: items } = await adminClient
    .from('room_queue')
    .select('*')
    .eq('room_code', code)
    .order('position', { ascending: true });

  if (!items) return NextResponse.json({ success: true });

  const currentIndex = items.findIndex((i) => i.id === parsed.data.itemId);
  if (currentIndex === -1) return NextResponse.json({ success: true });

  const [moved] = items.splice(currentIndex, 1);
  const targetIndex = Math.max(0, Math.min(items.length, parsed.data.newPosition));
  items.splice(targetIndex, 0, moved);

  // Update positions in batch
  for (let idx = 0; idx < items.length; idx++) {
    if (items[idx].position !== idx) {
      await adminClient.from('room_queue').update({ position: idx }).eq('id', items[idx].id);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const caller = await getRoomCaller(request, code);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get('itemId');
  if (!itemId) {
    return NextResponse.json({ error: 'itemId query parameter required' }, { status: 400 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient() || supabase;
  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  const { data: room } = await adminClient
    .from('rooms')
    .select('*')
    .eq('code', code)
    .is('ended_at', null)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { data: targetItem } = await adminClient
    .from('room_queue')
    .select('*')
    .eq('id', itemId)
    .eq('room_code', code)
    .single();

  if (!targetItem) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
  }

  if (!canModifyQueueItem(room, targetItem, caller.id)) {
    return NextResponse.json({ error: 'Only the host or track adder can remove this item' }, { status: 403 });
  }

  await adminClient.from('room_queue').delete().eq('id', itemId);

  // If the removed item was currently playing, advance to next
  if (room.state?.queueItemId === itemId) {
    const { data: nextItem } = await adminClient
      .from('room_queue')
      .select('*')
      .eq('room_code', code)
      .gt('position', targetItem.position)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();

    await adminClient
      .from('rooms')
      .update({
        state: {
          queueItemId: nextItem ? nextItem.id : null,
          status: nextItem ? 'playing' : 'paused',
          positionMs: 0,
          serverTimeMs: Date.now(),
          version: (room.state?.version || 1) + 1,
        },
      })
      .eq('code', code);
  }

  return NextResponse.json({ success: true });
}

