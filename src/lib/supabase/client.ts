import { createBrowserClient } from '@supabase/ssr';
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

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton browser Supabase client.
 * Returns null if Supabase environment variables are missing (guest mode).
 */
export function getSupabaseBrowserClient(
  overrideUrl?: string,
  overrideKey?: string
): SupabaseClient | null {
  const supabaseUrl = sanitizeEnvVar(overrideUrl || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = sanitizeEnvVar(overrideKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
}

