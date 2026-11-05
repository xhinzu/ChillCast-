import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';
import { isVoteSkipPassed } from '@/lib/rooms/permissions';

const voteSkipStore = new Map<string, Set<string>>(); // `${roomCode}:${queueItemId}` -> Set of userIds

const voteSchema = z.object({
  queueItemId: z.string(),
  totalMembers: z.number().int().min(1),
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
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid vote payload' }, { status: 400 });
  }

  // If host votes or room control is host-only and host votes, skip directly
  if (room.host_id === caller.id) {
    // Advance queue
    const { data: currentItem } = await adminClient
      .from('room_queue')
      .select('position')
      .eq('id', parsed.data.queueItemId)
      .single();

    const currentPos = currentItem?.position ?? -1;

    const { data: nextItem } = await adminClient
      .from('room_queue')
      .select('*')
      .eq('room_code', code)
      .gt('position', currentPos)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();

    const nextState = {
      queueItemId: nextItem ? nextItem.id : null,
      status: nextItem ? 'playing' : 'paused',
      positionMs: 0,
      serverTimeMs: Date.now(),
      version: (room.state?.version || 1) + 1,
    };

    await adminClient.from('rooms').update({ state: nextState }).eq('code', code);
    return NextResponse.json({ skipped: true, votes: 1, required: 1 });
  }

  // Track member vote
  const voteKey = `${code}:${parsed.data.queueItemId}`;
  let voters = voteSkipStore.get(voteKey);
  if (!voters) {
    voters = new Set<string>();
    voteSkipStore.set(voteKey, voters);
  }

  voters.add(caller.id);
  const currentVotes = voters.size;
  const passed = isVoteSkipPassed(currentVotes, parsed.data.totalMembers);

  if (passed) {
    voteSkipStore.delete(voteKey);

    const { data: currentItem } = await adminClient
      .from('room_queue')
      .select('position')
      .eq('id', parsed.data.queueItemId)
      .single();

    const currentPos = currentItem?.position ?? -1;

    const { data: nextItem } = await adminClient
      .from('room_queue')
      .select('*')
      .eq('room_code', code)
      .gt('position', currentPos)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();

    const nextState = {
      queueItemId: nextItem ? nextItem.id : null,
      status: nextItem ? 'playing' : 'paused',
      positionMs: 0,
      serverTimeMs: Date.now(),
      version: (room.state?.version || 1) + 1,
    };

    await adminClient.from('rooms').update({ state: nextState }).eq('code', code);
    return NextResponse.json({ skipped: true, votes: currentVotes, totalMembers: parsed.data.totalMembers });
  }

  return NextResponse.json({ skipped: false, votes: currentVotes, totalMembers: parsed.data.totalMembers });
}

