import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateRoomCode } from '@/lib/rooms/code';
import { checkRateLimit } from '@/lib/rooms/rate-limit';

const createRoomSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  settings: z
    .object({
      controlPlayback: z.enum(['host', 'everyone']).default('host'),
      addSongs: z.enum(['everyone', 'host']).default('everyone'),
      locked: z.boolean().default(false),
      maxMembers: z.number().int().min(2).max(20).default(12),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  // 1. Check rate limit per IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const { allowed } = checkRateLimit(`create:${clientIp}`, 10, 60000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  // 2. Requires authenticated user to host a room
  const supabase = await createClient(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const adminClient = createAdminClient() || supabase;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  let user = null;

  // Check Bearer token first
  if (token) {
    try {
      const authClient = adminClient || supabase;
      const { data } = await authClient.auth.getUser(token);
      if (data?.user) {
        user = data.user;
      }
    } catch {
      user = null;
    }
  }

  // Fall back to cookie session from request if token didn't yield a user
  if (!user) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        user = data.user;
      }
    } catch {
      user = null;
    }
  }

  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in to create and host a room.' },
      { status: 401 }
    );
  }

  // 3. Parse input
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body fallback
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid room configuration' },
      { status: 400 }
    );
  }

  const roomName = parsed.data.name || 'ChillCast Room';
  const settings = {
    controlPlayback: parsed.data.settings?.controlPlayback || 'host',
    addSongs: parsed.data.settings?.addSongs || 'everyone',
    locked: Boolean(parsed.data.settings?.locked),
    maxMembers: Math.min(20, Math.max(2, parsed.data.settings?.maxMembers || 12)),
  };

  // 4. Generate unique collision-checked room code
  let roomCode = '';
  let attempts = 0;
  while (attempts < 5) {
    const candidate = generateRoomCode();
    const { data: existing } = await adminClient
      .from('rooms')
      .select('code')
      .eq('code', candidate)
      .is('ended_at', null)
      .maybeSingle();

    if (!existing) {
      roomCode = candidate;
      break;
    }
    attempts++;
  }

  if (!roomCode) {
    return NextResponse.json(
      { error: 'Unable to generate unique room code. Please try again.' },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const initialState = {
    queueItemId: null,
    status: 'paused',
    positionMs: 0,
    serverTimeMs: Date.now(),
    version: 1,
  };

  const { data: room, error: insertError } = await adminClient
    .from('rooms')
    .insert({
      code: roomCode,
      name: roomName,
      host_id: user.id,
      settings,
      state: initialState,
      created_at: now,
      last_active_at: now,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create room:', insertError);
    const msg = insertError.code === '42501'
      ? 'Database permission error (RLS). Please add SUPABASE_SERVICE_ROLE_KEY to Vercel Environment Variables or run the RLS policies SQL in Supabase.'
      : (insertError.message || 'Failed to create room in database');
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ room }, { status: 201 });
}

