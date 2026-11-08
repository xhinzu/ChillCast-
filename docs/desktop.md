# MyuJiku Desktop (Tauri 2) Guide

MyuJiku Desktop is a lightweight, ultra-performance Windows application built with **Tauri 2**. It wraps the hosted MyuJiku web experience (`https://myujiku.vercel.app`) with full native operating system integration, including **Discord Rich Presence (IPC)**, **Now Playing Webhook**, and HTML5 desktop parity.

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

## 2. Running in Development

Ensure the local dev server is running or let Tauri launch it automatically:

```powershell
# 1. Start Tauri in development mode (loads http://localhost:3000)
npm run tauri:dev
```

In dev mode, WebView2 DevTools (`F12`) and the right-click context menu are enabled for debugging.

---

## 3. Building the Production Installer

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

## 4. Exposed Tauri IPC Commands

In accordance with least-privilege security, the remote web app can ONLY invoke the following 3 commands:

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `set_presence` | `{ payload: PresencePayload }` | Updates Discord Rich Presence with track title, artist, album art, timestamps, and buttons. |
| `clear_presence` | *none* | Clears active Discord presence when stopped or paused. |
| `send_discord_webhook` | `{ webhook_url, method?, message_id?, payload? }` | Sends/edits Now Playing embeds directly to Discord webhooks without browser CORS restrictions. |

The webview cannot access the filesystem, command shell, or arbitrary HTTP APIs.

---

## 5. Discord Developer Portal Setup

To configure custom branding in Discord Rich Presence:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it **MyuJiku** (this is the name that appears as "Playing MyuJiku" in Discord).
3. Under **Rich Presence** $\rightarrow$ **Rich Presence Assets**:
   - Upload `myujiku_logo` (1024x1024 PNG recommended) with key `myujiku_logo`.
   - Upload small icons for `play` and `pause`.
4. Copy the **Application ID** (Client ID) from General Information.
5. In your production environment or build script, set:
   ```env
   DISCORD_CLIENT_ID=<Your_Application_ID>
   ```
   *(Default fallback client ID `1303728080277962803` is pre-configured).*

---

## 6. Code Signing & Windows SmartScreen

When users install an unsigned `.exe` on Windows, **Windows SmartScreen** shows a blue warning (*"Windows protected your PC"*).

### Options for Code Signing:
1. **Self-Signed / Community (Free)**:
   - Users click *"More info"* $\rightarrow$ *"Run anyway"* once.
2. **Microsoft Trusted Signing / EV Code Signing Certificate**:
   - For enterprise releases, configure Azure Trusted Signing or a Sectigo/DigiCert EV certificate in GitHub Actions using `tauri-action` inputs:
     - `TAURI_SIGNING_PRIVATE_KEY`
     - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

---

## 7. Troubleshooting

- **"linker `link.exe` not found"**:
  Run `F:\vbcode\install_build_tools.bat` as Administrator to install the Visual Studio C++ build tools and Windows SDK to `F:\vbcode\BuildTools`.
- **WebView2 Not Found**:
  Windows 10/11 includes Evergreen WebView2 by default. If running on Windows Server or LTSC, install the Evergreen Bootstrapper from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- **Discord Rich Presence not updating**:
  Verify the Discord desktop application is open and logged in. In Discord settings $\rightarrow$ **Activity Privacy**, ensure **"Display current activity as a status message"** is turned ON.
