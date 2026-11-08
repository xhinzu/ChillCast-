# Desktop QA Checklist & Verification Matrix (docs/qa-desktop.md)

This checklist covers manual and automated verification procedures for the MyuJiku Windows Desktop application (Tauri v2 + WebView2).

---

## 1. Window Sizing & Drag Interactions
- [ ] **Maximize Window Stability**:
  - Maximize the desktop window to full screen.
  - Click and hold on various areas of the UI (navigation items, empty space, buttons, player controls).
  - **Expected**: Window remains maximized; does NOT un-maximize or shrink down to restored size.
- [ ] **Interactive Elements No-Drag**:
  - Click buttons in `SpotifyTopNav` (Search, Settings icon, Buy me a coffee, User profile).
  - **Expected**: Click events register on `mousedown`/`click`; no caption drag initiated.
- [ ] **Hold-to-Inspect**:
  - Press and hold on the MyuJiku logo for 450ms.
  - **Expected**: Smooth FLIP animation enlarges logo and text to center screen. Mouse wheel zooms 1x-4x, Esc or click outside closes.
  - Press and drag mouse off the logo before 450ms.
  - **Expected**: Hold timer cancels immediately without triggering inspect or navigating away.

---

## 2. Settings Modal Interactions
- [ ] **Mouse Wheel Scrolling**:
  - Open Settings (`Ctrl+,` or click gear icon in TopNav).
  - Position cursor over the right-hand settings section content.
  - Rotate mouse wheel up and down.
  - **Expected**: Settings section scrolls smoothly; content does not lock or freeze; wheel events are not eaten by window drag handlers.
- [ ] **Sidebar Navigation Wheel Scrolling**:
  - Position cursor over the left-hand section list in Settings.
  - Rotate mouse wheel.
  - **Expected**: Sidebar scrolls cleanly when content exceeds height.
- [ ] **Close Button ("X")**:
  - Click the "✕" button in the top-right corner of the Settings modal.
  - **Expected**: Modal closes immediately.
- [ ] **Done Button**:
  - Scroll down in any settings section and click the "Done" button at bottom right.
  - **Expected**: Modal closes immediately.
- [ ] **Backdrop & Escape Key**:
  - Click the dimmed backdrop outside the modal dialog.
  - **Expected**: Modal closes.
  - Reopen modal and press `Escape`.
  - **Expected**: Modal closes.

---

## 3. Window Close & System Tray Handling
- [ ] **Close to Tray (Minimize)**:
  - Configure Desktop settings: "When I close the window" -> "Minimize to system tray".
  - Click window "X" (native Windows close button).
  - **Expected**: Window hides; audio continues playing; Discord Rich Presence continues updating; tray icon displays current song tooltip.
- [ ] **Tray Menu & Restoration**:
  - Left-click tray icon or right-click -> "Show".
  - **Expected**: Window restores in original size and position.
- [ ] **Quit**:
  - Select "Quit" from tray menu or choose Quit in Close prompt.
  - **Expected**: App terminates cleanly, clears Discord presence, and frees background processes.
