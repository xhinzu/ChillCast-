import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const exportPayload = {
    export_version: '1.0',
    export_timestamp: new Date().toISOString(),
    service: 'ChillCast (Myujiku)',
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      identities: user.identities?.map((id) => ({
        provider: id.provider,
        created_at: id.created_at,
        last_sign_in_at: id.last_sign_in_at,
      })),
    },
    profile: profile || null,
    privacy_notice:
      'ChillCast does not sell personal data, track users across the web, or monetize personal information. Account data can be permanently deleted at any time in Profile settings.',
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="chillcast-user-data.json"',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

