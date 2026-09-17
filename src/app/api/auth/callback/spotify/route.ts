import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const redirectTarget = new URL('/', req.url);
  if (code) {
    redirectTarget.searchParams.set('spotify_code', code);
  }
  if (error) {
    redirectTarget.searchParams.set('spotify_error', error);
  }

  return NextResponse.redirect(redirectTarget);
}
