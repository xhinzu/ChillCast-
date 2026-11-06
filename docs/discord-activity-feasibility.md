# Discord Activity & Rich Presence Feasibility Report

**Target Application:** MyuJiku (`https://myujiku.vercel.app`)  
**Document Purpose:** In-depth technical and policy feasibility analysis for implementing Discord Rich Presence and evaluating whether MyuJiku could run as a native Discord Activity (Embedded App SDK) or utilize the Discord Social SDK.  
**Date of Research:** November 2024 / Current Documentation Baseline  
**Verdict / Recommendation:** **NO-GO** for building a native Discord Activity; **GO** for the PreMiD local bridge approach.

---

## 1. Executive Summary

A standard website running inside a desktop or mobile web browser **cannot interact with a user's Discord client or set Discord Rich Presence on its own**. Browser security sandboxes prevent web pages from communicating directly with local OS inter-process communication (IPC) ports (e.g., `\\.\pipe\discord-ipc-0` on Windows or `/tmp/discord-ipc-0` on Unix).

Discord provides two official SDKs for developer integration:
1. **Discord Embedded App SDK**: Embeds a single-page web application inside an `iframe` directly within Discord (called an **Activity**), playable in voice channels and DMs.
2. **Discord Social SDK**: A native C/C++ dynamic library intended for native game engines (Unreal Engine, Unity, C++ games) compiled to desktop or mobile binaries.

While running MyuJiku as an Embedded Discord Activity is technically conceivable for the UI, **it faces severe architectural, legal, and platform roadblocks**—chief among them being YouTube's Terms of Service, Discord's proxying architecture, Content Security Policy (CSP), and copyright compliance. Conversely, the **PreMiD local bridge approach** (implemented in `integrations/premid`) works today for web users with zero server overhead and no platform compliance barriers.

---

## 2. Could MyuJiku Run as a Discord Activity (Embedded App SDK)?

### 2.1 Overview of Discord Activities
A Discord Activity is an interactive web experience hosted in a sandboxed `iframe` within the Discord client across desktop, web, iOS, and Android. It communicates with the host Discord client via the **Embedded App SDK** (`@discord/embedded-app-sdk`) using secure `postMessage` protocol calls.

Activities are accessed directly from Discord voice channels or DMs via the App Launcher rocket icon or slash commands.

### 2.2 Required Architectural & Infrastructure Changes

To port MyuJiku to an Embedded Activity, the following fundamental changes would be required:

#### A. URL Mappings & Discord Activity Proxy (`.discordsays.com`)
* **How the Proxy Works**: Discord does not load your web application directly from `myujiku.vercel.app`. Instead, it routes all traffic through a secure reverse proxy at `https://<application_id>.discordsays.com`. This proxy hides user IP addresses and terminates TLS.
* **Relative Path Rule**: All frontend assets, scripts, stylesheets, and API requests must use relative paths (`/api/...`) rather than absolute URLs.
* **URL Mappings**: Any communication with external third-party servers must be pre-configured in the Discord Developer Portal under **URL Mappings**:
  - Example: Mapping prefix `/supabase` $\rightarrow$ `drtokajdrpcuklkrjdye.supabase.co`.
  - Example: Mapping prefix `/yt-thumb` $\rightarrow$ `img.youtube.com`.
* **Third-Party Library Patching**: Third-party packages that trigger hardcoded absolute HTTP/WebSocket requests fail with `blocked:csp`. Developers must call `patchUrlMappings` from `@discord/embedded-app-sdk`, which monkey-patches `window.fetch`, `XMLHttpRequest.prototype.open`, `WebSocket`, and HTML element attributes (`src`, `href`).

#### B. The Audio Streaming Showstopper (YouTube Proxying)
* MyuJiku plays audio through the **YouTube IFrame API** and serverless YouTube audio streaming resolvers.
* Inside a Discord Activity:
  1. The YouTube IFrame API attempts to load `https://www.youtube.com/embed/...` inside Discord's sandboxed iframe. Discord's iframe CSP blocks unauthorized nested iframes unless explicitly whitelisted or mapped.
  2. YouTube's anti-bot and datacenter restrictions strictly prohibit proxying YouTube streams through reverse proxies like `.discordsays.com`.
  3. Discord's Activity Proxy buffers and inspects traffic; media streaming protocols (chunked audio/video) frequently timeout or buffer erratically through the proxy.

#### C. Real-time Service (Supabase WebSockets)
* MyuJiku uses Supabase Realtime (`wss://...`) for room presence, queue sync, playback alignment, and room chat.
* To run inside Discord, the WebSocket connection must either be mapped through Discord's URL mappings (e.g., `/realtime` $\rightarrow$ `drtokajdrpcuklkrjdye.supabase.co`) or replaced with Discord's native voice channel data channels.
* *Documentation Gap / Ambiguity*: Discord's documentation acknowledges WebSocket support through URL Mappings, but rate-limit caps, connection drop behavior, and heartbeat timeouts for high-frequency state synchronization via the `.discordsays.com` proxy remain undocumented.

#### D. Content Security Policy (CSP) Restrictions
Discord enforces an immutable CSP on the parent container:
```http
Content-Security-Policy: default-src 'self' https://*.discordsays.com; script-src 'self' 'unsafe-inline' ...
```
Any attempt by a script to connect to unmapped external CDNs, fonts, analytics, or audio endpoints triggers an immediate `blocked:csp` error in the client console.

#### E. Sandboxed IFrame Limitations
1. **Autoplay Policy**: Discord's embedded browser engines (Chromium on desktop/Android, WebKit on iOS/macOS) strictly enforce media autoplay policies. Audio playback cannot initiate without an explicit user interaction (click/touch) inside the iframe.
2. **Storage Partitioning & Cookies**: Modern browsers partition storage for cross-origin iframes (Cookies Having Independent Partitioned State / CHIPS). Traditional authentication cookies without `SameSite=None; Secure; Partitioned` are blocked.
3. **Popups & OAuth Window Blocking**: `window.open` and popup-based OAuth login dialogs (e.g., Spotify OAuth or Google Sign-In) are either completely disabled or trigger security warnings inside Discord Activities.

#### F. Authentication via Embedded App SDK
MyuJiku would need to abandon its standard email/password or browser redirect flow in favor of Discord's native OAuth2 exchange:
1. When the app loads inside Discord, invoke:
   ```typescript
   import { DiscordSDK } from '@discord/embedded-app-sdk';
   const discordSdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID);
   await discordSdk.ready();

   const { code } = await discordSdk.commands.authorize({
     client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
     response_type: 'code',
     scope: ['identify', 'rpc.activities.write'],
     prompt: 'none',
   });
   ```
2. Send `code` to a backend route (`/.proxy/api/token`) that exchanges it with Discord (`POST https://discord.com/api/oauth2/token`) using the `DISCORD_CLIENT_SECRET`.
3. Map the returned Discord user profile (`user.id`, `username`, `avatar`) to a Supabase user session or issue a custom JWT.

#### G. Setting Rich Presence from Inside the Activity
Inside an Activity, Rich Presence is updated natively without any external bridge:
```typescript
await discordSdk.commands.setActivity({
  activity: {
    type: 0, // Playing
    details: `Listening to ${currentTrack.title}`,
    state: `by ${currentTrack.artist}`,
    timestamps: {
      start: Math.floor(Date.now() - currentTrack.positionSec * 1000),
      end: Math.floor(Date.now() + (currentTrack.durationSec - currentTrack.positionSec) * 1000),
    },
    assets: {
      large_image: currentTrack.artworkUrl,
      large_text: currentTrack.title,
      small_image: isPlaying ? 'play_icon' : 'pause_icon',
      small_text: isPlaying ? 'Playing' : 'Paused',
    },
  },
});
```
The application name ("MyuJiku") and default app icon are automatically rendered from the Discord Developer Application registration.

---

## 3. Can the Discord Social SDK Be Used from a Next.js Web App?

**Definitive Answer:** **NO.**

### Detailed Technical Explanation:
* The **Discord Social SDK** is the next-generation successor to the legacy Discord GameSDK.
* It is distributed as a **compiled C/C++ shared library (`.dll` on Windows, `.so` on Linux, `.dylib` on macOS, `.aar` on Android, and static frameworks on iOS)** with native bindings for **Unreal Engine** and **Unity**.
* It requires direct access to OS system calls, threading primitives, and the local Discord desktop client's IPC socket.
* Web browsers running client-side JavaScript / WebAssembly cannot link against native OS dynamic libraries (`.dll` / `.dylib`), nor can a Next.js web application execute native C++ bindings in the user's browser.
* Discord does not provide a JavaScript or WebAssembly wrapper for the Social SDK, and explicitly directs all web-based applications to the Embedded App SDK or Bot API instead.

---

## 4. Policy, Terms of Service & App Verification Requirements

Launching an application or Activity on Discord requires adherence to Discord's Developer Policy and Terms of Service:

### 4.1 Unverified vs. Verified Activities
* **Unverified Status (Development Phase)**:
  - Can only be launched by members of the developer team and up to 25 registered testers.
  - Can only be launched in Discord servers with **fewer than 25 members** or in direct message (DM) voice calls.
* **Verified Status (Public Launch)**:
  - Required to remove the 25-member server cap and allow users to launch the Activity across any server or DM.
  - Eligible to be featured in the **Discord App Directory** and the **Voice Channel App Launcher**.

### 4.2 Verification Prerequisites
1. **Developer Identity Verification**: The application owner or team admin must complete Stripe identity verification (government ID verification). The individual completing the verification must be **at least 16 years old**.
2. **Profile & Metadata Completeness**: Requires registered Terms of Service, Privacy Policy, complete descriptions, and high-resolution icons.
3. **Data Security & Privacy Compliance**: Discord prohibits storing or sharing user IPs, requires end-to-end encryption disclosures, and mandates strict adherence to GDPR/CCPA user data deletion requests.

### 4.3 The Critical Legal Barrier: Intellectual Property & Music Copyright
* **Discord Developer Policy (Section 3 — Intellectual Property)** explicitly forbids transmitting, streaming, or hosting copyrighted audio content without express licensing agreements from the copyright owners (record labels, publishers, or streaming providers).
* Major music bots on Discord (such as Rythm and Groovy) were served with cease-and-desist notices by Google and Discord because streaming YouTube audio to groups in Discord voice channels violates YouTube's Terms of Service (specifically Section 5: prohibited commercial and non-personal public performance use).
* Building an official Discord Activity that streams YouTube audio would **almost certainly be rejected during Discord's App Verification review**, or could expose the developers to intellectual property infringement liability.

---

## 5. Effort Estimate & Implementation Roadmap

If a decision were made to develop a Discord Activity (e.g., for user-uploaded copyright-free audio or licensed lo-fi streams), the required effort is estimated below:

| Phase | Description | Estimated Effort |
| :--- | :--- | :--- |
| **Phase 1: Project Architecture** | Set up Discord Developer Portal Application, configure URL Mappings, implement tunneling (`cloudflared`/`ngrok`), and install `@discord/embedded-app-sdk`. | 3–5 Days |
| **Phase 2: Authentication Overhaul** | Replace Supabase browser OAuth redirects with Discord SDK `commands.authorize()` handshake and backend token exchange endpoint. | 4–6 Days |
| **Phase 3: Proxying & Realtime** | Implement `patchUrlMappings` for Supabase WebSockets and external API endpoints; rewrite asset URLs to relative paths. | 5–7 Days |
| **Phase 4: Audio Engine Adaptations** | Build an Activity-compliant HTML5 Web Audio streaming player that complies with Discord iframe autoplay policies; replace YouTube iframe with an Activity-compatible audio source. | 8–12 Days |
| **Phase 5: Responsive UI for Discord** | Optimize layouts for Discord's fixed Activity viewport across Discord Desktop, Browser, and Mobile clients (pipette/split view). | 4–6 Days |
| **Phase 6: Verification & QA** | Complete Stripe identity verification, legal policy audits, and submit for Discord Activity App Verification. | 2–3 Weeks (Waiting Period) |
| **Total Estimated Effort** | | **5–7 Weeks** |

---

## 6. Main Risks & Showstoppers

1. **YouTube IFrame Embedding Blocked**: The YouTube IFrame player cannot reliably be embedded within Discord's Activity iframe due to nested iframe security restrictions and YouTube's domain-level embed protections.
2. **Copyright Enforcement**: An official Discord Activity playing commercial music without licensing is at immediate risk of DMCA takedown and Discord developer account termination.
3. **Bandwidth & Proxy Latency**: Routing real-time audio streams through `.discordsays.com` adds latency, causing audio desynchronization across users in the same voice channel.
4. **Maintenance Overhead**: Managing URL mappings and updating SDK versions to comply with Discord platform breaking changes requires ongoing engineering resources.

---

## 7. Recommendation: Go / No-Go

### Native Discord Activity (Embedded App SDK): **NO-GO**
* **Rationale**: The technical friction (proxying requirements, CSP hurdles, storage partitioning) combined with the severe copyright policy barrier (inability to stream YouTube audio inside a verified Discord Activity) makes a native Discord Activity unviable for MyuJiku's current architecture.

### PreMiD Local Bridge: **GO (Implemented)**
* **Rationale**:
  1. **Works Today**: Uses the user's local browser and desktop PreMiD bridge. Does not require server-side proxying or Discord platform approval.
  2. **Zero Copyright Risk for the Host**: Audio streams directly on the user's personal device in standard browser tabs without violating Discord's Activity Developer Policies.
  3. **Privacy First**: Fully opt-in, default OFF, and exposes data only when the user explicitly enables it.
  4. **Low Maintenance**: Requires only maintaining the PreMiD presence files (`metadata.json` and `presence.ts`) in `/integrations/premid`.

---

## 8. Cited Official Documentation

All analysis in this document is derived directly from the official developer documentation pages below:

1. **Discord Embedded App SDK Overview**:  
   [https://discord.com/developers/docs/activities/overview](https://discord.com/developers/docs/activities/overview)
2. **Discord Activities Development Guide & URL Mappings**:  
   [https://discord.com/developers/docs/activities/development-guides](https://discord.com/developers/docs/activities/development-guides)
3. **Discord Embedded App SDK Repository & `patchUrlMappings`**:  
   [https://github.com/discord/embedded-app-sdk](https://github.com/discord/embedded-app-sdk)
4. **Discord Activity `setActivity` Command**:  
   [https://discord.com/developers/docs/activities/sdk-reference#setactivity](https://discord.com/developers/docs/activities/sdk-reference#setactivity)
5. **Discord Social SDK Documentation**:  
   [https://discord.com/developers/docs/social-sdk/getting-started/using-c++](https://discord.com/developers/docs/social-sdk/getting-started/using-c++)
6. **Discord App Verification & Activity Requirements**:  
   [https://discord.com/developers/docs/activities/building-an-activity#verified-activities](https://discord.com/developers/docs/activities/building-an-activity#verified-activities)
7. **Discord Developer Policy & Terms of Service**:  
   [https://discord.com/developers/docs/policies-and-agreements/developer-policy](https://discord.com/developers/docs/policies-and-agreements/developer-policy)
8. **PreMiD Developer Documentation (Presences & Metadata)**:  
   [https://premid.app/docs/dev/presence/metadata](https://premid.app/docs/dev/presence/metadata)
9. **PreMiD Presence Creation Guide (`presence.ts`)**:  
   [https://premid.app/docs/dev/presence/presence](https://premid.app/docs/dev/presence/presence)
