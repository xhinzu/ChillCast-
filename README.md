#  Chillify — Spotify-Inspired Ambient Soundscapes & Music Player

A modern, high-performance web application designed as an **exact replica of the Spotify desktop/web app**, built with **Next.js 16 (App Router)**, **TypeScript (Strict Mode)**, **Tailwind CSS**, and the **Web Audio API**. Chillify blends procedural ambient audio layers, synced karaoke lyrics, and a universal music player with swappable audio adapters (Local, YouTube, and Spotify).

---

## ✨ Features

- **🎧 Live lyrics**:
  

- **🎛️ Ambient Soundscape Mixer**:
  

- **🎵 Universal Music Player (Swappable Adapters)*



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

## 📄 License
MIT License. Created with ❤️ for deep focus, studying, and relaxation.
