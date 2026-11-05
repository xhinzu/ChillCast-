import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyGuestToken } from './tokens';

export interface RoomCaller {
  id: string;
  name: string;
  avatar: string | null;
  isGuest: boolean;
}

/**
 * Resolves the identity of a room API caller.
 * Checks for a signed-in Supabase user first.
 * If not signed in, verifies the room guest token from headers or cookies.
 */
export async function getRoomCaller(
  request: NextRequest,
  roomCode: string
): Promise<RoomCaller | null> {
  // 1. Check for authenticated Supabase session
  try {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile
        const { data: profile } = await supabase
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
    }
  } catch {
    // Fallback to guest token
  }

  // 2. Check for signed guest token in Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = request.cookies.get(`chillcast_guest_${roomCode}`)?.value || null;
  }

  if (token) {
    const payload = verifyGuestToken(token);
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

