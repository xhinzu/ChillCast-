import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';

const kickSchema = z.object({
  targetUserId: z.string(),
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
    .select('host_id')
    .eq('code', code)
    .is('ended_at', null)
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.host_id !== caller.id) {
    return NextResponse.json({ error: 'Only the host can kick members' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = kickSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid kick payload' }, { status: 400 });
  }

  if (parsed.data.targetUserId === caller.id) {
    return NextResponse.json({ error: 'Host cannot kick themselves' }, { status: 400 });
  }

  // Broadcast kick via Realtime channel
  const channel = adminClient.channel(`room:${code}`);
  await channel.send({
    type: 'broadcast',
    event: 'member_kicked',
    payload: { targetUserId: parsed.data.targetUserId },
  });

  return NextResponse.json({ success: true, kickedUserId: parsed.data.targetUserId });
}

