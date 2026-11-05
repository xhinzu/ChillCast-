import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGuestToken } from './tokens';

export interface RoomCaller {
  id: string;
  name: string;
  avatar: string | null;
  isGuest: boolean;
}

/**
 * Resolves the identity of a room API caller.
 * Checks for a signed-in Supabase user first (via Authorization Bearer JWT or cookies).
 * If not signed in, verifies the room guest token from headers or cookies.
 */
export async function getRoomCaller(
  request: NextRequest,
  roomCode: string
): Promise<RoomCaller | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // 1. Check for authenticated Supabase session
  try {
    const supabase = await createClient(request);
    const admin = createAdminClient();
    const client = admin || supabase;
    let user = null;

    if (token && client) {
      const { data } = await client.auth.getUser(token);
      if (data?.user) {
        user = data.user;
      }
    }

    if (!user && supabase) {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        user = data.user;
      }
    }

    if (user && client) {
        // Fetch user profile
        const { data: profile } = await client
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        const name =
          profile?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Chill Member';
        const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || null;

        return {
          id: user.id,
          name,
          avatar,
          isGuest: false,
        };
      }
  } catch {
    // Fallback to guest token
  }

  // 2. Check for signed guest token in Authorization header or cookie
  const guestToken = token || request.cookies.get(`chillcast_guest_${roomCode}`)?.value || null;

  if (guestToken) {
    const payload = verifyGuestToken(guestToken);
    if (payload && payload.roomCode === roomCode) {
      return {
        id: payload.guestId,
        name: payload.nickname,
        avatar: null,
        isGuest: true,
      };
    }
  }

  return null;
}
