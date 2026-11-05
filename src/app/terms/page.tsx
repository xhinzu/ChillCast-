'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 sm:p-12 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
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
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Last updated: November 2026. Please read these terms carefully before accessing or
            creating an account on ChillCast.
          </p>
        </div>

        {/* Section 1: Overview */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">1. Acceptance of Terms</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            By accessing ChillCast (or creating an optional account), you agree to be bound by these
            Terms of Service. If you do not agree, you may continue enjoying ChillCast in guest mode
            or discontinue use.
          </p>
        </div>

        {/* Section 2: Account Responsibilities */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">2. User Accounts & Security</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            If you create an account, you are responsible for maintaining the confidentiality of your
            credentials and for all activities under your account. You agree not to select abusive,
            defamatory, or impersonating display names.
          </p>
        </div>

        {/* Section 3: Music Streaming & Disclaimers */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">3. Media Playback & Intellectual Property</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            ChillCast is a music exploration client and ambient sound mixer. Music playback is resolved
            through public APIs and user-provided sources. All musical compositions, lyrics, and audio
            recordings remain the copyrighted property of their respective copyright holders.
            ChillCast does not host unauthorized copyrighted media files on its servers.
          </p>
        </div>

        {/* Section 4: Termination */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-zinc-200">4. Account Deletion & Termination</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You may terminate your account at any time using the self-service &ldquo;Delete My Account&rdquo;
            button in your Profile settings. We reserve the right to suspend or terminate accounts
            that attempt to abuse the API, circumvent rate limits, or disrupt the service for other
            listeners.
          </p>
        </div>

        {/* Section 5: Draft notice */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-500 space-y-1">
          <p className="font-semibold text-zinc-400">Notice:</p>
          <p>
            These terms of service are a draft for developmental preview and are subject to review and
            formal legal publication by the project owner.
          </p>
        </div>
      </div>
    </div>
  );
}

