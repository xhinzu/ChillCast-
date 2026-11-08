'use client';

import React, { useEffect, useState } from 'react';
import {
  DISCORD_SETTINGS_CHANGED_EVENT,
  getDiscordPresenceEnabled,
  getDiscordPresenceHideDetails,
  getDiscordPresenceShareRoom,
  setDiscordPresenceEnabled,
  setDiscordPresenceHideDetails,
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
import {
  isTauri,
  getDiscordStatus,
  listenDiscordStatus,
  sendDesktopTestPresence,
  type DiscordConnectionStatus,
} from '@/lib/desktop';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentTrack } = usePlayback();
  const isDesktopApp = isTauri();

  // Desktop Discord IPC connection state
  const [discordStatus, setDiscordStatus] = useState<DiscordConnectionStatus>({ status: 'NotRunning' });
  const [whyPopoverOpen, setWhyPopoverOpen] = useState<boolean>(false);
  const [testingPresence, setTestingPresence] = useState<boolean>(false);
  const [testPresenceSuccess, setTestPresenceSuccess] = useState<boolean | null>(null);

  // Settings states
  const [discordEnabled, setDiscordEnabled] = useState<boolean>(() => getDiscordPresenceEnabled());
  const [hideDetails, setHideDetails] = useState<boolean>(() => getDiscordPresenceHideDetails());
  const [shareRoom, setShareRoom] = useState<boolean>(() => getDiscordPresenceShareRoom());

  // Webhook states
  const [webhookConfig, setLocalWebhookConfig] = useState<WebhookConfig>(() => getWebhookConfig());
  const [showWebhookUrl, setShowWebhookUrl] = useState<boolean>(false);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Accordion & copy state
  const [moreWaysOpen, setMoreWaysOpen] = useState<boolean>(false);
  const [isPreMiDHelpOpen, setIsPreMiDHelpOpen] = useState<boolean>(false);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Subscribe to live Discord status in desktop app
  useEffect(() => {
    if (!isDesktopApp) return;

    getDiscordStatus().then(setDiscordStatus);
    let unlisten: (() => void) | undefined;
    listenDiscordStatus((newStatus) => {
      setDiscordStatus(newStatus);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isDesktopApp]);

  useEffect(() => {
    const handleSync = () => {
      setDiscordEnabled(getDiscordPresenceEnabled());
      setHideDetails(getDiscordPresenceHideDetails());
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

  const handleToggleHideDetails = (checked: boolean) => {
    setHideDetails(checked);
    setDiscordPresenceHideDetails(checked);
  };

  const handleToggleShareRoom = (checked: boolean) => {
    setShareRoom(checked);
    setDiscordPresenceShareRoom(checked);
  };

  const handleTestPresence = async () => {
    setTestingPresence(true);
    setTestPresenceSuccess(null);
    try {
      const res = await sendDesktopTestPresence();
      if (res.success) {
        setTestPresenceSuccess(true);
        setTimeout(() => setTestPresenceSuccess(null), 3000);
      } else {
        setTestPresenceSuccess(false);
        setTimeout(() => setTestPresenceSuccess(null), 3500);
      }
    } catch {
      setTestPresenceSuccess(false);
      setTimeout(() => setTestPresenceSuccess(null), 3500);
    } finally {
      setTestingPresence(false);
    }
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
    setDiscordPresenceEnabled(isDesktopApp);
    setDiscordPresenceHideDetails(false);
    setDiscordPresenceShareRoom(isDesktopApp);
    setWebhookConfig({ url: '', enabled: false, botName: 'MyuJiku', deleteOnStop: false });
    setDiscordEnabled(isDesktopApp);
    setHideDetails(false);
    setShareRoom(isDesktopApp);
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
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

        {/* ─────────────────── SPOTIFY-STYLE DISCORD SECTION ─────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5865F2]" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-[11px] text-[#5865F2]">
                Discord Rich Presence
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

          {/* Browser friendly banner */}
          {!isDesktopApp && (
            <div className="bg-[#171720] border border-[#5865F2]/30 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] text-[10px] font-bold uppercase tracking-wider">
                  Web Browser Mode
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Automatic Discord status requires the <strong>MyuJiku Desktop App</strong>. Websites cannot connect directly to Discord IPC pipes without an installed app.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href="/releases/MyuJiku_1.0.0_x64-setup.exe"
                  download
                  className="px-3.5 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5 shadow"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Desktop App (.exe)
                </a>
                <button
                  type="button"
                  onClick={() => setIsPreMiDHelpOpen(!isPreMiDHelpOpen)}
                  className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 cursor-pointer"
                >
                  {isPreMiDHelpOpen ? 'Hide PreMiD bridge info' : 'Using browser with PreMiD?'}
                </button>
              </div>

              {isPreMiDHelpOpen && (
                <div className="mt-2 p-3 bg-[#121216] border border-[#262630] rounded-lg text-[11px] text-zinc-300 space-y-2 animate-in fade-in duration-150">
                  <p>
                    If using Google Chrome or Brave, install the{' '}
                    <a href="https://premid.app" target="_blank" rel="noopener noreferrer" className="text-white underline font-medium">
                      PreMiD app &amp; extension
                    </a>
                    . Then enable the toggle below to broadcast presence to PreMiD.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Main Discord Card */}
          <div className="bg-[#17171a] border border-[#282830] rounded-xl p-4 space-y-4">
            {/* Live Connection Indicator Bar (Desktop only) */}
            {isDesktopApp && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#131316] border border-[#222228] rounded-lg">
                <div className="flex items-center gap-2.5">
                  {discordStatus.status === 'Connected' ? (
                    <>
                      {discordStatus.data.avatarUrl ? (
                        <img
                          src={discordStatus.data.avatarUrl}
                          alt="Discord avatar"
                          className="w-5 h-5 rounded-full ring-1 ring-emerald-500/40"
                        />
                      ) : (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                          <span>Connected to Discord</span>
                          <span className="text-zinc-400 font-normal">
                            as {discordStatus.data.displayName || discordStatus.data.username}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : discordStatus.status === 'Connecting' ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
                      </span>
                      <span className="text-xs font-medium text-amber-300">Connecting to Discord IPC...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full bg-zinc-500" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-400">Waiting for Discord to start...</span>
                        <button
                          type="button"
                          onClick={() => setWhyPopoverOpen(!whyPopoverOpen)}
                          className="text-[10px] text-zinc-400 hover:text-white underline underline-offset-2 cursor-pointer"
                        >
                          Why?
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right action button: Test Status */}
                <div className="flex items-center gap-2">
                  {discordStatus.status === 'Connected' && (
                    <button
                      type="button"
                      onClick={handleTestPresence}
                      disabled={testingPresence}
                      className="px-3 py-1 rounded-md bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-[11px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingPresence
                        ? 'Testing...'
                        : testPresenceSuccess === true
                        ? '✓ Sent 10s sample!'
                        : testPresenceSuccess === false
                        ? '✕ Send failed'
                        : 'Test Status'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* "Why?" Popover for waiting state */}
            {whyPopoverOpen && discordStatus.status === 'NotRunning' && (
              <div className="p-3 bg-[#131316] border border-[#2a2a35] rounded-lg text-xs text-zinc-300 space-y-1.5 animate-in fade-in duration-150">
                <p className="font-semibold text-white">How automatic connection works:</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  MyuJiku connects to your Discord desktop app directly via local IPC. Just launch Discord (Stable, PTB, or Canary) and MyuJiku hooks up automatically — no logins, tokens, or webhooks required.
                </p>
              </div>
            )}

            {/* Toggle 1: Share what I'm listening to on Discord (Opt-out) */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <label
                  htmlFor="discord-presence-toggle"
                  className="text-xs sm:text-sm font-semibold text-white cursor-pointer select-none block"
                >
                  Share what I&apos;m listening to on Discord
                </label>
                <p className="text-[11px] text-zinc-400">
                  Updates your Discord status automatically when music plays. Pausing or closing clears status.
                </p>
              </div>

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

            {/* Toggle 2: Hide song details (Privacy option) */}
            {discordEnabled && (
              <div className="pt-3 border-t border-[#22222a] flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div>
                  <label
                    htmlFor="discord-presence-hide-details"
                    className="text-xs font-medium text-zinc-200 cursor-pointer select-none block"
                  >
                    Hide song details (Privacy mode)
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Displays &quot;Listening to MyuJiku&quot; without broadcasting specific song titles or artists.
                  </p>
                </div>

                <button
                  type="button"
                  id="discord-presence-hide-details"
                  role="switch"
                  aria-checked={hideDetails}
                  onClick={() => handleToggleHideDetails(!hideDetails)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    hideDetails ? 'bg-white' : 'bg-[#2e2e36]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                      hideDetails ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Toggle 3: Share room link with friends */}
            {discordEnabled && !hideDetails && (
              <div className="pt-3 border-t border-[#22222a] flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div>
                  <label
                    htmlFor="discord-presence-share-room"
                    className="text-xs font-medium text-zinc-200 cursor-pointer select-none block"
                  >
                    Share room link with friends
                  </label>
                  <p className="text-[10px] text-zinc-400">
                    Adds a &quot;Join room&quot; button in Discord so friends can listen together when you&apos;re in a Together room.
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

            {/* Discord Activity Privacy Hint (Crucial helper) */}
            <div className="pt-2 border-t border-[#22222a] flex items-start gap-2 text-[10px] text-zinc-400">
              <span className="text-[#5865F2] font-bold">ℹ</span>
              <p className="leading-relaxed">
                <strong>Activity Privacy:</strong> If your activity does not appear to friends, ensure{' '}
                <span className="text-zinc-200 underline decoration-zinc-600">
                  &quot;Display current activity as a status message&quot;
                </span>{' '}
                is switched ON inside your Discord desktop client under <em>User Settings ➔ Activity Privacy</em>.
              </p>
            </div>
          </div>

          {/* ─────────────────── MORE WAYS TO SHARE (ACCORDION) ─────────────────── */}
          <div className="border border-[#222228] bg-[#141417] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMoreWaysOpen(!moreWaysOpen)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#1a1a20] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">More ways to share</span>
                <span className="text-[10px] text-zinc-500">(Webhook &amp; Custom Status)</span>
              </div>
              <span className="text-zinc-400 text-xs">{moreWaysOpen ? '▲' : '▼'}</span>
            </button>

            {moreWaysOpen && (
              <div className="p-4 pt-1 space-y-4 border-t border-[#222228] animate-in fade-in duration-150">
                {/* 1. Now Playing Webhook Card */}
                <div className="bg-[#17171a] border border-[#282830] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Now Playing Webhook</h4>
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
                          value={webhookConfig.url}
                          onChange={(e) => handleWebhookChange({ url: e.target.value.trim() })}
                          placeholder="https://discord.com/api/webhooks/..."
                          className="w-full bg-[#101012] border border-[#2e2e36] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-[#5865F2]"
                        />
                      </div>

                      {webhookConfig.url && !isValidDiscordWebhookUrl(webhookConfig.url) && (
                        <p className="text-[10px] text-rose-400">
                          Please enter a valid Discord webhook URL (must start with https://discord.com/api/webhooks/...).
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <input
                          type="text"
                          value={webhookConfig.botName}
                          onChange={(e) => handleWebhookChange({ botName: e.target.value })}
                          placeholder="Bot username (MyuJiku)"
                          maxLength={32}
                          className="w-44 bg-[#101012] border border-[#2e2e36] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#5865F2]"
                        />

                        <button
                          type="button"
                          onClick={handleTestWebhook}
                          disabled={testingWebhook || !isValidDiscordWebhookUrl(webhookConfig.url)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                        >
                          {testingWebhook ? 'Testing...' : 'Test Webhook'}
                        </button>
                      </div>

                      {testResult && (
                        <div
                          className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 ${
                            testResult.success
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                          }`}
                        >
                          <span>{testResult.success ? '✓' : '✕'}</span>
                          <span>{testResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Copy Custom Status Card */}
                <div className="bg-[#17171a] border border-[#282830] rounded-xl p-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-white">Copy Custom Status</h4>
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
                    className="px-3 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
                  >
                    {copiedStatus ? '✓ Copied!' : 'Copy Status'}
                  </button>
                </div>
              </div>
            )}
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
