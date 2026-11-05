import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';
import { canControlPlayback } from '@/lib/rooms/permissions';
import { checkRateLimit } from '@/lib/rooms/rate-limit';

const stateUpdateSchema = z.object({
  status: z.enum(['playing', 'paused']),
  positionMs: z.number().min(0),
  queueItemId: z.string().nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const caller = await getRoomCaller(request, code);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized to update room state' }, { status: 401 });
  }

  // Rate limit actions per caller (max 30 per minute)
  const { allowed } = checkRateLimit(`state:${caller.id}`, 30, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient() || supabase;
  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  // Fetch current room
  const { data: room, error: roomError } = await adminClient
    .from('rooms')
    .select('*')
    .eq('code', code)
    .is('ended_at', null)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Check permission
  if (!canControlPlayback(room, caller.id)) {
    return NextResponse.json(
      { error: 'Only the host is allowed to control playback in this room.' },
      { status: 403 }
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = stateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid state payload' },
      { status: 400 }
    );
  }

  const currentVersion = room.state?.version || 1;
  const nextVersion = currentVersion + 1;
  const now = Date.now();

  const nextState = {
    queueItemId:
      parsed.data.queueItemId !== undefined
        ? parsed.data.queueItemId
        : room.state?.queueItemId || null,
    status: parsed.data.status,
    positionMs: Math.round(parsed.data.positionMs),
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
    return NextResponse.json({ error: 'Failed to update room state' }, { status: 500 });
  }

  return NextResponse.json({
    state: updatedRoom.state,
  });
}

