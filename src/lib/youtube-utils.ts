export interface ParsedYouTubeTarget {
  type: 'playlist' | 'video';
  id: string;
}

export function parseYouTubeInput(input: string): ParsedYouTubeTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Direct playlist ID (starts with PL, RD, OLAK5uy, etc.)
  if (/^(PL|RD|OLAK5uy)[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return { type: 'playlist', id: trimmed };
  }

  // 2. Direct 11-char Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: 'video', id: trimmed };
  }

  try {
    const url = new URL(trimmed);

    // Check query params for `list=`
    const listParam = url.searchParams.get('list');
    if (listParam) {
      return { type: 'playlist', id: listParam };
    }

    // Check query params for `v=` (standard watch URL)
    const vParam = url.searchParams.get('v');
    if (vParam) {
      return { type: 'video', id: vParam };
    }

    // Shortlink format: https://youtu.be/<videoId>
    if (url.hostname === 'youtu.be') {
      const pathId = url.pathname.replace(/^\//, '');
      if (pathId.length === 11) {
        return { type: 'video', id: pathId };
      }
    }

    // Embed format: https://www.youtube.com/embed/<videoId>
    if (url.pathname.startsWith('/embed/')) {
      const embedId = url.pathname.split('/')[2];
      if (embedId && embedId.length === 11) {
        return { type: 'video', id: embedId };
      }
    }
  } catch {
    // Not a valid URL
  }

  return null;
}
