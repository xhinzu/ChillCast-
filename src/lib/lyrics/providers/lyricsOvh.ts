/**
 * lyrics.ovh fallback provider (free public plain lyrics API)
 * https://api.lyrics.ovh/v1/{artist}/{title}
 */

export async function fetchLyricsOvh(artist: string, title: string): Promise<string | null> {
  if (!artist || !title) return null;

  try {
    const cleanArt = artist.trim();
    const cleanTit = title.trim();

    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArt)}/${encodeURIComponent(cleanTit)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Chillify/2.0',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { lyrics?: string };
    if (data && typeof data.lyrics === 'string' && data.lyrics.trim()) {
      return data.lyrics.trim();
    }
    return null;
  } catch {
    // Network or timeout failure falls through silently
    return null;
  }
}
