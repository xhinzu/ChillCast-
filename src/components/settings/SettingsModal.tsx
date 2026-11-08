'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import AppearanceSection from './sections/AppearanceSection';
import GlowSection from './sections/GlowSection';
import AudioSection from './sections/AudioSection';
import PlaybackSection from './sections/PlaybackSection';
import DesktopSection from './sections/DesktopSection';
import DiscordSection from './sections/DiscordSection';
import AccountSection from './sections/AccountSection';
import ShortcutsSection from './sections/ShortcutsSection';
import AboutSection from './sections/AboutSection';
import { useSettings } from '@/lib/settings/useSettings';
import type { AppSettings } from '@/lib/settings/settings-store';

export type SettingsSectionId =
  | 'appearance'
  | 'glow'
  | 'audio'
  | 'playback'
  | 'desktop'
  | 'discord'
  | 'account'
  | 'shortcuts'
  | 'about';

interface SectionMeta {
  id: SettingsSectionId;
  label: string;
  icon: string;
  desc: string;
  keywords: string[];
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: '🎨',
    desc: 'Themes, accent colors, and custom UI styling',
    keywords: ['theme', 'dark', 'light', 'amoled', 'system', 'accent', 'color', 'tint', 'contrast', 'wcag', 'inspect', 'logo'],
  },
  {
    id: 'glow',
    label: 'Glow & Lighting',
    icon: '✨',
    desc: 'Atmospheric UI highlights & lyrics edge glow',
    keywords: ['glow', 'lighting', 'edge', 'bloom', 'aurora', 'vignette', 'conic', 'intensity', 'music sync', 'blur'],
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: '🔊',
    desc: '8D spatial audio, muffled filter, and DSP diagnostics',
    keywords: ['8d', 'spatial', 'orbit', 'binaural', 'panner', 'muffled', 'lowpass', 'dsp', 'filter', 'sweep', 'test', 'audio'],
  },
  {
    id: 'playback',
    label: 'Playback',
    icon: '⏯️',
    desc: 'Autoplay and queue transition preferences',
    keywords: ['autoplay', 'similar', 'queue', 'mix', 'radio', 'loop', 'playback'],
  },
  {
    id: 'desktop',
    label: 'Desktop',
    icon: '🖥️',
    desc: 'System tray, background audio, and window close behavior',
    keywords: ['desktop', 'tray', 'close', 'quit', 'minimize', 'windows', 'startup', 'tauri'],
  },
  {
    id: 'discord',
    label: 'Discord',
    icon: '💬',
    desc: 'Rich Presence, channel webhooks, and custom status',
    keywords: ['discord', 'presence', 'rich presence', 'webhook', 'custom status', 'activity', 'listening to', 'avatar'],
  },
  {
    id: 'account',
    label: 'Account & Sync',
    icon: '👤',
    desc: 'Local-first cloud backup and device sync',
    keywords: ['account', 'sync', 'cloud', 'backup', 'export', 'login', 'supabase', 'discord login', 'playlists'],
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: '⌨️',
    desc: 'Hotkeys and custom key bindings',
    keywords: ['shortcuts', 'hotkeys', 'keyboard', 'bindings', 'keys', 'play', 'pause', 'seek', 'volume'],
  },
  {
    id: 'about',
    label: 'About',
    icon: 'ℹ️',
    desc: 'App version, engine specs, and credits',
    keywords: ['about', 'version', 'credits', 'license', 'specs', 'lyrics settings'],
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSectionId;
}

export default function SettingsModal({ isOpen, onClose, initialSection = 'appearance' }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { resetSection, exportSettings, importSettings } = useSettings();

  // Listen for custom open event with section target
  useEffect(() => {
    const handleOpenWithSection = (e: Event) => {
      const custom = e as CustomEvent<{ section?: SettingsSectionId }>;
      if (custom.detail?.section) {
        setActiveSection(custom.detail.section);
      }
    };
    window.addEventListener('myujiku_open_settings', handleOpenWithSection);
    return () => window.removeEventListener('myujiku_open_settings', handleOpenWithSection);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImportModalOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isImportModalOpen]);

  // Search filtering
  const matchingSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (sec) =>
        sec.label.toLowerCase().includes(q) ||
        sec.desc.toLowerCase().includes(q) ||
        sec.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const currentMeta = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  const handleExport = () => {
    const jsonStr = exportSettings();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myujiku-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError('Please paste or load a valid settings JSON string.');
      return;
    }
    const res = importSettings(importJsonText);
    if (res.success) {
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        setIsImportModalOpen(false);
        setImportJsonText('');
      }, 1000);
    } else {
      setImportError(res.error || 'Failed to import settings');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 titlebar-no-drag"
      data-no-drag="true"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[90vh] max-h-[820px] bg-[#121215] border border-[#26262e] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative text-white animate-in zoom-in-95 duration-150 titlebar-no-drag"
        data-no-drag="true"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─────────────────── TOP HEADER ─────────────────── */}
        <div className="h-14 px-5 border-b border-[#202028] flex items-center justify-between shrink-0 bg-[#151519]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-sm text-zinc-300">
              <Image
                src="/myujiku-logo.png"
                alt="MyuJiku Logo"
                width={24}
                height={24}
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Settings
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">v2.0</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-2.5 py-1 rounded-lg bg-[#202028] hover:bg-[#2c2c36] border border-[#30303e] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Export all settings to JSON file"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-[#202028] hover:bg-[#2c2c36] border border-[#30303e] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              title="Import settings from JSON"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1e1e24] hover:bg-[#2c2c36] text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer ml-1"
              title="Close settings"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─────────────────── MAIN SPLIT BODY ─────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#202028] bg-[#141418] flex flex-col shrink-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-[#202028]">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settings..."
                  className="w-full bg-[#1b1b22] border border-[#2b2b36] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-zinc-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Sections Nav List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 overscroll-contain">
              {matchingSections.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No matching settings found
                </div>
              ) : (
                matchingSections.map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setActiveSection(sec.id)}
                      style={
                        isActive
                          ? {
                              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                              borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                            }
                          : undefined
                      }
                      className={`w-full px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isActive
                          ? 'text-white font-semibold border shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-[#1a1a20]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-sm shrink-0">{sec.icon}</span>
                        <span className="text-xs truncate">{sec.label}</span>
                      </div>
                      {searchQuery && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          match
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT CONTENT PANEL */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0f0f12]">
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-[#202028] bg-[#121216] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentMeta.icon}</span>
                  <span>{currentMeta.label}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{currentMeta.desc}</p>
              </div>

              {currentMeta.id !== 'about' && (
                <button
                  type="button"
                  onClick={() => resetSection(currentMeta.id as keyof AppSettings)}
                  className="px-3 py-1.5 rounded-lg bg-[#1c1c24] hover:bg-[#282832] border border-[#2e2e3a] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title={`Reset ${currentMeta.label} settings to defaults`}
                >
                  Reset Section
                </button>
              )}
            </div>

            {/* Section Component Body */}
            <div
              className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {activeSection === 'appearance' && <AppearanceSection onOpenLyricsSettings={onClose} />}
              {activeSection === 'glow' && <GlowSection />}
              {activeSection === 'audio' && <AudioSection />}
              {activeSection === 'playback' && <PlaybackSection />}
              {activeSection === 'desktop' && <DesktopSection />}
              {activeSection === 'discord' && <DiscordSection />}
              {activeSection === 'account' && <AccountSection />}
              {activeSection === 'shortcuts' && <ShortcutsSection />}
              {activeSection === 'about' && <AboutSection onOpenLyricsSettings={onClose} />}
            </div>

            {/* Footer */}
            <div className="h-14 px-6 border-t border-[#202028] bg-[#121216] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────── IMPORT SETTINGS MODAL POPUP ─────────────────── */}
        {isImportModalOpen && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => setIsImportModalOpen(false)}
          >
            <div
              className="w-full max-w-lg bg-[#16161c] border border-[#2e2e3a] rounded-2xl p-5 space-y-4 text-white shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#262632] pb-3">
                <h4 className="text-sm font-bold text-white">Import Settings</h4>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Paste JSON settings or upload a previously exported <code className="text-zinc-200">.json</code> file.
                Sensitive credentials like webhooks and tokens are safely preserved.
              </p>

              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"appearance": {...}, "glow": {...}}'
                  className="w-full bg-[#101014] border border-[#282834] rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[var(--accent)]"
                />

                <div className="flex items-center justify-between">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[var(--accent)] hover:opacity-80 underline cursor-pointer"
                  >
                    Upload JSON file
                  </button>

                  <span className="text-[10px] text-zinc-500 font-mono">
                    {importJsonText ? `${importJsonText.length} characters` : 'Empty'}
                  </span>
                </div>
              </div>

              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                    color: 'var(--accent)',
                  }}
                  className="p-2.5 rounded-lg border text-xs font-semibold"
                >
                  ✓ Settings successfully imported and applied!
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#262632]">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-[#202028] hover:bg-[#2a2a34] text-xs font-medium text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-contrast)',
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 cursor-pointer shadow"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
