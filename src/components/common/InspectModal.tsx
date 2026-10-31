'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePlayback } from '@/context/PlaybackContext';
import { loadLyricsSettings, LYRICS_SETTINGS_KEY } from '@/lib/lyrics/settings';
import { useQuality } from '@/hooks/useQuality';
import { Z_INDEX } from '@/constants/zIndex';
import { DEV_OVERLAY_STORAGE_KEY } from './DevOverlay';

interface InspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function InspectModal({ isOpen, onClose, triggerRef }: InspectModalProps) {
  const { currentTrack, currentTime, isPlaying, getPlaybackRate, duration, getAudioAnalyser } = usePlayback();
  const playbackRate = typeof getPlaybackRate === 'function' ? getPlaybackRate() : 1.0;
  const { fps, effectiveQuality } = useQuality('auto');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDevOverlay, setShowDevOverlay] = useState(false);
  const [localStorageBytes, setLocalStorageBytes] = useState(0);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setShowDevOverlay(localStorage.getItem(DEV_OVERLAY_STORAGE_KEY) === 'true');

      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          total += (key.length + val.length) * 2;
        }
      }
      setLocalStorageBytes(total);
    } catch {
      // ignore
    }
  }, [isOpen]);

  const handleToggleDevOverlay = (checked: boolean) => {
    setShowDevOverlay(checked);
    try {
      localStorage.setItem(DEV_OVERLAY_STORAGE_KEY, checked ? 'true' : 'false');
      window.dispatchEvent(new Event('myujiku_dev_overlay_updated'));
    } catch {
      // ignore
    }
  };

  // Keyboard navigation & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, triggerRef]);

  // Trap focus initially
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstBtn = modalRef.current.querySelector<HTMLElement>('button');
      firstBtn?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const currentSettings = loadLyricsSettings();
  const analyser = typeof getAudioAnalyser === 'function' ? getAudioAnalyser() : null;
  const audioCtxState = analyser?.context?.state || (isPlaying ? 'running' : 'suspended');

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';
  const gitCommitSha = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || '71dc352';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'Recent';
  const env = process.env.NODE_ENV || 'production';

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A';
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  const trackInfo = currentTrack
    ? {
        id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        duration: currentTrack.duration,
      }
    : null;

  const playerState = {
    currentTime: `${currentTime.toFixed(2)}s`,
    duration: `${duration.toFixed(2)}s`,
    isPlaying,
    playbackRate,
    audioContextState: audioCtxState,
  };

  const handleCopyDebugInfo = async () => {
    const report = [
      '### MyuJiku Debug Report',
      `- App Version: ${appVersion}`,
      `- Git Commit SHA: ${gitCommitSha}`,
      `- Build Time: ${buildTime}`,
      `- Environment: ${env}`,
      `- Viewport: ${viewport} (DPR: ${dpr})`,
      `- User Agent: ${userAgent}`,
      `- Live FPS: ${fps} (Quality: ${effectiveQuality})`,
      `- AudioContext: ${audioCtxState}`,
      `- LocalStorage Used: ${(localStorageBytes / 1024).toFixed(1)} KB`,
      '',
      '#### Current Track',
      '```json',
      JSON.stringify(trackInfo, null, 2),
      '```',
      '',
      '#### Player State',
      '```json',
      JSON.stringify(playerState, null, 2),
      '```',
      '',
      '#### Settings',
      '```json',
      JSON.stringify(currentSettings, null, 2),
      '```',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // fallback
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-modal-title"
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      style={{ zIndex: Z_INDEX.modals }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          triggerRef?.current?.focus();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[85vh] bg-[#111111] border border-[#2b2b2b] rounded-2xl shadow-2xl flex flex-col text-white overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 relative shrink-0">
              <Image
                src="/myujiku-logo.png"
                alt="MyuJiku Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 id="inspect-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>About MyuJiku</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  Inspect
                </span>
              </h2>
              <p className="text-xs text-zinc-400">System diagnostics & debug inspector</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-mono scrollbar-thin scrollbar-thumb-zinc-700">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#181818] border border-[#262626]">
              <span className="text-[10px] text-zinc-500 block uppercase">Version</span>
              <span className="font-bold text-white text-sm">v{appVersion}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#181818] border border-[#262626]">
              <span className="text-[10px] text-zinc-500 block uppercase">Git Commit</span>
              <span className="font-bold text-emerald-400 text-sm truncate block" title={gitCommitSha}>
                {gitCommitSha.slice(0, 7)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#181818] border border-[#262626]">
              <span className="text-[10px] text-zinc-500 block uppercase">Live FPS</span>
              <span className="font-bold text-white text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {fps} FPS
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#181818] border border-[#262626]">
              <span className="text-[10px] text-zinc-500 block uppercase">Storage</span>
              <span className="font-bold text-zinc-300 text-sm">
                {(localStorageBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>

          {/* Toggle Developer Overlay */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between">
            <div>
              <span className="text-zinc-200 font-bold block text-sm">Show Developer Overlay</span>
              <span className="text-[11px] text-zinc-400">
                Pins a live FPS and playback timing readout on screen
              </span>
            </div>
            <input
              type="checkbox"
              checked={showDevOverlay}
              onChange={(e) => handleToggleDevOverlay(e.target.checked)}
              className="w-4 h-4 rounded bg-[#202020] border-zinc-600 text-red-500 focus:ring-0 cursor-pointer accent-red-500"
            />
          </div>

          {/* Environment & Hardware */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Client & Runtime
            </span>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1 text-zinc-300">
              <div><span className="text-zinc-500">Build Time:</span> {buildTime}</div>
              <div><span className="text-zinc-500">Environment:</span> {env}</div>
              <div><span className="text-zinc-500">Viewport:</span> {viewport} (DPR: {dpr})</div>
              <div><span className="text-zinc-500">AudioContext:</span> {audioCtxState}</div>
              <div className="truncate"><span className="text-zinc-500">User Agent:</span> {userAgent}</div>
            </div>
          </div>

          {/* Track & Playback */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Current Playback
            </span>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222] space-y-1 text-zinc-300">
              <div><span className="text-zinc-500">Track:</span> {currentTrack?.title || 'None'}</div>
              <div><span className="text-zinc-500">Artist:</span> {currentTrack?.artist || 'N/A'}</div>
              <div><span className="text-zinc-500">Playback Time:</span> {currentTime.toFixed(2)}s / {duration.toFixed(2)}s ({playbackRate}x)</div>
              <div><span className="text-zinc-500">Playing:</span> {isPlaying ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Active Settings JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Settings JSON ({LYRICS_SETTINGS_KEY})
              </span>
            </div>
            <pre className="p-3 rounded-xl bg-[#0d0d0d] border border-[#222222] text-[11px] text-zinc-400 overflow-x-auto max-h-48 scrollbar-thin">
              {JSON.stringify(currentSettings, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#222222] bg-[#161616] flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyDebugInfo}
            className="px-3 py-1.5 rounded-xl bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>{copySuccess ? '✓ Copied!' : '📋 Copy debug info'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
            className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
