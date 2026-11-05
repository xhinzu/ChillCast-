import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

function sanitizeEnvVar(val?: string): string | null {
  if (!val) return null;
  let cleaned = val.trim().split(/[\r\n]+/)[0].trim();
  const nextVarIdx = cleaned.search(/(?:NEXT_PUBLIC_|SUPABASE_|SPOTIFY_)/);
  if (nextVarIdx > 0) {
    cleaned = cleaned.substring(0, nextVarIdx).trim();
  }
  // Strip trailing quotes, semicolons or spaces
  cleaned = cleaned.replace(/^["']+|["';\s]+$/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Creates an administrative Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 * STRICTLY SERVER-SIDE ONLY. Never import or invoke this in client components.
 * Returns null if the service role key is not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = sanitizeEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (err) {
    console.error('Failed to initialize admin Supabase client:', err);
    return null;
  }
}

