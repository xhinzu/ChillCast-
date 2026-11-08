'use client';

import React, { useEffect, useState, useRef } from 'react';
import { PlaybackProvider, usePlayback } from '@/context/PlaybackContext';
import { AmbientProvider } from '@/context/AmbientContext';
import { RoomProvider, useRoom } from '@/context/RoomContext';
import SpotifyTopNav from '@/components/spotify/SpotifyTopNav';
import SpotifySidebar from '@/components/spotify/SpotifySidebar';
import SpotifyMainContent from '@/components/spotify/SpotifyMainContent';
import SpotifyBottomPlayer from '@/components/spotify/SpotifyBottomPlayer';
import MobileTabBar from '@/components/spotify/MobileTabBar';
import SpotifyNowPlayingPanel from '@/components/spotify/SpotifyNowPlayingPanel';
import FloatingLyrics from '@/components/lyrics/FloatingLyrics';
import DiscordPresenceBridge from '@/components/discord/DiscordPresenceBridge';
import InspectModal from '@/components/lyrics/InspectModal';
import CloseConfirmationModal from '@/components/desktop/CloseConfirmationModal';
import ShortcutsOverlayModal from '@/components/common/ShortcutsOverlayModal';
import Miniplayer from '@/components/player/Miniplayer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { initThemeApplier } from '@/lib/theme/theme-applier';
import { useSettings } from '@/lib/settings/useSettings';
import { decodePlaylistShareData } from '@/lib/playlist-share';
import { addOrUpdatePlaylist, SavedPlaylistItem } from '@/lib/playlist-storage';
import {
  isTauri,
  hideWindow,
  quitApp,
  updateTrayTooltip,
  listenWindowCloseRequested,
  listenTrayControls,
  toggleDesktopMiniplayer,
} from '@/lib/desktop';

export interface ChillCastAppProps {
  initialView?: string;
  initialRoomCode?: string;
}

function ChillCastShell({ initialView = 'home', initialRoomCode }: ChillCastAppProps) {
  const { togglePlay, nextTrack, previousTrack, currentTrack } = usePlayback();
  const { joinRoom, room } = useRoom();
  const { settings } = useSettings();
  const [activeView, setActiveView] = useState<string>(initialView);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNowPlaying, setShowNowPlaying] = useState<boolean>(true);
  const [showInspectModal, setShowInspectModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showShortcutsOverlay, setShowShortcutsOverlay] = useState<boolean>(false);
  const [showMiniplayer, setShowMiniplayer] = useState<boolean>(false);
  const showMiniplayerRef = useRef<boolean>(false);
  showMiniplayerRef.current = showMiniplayer;
  const [trayNotice, setTrayNotice] = useState<string | null>(null);

  // Global Keyboard Shortcuts Engine
  useKeyboardShortcuts({
    onOpenLyrics: () => setActiveView('lyrics'),
    onOpenSettings: () => {
      window.dispatchEvent(new CustomEvent('myujiku_open_settings'));
    },
    onToggleShortcutsOverlay: () => setShowShortcutsOverlay((prev) => !prev),
    onCloseModals: () => {
      setShowShortcutsOverlay(false);
      setShowInspectModal(false);
      setShowCloseModal(false);
    },
    onFocusSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
      );
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
  });

  // Listen to navigation events from shortcuts or modals
  useEffect(() => {
    const handleNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setActiveView(detail);
      }
    };
    const handleClose = () => {
      setShowShortcutsOverlay(false);
      setShowInspectModal(false);
      setShowCloseModal(false);
      setShowMiniplayer(false);
    };
    const handleToggleShortcuts = () => {
      setShowShortcutsOverlay((prev) => !prev);
    };
    const handleToggleMiniplayer = () => {
      setShowMiniplayer((prev) => {
        const next = !prev;
        if (isTauri()) {
          toggleDesktopMiniplayer(next).catch(() => {});
        }
        return next;
      });
    };

    window.addEventListener('myujiku_navigate_view', handleNav);
    window.addEventListener('myujiku_close_modals', handleClose);
    window.addEventListener('myujiku_toggle_shortcuts_overlay', handleToggleShortcuts);
    window.addEventListener('myujiku_toggle_miniplayer', handleToggleMiniplayer);
    return () => {
      window.removeEventListener('myujiku_navigate_view', handleNav);
      window.removeEventListener('myujiku_close_modals', handleClose);
      window.removeEventListener('myujiku_toggle_shortcuts_overlay', handleToggleShortcuts);
      window.removeEventListener('myujiku_toggle_miniplayer', handleToggleMiniplayer);
    };
  }, []);

  // Import shared playlist from URL if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const importId = url.searchParams.get('import_playlist');
      const d = url.searchParams.get('d');
      if (importId && d) {
        const data = decodePlaylistShareData(d);
        if (data) {
          const newPlaylist: SavedPlaylistItem = {
            id: data.id || importId,
            title: data.title || 'Shared Playlist',
            subtitle: data.description || `${data.tracks?.length || 0} songs • Shared`,
            type: 'custom',
            targetUrl: '',
            icon: 'music',
            coverUrl: data.coverUrl,
            createdAt: Date.now(),
            tracks: (data.tracks || []).map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              duration: t.duration || '3:00',
              thumbnail: t.thumbnail,
              addedAt: Date.now(),
            })),
          };
          addOrUpdatePlaylist(newPlaylist);
          setActiveView(`playlist:${newPlaylist.id}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch {}
  }, []);

  // Desktop integration: Window close handler, tray controls, tray tooltip
  useEffect(() => {
    if (!isTauri()) return;

    // Listen for window close requested
    let unlistenClose: (() => void) | undefined;
    listenWindowCloseRequested(async () => {
      // If miniplayer is active, closing window minimizes to tray so music and popup state remain safe
      if (showMiniplayerRef.current) {
        await hideWindow();
        return;
      }

      const action = settings.desktop.closeAction;
      if (action === 'tray') {
        const hasSeenNotice = localStorage.getItem('myujiku_seen_tray_notice') === 'true';
        if (!hasSeenNotice) {
          try {
            localStorage.setItem('myujiku_seen_tray_notice', 'true');
          } catch {}
          setTrayNotice('MyuJiku is minimized to the system tray. Music will keep playing in the background.');
          setTimeout(() => setTrayNotice(null), 5000);
        }
        await hideWindow();
      } else if (action === 'quit') {
        await quitApp();
      } else {
        setShowCloseModal(true);
      }
    }).then((fn) => {
      unlistenClose = fn;
    });

    // Listen for tray playback controls (Show, Miniplayer, Play/Pause, Next, Prev, Quit)
    let unlistenTray: (() => void) | undefined;
    listenTrayControls({
      onPlayPause: () => togglePlay(),
      onNext: () => nextTrack(),
      onPrev: () => previousTrack(),
      onShowMiniplayer: () => {
        setShowMiniplayer(true);
        if (isTauri()) {
          toggleDesktopMiniplayer(true).catch(() => {});
        }
      },
      onShowApp: () => {
        setShowMiniplayer(false);
        if (isTauri()) {
          toggleDesktopMiniplayer(false).catch(() => {});
        }
      },
    }).then((fn) => {
      unlistenTray = fn;
    });

    return () => {
      if (unlistenClose) unlistenClose();
      if (unlistenTray) unlistenTray();
    };
  }, [settings.desktop.closeAction, togglePlay, nextTrack, previousTrack]);

  // Update system tray tooltip with current song info
  useEffect(() => {
    if (!isTauri()) return;
    if (currentTrack) {
      updateTrayTooltip(currentTrack.title || 'Untitled', currentTrack.artist || 'Unknown Artist');
    } else {
      updateTrayTooltip('Ready', 'MyuJiku');
    }
  }, [currentTrack]);

  useEffect(() => {
    const handleOpen = () => setShowInspectModal(true);
    window.addEventListener('myujiku_open_inspect_modal', handleOpen);
    return () => window.removeEventListener('myujiku_open_inspect_modal', handleOpen);
  }, []);
  const [searchViewMode, setSearchViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    try {
      const saved = localStorage.getItem('chillify_search_view_mode');
      if (saved === 'grid' || saved === 'list') {
        return saved;
      }
    } catch {}
    return 'list';
  });

  // If initial room code was provided in URL (e.g. /together/[code]), initiate join
  useEffect(() => {
    if (initialRoomCode && (!room || room.code !== initialRoomCode)) {
      joinRoom(initialRoomCode);
    }
  }, [initialRoomCode, joinRoom, room]);

  const handleSetSearchViewMode = (mode: 'list' | 'grid') => {
    setSearchViewMode(mode);
    try {
      localStorage.setItem('chillify_search_view_mode', mode);
    } catch {}
  };

  // Global spacebar hotkey for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Initialize global theme and system color scheme synchronization
  useEffect(() => {
    return initThemeApplier();
  }, []);

  return (
    // Use h-dvh so mobile browser chrome (address bar) is accounted for
    <div className="h-[100dvh] w-screen bg-[var(--bg-base)] text-[var(--text)] flex flex-col overflow-hidden select-none font-sans">

      {/* 1. Top Navigation Bar */}
      <SpotifyTopNav
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchViewMode={searchViewMode}
        setSearchViewMode={handleSetSearchViewMode}
      />

      {/* 2. Main Middle: Sidebar + Main Discovery Content + Right-side Now Playing Panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar — hidden on mobile, visible on md+ (17-19% width) */}
        <div className="hidden md:flex px-2 py-2 h-full shrink-0">
          <SpotifySidebar
            activeView={activeView}
            setActiveView={setActiveView}
            setSearchQuery={setSearchQuery}
          />
        </div>

        {/* Center main scrollable content area (55-60% width) */}
        <div className="flex-1 overflow-hidden min-h-0 md:px-2 md:py-2">
          <SpotifyMainContent
            activeView={activeView}
            setActiveView={setActiveView}
            showVideo={showVideo}
            setShowVideo={setShowVideo}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchViewMode={searchViewMode}
            setSearchViewMode={handleSetSearchViewMode}
            extraBottomPadding={currentTrack ? 'pb-[130px] md:pb-0' : 'pb-[64px] md:pb-0'}
            onToggleNowPlaying={() => setShowNowPlaying((prev) => !prev)}
            isNowPlayingOpen={showNowPlaying}
          />
        </div>

        {/* Right Persistent Now Playing Panel (22-25% width on xl+, toggleable) */}
        {showNowPlaying && (
          <div className="hidden xl:flex px-2 py-2 h-full shrink-0">
            <SpotifyNowPlayingPanel
              isOpen={showNowPlaying}
              onClose={() => setShowNowPlaying(false)}
            />
          </div>
        )}
      </div>

      {/* Floating lyrics overlay when user browses other tabs */}
      <FloatingLyrics
        activeView={activeView}
        onNavigateToLyrics={() => setActiveView('lyrics')}
      />

      {/* 3. Bottom Player Bar */}
      <div className="md:block shrink-0">
        <SpotifyBottomPlayer
          showVideo={showVideo}
          setShowVideo={setShowVideo}
          activeView={activeView}
          setActiveView={setActiveView}
          onToggleNowPlaying={() => setShowNowPlaying((prev) => !prev)}
          isNowPlayingOpen={showNowPlaying}
          onToggleMiniplayer={() => {
            setShowMiniplayer((prev) => {
              const next = !prev;
              if (isTauri()) {
                toggleDesktopMiniplayer(next).catch(() => {});
              }
              return next;
            });
          }}
          isMiniplayerOpen={showMiniplayer}
        />
      </div>

      {/* 4. Mobile-only bottom tab bar — fixed at very bottom */}
      <MobileTabBar
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 5. Permanent YouTube Player Container */}
      <div
        id="chillcast-yt-wrapper"
        aria-hidden="true"
        className={`fixed transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-[#282828] bg-black ${
          showVideo
            ? 'bottom-[120px] md:bottom-24 right-4 md:right-6 w-72 h-40 md:w-80 md:h-48 lg:w-96 lg:h-56 opacity-100 pointer-events-auto z-40'
            : 'bottom-0 right-0 w-64 h-36 opacity-[0.002] pointer-events-none -z-50'
        }`}
      >
        <div id="chillcast-yt-player" className="w-full h-full" />
      </div>

      {/* 6. Discord Rich Presence Bridge (PreMiD support) */}
      <DiscordPresenceBridge />

      {/* 7. Hidden Inspect / About Diagnostics Modal (7-tap logo trigger) */}
      <InspectModal
        isOpen={showInspectModal}
        onClose={() => setShowInspectModal(false)}
      />

      {/* 8. Desktop Close Confirmation Modal */}
      <CloseConfirmationModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onSwitchToMiniplayer={() => {
          setShowCloseModal(false);
          setShowMiniplayer(true);
          if (isTauri()) {
            toggleDesktopMiniplayer(true).catch(() => {});
          }
        }}
        onFirstTimeTrayNotify={() => {
          setTrayNotice('MyuJiku is minimized to the system tray. Music will keep playing in the background.');
          setTimeout(() => setTrayNotice(null), 5000);
        }}
      />

      {/* 9. Shortcuts Quick Sheet Modal */}
      <ShortcutsOverlayModal
        isOpen={showShortcutsOverlay}
        onClose={() => setShowShortcutsOverlay(false)}
        onOpenSettings={() => {
          window.dispatchEvent(new CustomEvent('myujiku_open_settings'));
        }}
      />

      {/* 10. Floating Miniplayer Mode */}
      <Miniplayer
        isOpen={showMiniplayer}
        onClose={() => {
          setShowMiniplayer(false);
          if (isTauri()) {
            toggleDesktopMiniplayer(false).catch(() => {});
          }
        }}
      />

      {/* 9. One-time Tray Notification Toast */}
      {trayNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl bg-[#1e1e28] border border-blue-500/40 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>{trayNotice}</span>
        </div>
      )}
    </div>
  );
}

export default function ChillCastApp({ initialView = 'home', initialRoomCode }: ChillCastAppProps) {
  return (
    <PlaybackProvider>
      <AmbientProvider>
        <RoomProvider>
          <ChillCastShell initialView={initialView} initialRoomCode={initialRoomCode} />
        </RoomProvider>
      </AmbientProvider>
    </PlaybackProvider>
  );
}
