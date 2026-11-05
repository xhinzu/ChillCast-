import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  const supabase = await createClient();
  const adminClient = createAdminClient() || supabase;

  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  // Fetch active room
  const { data: room, error: roomError } = await adminClient
    .from('rooms')
    .select('*')
    .eq('code', code)
    .is('ended_at', null)
    .maybeSingle();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found or has ended' }, { status: 404 });
  }

  // Fetch queue items ordered by position
  const { data: queue, error: queueError } = await adminClient
    .from('room_queue')
    .select('*')
    .eq('room_code', code)
    .order('position', { ascending: true });

  if (queueError) {
    return NextResponse.json({ error: 'Failed to load room queue' }, { status: 500 });
  }

  // Caller identity (optional check)
  const caller = await getRoomCaller(request, code);

  return NextResponse.json({
    room,
    queue: queue || [],
    viewer: caller,
  });
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

  const supabase = await createClient();
  const adminClient = createAdminClient() || supabase;
  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  // Fetch room to check host
  const { data: room } = await adminClient
    .from('rooms')
    .select('host_id')
    .eq('code', code)
    .is('ended_at', null)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.host_id !== caller.id) {
    return NextResponse.json({ error: 'Only the host can end the room' }, { status: 403 });
  }

  // Mark room as ended
  const now = new Date().toISOString();
  await adminClient.from('rooms').update({ ended_at: now }).eq('code', code);

  return NextResponse.json({ success: true, message: 'Room ended successfully' });
}

