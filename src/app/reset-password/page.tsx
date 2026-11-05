'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { resetPasswordSchema } from '@/lib/auth/validation';
import { getFriendlyAuthErrorMessage } from '@/lib/auth/errors';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg('Authentication is not configured in this environment.');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(getFriendlyAuthErrorMessage(error));
        return;
      }

      setSuccessMsg('Your password has been successfully updated! Redirecting to player...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setErrorMsg(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
      <div className="w-full max-w-md bg-[#121214] border border-[#26262a] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group mb-2">
            <div className="relative w-10 h-10">
              <Image
                src="/myujiku-logo.png"
                alt="ChillCast"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <span className="font-bold text-lg tracking-tight">ChillCast</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
          <p className="text-xs text-zinc-400">
            Please choose a secure new password of at least 8 characters.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <span className="shrink-0 mt-0.5">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        {!successMsg ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block" htmlFor="new-password">
                New Password (min 8 characters)
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  disabled={isLoading}
                  className="w-full h-10 rounded-xl bg-[#1a1a20] border border-[#2e2e38] focus:border-zinc-400 text-white placeholder-zinc-500 text-xs pl-3.5 pr-10 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={isLoading}
                className="w-full h-10 rounded-xl bg-[#1a1a20] border border-[#2e2e38] focus:border-zinc-400 text-white placeholder-zinc-500 text-xs px-3.5 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              )}
              <span>Update Password</span>
            </button>
          </form>
        ) : (
          <div className="text-center pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
            >
              Go to Player Now
            </Link>
          </div>
        )}

        <div className="text-center pt-2 border-t border-[#222228]">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← Back to ChillCast Player
          </Link>
        </div>
      </div>
    </div>
  );
}

