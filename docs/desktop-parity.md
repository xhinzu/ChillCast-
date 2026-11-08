# Desktop Feature Parity Matrix

This document tracks feature parity between the hosted MyuJiku web app and the native Windows Tauri 2 desktop application.

| Feature Area | Specific Functionality | Status | Technical Implementation & Notes |
| :--- | :--- | :---: | :--- |
| **Window & Lifecycle** | Black background (`#000`) | **PASS** | `backgroundColor: "#000000"` in `tauri.conf.json` eliminates white flash during initial window creation. |
| **Window & Lifecycle** | Min size (900x600) | **PASS** | `minWidth: 900`, `minHeight: 600` strictly enforced by native window manager. |
| **Window & Lifecycle** | Window state persistence | **PASS** | `tauri-plugin-window-state` saves and restores window dimensions, position, and maximized state across restarts. |
| **Window & Lifecycle** | Single instance handling | **PASS** | `tauri-plugin-single-instance` focuses and unminimizes the existing window on secondary launches. |
| **Window & Lifecycle** | Offline fallback page | **PASS** | Bundled `src-tauri/fallback/index.html` renders if network is disconnected or DNS fails, with Retry button. |
| **HTML5 & Drag-Drop** | `.lrc` / `.txt` lyrics drag-and-drop | **PASS** | `dragDropEnabled: false` set on the main window, allowing standard HTML5 `ondrop` / `ondragover` events to reach the web page without native OS interception. |
| **HTML5 & Drag-Drop** | Custom audio upload (.mp3/.wav/.flac) | **PASS** | Standard file inputs and drag-and-drop zones function natively in WebView2. |
| **HTML5 & Drag-Drop** | Custom background image upload | **PASS** | File drops processed by canvas / FileReader API identical to browser. |
| **Audio Engine** | Autoplay without gesture block | **PASS** | WebView2 argument `--autoplay-policy=no-user-gesture-required` enables seamless playlist progression and room sync. |
| **Audio Engine** | Web Audio DSP effects chain | **PASS** | 8D spatial panner, low-pass muffled filter, vinyl crackle generator, and ambient mixing run smoothly with hardware acceleration. |
| **Audio Engine** | YouTube iframe / stream playback | **PASS** | Embedded player and streaming endpoints resolve with full HTTPS cookies and origin integrity. |
| **Display & Lyrics** | Fullscreen API (lyrics view) | **PASS** | Native WebView2 supports `element.requestFullscreen()` seamlessly. |
| **Display & Lyrics** | Screen Wake Lock API | **PASS** | Keeps monitor active while reading lyrics or listening in ambience mode. |
| **Graphics & Shaders** | Canvas / WebGL overlays | **PASS** | Chroma effects, visualizers, particle pools, and word shaders execute via direct GPU pipeline. |
| **Graphics & Shaders** | CSS 3D & rAF Performance | **PASS** | Vinyl rotation, 3D card tilts, and kinetic lyrics animate at full refresh rate (60/120/144Hz). |
| **Data Persistence** | localStorage & IndexedDB | **PASS** | WebView2 user data folder isolates and preserves playlists, liked songs, lyrics offsets, and settings. |
| **Collaboration** | Listen Together (Realtime WebSockets) | **PASS** | Supabase WebSockets (`wss://`) maintain persistent connections for instant queue, pause, and seek synchronization. |
| **Authentication** | Discord & Supabase OAuth | **PASS** | In-window navigation rule allows `discord.com` and `supabase.co` domains, completing OAuth flows within the window. |
| **Navigation & Links** | External URLs open in system browser | **PASS** | External links (e.g. "Buy me a coffee", external documentation) are intercepted by `on_navigation` and launched via `opener` plugin. |
| **Discord Suite** | Native Discord Rich Presence (IPC) | **PASS** | Rust `set_presence` command talks to local Discord client via named pipe (`\\.\pipe\discord-ipc-0`). |
| **Discord Suite** | Now Playing Webhook | **PASS** | Bypasses browser CORS via Rust command; supports automated message editing (PATCH) and cleanup on stop. |
| **Discord Suite** | Copy Custom Status button | **PASS** | One-click button in player bar and settings formats `🎧 <Artist> - <Title> | MyuJiku` directly to system clipboard with toast. |
