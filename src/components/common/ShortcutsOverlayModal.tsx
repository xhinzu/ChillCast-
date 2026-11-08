'use client';

import React, { useEffect } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import {
  SHORTCUT_DEFINITIONS,
  formatKeyDisplay,
} from '@/components/settings/sections/ShortcutsSection';

interface ShortcutsOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export default function ShortcutsOverlayModal({
  isOpen,
  onClose,
  onOpenSettings,
}: ShortcutsOverlayModalProps) {
  const { settings } = useSettings();
  const bindings = settings.shortcuts?.bindings || {};

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groups = ['Playback', 'Navigation', 'Lyrics', 'Audio', 'Window'] as const;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 titlebar-no-drag"
      data-no-drag="true"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheatsheet"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--surface,#141419)] border border-[var(--border,#2b2b36)] rounded-2xl p-6 shadow-2xl text-[var(--text,#ffffff)] space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border,#262633)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">
              ⌨
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[var(--text-muted,#9ca3af)]">
                Quick controls for hands-free listening and navigation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close shortcuts overlay"
          >
            ✕
          </button>
        </div>

        {/* Grouped Shortcuts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {groups.map((group) => {
            const list = SHORTCUT_DEFINITIONS.filter((sc) => sc.group === group);
            if (list.length === 0) return null;

            return (
              <div
                key={group}
                className="bg-[var(--surface-2,#191922)] border border-[var(--border,#262633)] rounded-xl p-4 space-y-2.5"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  {group}
                </div>
                <div className="space-y-2">
                  {list.map((sc) => {
                    const activeKey = bindings[sc.id] || sc.defaultKey;
                    const display = formatKeyDisplay(activeKey);

                    return (
                      <div
                        key={sc.id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <span className="text-[var(--text,#e5e7eb)]">{sc.name}</span>
                        <kbd className="px-2 py-0.5 rounded-md bg-[var(--surface-3,#232330)] border border-[var(--border,#343444)] text-[11px] font-mono font-semibold text-zinc-200 shadow-sm">
                          {display}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info & rebind button */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border,#262633)] text-xs text-[var(--text-muted,#9ca3af)]">
          <span>
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">?</kbd> anytime to open this sheet
          </span>
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors cursor-pointer"
            >
              Rebind in Settings →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
