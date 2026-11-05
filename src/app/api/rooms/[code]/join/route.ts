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

  const supabase = await createClient();
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
  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
  if (supabase) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      user = userData.user;
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
    const sanitized = sanitizeDisplayName(rawNickname || '');
    if (!sanitized || sanitized.length < 2) {
      return NextResponse.json(
        { error: 'Please enter a nickname between 2 and 24 characters to join.' },
        { status: 400 }
      );
    }
    if (sanitized.length > 24) {
      return NextResponse.json(
        { error: 'Nickname must be 24 characters or less.' },
        { status: 400 }
      );
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

  const response = NextResponse.json({
    room,
    member: {
      id: memberId,
      name: memberName,
      avatar: memberAvatar,
      isHost: room.host_id === memberId,
      isGuest,
      joinedAt: Date.now(),
    },
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

