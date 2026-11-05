import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  discord_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signInWithDiscord: (redirectTo?: string) => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error?: string; confirmationRequired?: boolean }>;
  forgotPassword: (email: string) => Promise<{ error?: string; success?: boolean }>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<{ error?: string; profile?: Profile }>;
  refreshProfile: () => Promise<void>;
}

