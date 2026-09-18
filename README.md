# ☕ Chillify 🥰 — Spotify-Inspired Ambient Soundscapes & Music Player

A modern, high-performance web application designed as an **exact replica of the Spotify desktop/web app**, built with **Next.js 16 (App Router)**, **TypeScript (Strict Mode)**, **Tailwind CSS**, and the **Web Audio API**. Chillify blends procedural ambient audio layers, synced karaoke lyrics, and a universal music player with swappable audio adapters (Local, YouTube, and Spotify).

---

## ✨ Features

- **🎧 Exact Spotify Web/Desktop App Replica**:
  - Authentic Spotify dark theme (`#000000`, `#121212`, `#181818`), Spotify green accents (`#1DB954`), and custom Spotify range sliders.
  - Left navigation sidebar (*Home*, *Ambient Mixer*, *Live Lyrics*, *Your Library*), central search pill, and persistent 3-column bottom playback bar.

- **🎛️ Web Audio API Ambient Soundscape Mixer**:
  - Independent channel mixer with real-time master & individual volume sliders and mute toggles.
  - Authentic high-fidelity audio loops: *Gentle Rain*, *Chill Mountain Wind*, *Woodland Songbirds*, *Summer Night Crickets*, and *Subtle Distant Thunder*.
  - Quick atmospheric presets: *Rainy Night*, *Forest Canopy*, and *Stop All*.

- **🎵 Universal Music Player (Swappable Adapters)**:
  - **Local Audio**: Bundled chill sample track + client-side custom file upload support (`.mp3`, `.wav`, `.ogg`, `.flac`).
  - **YouTube Player (Zero API Quota)**: IFrame API adapter with custom scrubber, duration tracking, and playlist presets. Does not consume YouTube Data API quota!
  - **Spotify Dual-Mode**:
    - *Mode A (PKCE OAuth)*: Direct streaming via Spotify Web Playback SDK using personal Spotify account credentials.
    - *Mode B (Metadata + YouTube Resolution)*: Server-side Spotify Web API playlist resolution paired with YouTube audio fallback, backed by a persistent disk cache (`.data/youtube-cache.json`) to conserve quota.

- **🎙️ Live Synced Lyrics (LRCLIB)**:
  - Real-time line-by-line synced karaoke view with automatic scrolling isolated to the lyrics pane.
  - Interactive click-to-seek: click any lyric line to jump directly to that timestamp in the track.
  - Graceful fallback for instrumental tracks and plain unsynced lyrics.

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Node.js** 18.18+ or 20+
- **npm**, **pnpm**, or **yarn**

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd chillcast
npm install
```

### 3. Configure Environment Variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Required? |
| :--- | :--- | :--- |
| `SPOTIFY_CLIENT_ID` | Spotify Developer Client ID (for Mode B playlist resolution) | Optional |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer Client Secret | Optional |
| `YOUTUBE_API_KEY` | Google Cloud YouTube Data API v3 key (for Mode B search fallback) | Optional |
| `NEXT_PUBLIC_APP_URL` | Application root URL (defaults to `http://localhost:3000`) | Optional |

> **Note**: Local playback, the ambient soundscape mixer, and YouTube playlist playback work out of the box with **zero configuration and zero API keys**.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deploying to Vercel

The fastest way to deploy ChillCast to production is with Vercel:

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
3. In the project settings, under **Environment Variables**, add:
   - `SPOTIFY_CLIENT_ID` (optional, for Spotify playlist resolver)
   - `SPOTIFY_CLIENT_SECRET` (optional, for Spotify playlist resolver)
   - `YOUTUBE_API_KEY` (optional, for Spotify track resolution fallback)
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL, e.g. `https://your-app.vercel.app`)
4. Click **Deploy**. Vercel will automatically build and deploy the Next.js App Router project!

---

## 🛠️ Architecture

```
chillcast/
├── public/
│   ├── audio/              # High-fidelity ambient recordings & sample chill track
│   └── videos/             # Seamless 1080p atmospheric background video loops
├── src/
│   ├── app/                # Next.js App Router (pages & API route handlers)
│   │   ├── api/
│   │   │   ├── lyrics/     # LRCLIB synced lyrics proxy
│   │   │   ├── spotify/    # Spotify playlist metadata resolver
│   │   │   └── youtube/    # YouTube track search & quota cache stats
│   │   └── page.tsx        # Single-page ambient dashboard
│   ├── components/         # Glassmorphism UI components
│   │   ├── AmbientBackground.tsx    # HD Video loops + canvas engine
│   │   ├── AmbientSoundMixer.tsx    # Web Audio API multi-channel mixer
│   │   ├── LiveLyrics.tsx           # Synced karaoke lyrics display
│   │   ├── SceneSelector.tsx        # Atmospheric theme switcher
│   │   └── UniversalMusicPlayer.tsx # Swappable playback UI
│   ├── context/
│   │   └── PlaybackContext.tsx      # Unified playback state provider
│   ├── lib/
│   │   ├── adapters/       # Playback adapters (Local, YouTube, Spotify)
│   │   ├── ambient-engine.ts # Web Audio API sound synthesis & looping
│   │   └── lrc-parser.ts   # Synchronized LRC lyrics parser
│   └── types/              # Strict TypeScript definitions
```

---

## 📄 License
MIT License. Created with ❤️ for deep focus, studying, and relaxation.
