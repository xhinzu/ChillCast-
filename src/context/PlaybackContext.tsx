'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AdapterType,
  PlaybackAdapter,
  PlaybackState,
  TrackInfo,
} from '@/types/playback';
import { createAdapter, LocalAudioAdapter } from '@/lib/adapters';

interface PlaybackContextValue {
  activeAdapterType: AdapterType;
  activeAdapter: PlaybackAdapter | null;
  currentTrack: TrackInfo | null;
  playbackState: PlaybackState;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  errorMessage: string | null;
  isSpatial8D: boolean;
  isMuffled: boolean;

  switchAdapter: (type: AdapterType) => Promise<PlaybackAdapter>;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  loadPlaylist: (urlOrId: string, preferredType?: AdapterType) => Promise<void>;
  loadCustomLocalFile: (file: File) => Promise<void>;
  toggleSpatial8D: () => void;
  toggleMuffled: () => void;
  playCustomTrackList: (tracks: TrackInfo[], startIndex?: number) => Promise<void>;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [activeAdapterType, setActiveAdapterType] = useState<AdapterType>('local');
  const [activeAdapter, setActiveAdapter] = useState<PlaybackAdapter | null>(null);
  const adapterRef = useRef<PlaybackAdapter | null>(null);

  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSpatial8D, setIsSpatial8D] = useState<boolean>(false);
  const [isMuffled, setIsMuffled] = useState<boolean>(false);

  const playCustomTrackListRef = useRef<((tracks: TrackInfo[], startIndex?: number) => Promise<void>) | null>(null);

  // Bind subscriptions from an adapter
  const attachAdapterListeners = useCallback((adapter: PlaybackAdapter) => {
    const unsubPos = adapter.onPositionChange((pos) => {
      setCurrentTime(pos);
      const d = adapter.getDuration();
      if (d > 0) {
        setDuration(d);
      }
    });
    const unsubTrack = adapter.onTrackChange((track) => {
      setCurrentTrack(track);
      if (track && track.duration > 0) {
        setDuration(track.duration);
      } else {
        const d = adapter.getDuration();
        if (d > 0) {
          setDuration(d);
        }
      }
    });
    const unsubState = adapter.onStateChange((state) => {
      setPlaybackState(state);
      if (state === 'ended') {
        const { tracks, currentIndex } = playlistQueueRef.current;
        if (tracks.length > 0 && currentIndex + 1 < tracks.length && playCustomTrackListRef.current) {
          playCustomTrackListRef.current(tracks, currentIndex + 1);
        }
      }
    });
    const unsubErr = adapter.onError((err) => setErrorMessage(err));

    return () => {
      unsubPos();
      unsubTrack();
      unsubState();
      unsubErr();
    };
  }, []);

  // Initialize active adapter on mount or type change
  useEffect(() => {
    let cleanSubs: (() => void) | null = null;
    let isCancelled = false;

    const init = async () => {
      if (adapterRef.current && adapterRef.current.name === activeAdapterType) {
        return;
      }

      if (adapterRef.current) {
        adapterRef.current.cleanup();
      }

      const newAdapter = createAdapter(activeAdapterType);
      adapterRef.current = newAdapter;
      setActiveAdapter(newAdapter);

      cleanSubs = attachAdapterListeners(newAdapter);
      await newAdapter.initialize();

      if (!isCancelled) {
        newAdapter.setVolume(isMuted ? 0 : volume);
      }
    };

    init().catch((err) => {
      console.error('Failed to initialize playback adapter:', err);
    });

    return () => {
      isCancelled = true;
      if (cleanSubs) cleanSubs();
    };
  }, [activeAdapterType, attachAdapterListeners]);

  // Sync volume & mute to the active adapter without rebuilding it
  useEffect(() => {
    if (adapterRef.current) {
      adapterRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [isMuted, volume]);

  const switchAdapter = useCallback(
    async (type: AdapterType): Promise<PlaybackAdapter> => {
      if (adapterRef.current && adapterRef.current.name === type) {
        return adapterRef.current;
      }

      setErrorMessage(null);
      setCurrentTime(0);

      if (adapterRef.current) {
        adapterRef.current.cleanup();
        adapterRef.current = null;
      }

      const newAdapter = createAdapter(type);
      adapterRef.current = newAdapter;
      setActiveAdapter(newAdapter);
      setActiveAdapterType(type);

      attachAdapterListeners(newAdapter);
      await newAdapter.initialize();
      newAdapter.setVolume(isMuted ? 0 : volume);

      return newAdapter;
    },
    [attachAdapterListeners, isMuted, volume]
  );

  const play = useCallback(async () => {
    if (adapterRef.current) {
      setErrorMessage(null);
      await adapterRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!adapterRef.current) return;
    if (playbackState === 'playing') {
      adapterRef.current.pause();
    } else {
      await adapterRef.current.play();
    }
  }, [playbackState]);

  const seek = useCallback((seconds: number) => {
    if (adapterRef.current) {
      adapterRef.current.seek(seconds);
    }
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (adapterRef.current) {
      adapterRef.current.setVolume(isMuted ? 0 : clamped);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (adapterRef.current) {
      adapterRef.current.setVolume(nextMuted ? 0 : volume);
    }
  }, [isMuted, volume]);

  const playlistQueueRef = useRef<{ tracks: TrackInfo[]; currentIndex: number }>({
    tracks: [],
    currentIndex: 0,
  });

  const playCustomTrackList = useCallback(
    async (tracks: TrackInfo[], startIndex = 0) => {
      if (!tracks || tracks.length === 0) return;
      const index = Math.max(0, Math.min(tracks.length - 1, startIndex));
      playlistQueueRef.current = { tracks, currentIndex: index };

      const track = tracks[index];
      setErrorMessage(null);
      setCurrentTime(0);
      setDuration(track.duration || 0);

      const targetType: AdapterType = track.source === 'local' ? 'local' : 'youtube';
      let adapter = adapterRef.current;
      if (!adapter || adapter.name !== targetType) {
        adapter = await switchAdapter(targetType);
      }

      if (adapter) {
        await adapter.loadPlaylist(track.sourceUrl || track.id);
        await adapter.play();
      }
    },
    [switchAdapter]
  );

  useEffect(() => {
    playCustomTrackListRef.current = playCustomTrackList;
  }, [playCustomTrackList]);

  const nextTrack = useCallback(() => {
    const { tracks, currentIndex } = playlistQueueRef.current;
    if (tracks.length > 0 && currentIndex + 1 < tracks.length) {
      playCustomTrackList(tracks, currentIndex + 1);
      return;
    }
    const adapter = adapterRef.current;
    if (adapter && 'nextTrack' in adapter && typeof (adapter as { nextTrack?: () => void }).nextTrack === 'function') {
      (adapter as { nextTrack: () => void }).nextTrack();
    }
  }, [playCustomTrackList]);

  const previousTrack = useCallback(() => {
    const { tracks, currentIndex } = playlistQueueRef.current;
    if (tracks.length > 0 && currentIndex > 0) {
      playCustomTrackList(tracks, currentIndex - 1);
      return;
    }
    const adapter = adapterRef.current;
    if (adapter && 'previousTrack' in adapter && typeof (adapter as { previousTrack?: () => void }).previousTrack === 'function') {
      (adapter as { previousTrack: () => void }).previousTrack();
    }
  }, [playCustomTrackList]);

  const loadPlaylist = useCallback(
    async (urlOrId: string, preferredType?: AdapterType) => {
      setErrorMessage(null);
      setCurrentTime(0);
      setDuration(0);
      playlistQueueRef.current = { tracks: [], currentIndex: 0 };

      // Auto-detect or select adapter type
      let targetType = preferredType;
      if (!targetType) {
        if (urlOrId.includes('spotify.com')) {
          targetType = 'spotify';
        } else if (
          urlOrId.includes('youtube.com') ||
          urlOrId.includes('youtu.be') ||
          /^[a-zA-Z0-9_-]{11}$/.test(urlOrId.trim()) ||
          /^(PL|RD|OLAK5uy)[a-zA-Z0-9_-]{10,}$/.test(urlOrId.trim())
        ) {
          targetType = 'youtube';
        } else {
          targetType = activeAdapterType;
        }
      }

      let adapter = adapterRef.current;
      if (!adapter || adapter.name !== targetType) {
        adapter = await switchAdapter(targetType);
      }

      if (adapter) {
        await adapter.loadPlaylist(urlOrId);
        await adapter.play();
      }
    },
    [activeAdapterType, switchAdapter]
  );

  const loadCustomLocalFile = useCallback(
    async (file: File) => {
      let adapter = adapterRef.current;
      if (!(adapter instanceof LocalAudioAdapter)) {
        adapter = await switchAdapter('local');
      }
      if (adapter instanceof LocalAudioAdapter) {
        setErrorMessage(null);
        setCurrentTime(0);
        setDuration(0);
        await adapter.loadCustomFile(file);
        await adapter.play();
      }
    },
    [switchAdapter]
  );

  const toggleSpatial8D = useCallback(() => {
    setIsSpatial8D((prev) => {
      const next = !prev;
      const adapter = adapterRef.current;
      if (adapter && 'setSpatial8D' in adapter && typeof (adapter as unknown as { setSpatial8D: (b: boolean) => void }).setSpatial8D === 'function') {
        (adapter as unknown as { setSpatial8D: (b: boolean) => void }).setSpatial8D(next);
      }
      return next;
    });
  }, []);

  const toggleMuffled = useCallback(() => {
    setIsMuffled((prev) => {
      const next = !prev;
      const adapter = adapterRef.current;
      if (adapter && 'setMuffled' in adapter && typeof (adapter as unknown as { setMuffled: (b: boolean) => void }).setMuffled === 'function') {
        (adapter as unknown as { setMuffled: (b: boolean) => void }).setMuffled(next);
      }
      return next;
    });
  }, []);

  // Keep adapter effects in sync
  useEffect(() => {
    const adapter = adapterRef.current;
    if (adapter && 'setSpatial8D' in adapter && typeof (adapter as unknown as { setSpatial8D: (b: boolean) => void }).setSpatial8D === 'function') {
      (adapter as unknown as { setSpatial8D: (b: boolean) => void }).setSpatial8D(isSpatial8D);
    }
    if (adapter && 'setMuffled' in adapter && typeof (adapter as unknown as { setMuffled: (b: boolean) => void }).setMuffled === 'function') {
      (adapter as unknown as { setMuffled: (b: boolean) => void }).setMuffled(isMuffled);
    }
  }, [activeAdapter, isSpatial8D, isMuffled]);

  const isPlaying = playbackState === 'playing';

  return (
    <PlaybackContext.Provider
      value={{
        activeAdapterType,
        activeAdapter,
        currentTrack,
        playbackState,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        errorMessage,
        isSpatial8D,
        isMuffled,
        switchAdapter,
        play,
        pause,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        nextTrack,
        previousTrack,
        loadPlaylist,
        loadCustomLocalFile,
        toggleSpatial8D,
        toggleMuffled,
        playCustomTrackList,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}
