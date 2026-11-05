import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';
import { isValidTrackEndEvent } from '@/lib/rooms/permissions';

const nextSchema = z.object({
  queueItemId: z.string(),
  version: z.number().int(),
});

export async function POST(
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
  const parsed = nextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid track-end payload' }, { status: 400 });
  }

  const currentVersion = room.state?.version || 1;
  const currentQueueItemId = room.state?.queueItemId;

  // De-duplicate: ignore if version has already advanced or queueItemId differs
  if (!isValidTrackEndEvent(currentVersion, currentQueueItemId, parsed.data.version, parsed.data.queueItemId)) {
    return NextResponse.json({
      deDuplicated: true,
      message: 'Event was already processed by another listener',
      state: room.state,
    });
  }

  // Get current item to know position
  const { data: currentItem } = await adminClient
    .from('room_queue')
    .select('position')
    .eq('id', parsed.data.queueItemId)
    .single();

  const currentPos = currentItem?.position ?? -1;

  // Find next item in queue
  const { data: nextItem } = await adminClient
    .from('room_queue')
    .select('*')
    .eq('room_code', code)
    .gt('position', currentPos)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextVersion = currentVersion + 1;
  const now = Date.now();

  const nextState = {
    queueItemId: nextItem ? nextItem.id : null,
    status: nextItem ? 'playing' : 'paused',
    positionMs: 0,
    serverTimeMs: now,
    version: nextVersion,
  };

  const { data: updatedRoom, error: updateError } = await adminClient
    .from('rooms')
    .update({
      state: nextState,
      last_active_at: new Date().toISOString(),
    })
    .eq('code', code)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to advance room queue' }, { status: 500 });
  }

  return NextResponse.json({
    state: updatedRoom.state,
    nextItem: nextItem || null,
  });
}

