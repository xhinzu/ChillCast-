import { NextRequest, NextResponse } from 'next/server';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyPlaylistResponse {
  name: string;
  description: string;
  images?: Array<{ url: string }>;
  tracks: {
    total: number;
    items: Array<{
      track: {
        id: string;
        name: string;
        duration_ms: number;
        artists: Array<{ name: string }>;
        album: {
          name: string;
          images?: Array<{ url: string }>;
        };
      } | null;
    }>;
  };
}

function parseSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return trimmed;
  }
  const matchUrl = trimmed.match(/playlist\/([a-zA-Z0-9]{22})/);
  if (matchUrl && matchUrl[1]) {
    return matchUrl[1];
  }
  const matchUri = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
  if (matchUri && matchUri[1]) {
    return matchUri[1];
  }
  return null;
}

// In-memory token cache for client credentials
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyClientCredentialsToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Spotify token error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as SpotifyTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

async function resolveViaSpotifyEmbed(playlistId: string) {
  const embedRes = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    cache: 'no-store',
  });

  if (!embedRes.ok) {
    throw new Error(`Spotify embed returned status ${embedRes.status}`);
  }

  const html = await embedRes.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
  if (!match || !match[1]) {
    throw new Error('Could not parse Spotify embed data');
  }

  const json = JSON.parse(match[1]);
  const entity = json?.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('Spotify playlist entity not found in embed');
  }

  const coverUrl =
    entity.coverArt?.sources?.[0]?.url ||
    entity.visualIdentity?.image?.[2]?.url ||
    entity.visualIdentity?.image?.[0]?.url ||
    '';

  const tracks = (entity.trackList || []).map((t: {
    uri?: string;
    uid?: string;
    title?: string;
    subtitle?: string;
    duration?: number;
  }) => ({
    id: t.uri ? t.uri.replace('spotify:track:', '') : (t.uid || Math.random().toString(36).slice(2)),
    title: t.title || 'Untitled Track',
    artist: t.subtitle || 'Unknown Artist',
    album: entity.name || 'Spotify Playlist',
    duration: t.duration ? Math.round(t.duration / 1000) : 0,
    artworkUrl: coverUrl,
  }));

  return {
    playlistId,
    playlistName: entity.name || 'Spotify Playlist',
    description: entity.subtitle || '',
    artworkUrl: coverUrl,
    totalTracks: tracks.length,
    tracks,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playlistUrlOrId } = body as { playlistUrlOrId?: string };

    if (!playlistUrlOrId) {
      return NextResponse.json(
        { error: 'Playlist URL or Spotify ID is required' },
        { status: 400 }
      );
    }

    const playlistId = parseSpotifyPlaylistId(playlistUrlOrId);
    if (!playlistId) {
      return NextResponse.json(
        { error: 'Invalid Spotify playlist link or ID format' },
        { status: 400 }
      );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    // Strategy 1: If Spotify credentials are configured, try official API
    if (clientId && clientSecret) {
      try {
        const token = await getSpotifyClientCredentialsToken(clientId, clientSecret);

        const playlistRes = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images,tracks.total,tracks.items(track(id,name,duration_ms,artists(name),album(name,images)))`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          }
        );

        if (playlistRes.ok) {
          const playlistData = (await playlistRes.json()) as SpotifyPlaylistResponse;

          const tracks = (playlistData.tracks?.items || [])
            .filter((item) => item.track !== null)
            .map((item) => {
              const t = item.track!;
              return {
                id: t.id,
                title: t.name,
                artist: t.artists.map((a) => a.name).join(', ') || 'Unknown Artist',
                album: t.album.name || playlistData.name,
                duration: Math.round(t.duration_ms / 1000),
                artworkUrl: t.album.images?.[0]?.url || playlistData.images?.[0]?.url || '',
              };
            });

          return NextResponse.json({
            playlistId,
            playlistName: playlistData.name,
            description: playlistData.description,
            artworkUrl: playlistData.images?.[0]?.url || '',
            totalTracks: playlistData.tracks?.total || tracks.length,
            tracks,
          });
        }
      } catch (apiErr) {
        console.warn('Spotify official API failed, falling back to public embed:', apiErr);
      }
    }

    // Strategy 2: Zero-config public embed resolution (works for any public Spotify playlist!)
    const embedData = await resolveViaSpotifyEmbed(playlistId);
    return NextResponse.json(embedData);
  } catch (err) {
    console.error('Error resolving Spotify playlist:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to resolve Spotify playlist' },
      { status: 500 }
    );
  }
}
