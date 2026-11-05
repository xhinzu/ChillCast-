import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import type { AuthContextValue } from '@/types/auth';

/**
 * Hook to access current authenticated user, profile, and auth methods.
 * Safe to call anywhere in the tree. Defaults to guest mode if not logged in.
 */
export function useUser(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context;
}

