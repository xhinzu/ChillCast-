'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { signInSchema, signUpSchema, forgotPasswordSchema } from '@/lib/auth/validation';
import TurnstileWidget from './TurnstileWidget';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultTab = 'signin',
}: AuthModalProps) {
  const {
    signInWithDiscord,
    signInWithEmail,
    signUpWithEmail,
    forgotPassword,
    isLoading,
    isConfigured,
  } = useUser();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [, setTurnstileToken] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Discord OAuth sign-in
  const handleDiscordSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const result = await signInWithDiscord('/');
    if (result.error) {
      setErrorMsg(result.error);
    }
  };

  // Handle Sign In with Email
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = signInSchema.safeParse({ email, password });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    const result = await signInWithEmail(email, password);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      onClose();
    }
  };

  // Handle Sign Up with Email
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = signUpSchema.safeParse({ email, password });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    const result = await signUpWithEmail(email, password);
    if (result.error) {
      setErrorMsg(result.error);
    } else if (result.confirmationRequired) {
      setSuccessMsg(
        'Account created! A verification link has been sent to your email. Please check your inbox to confirm your account.'
      );
    } else {
      onClose();
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || 'Please enter a valid email.');
      return;
    }

    const result = await forgotPassword(email);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setSuccessMsg(
        'If an account exists for this email, a password reset link has been sent. Please check your inbox.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#121214] border border-[#26262a] rounded-2xl shadow-2xl p-6 sm:p-7 relative text-white space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1e1e24] hover:bg-[#2c2c34] text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Not Configured Banner (Guest Mode Fallback) */}
        {!isConfigured && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>⚠️</span> Supabase Not Configured
            </p>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Set <code className="bg-black/40 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="bg-black/40 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment to enable Discord and email sign-in. Guest mode remains fully functional!
            </p>
          </div>
        )}

        {/* Modal Header & Tabs */}
        {mode !== 'forgot' ? (
          <div>
            <div className="flex border-b border-[#24242a] mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors cursor-pointer text-center relative ${
                  mode === 'signin' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Sign In
                {mode === 'signin' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 pb-3 text-sm font-semibold transition-colors cursor-pointer text-center relative ${
                  mode === 'signup' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Create Account
                {mode === 'signup' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {mode === 'signin' ? 'Welcome Back to ChillCast' : 'Create Your Free Account'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {mode === 'signin'
                ? 'Sign in to access your profile and custom settings.'
                : 'Sign up to personalize your ChillCast experience.'}
            </p>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors mb-3 cursor-pointer"
            >
              ← Back to Sign In
            </button>
            <h2 className="text-xl font-bold tracking-tight">Reset Password</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Enter your email address and we will send you a secure link to reset your password.
            </p>
          </div>
        )}

        {/* Discord OAuth Button */}
        {mode !== 'forgot' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleDiscordSignIn}
              disabled={isLoading || !isConfigured}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-white font-semibold text-xs transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Continue with Discord</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#26262c] w-full" />
              <span className="bg-[#121214] px-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
                or with email
              </span>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed flex items-start gap-2">
            <span className="shrink-0 mt-0.5">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email Form */}
        <form
          onSubmit={
            mode === 'signin'
              ? handleSignIn
              : mode === 'signup'
              ? handleSignUp
              : handleForgotPassword
          }
          className="space-y-4"
        >
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block" htmlFor="auth-email">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading || !isConfigured}
              className="w-full h-10 rounded-xl bg-[#1a1a20] border border-[#2e2e38] focus:border-zinc-400 text-white placeholder-zinc-500 text-xs px-3.5 outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Password input (Sign in & Sign up) */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300" htmlFor="auth-password">
                  Password {mode === 'signup' && <span className="text-zinc-500 font-normal">(min 8 characters)</span>}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Create a strong password (8+ chars)' : 'Enter your password'}
                  required
                  disabled={isLoading || !isConfigured}
                  className="w-full h-10 rounded-xl bg-[#1a1a20] border border-[#2e2e38] focus:border-zinc-400 text-white placeholder-zinc-500 text-xs pl-3.5 pr-10 outline-none transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          {/* Optional Cloudflare Turnstile */}
          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isConfigured}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            )}
            <span>
              {mode === 'signin'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Password Reset Link'}
            </span>
          </button>

          {/* Sign up disclaimer */}
          {mode === 'signup' && (
            <p className="text-[11px] text-zinc-400 text-center leading-relaxed pt-1">
              By creating an account, you agree to ChillCast&apos;s{' '}
              <Link
                href="/terms"
                target="_blank"
                className="text-white hover:underline font-medium"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="text-white hover:underline font-medium"
              >
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
