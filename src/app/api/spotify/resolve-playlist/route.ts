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

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            'Spotify credentials not found. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env.local to resolve live Spotify playlists.',
          needsConfig: true,
        },
        { status: 503 }
      );
    }

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

    if (!playlistRes.ok) {
      const err = await playlistRes.text();
      return NextResponse.json(
        { error: `Spotify API error (${playlistRes.status}): ${err}` },
        { status: playlistRes.status }
      );
    }

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
  } catch (err) {
    console.error('Error resolving Spotify playlist:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to resolve Spotify playlist' },
      { status: 500 }
    );
  }
}
