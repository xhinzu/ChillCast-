'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { hideWindow, quitApp } from '@/lib/desktop';

interface CloseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFirstTimeTrayNotify?: () => void;
  onSwitchToMiniplayer?: () => void;
}

export default function CloseConfirmationModal({
  isOpen,
  onClose,
  onFirstTimeTrayNotify,
  onSwitchToMiniplayer,
}: CloseConfirmationModalProps) {
  const { updateSettings } = useSettings();
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMinimizeToTray = async () => {
    if (rememberChoice) {
      updateSettings('desktop', { closeAction: 'tray' });
    }
    const hasSeenNotice = localStorage.getItem('myujiku_seen_tray_notice') === 'true';
    if (!hasSeenNotice) {
      try {
        localStorage.setItem('myujiku_seen_tray_notice', 'true');
      } catch {
        // ignore
      }
      onFirstTimeTrayNotify?.();
    }
    onClose();
    await hideWindow();
  };

  const handleQuit = async () => {
    if (rememberChoice) {
      updateSettings('desktop', { closeAction: 'quit' });
    }
    onClose();
    await quitApp();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200 titlebar-no-drag"
      data-no-drag="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-dialog-title"
    >
      <div className="relative w-full max-w-md bg-[#131318] border border-[#2b2b36] rounded-2xl p-6 shadow-2xl space-y-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div>
            <h3 id="close-dialog-title" className="text-base font-semibold text-white">
              Close MyuJiku
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Would you like to keep audio playing in the Windows system tray or exit the application completely?
            </p>
          </div>
        </div>

        {/* Remember choice toggle */}
        <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none bg-[#191922] p-2.5 rounded-lg border border-[#262633]">
          <input
            type="checkbox"
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span>Remember my choice (can be changed anytime in Settings &gt; Desktop)</span>
        </label>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {onSwitchToMiniplayer && (
            <button
              type="button"
              onClick={onSwitchToMiniplayer}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
            >
              Show Miniplayer
            </button>
          )}
          <button
            type="button"
            onClick={handleQuit}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Quit MyuJiku
          </button>
          <button
            type="button"
            onClick={handleMinimizeToTray}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Minimize to Tray
          </button>
        </div>
      </div>
    </div>
  );
}
