# MyuJiku • PreMiD Discord Rich Presence

This directory contains the official **PreMiD Presence** integration for **MyuJiku** (`https://myujiku.vercel.app`).

Because standard web browsers cannot directly communicate with Discord's desktop IPC socket due to web sandbox and security policies, [PreMiD](https://premid.app) acts as a local bridge between the MyuJiku web app and Discord Rich Presence via a desktop client and browser extension.

---

## How It Works

1. **Privacy-Safe Data Bridge**:
   When the user enables **"Show what I'm listening to on Discord"** in MyuJiku Settings, MyuJiku populates a hidden DOM element:
   ```html
   <div id="myujiku-discord-presence" style="display:none"
        data-app-name="MyuJiku"
        data-title="Starboy"
        data-artist="The Weeknd"
        data-cover-url="https://img.youtube.com/vi/.../hqdefault.jpg"
        data-duration="230"
        data-position="45"
        data-status="playing"
        data-room-code="5KXPF6"
        data-updated-at="1730000000">
   </div>
   ```
2. **Zero Overhead**: The element updates **only** on track change, play/pause change, or user seek (never per frame).
3. **Absolute Privacy**: When the user turns the toggle **OFF**, the element contains **nothing** (all attributes are removed), and PreMiD immediately clears the Discord activity.
4. **Presence Logic (`presence.ts`)**: PreMiD reads `#myujiku-discord-presence` and formats Discord Rich Presence:
   - **Details**: `Listening to <Title>`
   - **State**: `by <Artist>`
   - **Large Image**: Album cover art (or MyuJiku logo fallback)
   - **Small Image**: `play` / `pause` icon
   - **Timestamps**: Elapsed and remaining time when playing
   - **Buttons**:
     - `Listen on MyuJiku` $\rightarrow$ links to `https://myujiku.vercel.app`
     - `Join my room` $\rightarrow$ links to `https://myujiku.vercel.app/together/<roomCode>` (only if the user enabled "Share room link in presence")

> **Important**: The Discord status will **only appear for users who have the PreMiD desktop app and browser extension installed**. The app's name ("MyuJiku") and logo in Discord come from the approved PreMiD Presence listing.

---

## Testing Locally

You can test this presence locally on your machine before submitting it to the PreMiD store.

### Prerequisites
1. Install the **PreMiD Desktop Application**: [https://premid.app/downloads](https://premid.app/downloads) (must be running in your system tray).
2. Install the **PreMiD Browser Extension**: [Chrome](https://chromewebstore.google.com/detail/premid/agjnjboanicjcpenljmaaigopkgjjids) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/premid/).
3. Node.js 18+ installed.

### Steps to Run with PreMiD CLI
1. Open a terminal in this directory:
   ```bash
   cd integrations/premid
   ```
2. Run PreMiD's local development runner:
   ```bash
   npx @premid/cli dev
   ```
   *(Alternatively, if `@premid/cli` is installed globally via `npm install -g @premid/cli`, run `pmd dev`)*.
3. Open `https://myujiku.vercel.app` (or your local development server `http://localhost:3000`).
4. In MyuJiku, open **Settings** (gear icon in the top navigation bar) and turn **ON** *"Show what I'm listening to on Discord"*.
5. Play any track. Check your Discord profile — your status will appear as:
   - **Playing MyuJiku**
   - *Listening to <Song Title>*
   - *by <Artist Name>*

---

## Submitting to the PreMiD Presence Store

PreMiD maintains a centralized, open-source presence repository at [github.com/PreMiD/Presences](https://github.com/PreMiD/Presences).

### 1. Asset Requirements (from PreMiD Documentation)
- **Service Logo (`logo`)**:
  - Exact dimensions: **512 × 512 pixels** (square PNG).
  - Recommended: Transparent background, clean contrast, crisp vector export.
  - Hosting: Must be hosted on an approved direct-link image host (preferably **Imgur**, e.g., `https://i.imgur.com/YOUR_ID.png`).
- **Thumbnail / Card Banner (`thumbnail`)**:
  - Recommended dimensions: **1280 × 720 pixels** (16:9 ratio).
  - Format: High-quality screenshot or marketing banner of MyuJiku.
  - Hosting: Direct Imgur URL ending in `.png` or `.jpg`.

### 2. Submission Steps
1. Fork the official repository: [PreMiD/Presences](https://github.com/PreMiD/Presences).
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/Presences.git
   cd Presences
   ```
3. Create a branch:
   ```bash
   git checkout -b add/myujiku
   ```
4. Create directory `websites/M/MyuJiku/` and copy the files:
   - `metadata.json`
   - `presence.ts`
5. Replace the placeholder `logo` and `thumbnail` URLs in `metadata.json` with the live direct Imgur image URLs.
6. Validate your presence using PreMiD's official linter:
   ```bash
   npm install
   npm run validate
   ```
7. Commit and push:
   ```bash
   git commit -m "feat(MyuJiku): add presence"
   git push origin add/myujiku
   ```
8. Open a Pull Request against `PreMiD/Presences:main`. The PreMiD QA team reviews and approves presences typically within a few days. Once merged, it becomes available to all 500,000+ PreMiD users worldwide.
