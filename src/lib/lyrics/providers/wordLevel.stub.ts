import { LyricsProvider, LyricsResult } from './types';

/**
 * WordLevelStubProvider
 *
 * STUB: Architecture placeholder for future native word-by-word synced lyrics sources
 * (e.g. TTML / Musixmatch / Spotify Canvas / Apple Music TTML sync data).
 *
 * NOTE: As per project guidelines, unofficial scraping or third-party ToS-violating
 * endpoints are strictly avoided. When an official or designated licensed API key
 * is configured in the future, implement this provider's `getLyrics` method.
 */
export class WordLevelStubProvider implements LyricsProvider {
  readonly name = 'word-level-stub';

  public async getLyrics(_track: {
    id: string;
    title: string;
    artist: string;
    duration?: number;
  }): Promise<LyricsResult> {
    void _track;
    // Stub provider currently returns not found so that the architecture
    // falls through to the line-level derivation provider (LRCLIB).
    return {
      source: this.name,
      synced: 'none',
      lines: [],
      error: 'Word-level provider not yet configured with an authorized upstream API source.',
    };
  }
}

export const wordLevelStubProvider = new WordLevelStubProvider();
