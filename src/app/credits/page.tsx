'use client';

import React from 'react';
import Link from 'next/link';
import { ASSET_MANIFEST, ASSET_LICENSES } from '@/lib/lyrics/visuals/manifest';

export default function CreditsPage() {
  const assets = Object.values(ASSET_MANIFEST);

  // Group assets by license
  const byLicense = assets.reduce<Record<string, typeof assets>>((acc, asset) => {
    acc[asset.license] = acc[asset.license] || [];
    acc[asset.license].push(asset);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 sm:p-12 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-4 border-b border-zinc-800 pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Player
          </Link>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Asset Credits & Legal Licenses
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            ChillCast features curated concept art, vector illustrations, and line iconography
            designed to elevate synced lyric visualization. All assets are sourced exclusively under
            permissive open-source and Creative Commons licenses allowing use in public web applications.
          </p>
        </div>

        {/* License Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(ASSET_LICENSES).map(([key, info]) => (
            <div
              key={key}
              className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{info.name}</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Permissive
                </span>
              </div>
              <a
                href={info.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-400 hover:underline block break-all"
              >
                {info.url}
              </a>
            </div>
          ))}
        </div>

        {/* Assets Listing by License */}
        <div className="space-y-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-200">
            Active Artworks ({assets.length} Manifest Entries)
          </h2>

          {Object.entries(byLicense).map(([license, items]) => (
            <div key={license} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-rose-400">{license}</h3>
                <span className="text-xs text-zinc-500">({items.length} assets)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-center gap-3"
                  >
                    <span
                      className="w-8 h-8 flex items-center justify-center shrink-0"
                      dangerouslySetInnerHTML={{ __html: item.illustratedSvg }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{item.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Attribution Notice */}
        <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800/60 text-xs text-zinc-500 space-y-2">
          <p className="font-semibold text-zinc-400">Notice of Attribution:</p>
          <p>
            - Microsoft Fluent Emoji is copyright (c) Microsoft Corporation and licensed under the MIT License.
          </p>
          <p>
            - Lucide Icons is copyright (c) Lucide Contributors and licensed under the ISC License.
          </p>
          <p>
            - Game-icons.net icons are created by Lorc, Delapouite, and contributors under the CC BY 3.0 License.
          </p>
          <p>
            - Original vector adaptations and lyric lexicon mappings are copyright (c) Myujiku / ChillCast Contributors.
          </p>
        </div>
      </div>
    </div>
  );
}
