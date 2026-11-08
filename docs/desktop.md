# MyuJiku Desktop (Tauri 2) Guide

MyuJiku Desktop is a lightweight, ultra-performance Windows application built with **Tauri 2**. It wraps the hosted MyuJiku web experience (`https://myujiku.vercel.app`) with full native operating system integration, including **Automatic Spotify-Style Discord Rich Presence (IPC)**, **Now Playing Webhook**, and HTML5 desktop parity.

---

## 1. Tooling Layout & Environment Variables

All build tools, installers, and caches are isolated under `F:\vbcode`:

```text
F:\vbcode\
├── downloads\        # Bootstrappers and installers (rustup-init.exe, vs_BuildTools.exe)
├── rust\
│   ├── rustup\       # RUSTUP_HOME (toolchains and profiles)
│   ├── cargo\        # CARGO_HOME (crates registry and bin/ executables)
│   └── target\       # CARGO_TARGET_DIR (shared Rust compilation cache)
├── BuildTools\       # Visual Studio C++ Build Tools & Windows 10/11 SDK
├── npm-cache\        # Isolated npm cache directory
├── releases\         # Output directory for production .exe installers
└── install_build_tools.bat # One-click elevated bootstrapper for MSVC C++ tools
```

### Environment Variables
Set permanently via `setx` as user environment variables:
- `RUSTUP_HOME` = `F:\vbcode\rust\rustup`
- `CARGO_HOME` = `F:\vbcode\rust\cargo`
- `CARGO_TARGET_DIR` = `F:\vbcode\rust\target`
- `PATH` includes `F:\vbcode\rust\cargo\bin`
- npm cache set via `npm config set cache F:\vbcode\npm-cache`

### System Components on C:
The following shared components cannot reside exclusively on `F:` and reside on `C:` as mandated by Windows / Microsoft:
- **WebView2 Evergreen Runtime**: `C:\Program Files (x86)\Microsoft EdgeWebView\Application`
- **Visual Studio Shared Installer**: `C:\Program Files (x86)\Microsoft Visual Studio\Installer`

---

## 2. Automatic Discord Rich Presence (Spotify-Style)

The desktop app features **zero-setup automatic Discord Rich Presence**:
- **Background Worker**: Auto-detects and connects quietly to any running Discord client (`discord-ipc-0` through `discord-ipc-9`, covering Stable, PTB, and Canary).
- **Auto-Reconnect**: If Discord starts later or restarts, the app reconnects with exponential backoff (10s–30s).
- **Listening Activity (Type 2)**: Displays "Listening to [Song Title]" with artist, cover art, elapsed/remaining progress timestamps, "Listen on MyuJiku", and "Join room" buttons.
- **Privacy Controls**:
  - Opt-out toggle in Settings ("Share what I'm listening to on Discord", default ON in desktop).
  - "Hide song details" option (displays only "Listening to MyuJiku").
  - Auto-pause timeout: Automatically clears activity after 5 minutes of paused playback.
- **Verification Script**: Run `node scripts/check-discord.mjs` to test pipe connectivity and Application ID.

---

## 3. Running in Development

Ensure the local dev server is running or let Tauri launch it automatically:

```powershell
# 1. Start Tauri in development mode (loads http://localhost:3000)
npm run tauri:dev
```

In dev mode, WebView2 DevTools (`F12`) and the right-click context menu are enabled for debugging.

---

## 4. Building the Production Installer

To produce the standalone Windows NSIS installer `.exe`:

```powershell
npm run tauri:build
```

The installer will be generated at:
```text
src-tauri/target/release/bundle/nsis/MyuJiku_1.0.0_x64-setup.exe
```
A copy is placed in `F:\vbcode\releases\`.

---

## 5. Exposed Tauri IPC Commands

In accordance with least-privilege security, the remote web app can ONLY invoke the following commands:

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `get_discord_status` | *none* | Returns current IPC status: `NotRunning`, `Connecting`, `Connected { username, displayName?, avatarUrl? }`, `AppIdMissing`, or `Error`. |
| `set_presence` | `{ payload: PresencePayload }` | Updates Discord Rich Presence with track title, artist, album art, timestamps, and buttons. |
| `clear_presence` | *none* | Clears active Discord presence when stopped or paused. |
| `send_test_presence` | *none* | Sends a 10-second sample presence to Discord for testing. |
| `set_discord_client_id` | `{ clientId: string }` | Dynamically configures or updates the Discord Application ID. |
| `send_discord_webhook` | `{ webhook_url, method?, message_id?, payload? }` | Sends/edits Now Playing embeds directly to Discord webhooks without browser CORS restrictions. |

The webview cannot access the filesystem, command shell, or arbitrary HTTP APIs.

---

## 6. Discord Developer Portal Setup

To configure custom branding in Discord Rich Presence:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it **MyuJiku** (this is the name that appears as "Listening to MyuJiku" in Discord).
3. Under **Rich Presence** $\rightarrow$ **Rich Presence Assets**:
   - Upload `myujiku_logo` (1024x1024 PNG recommended) with key `myujiku_logo`.
   - Upload small icons for `play` and `pause`.
4. Copy the **Application ID** (Client ID) from General Information.
5. In your production environment or build script, set:
   ```env
   DISCORD_CLIENT_ID=<Your_Application_ID>
   ```
   Or enter the Application ID directly inside the app's Settings under Discord Rich Presence.
6. **Activity Privacy in Discord**: If status does not appear on your profile, make sure *"Display current activity as a status message"* is toggled ON under Discord *User Settings ➔ Activity Privacy*.

---

## 7. Code Signing & Windows SmartScreen

When distributing outside the Microsoft Store without an EV code signing certificate:
- The installer executable is signed or self-contained.
- Windows SmartScreen may present an *"Unrecognized app"* prompt on initial launch.
- Users can click **More info** $\rightarrow$ **Run anyway** to install.
