'use client';

import React, { useState, useEffect } from 'react';
import { usePlayback } from '@/context/PlaybackContext';
import {
  isTauri,
  getDiscordStatus,
  listenDiscordStatus,
  sendDesktopTestPresence,
  type DiscordConnectionStatus,
} from '@/lib/desktop';
import {
  testDiscordWebhook,
  isValidDiscordWebhookUrl,
} from '@/lib/discord/webhook';
import { copyDiscordCustomStatus } from '@/lib/discord/custom-status';
import { useSettings } from '@/lib/settings/useSettings';
import { SettingsCheckIcon, SettingsCloseIcon } from '../SettingsIcons';

export default function DiscordSection() {
  const { currentTrack } = usePlayback();
  const isDesktopApp = isTauri();
  const { settings, updateSettings, resetSection } = useSettings();

  const [discordStatus, setDiscordStatus] = useState<DiscordConnectionStatus>({ status: 'NotRunning' });
  const [whyPopoverOpen, setWhyPopoverOpen] = useState(false);
  const [testingPresence, setTestingPresence] = useState(false);
  const [testPresenceSuccess, setTestPresenceSuccess] = useState<boolean | null>(null);

  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const [moreWaysOpen, setMoreWaysOpen] = useState(false);
  const [isPreMiDHelpOpen, setIsPreMiDHelpOpen] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  const [testingCover, setTestingCover] = useState(false);
  const [coverTestResult, setCoverTestResult] = useState<{
    status: number;
    contentType: string;
    size: string;
    url: string;
    previewUrl: string;
    error?: string;
  } | null>(null);

  const handleTestCover = async () => {
    setTestingCover(true);
    setCoverTestResult(null);

    const ytId = (() => {
      if (!currentTrack) return null;
      if (/^[A-Za-z0-9_-]{11}$/.test(currentTrack.id)) return currentTrack.id;
      if (currentTrack.artworkUrl) {
        const m = currentTrack.artworkUrl.match(/\/vi\/([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
      }
      if (currentTrack.sourceUrl) {
        const m = currentTrack.sourceUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
      }
      return null;
    })();

    const targetUrl = currentTrack?.artworkUrl?.startsWith('https://')
      ? currentTrack.artworkUrl
      : ytId
      ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
      : 'https://i.ytimg.com/vi/HyHNu342610/hqdefault.jpg';

    try {
      const res = await fetch(targetUrl, { method: 'GET' });
      const contentType = res.headers.get('content-type') || 'unknown';
      const contentLength = res.headers.get('content-length');
      const size = contentLength
        ? `${Math.round(parseInt(contentLength, 10) / 1024)} KB`
        : 'stream';

      setCoverTestResult({
        status: res.status,
        contentType,
        size,
        url: targetUrl,
        previewUrl: targetUrl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCoverTestResult({
        status: 0,
        contentType: 'error',
        size: '0 KB',
        url: targetUrl,
        previewUrl: targetUrl,
        error: msg,
      });
    } finally {
      setTestingCover(false);
    }
  };

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

  const handleTestWebhook = async () => {
    if (!isValidDiscordWebhookUrl(settings.discord.webhookUrl)) {
      setTestResult({ success: false, message: 'Invalid Discord webhook URL format' });
      return;
    }
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await testDiscordWebhook(settings.discord.webhookUrl, settings.discord.webhookBotName);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5865F2]" />
            Discord Rich Presence &amp; Integrations
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Automatic Spotify-style status, channel webhooks, and custom status
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetSection('discord')}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          title="Reset this section to defaults"
        >
          Reset Discord
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

            {/* Action buttons: Test Cover & Test Status */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestCover}
                disabled={testingCover}
                className="px-3 py-1 rounded-md bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-[11px] font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                title="Verify current track cover art URL and response headers"
              >
                {testingCover ? 'Testing cover...' : 'Test cover'}
              </button>

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
                    ? 'Sent 10s sample'
                    : testPresenceSuccess === false
                    ? 'Send failed'
                    : 'Test Status'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cover Diagnostic Result Card */}
        {coverTestResult && (
          <div className="p-3 bg-[#111115] border border-[#262632] rounded-xl flex items-start gap-3.5 animate-in fade-in duration-150">
            {coverTestResult.status === 200 ? (
              <img
                src={coverTestResult.previewUrl}
                alt="Cover Preview"
                className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0 shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500 font-mono text-xs">
                N/A
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-white">Cover Art Diagnostic Result</span>
                <span
                  style={
                    coverTestResult.status === 200
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                          color: 'var(--accent)',
                          borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                        }
                      : { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
                  }
                  className="px-2 py-0.5 rounded text-[10px] font-mono border"
                >
                  HTTP {coverTestResult.status} {coverTestResult.status === 200 ? 'OK' : 'FAIL'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                <div>Type: <span className="text-zinc-200">{coverTestResult.contentType}</span></div>
                <div>Size: <span className="text-zinc-200">{coverTestResult.size}</span></div>
              </div>

              <div className="text-[10px] font-mono text-zinc-500 truncate pt-0.5" title={coverTestResult.url}>
                URL: {coverTestResult.url}
              </div>

              {coverTestResult.error && (
                <div className="text-[10px] text-rose-400 pt-0.5">
                  Error: {coverTestResult.error}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCoverTestResult(null)}
              className="text-zinc-500 hover:text-white text-xs cursor-pointer"
            >
              <SettingsCloseIcon className="w-3 h-3" />
            </button>
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
              Updates your Discord status automatically with live progress bar and cover art when music plays.
            </p>
          </div>

          <button
            type="button"
            id="discord-presence-toggle"
            role="switch"
            aria-checked={settings.discord.presenceEnabled}
            onClick={() => updateSettings('discord', { presenceEnabled: !settings.discord.presenceEnabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.discord.presenceEnabled ? 'bg-white' : 'bg-[#2e2e36]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                settings.discord.presenceEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Hide song details (Privacy option) */}
        {settings.discord.presenceEnabled && (
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
              aria-checked={settings.discord.hideDetails}
              onClick={() => updateSettings('discord', { hideDetails: !settings.discord.hideDetails })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.discord.hideDetails ? 'bg-white' : 'bg-[#2e2e36]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.discord.hideDetails ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-400'
                }`}
              />
            </button>
          </div>
        )}

        {/* Toggle 3: Share room link with friends */}
        {settings.discord.presenceEnabled && !settings.discord.hideDetails && (
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
              aria-checked={settings.discord.shareRoom}
              onClick={() => updateSettings('discord', { shareRoom: !settings.discord.shareRoom })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.discord.shareRoom ? 'bg-white' : 'bg-[#2e2e36]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.discord.shareRoom ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-400'
                }`}
              />
            </button>
          </div>
        )}

        {/* Discord Activity Privacy Hint */}
        <div className="pt-2 border-t border-[#22222a] flex items-start gap-2 text-[10px] text-zinc-400">
          <svg className="w-3.5 h-3.5 text-[#5865F2] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="leading-relaxed">
            <strong>Activity Privacy:</strong> If your activity does not appear to friends, ensure{' '}
            <span className="text-zinc-200 underline decoration-zinc-600">
              &quot;Display current activity as a status message&quot;
            </span>{' '}
            is switched ON inside your Discord desktop client under <em>User Settings -&gt; Activity Privacy</em>.
          </p>
        </div>
      </div>

      {/* Accordion: More ways to share (Webhook & Custom Status) */}
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
                  aria-checked={settings.discord.webhookEnabled}
                  onClick={() => updateSettings('discord', { webhookEnabled: !settings.discord.webhookEnabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.discord.webhookEnabled ? 'bg-white' : 'bg-[#2e2e36]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.discord.webhookEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>

              {settings.discord.webhookEnabled && (
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
                      value={settings.discord.webhookUrl}
                      onChange={(e) => updateSettings('discord', { webhookUrl: e.target.value.trim() })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full bg-[#101012] border border-[#2e2e36] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>

                  {settings.discord.webhookUrl && !isValidDiscordWebhookUrl(settings.discord.webhookUrl) && (
                    <p className="text-[10px] text-rose-400">
                      Please enter a valid Discord webhook URL (must start with https://discord.com/api/webhooks/...).
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <input
                      type="text"
                      value={settings.discord.webhookBotName}
                      onChange={(e) => updateSettings('discord', { webhookBotName: e.target.value })}
                      placeholder="Bot username (MyuJiku)"
                      maxLength={32}
                      className="w-44 bg-[#101012] border border-[#2e2e36] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#5865F2]"
                    />

                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !isValidDiscordWebhookUrl(settings.discord.webhookUrl)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      {testingWebhook ? 'Testing...' : 'Test Webhook'}
                    </button>
                  </div>

                  {testResult && (
                    <div
                      style={
                        testResult.success
                          ? {
                              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                              borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                              color: 'var(--accent)',
                            }
                          : undefined
                      }
                      className={`p-2.5 rounded-lg text-[11px] flex items-center gap-2 border ${
                        testResult.success
                          ? ''
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {testResult.success ? (
                        <SettingsCheckIcon className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <SettingsCloseIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
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
                  {currentTrack?.artist || 'Artist'} - {currentTrack?.title || 'Song'} | MyuJiku
                </code>
              </div>

              <button
                type="button"
                onClick={handleCopyCurrentStatus}
                className="px-3 py-1.5 rounded-lg bg-[#24242c] hover:bg-[#32323e] border border-[#383848] text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
              >
                {copiedStatus ? 'Copied!' : 'Copy Status'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
