/**
 * Discord Custom Status Formatter
 * Formats current track info into a clean status string for Discord's "Set Custom Status" dialog.
 */

export function formatDiscordCustomStatus(artist: string, title: string): string {
  const cleanTitle = (title || 'Unknown').trim();
  const cleanArtist = (artist || '').trim();
  if (!cleanArtist) {
    return `🎧 ${cleanTitle} | MyuJiku`;
  }
  return `🎧 ${cleanArtist} - ${cleanTitle} | MyuJiku`;
}

export async function copyDiscordCustomStatus(
  artist: string,
  title: string
): Promise<{ success: boolean; text: string }> {
  const statusText = formatDiscordCustomStatus(artist, title);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(statusText);
      return { success: true, text: statusText };
    }
    // Fallback for older environments
    const textarea = document.createElement('textarea');
    textarea.value = statusText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return { success: true, text: statusText };
  } catch (err) {
    console.error('Failed to copy Discord status:', err);
    return { success: false, text: statusText };
  }
}
