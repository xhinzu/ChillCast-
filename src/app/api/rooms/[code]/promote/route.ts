import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';

const promoteSchema = z.object({
  newHostId: z.string().min(1),
  reason: z.enum(['transfer', 'host_disconnected']).optional(),
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
  const parsed = promoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid promotion payload' }, { status: 400 });
  }

  const isCurrentHost = room.host_id === caller.id;
  const isHostDisconnected = parsed.data.reason === 'host_disconnected';

  if (!isCurrentHost && !isHostDisconnected) {
    return NextResponse.json({ error: 'Only the host or member-fallback can transfer host' }, { status: 403 });
  }

  const { data: updated, error } = await adminClient
    .from('rooms')
    .update({
      host_id: parsed.data.newHostId,
      last_active_at: new Date().toISOString(),
    })
    .eq('code', code)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: 'Failed to update room host' }, { status: 500 });
  }

  // Broadcast host transfer
  const channel = adminClient.channel(`room:${code}`);
  await channel.send({
    type: 'broadcast',
    event: 'host_transferred',
    payload: { newHostId: parsed.data.newHostId, previousHostId: room.host_id },
  });

  return NextResponse.json({ success: true, host_id: updated.host_id });
}

