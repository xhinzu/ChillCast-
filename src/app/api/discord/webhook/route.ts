import { NextRequest, NextResponse } from 'next/server';

/**
 * Strict regex validation for Discord Webhook URLs:
 * Accepts:
 *   https://discord.com/api/webhooks/<id>/<token>
 *   https://discordapp.com/api/webhooks/<id>/<token>
 *   https://ptb.discord.com/api/webhooks/<id>/<token>
 *   https://canary.discord.com/api/webhooks/<id>/<token>
 * Never logs or stores the webhook URL or payload.
 */
const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:(?:ptb\.|canary\.)?discord(?:app)?\.com)\/api\/webhooks\/\d{17,21}\/[A-Za-z0-9_-]+$/;

// In-memory rate limiting map for relay abuse prevention: max 1 request per 3 seconds per IP
const rateLimitMap = new Map<string, number>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const lastTime = rateLimitMap.get(ip) || 0;
  if (now - lastTime < 3000) {
    return true;
  }
  rateLimitMap.set(ip, now);
  // Periodic cleanup
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now - v > 60000) rateLimitMap.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limited. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const { webhookUrl, method = 'POST', messageId, payload } = body;

    if (!webhookUrl || typeof webhookUrl !== 'string' || !DISCORD_WEBHOOK_REGEX.test(webhookUrl)) {
      return NextResponse.json({ error: 'Invalid Discord webhook URL format' }, { status: 400 });
    }

    let targetUrl = webhookUrl;
    if (method === 'PATCH' || method === 'DELETE') {
      if (!messageId || typeof messageId !== 'string' || !/^\d{17,21}$/.test(messageId)) {
        return NextResponse.json({ error: 'Invalid Discord message ID' }, { status: 400 });
      }
      targetUrl = `${webhookUrl}/messages/${messageId}`;
    } else {
      // POST with wait=true so Discord returns the created message ID
      targetUrl = `${webhookUrl}?wait=true`;
    }

    const discordRes = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method === 'DELETE' ? undefined : JSON.stringify(payload),
    });

    if (discordRes.status === 204 || method === 'DELETE') {
      return NextResponse.json({ success: true });
    }

    if (discordRes.status === 404) {
      // Message deleted or webhook missing
      return NextResponse.json({ error: 'Message not found', notFound: true }, { status: 404 });
    }

    if (discordRes.status === 429) {
      const retryAfter = discordRes.headers.get('retry-after') || '5';
      return NextResponse.json({ error: 'Discord rate limit exceeded', retryAfter }, { status: 429 });
    }

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      return NextResponse.json({ error: `Discord responded with ${discordRes.status}: ${errText}` }, { status: discordRes.status });
    }

    const data = await discordRes.json();
    return NextResponse.json({ success: true, messageId: data.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown relay error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

