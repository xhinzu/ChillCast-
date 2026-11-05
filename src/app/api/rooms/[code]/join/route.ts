import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeRoomCode } from '@/lib/rooms/code';
import { signGuestToken } from '@/lib/rooms/tokens';
import { checkRateLimit } from '@/lib/rooms/rate-limit';
import { sanitizeDisplayName } from '@/lib/auth/validation';

const joinSchema = z.object({
  nickname: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  // 1. Rate limit per IP
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const { allowed } = checkRateLimit(`join:${clientIp}`, 10, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many join attempts. Please wait a moment.' },
      { status: 429 }
    );
  }

  const supabase = await createClient(request);
  const adminClient = createAdminClient() || supabase;
  if (!adminClient) {
    return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
  }

  // 2. Query room
  const { data: room, error: roomError } = await adminClient
    .from('rooms')
    .select('*')
    .eq('code', code)
    .is('ended_at', null)
    .maybeSingle();

  if (roomError || !room) {
    return NextResponse.json({ error: 'Room does not exist or has expired.' }, { status: 404 });
  }

  // 3. Resolve user identity (signed-in vs guest)
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;

  // Check Bearer token first
  if (token) {
    try {
      const authClient = adminClient || supabase!;
      const { data: userData } = await authClient.auth.getUser(token);
      if (userData?.user) {
        user = userData.user;
      }
    } catch {
      user = null;
    }
  }

  // Fall back to cookie session from request if token didn't yield a user
  if (!user && supabase) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        user = userData.user;
      }
    } catch {
      user = null;
    }
  }

  let body: { nickname?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body fallback
  }
  const parsed = joinSchema.safeParse(body);

  let memberId: string;
  let memberName: string;
  let memberAvatar: string | null = null;
  let isGuest = true;
  let guestToken: string | null = null;

  if (user) {
    // Authenticated user
    memberId = user.id;
    isGuest = false;

    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    memberName =
      profile?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Chill Listener';
    memberAvatar = profile?.avatar_url || user.user_metadata?.avatar_url || null;
  } else {
    // Guest user
    const rawNickname = parsed.success ? parsed.data.nickname : undefined;
    let sanitized = sanitizeDisplayName(rawNickname || '');
    if (!sanitized || sanitized.length < 2) {
      sanitized = `Listener_${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (sanitized.length > 24) {
      sanitized = sanitized.slice(0, 24);
    }

    memberId = `guest_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    memberName = sanitized;
    isGuest = true;

    // Issue signed guest token
    guestToken = signGuestToken({
      guestId: memberId,
      nickname: memberName,
      roomCode: code,
    });
  }

  // 4. Check room lock status
  if (room.settings?.locked && room.host_id !== memberId) {
    return NextResponse.json(
      { error: 'This room is currently locked by the host.' },
      { status: 403 }
    );
  }

  // Update room activity timestamp
  await adminClient
    .from('rooms')
    .update({ last_active_at: new Date().toISOString() })
    .eq('code', code);

  // Fetch queue items ordered by position
  const { data: queueItems } = await adminClient
    .from('room_queue')
    .select('*')
    .eq('room_code', code)
    .order('position', { ascending: true });

  const memberPayload = {
    id: memberId,
    name: memberName,
    avatar: memberAvatar,
    isHost: room.host_id === memberId,
    isGuest,
    joinedAt: Date.now(),
  };

  const response = NextResponse.json({
    room,
    queue: queueItems || [],
    member: memberPayload,
    memberInfo: memberPayload,
    guestToken,
  });

  // Set cookie for guest if token was created
  if (guestToken) {
    response.cookies.set(`chillcast_guest_${code}`, guestToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 3600,
    });
  }

  return response;
}

