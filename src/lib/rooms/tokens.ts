import crypto from 'crypto';

export interface GuestTokenPayload {
  guestId: string;
  nickname: string;
  roomCode: string;
  exp: number; // expiry timestamp in ms
}

const TOKEN_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.GUEST_TOKEN_SECRET ||
  'chillcast-listen-together-fallback-secret-2026';

/**
 * Creates an HMAC-SHA256 signed room-scoped token for guests.
 * Token expires in 24 hours.
 */
export function signGuestToken(payload: Omit<GuestTokenPayload, 'exp'>, ttlMs: number = 24 * 3600 * 1000): string {
  const fullPayload: GuestTokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and parses a signed guest token.
 * Returns null if invalid or expired.
 */
export function verifyGuestToken(token: string | null | undefined): GuestTokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  // Constant-time comparison
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as GuestTokenPayload;

    if (!payload.guestId || !payload.roomCode || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

