import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSafeRedirectUrl } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const errorDescription =
    requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  const safeRedirectPath = getSafeRedirectUrl(next, '/');

  // Determine correct redirect URL handling Vercel reverse proxy headers
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  let targetUrl: string;

  if (isLocalEnv) {
    targetUrl = new URL(safeRedirectPath, request.url).toString();
  } else if (forwardedHost) {
    targetUrl = `https://${forwardedHost}${safeRedirectPath}`;
  } else {
    targetUrl = new URL(safeRedirectPath, request.url).toString();
  }

  if (errorDescription) {
    const errorUrl = new URL(targetUrl);
    errorUrl.searchParams.set('auth_error', errorDescription);
    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(targetUrl);

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies();
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Apply cookies to both the cookieStore and the NextResponse object
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Supabase code exchange error:', error.message);
        const errUrl = new URL(targetUrl);
        errUrl.searchParams.set('auth_error', error.message);
        return NextResponse.redirect(errUrl);
      }
    }
  }

  return response;
}
