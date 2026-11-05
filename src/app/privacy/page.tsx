'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 sm:p-12 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-4 border-b border-zinc-800 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Player
          </Link>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono uppercase tracking-wide">
            Draft — To be reviewed by the owner
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Last updated: November 2026. This policy describes how ChillCast handles your personal
            data in a transparent, privacy-first manner.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">1. Information We Collect</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            ChillCast requires no account to use—guest mode is the default and provides full access
            to ambient audio, playlists, and synced lyrics. If you choose to create an account, we
            collect only the minimal data necessary to provide personalized account features:
          </p>
          <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1.5 pl-2">
            <li>
              <strong className="text-zinc-200">Email Address:</strong> Used strictly for account
              authentication, security notices, and password recovery.
            </li>
            <li>
              <strong className="text-zinc-200">Display Name:</strong> A chosen pseudonym (2–24
              characters) shown on your user menu and profile.
            </li>
            <li>
              <strong className="text-zinc-200">Avatar Image:</strong> Your public profile avatar
              (imported from Discord if you sign in via Discord OAuth, or generated default initials).
            </li>
            <li>
              <strong className="text-zinc-200">Discord ID (Optional):</strong> If you authenticate
              via Discord, we store your unique Discord account identifier solely to link your session.
              We do not request or access your guilds, friends list, or messages.
            </li>
          </ul>
        </div>

        {/* Section 2: How We Use Your Data */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">2. We Never Sell Your Data</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            We respect your privacy. ChillCast does <strong className="text-white">NOT</strong> sell,
            rent, trade, or monetize your personal information to third-party data brokers or
            advertisers. Your data is used exclusively to maintain your login session and store your
            profile preferences.
          </p>
        </div>

        {/* Section 3: Third-Party Authentication & Hosting */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">3. Authentication & Hosting Infrastructure</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            User credentials and authentication sessions are secured via Supabase Auth using
            industry-standard encryption and secure HTTP cookies. When you sign in with Discord,
            authentication tokens are handled securely and we only request basic profile and email
            identities.
          </p>
        </div>

        {/* Section 4: Data Rights & Deletion */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">4. Data Export & Deletion on Request</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You maintain full sovereignty over your data:
          </p>
          <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1.5 pl-2">
            <li>
              <strong className="text-zinc-200">Download Data:</strong> You can export a full JSON
              archive of your account information at any time from your Profile settings.
            </li>
            <li>
              <strong className="text-zinc-200">Delete Account:</strong> You can permanently delete
              your profile and authentication record with one click in your Profile settings. Deletion
              is instant and irreversible.
            </li>
          </ul>
        </div>

        {/* Section 5: Notice */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-500 space-y-1">
          <p className="font-semibold text-zinc-400">Notice:</p>
          <p>
            This privacy statement is a draft for developmental preview and is subject to review and
            formal legal publication by the project owner.
          </p>
        </div>
      </div>
    </div>
  );
}

