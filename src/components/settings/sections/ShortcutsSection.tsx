'use client';

import React, { useState } from 'react';
import { useSettings } from '@/lib/settings/useSettings';
import { DEFAULT_KEY_BINDINGS } from '@/lib/settings/settings-store';

export interface ShortcutDefinition {
  id: string;
  name: string;
  group: 'Playback' | 'Navigation' | 'Lyrics' | 'Audio' | 'Window';
  defaultKey: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // Playback
  { id: 'play_pause', name: 'Play / Pause', group: 'Playback', defaultKey: 'Space' },
  { id: 'seek_backward', name: 'Seek Backward 5s', group: 'Playback', defaultKey: 'ArrowLeft' },
  { id: 'seek_forward', name: 'Seek Forward 5s', group: 'Playback', defaultKey: 'ArrowRight' },
  { id: 'prev_track', name: 'Previous Track', group: 'Playback', defaultKey: 'ctrl+ArrowLeft' },
  { id: 'next_track', name: 'Next Track', group: 'Playback', defaultKey: 'ctrl+ArrowRight' },
  { id: 'volume_down', name: 'Volume Down 5%', group: 'Playback', defaultKey: 'ArrowDown' },
  { id: 'volume_up', name: 'Volume Up 5%', group: 'Playback', defaultKey: 'ArrowUp' },
  { id: 'toggle_mute', name: 'Mute / Unmute', group: 'Playback', defaultKey: 'KeyM' },
  { id: 'toggle_shuffle', name: 'Toggle Shuffle', group: 'Playback', defaultKey: 'KeyS' },
  { id: 'toggle_repeat', name: 'Toggle Repeat', group: 'Playback', defaultKey: 'KeyR' },
  { id: 'toggle_like', name: 'Like / Save Track', group: 'Playback', defaultKey: 'KeyL' },

  // Navigation
  { id: 'focus_search', name: 'Focus Search', group: 'Navigation', defaultKey: 'Slash' },
  { id: 'open_lyrics', name: 'Go to Lyrics View', group: 'Navigation', defaultKey: 'KeyG KeyL' },

  // Lyrics
  { id: 'fullscreen_lyrics', name: 'Toggle Fullscreen Lyrics', group: 'Lyrics', defaultKey: 'KeyF' },

  // Audio
  { id: 'toggle_8d', name: 'Toggle 8D Spatial Audio', group: 'Audio', defaultKey: 'Digit8' },
  { id: 'toggle_muffled', name: 'Toggle Muffled Sound', group: 'Audio', defaultKey: 'KeyU' },

  // Window
  { id: 'open_settings', name: 'Open Settings', group: 'Window', defaultKey: 'ctrl+Comma' },
  { id: 'show_shortcuts_overlay', name: 'Show Shortcuts Quick Sheet', group: 'Window', defaultKey: 'Shift+Slash' },
  { id: 'close_dialog', name: 'Close Dialogs / Overlays', group: 'Window', defaultKey: 'Escape' },
];

export function formatKeyDisplay(keyStr: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);
  const parts = keyStr.split('+');
  return parts
    .map((p) => {
      const lower = p.toLowerCase();
      if (lower === 'ctrl') return isMac ? '⌘' : 'Ctrl';
      if (lower === 'alt') return isMac ? '⌥' : 'Alt';
      if (lower === 'shift') return isMac ? '⇧' : 'Shift';
      if (p.startsWith('Key')) return p.slice(3);
      if (p.startsWith('Digit')) return p.slice(5);
      if (p === 'ArrowLeft') return '←';
      if (p === 'ArrowRight') return '→';
      if (p === 'ArrowUp') return '↑';
      if (p === 'ArrowDown') return '↓';
      if (p === 'Space') return 'Space';
      if (p === 'Slash') return '/';
      if (p === 'Comma') return ',';
      if (p === 'Shift+Slash') return '?';
      return p;
    })
    .join(' + ');
}

export default function ShortcutsSection() {
  const { settings, updateSettings, resetSection } = useSettings();
  const bindings = settings.shortcuts?.bindings || DEFAULT_KEY_BINDINGS;

  const [search, setSearch] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const filteredShortcuts = SHORTCUT_DEFINITIONS.filter(
    (sc) =>
      sc.name.toLowerCase().includes(search.toLowerCase()) ||
      sc.group.toLowerCase().includes(search.toLowerCase()) ||
      (bindings[sc.id] || sc.defaultKey).toLowerCase().includes(search.toLowerCase())
  );

  const groups = ['Playback', 'Navigation', 'Lyrics', 'Audio', 'Window'] as const;

  const handleStartRecording = (id: string) => {
    setRecordingId(id);
    setConflictWarning(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setRecordingId(null);
      setConflictWarning(null);
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey && e.key.length > 1) modifiers.push('shift');

    let keyPart = e.code;
    if (!keyPart || keyPart === 'ControlLeft' || keyPart === 'ControlRight' || keyPart === 'ShiftLeft' || keyPart === 'ShiftRight' || keyPart === 'AltLeft' || keyPart === 'AltRight') {
      return; // Modifier only, wait for primary key
    }

    const combo = modifiers.length > 0 ? `${modifiers.join('+')}+${keyPart}` : keyPart;

    // Conflict detection
    const conflicting = Object.entries(bindings).find(([scId, boundKey]) => boundKey === combo && scId !== id);
    if (conflicting) {
      const conflictingDef = SHORTCUT_DEFINITIONS.find((d) => d.id === conflicting[0]);
      setConflictWarning(`"${combo}" is already assigned to "${conflictingDef?.name || conflicting[0]}".`);
      return;
    }

    // Save binding
    updateSettings('shortcuts', {
      bindings: {
        ...bindings,
        [id]: combo,
      },
    });

    setRecordingId(null);
    setConflictWarning(null);
  };

  const handleResetSingle = (id: string, defaultKey: string) => {
    updateSettings('shortcuts', {
      bindings: {
        ...bindings,
        [id]: defaultKey,
      },
    });
    setConflictWarning(null);
  };

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            Keyboard Shortcuts
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Click any shortcut to record custom key combinations
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('shortcuts')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset all shortcuts to defaults"
        >
          Reset All Shortcuts
        </button>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shortcuts (e.g. play, seek, volume, lyrics)..."
          className="w-full bg-[#17171a] border border-[#282830] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {conflictWarning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
          <span>{conflictWarning}</span>
          <button
            type="button"
            onClick={() => setConflictWarning(null)}
            className="text-[11px] underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grouped Shortcuts List */}
      <div className="space-y-5">
        {groups.map((group) => {
          const items = filteredShortcuts.filter((sc) => sc.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="bg-[#17171a] border border-[#282830] rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-[#131316] border-b border-[#222228] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {group}
              </div>
              <div className="divide-y divide-[#222228]">
                {items.map((sc) => {
                  const currentBinding = bindings[sc.id] || sc.defaultKey;
                  const isRecording = recordingId === sc.id;
                  const isModified = currentBinding !== sc.defaultKey;

                  return (
                    <div
                      key={sc.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#1a1a20] transition-colors"
                    >
                      <span className="text-xs text-zinc-200 font-medium">{sc.name}</span>

                      <div className="flex items-center gap-2">
                        {isRecording ? (
                          <div
                            tabIndex={0}
                            onKeyDown={(e) => handleKeyDown(e, sc.id)}
                            className="px-3 py-1 rounded bg-rose-500 text-white font-mono text-xs font-semibold animate-pulse outline-none ring-2 ring-rose-400 cursor-pointer"
                          >
                            Press key combo... (Esc to cancel)
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartRecording(sc.id)}
                            className={`px-2.5 py-1 rounded font-mono text-xs font-semibold border transition-all cursor-pointer ${
                              isModified
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/40 hover:bg-rose-500/20'
                                : 'bg-[#202026] text-zinc-300 border-[#30303c] hover:bg-[#282832] hover:text-white'
                            }`}
                            title="Click to rebind this shortcut"
                          >
                            {formatKeyDisplay(currentBinding)}
                          </button>
                        )}

                        {isModified && !isRecording && (
                          <button
                            type="button"
                            onClick={() => handleResetSingle(sc.id, sc.defaultKey)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                            title="Reset to default key"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-[#141418] border border-[#262630] rounded-xl text-[11px] text-zinc-400 flex items-center gap-2">
        <span>💡</span>
        <span>
          Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px]">?</kbd> anywhere in the app to view the quick shortcuts sheet overlay.
        </span>
      </div>
    </div>
  );
}
