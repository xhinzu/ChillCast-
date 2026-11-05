'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthContextValue, Profile } from '@/types/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getFriendlyAuthErrorMessage } from '@/lib/auth/errors';
import { profileUpdateSchema } from '@/lib/auth/validation';

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: Profile | null;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
  supabaseUrl,
  supabaseAnonKey,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const supabase = getSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
  const isConfigured = Boolean(
    (supabaseUrl && supabaseAnonKey) ||
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  // Fetch or refresh current user profile
  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch {
      // In guest or offline mode, ignore profile fetch error
    }
  }, [supabase]);

  // Listen for Supabase auth state transitions and hydrate on mount
  useEffect(() => {
    if (!supabase) return;

    // Hydrate user on mount in case session cookie is present
    supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser(currentUser);
        await refreshProfile();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (event === 'SIGNED_OUT' || !sessionUser) {
        setProfile(null);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        await refreshProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, refreshProfile]);

  // Sign in with Discord OAuth (scopes: identify email only)
  const signInWithDiscord = useCallback(
    async (redirectToPath: string = '/'): Promise<{ error?: string }> => {
      if (!supabase) {
        return { error: 'Authentication is not configured. Please set Supabase environment variables.' };
      }

      try {
        setIsLoading(true);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(redirectToPath)}`;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: {
            scopes: 'identify email',
            redirectTo: callbackUrl,
          },
        });

        if (error) {
          return { error: getFriendlyAuthErrorMessage(error) };
        }

        return {};
      } catch (err) {
        return { error: getFriendlyAuthErrorMessage(err) };
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  // Sign in with Email and Password
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!supabase) {
        return { error: 'Authentication is not configured. Please set Supabase environment variables.' };
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return { error: getFriendlyAuthErrorMessage(error) };
        }

        if (data.user) {
          setUser(data.user);
          await refreshProfile();
        }

        return {};
      } catch (err) {
        return { error: getFriendlyAuthErrorMessage(err) };
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, refreshProfile]
  );

  // Sign up with Email and Password
  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error?: string; confirmationRequired?: boolean }> => {
      if (!supabase) {
        return { error: 'Authentication is not configured. Please set Supabase environment variables.' };
      }

      try {
        setIsLoading(true);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const callbackUrl = `${origin}/auth/callback`;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: callbackUrl,
          },
        });

        if (error) {
          return { error: getFriendlyAuthErrorMessage(error) };
        }

        // If email confirmation is required, session will be null
        const confirmationRequired = Boolean(data.user && !data.session);

        if (data.user && data.session) {
          setUser(data.user);
          await refreshProfile();
        }

        return { confirmationRequired };
      } catch (err) {
        return { error: getFriendlyAuthErrorMessage(err) };
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, refreshProfile]
  );

  // Send password reset email
  const forgotPassword = useCallback(
    async (email: string): Promise<{ error?: string; success?: boolean }> => {
      if (!supabase) {
        return { error: 'Authentication is not configured. Please set Supabase environment variables.' };
      }

      try {
        setIsLoading(true);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const resetUrl = `${origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: resetUrl,
        });

        if (error) {
          // Check for rate limit
          if (/rate limit/i.test(error.message)) {
            return { error: 'Too many requests. Please wait a minute before requesting another email.' };
          }
          // Do not leak whether the email exists
        }

        return { success: true };
      } catch {
        return { success: true };
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  // Sign out user
  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Update display name via server route
  const updateDisplayName = useCallback(
    async (displayName: string): Promise<{ error?: string; profile?: Profile }> => {
      try {
        setIsLoading(true);
        const parsed = profileUpdateSchema.safeParse({ display_name: displayName });
        if (!parsed.success) {
          return { error: parsed.error.issues[0].message };
        }

        const res = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: parsed.data.display_name }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { error: data.error || 'Failed to update profile' };
        }

        if (data.profile) {
          setProfile(data.profile);
          return { profile: data.profile };
        }

        await refreshProfile();
        return {};
      } catch (err) {
        return { error: getFriendlyAuthErrorMessage(err) };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshProfile]
  );

  const value: AuthContextValue = {
    user,
    profile,
    isLoading,
    isConfigured,
    signInWithDiscord,
    signInWithEmail,
    signUpWithEmail,
    forgotPassword,
    signOut,
    updateDisplayName,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

