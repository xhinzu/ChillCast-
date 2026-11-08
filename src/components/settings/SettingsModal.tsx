'use client';

import React, { useEffect, useState } from 'react';
import {
  DISCORD_SETTINGS_CHANGED_EVENT,
  getDiscordPresenceEnabled,
  getDiscordPresenceShareRoom,
  setDiscordPresenceEnabled,
  setDiscordPresenceShareRoom,
} from '@/lib/discord/presence-settings';
import {
  getWebhookConfig,
  setWebhookConfig,
  testDiscordWebhook,
  isValidDiscordWebhookUrl,
  WebhookConfig,
} from '@/lib/discord/webhook';
import { copyDiscordCustomStatus } from '@/lib/discord/custom-status';
import { usePlayback } from '@/context/PlaybackContext';
import { isTauri } from '@/lib/desktop';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentTrack } = usePlayback();
  const isDesktopApp = isTauri();

  // Rich Presence states
  const [discordEnabled, setDiscordEnabled] = useState<boolean>(() => getDiscordPresenceEnabled());
  const [shareRoom, setShareRoom] = useState<boolean>(() => getDiscordPresenceShareRoom());
  const [isPreMiDHelpOpen, setIsPreMiDHelpOpen] = useState(false);

  // Webhook states
  const [webhookConfig, setLocalWebhookConfig] = useState<WebhookConfig>(() => getWebhookConfig());
  const [showWebhookUrl, setShowWebhookUrl] = useState<boolean>(false);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Status copy state
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  useEffect(() => {
    const handleSync = () => {
      setDiscordEnabled(getDiscordPresenceEnabled());
      setShareRoom(getDiscordPresenceShareRoom());
      setLocalWebhookConfig(getWebhookConfig());
    };
    window.addEventListener(DISCORD_SETTINGS_CHANGED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(DISCORD_SETTINGS_CHANGED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

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

  const handleToggleDiscord = (checked: boolean) => {
    setDiscordEnabled(checked);
    setDiscordPresenceEnabled(checked);
  };

  const handleToggleShareRoom = (checked: boolean) => {
    setShareRoom(checked);
    setDiscordPresenceShareRoom(checked);
  };

  const handleWebhookChange = (patch: Partial<WebhookConfig>) => {
    const updated = { ...webhookConfig, ...patch };
    setLocalWebhookConfig(updated);
    setWebhookConfig(patch);
    setTestResult(null);
  };

  const handleTestWebhook = async () => {
    if (!isValidDiscordWebhookUrl(webhookConfig.url)) {
      setTestResult({ success: false, message: 'Invalid Discord webhook URL format' });
      return;
    }
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await testDiscordWebhook(webhookConfig.url, webhookConfig.botName);
      if (res.success) {
        setTestResult({ success: true, message: 'Test message posted successfully in Discord!' });
      } else {
        setTestResult({ success: false, message: res.error || 'Failed to send test message' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleCopyCurrentStatus = async () => {
    const artist = currentTrack?.artist || 'Gorillaz';
    const title = currentTrack?.title || 'Feel Good Inc.';
    const res = await copyDiscordCustomStatus(artist, title);
    if (res.success) {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    }
  };

  const handleResetDiscordSettings = () => {
    setDiscordPresenceEnabled(false);
    setDiscordPresenceShareRoom(false);
    setWebhookConfig({ url: '', enabled: false, botName: 'MyuJiku', deleteOnStop: false });
    setDiscordEnabled(false);
    setShareRoom(false);
    setLocalWebhookConfig({ url: '', enabled: false, botName: 'MyuJiku', deleteOnStop: false });
    setTestResult(null);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#121214] border border-[#26262a] rounded-2xl shadow-2xl p-6 relative text-white space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222228] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1e1e24] border border-[#2e2e36] flex items-center justify-center text-zinc-300">
              <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Settings</h2>
              <p className="text-[11px] text-zinc-400">Manage integrations & preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1c1c20] hover:bg-[#282830] text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-sm cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* ─────────────────── DISCORD INTEGRATIONS GROUP ─────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5865F2]" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase text-[11px] text-[#5865F2]">
                Discord Integrations
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetDiscordSettings}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              title="Reset all Discord settings to default"
            >
              Reset to Defaults
            </button>
          </div>

          {/* 1. Rich Presence Card */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    Rich Presence
                  </h4>
                  {isDesktopApp ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                      DESKTOP ACTIVE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-medium text-zinc-400">
                      WEB BROWSER
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  {isDesktopApp
                    ? 'Display live track, artist, and progress directly in your Discord profile.'
                    : 'Available in the MyuJiku desktop app, or using the PreMiD local bridge.'}
                </p>
              </div>

              {/* Styled Switch */}
              <button
                type="button"
                id="discord-presence-toggle"
                role="switch"
                aria-checked={discordEnabled}
                onClick={() => handleToggleDiscord(!discordEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  discordEnabled ? 'bg-white' : 'bg-[#2e2e36]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                    discordEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            {/* Privacy note */}
            <p className="text-[10px] text-zinc-500 border-t border-[#22222a] pt-2">
              Privacy: Only broadcasts song title, artist name, and duration. Pausing or stopping playback clears presence.
            </p>

            {/* Sub-toggle: Share Room Link */}
            {discordEnabled && (
              <div className="pt-2 border-t border-[#22222a] flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div>
                  <label
                    htmlFor="discord-presence-share-room"
                    className="text-xs font-medium text-zinc-200 cursor-pointer select-none block"
                  >
                    Share room link in presence
                  </label>
                  <p className="text-[10px] text-zinc-500">
                    Adds a &quot;Join my room&quot; button in Discord when you are in a Together room.
                  </p>
                </div>

                <button
                  type="button"
                  id="discord-presence-share-room"
                  role="switch"
                  aria-checked={shareRoom}
                  onClick={() => handleToggleShareRoom(!shareRoom)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    shareRoom ? 'bg-white' : 'bg-[#2e2e36]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                      shareRoom ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Browser PreMiD accordion */}
            {!isDesktopApp && (
              <div className="border-t border-[#22222a] pt-2">
                <button
                  type="button"
                  onClick={() => setIsPreMiDHelpOpen(!isPreMiDHelpOpen)}
                  className="text-[11px] text-[#5865F2] hover:underline cursor-pointer"
                >
                  {isPreMiDHelpOpen ? '▲ Hide PreMiD web bridge guide' : '▼ How to use Rich Presence on the web via PreMiD'}
                </button>
                {isPreMiDHelpOpen && (
                  <div className="mt-2 p-3 bg-[#131316] border border-[#222228] rounded-lg text-[11px] text-zinc-300 space-y-2">
                    <p>
                      Websites cannot set Discord desktop presence directly without an installed helper. Install the{' '}
                      <a href="https://premid.app" target="_blank" rel="noopener noreferrer" className="text-white underline">
                        PreMiD desktop app &amp; extension
                      </a>
                      , or run the official <strong>MyuJiku Desktop App</strong> which includes native Discord IPC built-in.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Now Playing Webhook Card */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    Now Playing Webhook
                  </h4>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-medium text-zinc-400">
                    BROWSER &amp; DESKTOP
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Broadcasts now-playing song cards into a Discord channel via Webhook.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={webhookConfig.enabled}
                onClick={() => handleWebhookChange({ enabled: !webhookConfig.enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  webhookConfig.enabled ? 'bg-white' : 'bg-[#2e2e36]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                    webhookConfig.enabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            {webhookConfig.enabled && (
              <div className="pt-2 border-t border-[#22222a] space-y-3 animate-in fade-in duration-150">
                {/* Webhook URL Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-300 flex items-center justify-between">
                    <span>Discord Webhook URL</span>
                    <button
                      type="button"
                      onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      {showWebhookUrl ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  <input
                    type={showWebhookUrl ? 'text' : 'password'}
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookConfig.url}
                    onChange={(e) => handleWebhookChange({ url: e.target.value })}
                    className="w-full bg-[#111114] border border-[#2b2b34] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                  {webhookConfig.url && !isValidDiscordWebhookUrl(webhookConfig.url) && (
                    <p className="text-[10px] text-rose-400">
                      Must match https://discord.com/api/webhooks/&lt;id&gt;/&lt;token&gt;
                    </p>
                  )}
                </div>

                {/* Bot Name & Test Button */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-zinc-300">
                      Bot Name
                    </label>
                    <input
                      type="text"
                      placeholder="MyuJiku"
                      value={webhookConfig.botName}
                      onChange={(e) => handleWebhookChange({ botName: e.target.value })}
                      className="w-full bg-[#111114] border border-[#2b2b34] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !isValidDiscordWebhookUrl(webhookConfig.url)}
                    className="px-3 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] disabled:opacity-40 disabled:cursor-not-allowed border border-[#353542] text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
                  >
                    {testingWebhook ? 'Testing...' : 'Test Webhook'}
                  </button>
                </div>

                {/* Test Feedback Message */}
                {testResult && (
                  <div
                    className={`p-2 rounded-lg text-[11px] ${
                      testResult.success
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}

                {/* Sub-option: Delete message on stop */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div>
                    <label className="text-xs font-medium text-zinc-200 cursor-pointer select-none block">
                      Delete message when I stop listening
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      Automatically removes the Now Playing card from the channel when paused or playback stops.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={webhookConfig.deleteOnStop}
                    onClick={() => handleWebhookChange({ deleteOnStop: !webhookConfig.deleteOnStop })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      webhookConfig.deleteOnStop ? 'bg-white' : 'bg-[#2e2e36]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                        webhookConfig.deleteOnStop ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-400'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[10px] text-zinc-500 pt-1 leading-relaxed">
                  ⚠️ Security notice: Webhook URL is stored strictly on your device. Anyone with this URL can post messages to your channel.
                </p>
              </div>
            )}
          </div>

          {/* 3. Copy Custom Status Card */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-semibold text-white">
                Copy Discord Status
              </h4>
              <p className="text-[11px] text-zinc-400">
                Copies current song formatted for Discord custom status:
              </p>
              <code className="text-[10px] text-zinc-400 bg-black/40 px-2 py-0.5 rounded inline-block mt-1 font-mono">
                🎧 {currentTrack?.artist || 'Artist'} - {currentTrack?.title || 'Song'} | MyuJiku
              </code>
            </div>

            <button
              type="button"
              onClick={handleCopyCurrentStatus}
              className="px-3.5 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              {copiedStatus ? '✓ Copied!' : 'Copy Status'}
            </button>
          </div>

          {/* 4. Discord Activity (Coming Soon) */}
          <div className="bg-[#141416] border border-[#202024] opacity-60 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-400">
                  Embedded Discord Activity
                </h4>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[9px] font-bold text-zinc-500 uppercase">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Launch MyuJiku directly inside voice channels with friends via the Discord Rocket icon.
              </p>
            </div>

            <a
              href="/docs/discord-activity-feasibility.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 shrink-0"
            >
              Read Report
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
