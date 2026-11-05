import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

function sanitizeEnvVar(val?: string): string | null {
  if (!val) return null;
  let cleaned = val.trim().split(/[\r\n]+/)[0].trim();
  const nextVarIdx = cleaned.search(/(?:NEXT_PUBLIC_|SUPABASE_|SPOTIFY_)/);
  if (nextVarIdx > 0) {
    cleaned = cleaned.substring(0, nextVarIdx).trim();
  }
  cleaned = cleaned.replace(/^["']+|["';\s]+$/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Creates a server Supabase client using App Router cookies.
 * Accepts an optional NextRequest for Route Handlers to ensure all request cookies are read.
 * Returns null if Supabase environment variables are missing (guest mode).
 */
export async function createClient(request?: NextRequest): Promise<SupabaseClient | null> {
  const supabaseUrl = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // cookies() unavailable in non-request contexts
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (request) {
          const reqCookies = request.cookies.getAll();
          if (reqCookies && reqCookies.length > 0) {
            return reqCookies;
          }
        }
        return cookieStore ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        try {
          if (cookieStore) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore!.set(name, value, options)
            );
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

