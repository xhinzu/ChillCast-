import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates an administrative Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 * STRICTLY SERVER-SIDE ONLY. Never import or invoke this in client components.
 * Returns null if the service role key is not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

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

