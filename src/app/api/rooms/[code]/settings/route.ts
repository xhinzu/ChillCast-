import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { getRoomCaller } from '@/lib/rooms/auth-helper';

const settingsUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  controlPlayback: z.enum(['host', 'everyone']).optional(),
  addSongs: z.enum(['everyone', 'host']).optional(),
  locked: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(20).optional(),
});

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

  if (room.host_id !== caller.id) {
    return NextResponse.json({ error: 'Only the host can modify room settings' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid settings' }, { status: 400 });
  }

  const nextSettings = {
    ...room.settings,
    ...(parsed.data.controlPlayback ? { controlPlayback: parsed.data.controlPlayback } : {}),
    ...(parsed.data.addSongs ? { addSongs: parsed.data.addSongs } : {}),
    ...(parsed.data.locked !== undefined ? { locked: parsed.data.locked } : {}),
    ...(parsed.data.maxMembers ? { maxMembers: parsed.data.maxMembers } : {}),
  };

  const nextName = parsed.data.name || room.name;

  const { data: updated, error } = await adminClient
    .from('rooms')
    .update({
      name: nextName,
      settings: nextSettings,
      last_active_at: new Date().toISOString(),
    })
    .eq('code', code)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({ room: updated });
}

