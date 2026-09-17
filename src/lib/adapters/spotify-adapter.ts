import { BasePlaybackAdapter } from './base-adapter';
import { AdapterType, TrackInfo } from '@/types/playback';
import { SpotifyPlaybackState, SpotifyWebPlayer } from '@/types/spotify';
import { YouTubeAdapter } from './youtube-adapter';

export type SpotifyMode = 'metadata' | 'pkce';

export interface ResolvedSpotifyTrack extends TrackInfo {
  spotifyId: string;
  youtubeVideoId?: string;
  isResolved?: boolean;
}

export class SpotifyAdapter extends BasePlaybackAdapter {
  readonly name: AdapterType = 'spotify';
  readonly displayName = 'Spotify';

  private mode: SpotifyMode = 'metadata';
  private spotifyPlayer: SpotifyWebPlayer | null = null;
  private deviceId: string | null = null;
  private accessToken: string | null = null;
  private youtubeResolver: YouTubeAdapter | null = null;
  private playlist: ResolvedSpotifyTrack[] = [];
  private currentTrackIndex = 0;
  private positionInterval: number | null = null;

  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Check if user has an active PKCE token stored in localStorage
    const savedToken = localStorage.getItem('spotify_access_token');
    if (savedToken) {
      this.accessToken = savedToken;
    }

    // Initialize the YouTube fallback resolver for Mode B
    this.youtubeResolver = new YouTubeAdapter();
    await this.youtubeResolver.initialize();

    // Mirror YouTube resolver events when in Mode B
    this.youtubeResolver.onPositionChange((pos) => {
      if (this.mode === 'metadata') {
        this.emitPosition(pos);
      }
    });

    this.youtubeResolver.onStateChange((st) => {
      if (this.mode === 'metadata') {
        this.emitState(st);
      }
    });

    this.emitState('idle');
  }

  public setMode(mode: SpotifyMode) {
    this.mode = mode;
    if (mode === 'pkce' && !this.spotifyPlayer && this.accessToken) {
      this.initWebPlaybackSDK();
    }
  }

  public getMode(): SpotifyMode {
    return this.mode;
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('spotify_access_token', token);
    if (this.mode === 'pkce') {
      this.initWebPlaybackSDK();
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public clearAccessToken() {
    this.accessToken = null;
    localStorage.removeItem('spotify_access_token');
    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect();
      this.spotifyPlayer = null;
    }
    this.mode = 'metadata';
  }

  /* --- Mode A: Spotify Web Playback SDK --- */
  private async initWebPlaybackSDK(): Promise<void> {
    if (!this.accessToken) return;

    await this.ensureSpotifySdkLoaded();

    if (!window.Spotify) return;

    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect();
    }

    const player = new window.Spotify.Player({
      name: 'ChillCast Web Player',
      getOAuthToken: (cb) => cb(this.accessToken || ''),
      volume: this.volume,
    });

    player.addListener('ready', ({ device_id }) => {
      this.deviceId = device_id;
      this.emitState('paused');
    });

    player.addListener('not_ready', () => {
      this.deviceId = null;
    });

    player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
      if (!state) return;
      this.duration = state.duration / 1000;
      this.emitPosition(state.position / 1000);

      const current = state.track_window.current_track;
      if (current) {
        this.emitTrack({
          id: current.id,
          title: current.name,
          artist: current.artists.map((a) => a.name).join(', '),
          album: current.album.name,
          duration: state.duration / 1000,
          artworkUrl: current.album.images?.[0]?.url,
          source: 'spotify',
        });
      }

      this.emitState(state.paused ? 'paused' : 'playing');
    });

    player.addListener('account_error', (err) => {
      this.emitError(`Spotify account error: ${err.message} (Spotify Premium required for Web Playback SDK)`);
    });

    player.addListener('authentication_error', (err) => {
      this.emitError(`Spotify auth error: ${err.message}. Please reconnect your account.`);
    });

    await player.connect();
    this.spotifyPlayer = player;
  }

  private ensureSpotifySdkLoaded(): Promise<void> {
    return new Promise((resolve) => {
      if (window.Spotify) {
        resolve();
        return;
      }
      const existing = document.getElementById('spotify-player-sdk');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'spotify-player-sdk';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        document.body.appendChild(script);
      }
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
    });
  }

  /* --- Mode B: Playlist Metadata Import + YouTube Resolution --- */
  public async loadPlaylist(idOrUrl: string): Promise<TrackInfo[]> {
    this.emitState('loading');

    try {
      const res = await fetch('/api/spotify/resolve-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrlOrId: idOrUrl }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        this.emitError(data.error || 'Failed to load Spotify playlist metadata');
        return [];
      }

      const tracks: ResolvedSpotifyTrack[] = (data.tracks || []).map((t: TrackInfo) => ({
        ...t,
        spotifyId: t.id,
        source: 'spotify' as const,
      }));

      this.playlist = tracks;
      this.currentTrackIndex = 0;

      if (tracks.length > 0) {
        await this.loadTrack(tracks[0]);
      }

      return tracks;
    } catch (err) {
      this.emitError((err as Error).message);
      return [];
    }
  }

  public async loadTrack(track: TrackInfo): Promise<void> {
    this.currentTrack = track;
    this.emitTrack(track);

    if (this.mode === 'pkce' && this.deviceId && this.accessToken) {
      // Play on Spotify device directly via Spotify Web API
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [`spotify:track:${track.id}`],
        }),
      });
      return;
    }

    // Mode B: Resolve track to YouTube video via cache-first server endpoint
    await this.resolveAndPlayViaYouTube(track);
  }

  private async resolveAndPlayViaYouTube(track: TrackInfo) {
    this.emitState('loading');
    try {
      const res = await fetch('/api/youtube/search-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist: track.artist, title: track.title }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        this.emitError(data.error || 'Failed to resolve Spotify track to YouTube stream');
        return;
      }

      if (this.youtubeResolver && data.videoId) {
        await this.youtubeResolver.loadPlaylist(data.videoId);
        await this.youtubeResolver.play();
        this.emitState('playing');
      }
    } catch (err) {
      this.emitError((err as Error).message);
    }
  }

  public async play(): Promise<void> {
    if (this.mode === 'pkce' && this.spotifyPlayer) {
      await this.spotifyPlayer.resume();
      this.emitState('playing');
    } else if (this.youtubeResolver) {
      await this.youtubeResolver.play();
      this.emitState('playing');
    }
  }

  public pause(): void {
    if (this.mode === 'pkce' && this.spotifyPlayer) {
      this.spotifyPlayer.pause();
      this.emitState('paused');
    } else if (this.youtubeResolver) {
      this.youtubeResolver.pause();
      this.emitState('paused');
    }
  }

  public seek(seconds: number): void {
    if (this.mode === 'pkce' && this.spotifyPlayer) {
      this.spotifyPlayer.seek(seconds * 1000);
      this.emitPosition(seconds);
    } else if (this.youtubeResolver) {
      this.youtubeResolver.seek(seconds);
      this.emitPosition(seconds);
    }
  }

  public nextTrack(): void {
    if (this.playlist.length > 0 && this.currentTrackIndex < this.playlist.length - 1) {
      this.currentTrackIndex++;
      this.loadTrack(this.playlist[this.currentTrackIndex]);
    } else if (this.mode === 'pkce' && this.spotifyPlayer) {
      this.spotifyPlayer.nextTrack();
    }
  }

  public previousTrack(): void {
    if (this.playlist.length > 0 && this.currentTrackIndex > 0) {
      this.currentTrackIndex--;
      this.loadTrack(this.playlist[this.currentTrackIndex]);
    } else if (this.mode === 'pkce' && this.spotifyPlayer) {
      this.spotifyPlayer.previousTrack();
    }
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.spotifyPlayer) {
      this.spotifyPlayer.setVolume(volume);
    }
    if (this.youtubeResolver) {
      this.youtubeResolver.setVolume(volume);
    }
  }

  public override cleanup(): void {
    if (this.positionInterval !== null) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
    if (this.spotifyPlayer) {
      this.spotifyPlayer.disconnect();
      this.spotifyPlayer = null;
    }
    if (this.youtubeResolver) {
      this.youtubeResolver.cleanup();
      this.youtubeResolver = null;
    }
    super.cleanup();
  }
}
