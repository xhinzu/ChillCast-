import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Strict allowlist: ensures redirect only navigates to valid same-origin paths
  const safeRedirectPath = getSafeRedirectUrl(next, '/');

  if (errorDescription) {
    const errorUrl = new URL('/', request.url);
    errorUrl.searchParams.set('auth_error', errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Supabase code exchange error:', error.message);
        const errorUrl = new URL('/', request.url);
        errorUrl.searchParams.set('auth_error', error.message);
        return NextResponse.redirect(errorUrl);
      }
    }
  }

  // Safe internal redirect
  const redirectTarget = new URL(safeRedirectPath, request.url);
  return NextResponse.redirect(redirectTarget);
}

