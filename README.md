#  Chillify — Spotify-Inspired Ambient Soundscapes & Music Player

A modern, high-performance web application designed as an **exact replica of the Spotify desktop/web app**, built with **Next.js 16 (App Router)**, **TypeScript (Strict Mode)**, **Tailwind CSS**, and the **Web Audio API**. Chillify blends procedural ambient audio layers, synced karaoke lyrics, and a universal music player with swappable audio adapters (Local, YouTube, and Spotify).

---

## ✨ Features

- **🎧 Live lyrics**:
  
- **🎛️ Ambient Soundscape Mixer**:
  
- **🎵 Universal Music Player *

- **💽 Vinyl Deck Mixer *

## 🧪 Experimental Lyrics Timing Providers (Default: OFF)

Chillify includes an experimental feature that improves lyric timing by using YouTube captions as a timing source to align unsynced plain lyrics via sequence alignment (Needleman-Wunsch).

To enable this feature, set the following environment variable:
```env
LYRICS_EXPERIMENTAL_PROVIDERS=true
```

> [!WARNING]
> **Risk Disclaimer**:
> Caption fetching uses unauthenticated, unofficial methods directly from YouTube's watch pages and timed text endpoints. These endpoints are not part of the official YouTube Data API. They may break at any time, be throttled, or violate YouTube's Terms of Service. By setting `LYRICS_EXPERIMENTAL_PROVIDERS=true`, you explicitly acknowledge and accept these risks.

When enabled:
- Captions are used **strictly as a timing reference** to align words and lines. Caption text itself is **never displayed** to users.
- Sound effect tracks (e.g. tracks that are mostly `[Music]` or noise tags) and caption tracks covering less than 40% of the song's duration are automatically rejected.
- If caption fetching fails or times out (4 seconds), it fails silently and falls back to standard plain/estimated lyrics.
- If quality gating passes ($\ge 50\%$ word alignment with similarity $\ge 0.8$), an **Aligned** badge is displayed on the lyrics view.

## 📄 License
MIT License.
