import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton browser Supabase client.
 * Returns null if Supabase environment variables are missing (guest mode).
 */
export function getSupabaseBrowserClient(
  overrideUrl?: string,
  overrideKey?: string
): SupabaseClient | null {
  const supabaseUrl = overrideUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = overrideKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
}

