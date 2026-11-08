'use client';

import React from 'react';
import { isTauri } from '@/lib/desktop';
import { useSettings } from '@/lib/settings/useSettings';

export default function DesktopSection() {
  const isDesktop = isTauri();
  const { settings, updateSettings, resetSection } = useSettings();
  const desktop = settings.desktop;

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            Desktop Integration
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            System tray behavior, window close options, and startup preferences
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('desktop')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset desktop settings to defaults"
        >
          Reset Desktop
        </button>
      </div>

      {!isDesktop ? (
        <div className="bg-[#171720] border border-[#2a2a35] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                color: 'var(--accent)',
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            >
              Desktop Exclusive Features
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            System tray controls, background audio playback on close, and Windows startup settings are exclusive to the native Windows desktop app.
          </p>
          <div className="pt-1">
            <a
              href="/releases/MyuJiku_1.0.0_x64-setup.exe"
              download
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast)',
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 shadow"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download MyuJiku Windows App (.exe)
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Close Window Action */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
            <label className="text-xs font-semibold text-white block">When I Close the Window</label>
            <p className="text-[11px] text-zinc-400">
              Choose whether closing the app window keeps background audio playing in the Windows system tray.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                {
                  id: 'ask',
                  title: 'Ask each time',
                  desc: 'Shows confirmation prompt (Default)',
                },
                {
                  id: 'tray',
                  title: 'Minimize to Tray',
                  desc: 'Keep music playing in background',
                },
                {
                  id: 'quit',
                  title: 'Quit MyuJiku',
                  desc: 'Completely stop audio & exit',
                },
              ].map((opt) => {
                const isSelected = desktop.closeAction === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSettings('desktop', { closeAction: opt.id as 'tray' | 'quit' | 'ask' })}
                    style={
                      isSelected
                        ? {
                            borderColor: 'var(--accent)',
                            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                            boxShadow: '0 0 10px color-mix(in srgb, var(--accent) 25%, transparent)',
                          }
                        : undefined
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'text-white'
                        : 'border-[#2a2a34] bg-[#121215] text-zinc-300 hover:bg-[#1a1a20]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{opt.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Startup Options */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-white block">Start with Windows</label>
                <p className="text-[11px] text-zinc-400">Automatically launches MyuJiku when you log into your PC.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={desktop.startWithWindows}
                onClick={() => updateSettings('desktop', { startWithWindows: !desktop.startWithWindows })}
                style={{
                  backgroundColor: desktop.startWithWindows ? 'var(--accent)' : '#2e2e36',
                }}
                className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                    desktop.startWithWindows ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 border-t border-[#22222a] flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-white block">Start Minimized to System Tray</label>
                <p className="text-[11px] text-zinc-400">Launches silently in the background tray without opening the main window.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={desktop.startMinimizedToTray}
                onClick={() => updateSettings('desktop', { startMinimizedToTray: !desktop.startMinimizedToTray })}
                style={{
                  backgroundColor: desktop.startMinimizedToTray ? 'var(--accent)' : '#2e2e36',
                }}
                className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                    desktop.startMinimizedToTray ? 'translate-x-4 bg-white' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
