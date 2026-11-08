mod discord_ipc;

use discord_ipc::{
    start_background_discord_worker, DiscordConnectionStatus, DiscordManager, PresencePayload,
    SharedDiscordManager, PRODUCTION_URL,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl};
use tauri_plugin_opener::OpenerExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookResponse {
    pub success: bool,
    #[serde(rename = "messageId")]
    pub message_id: Option<String>,
    pub error: Option<String>,
    #[serde(rename = "notFound")]
    pub not_found: Option<bool>,
}

#[tauri::command]
fn get_discord_status(
    manager: tauri::State<'_, SharedDiscordManager>,
) -> DiscordConnectionStatus {
    manager.lock().unwrap().get_status()
}

#[tauri::command]
fn get_discord_debug_info(
    manager: tauri::State<'_, SharedDiscordManager>,
) -> discord_ipc::DiscordDebugInfo {
    manager.lock().unwrap().get_debug_info()
}

#[tauri::command]
fn set_presence(
    payload: PresencePayload,
    manager: tauri::State<'_, SharedDiscordManager>,
) -> Result<(), String> {
    manager.lock().unwrap().set_payload(Some(payload));
    Ok(())
}

#[tauri::command]
fn clear_presence(manager: tauri::State<'_, SharedDiscordManager>) -> Result<(), String> {
    manager.lock().unwrap().set_payload(None);
    Ok(())
}

#[tauri::command]
fn send_test_presence(
    manager: tauri::State<'_, SharedDiscordManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    manager.lock().unwrap().send_test_presence()?;

    // Schedule clearing the test presence after 10 seconds
    let manager_clone = manager.inner().clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(10));
        manager_clone.lock().unwrap().sync_presence();
    });

    let _ = app_handle;
    Ok(())
}

#[tauri::command]
fn set_discord_client_id(
    client_id: String,
    manager: tauri::State<'_, SharedDiscordManager>,
) -> Result<(), String> {
    manager.lock().unwrap().set_client_id(client_id);
    Ok(())
}

#[tauri::command]
async fn send_discord_webhook(
    webhook_url: String,
    method: Option<String>,
    message_id: Option<String>,
    payload: Option<serde_json::Value>,
) -> Result<WebhookResponse, String> {
    // Strictly validate webhook URL format
    let valid_prefixes = [
        "https://discord.com/api/webhooks/",
        "https://discordapp.com/api/webhooks/",
        "https://ptb.discord.com/api/webhooks/",
        "https://canary.discord.com/api/webhooks/",
    ];

    if !valid_prefixes.iter().any(|p| webhook_url.starts_with(p)) {
        return Ok(WebhookResponse {
            success: false,
            message_id: None,
            error: Some("Invalid Discord webhook URL format".into()),
            not_found: None,
        });
    }

    let http_client = reqwest::Client::new();
    let method_str = method.unwrap_or_else(|| "POST".into());

    let target_url = if method_str == "PATCH" || method_str == "DELETE" {
        let mid = match message_id {
            Some(m) if !m.trim().is_empty() => m,
            _ => {
                return Ok(WebhookResponse {
                    success: false,
                    message_id: None,
                    error: Some("Missing message ID for PATCH/DELETE".into()),
                    not_found: None,
                });
            }
        };
        format!("{}/messages/{}", webhook_url, mid)
    } else {
        format!("{}?wait=true", webhook_url)
    };

    let req = match method_str.as_str() {
        "PATCH" => http_client.patch(&target_url),
        "DELETE" => http_client.delete(&target_url),
        _ => http_client.post(&target_url),
    };

    let req = if method_str != "DELETE" {
        if let Some(body) = payload {
            req.json(&body)
        } else {
            req
        }
    } else {
        req
    };

    match req.send().await {
        Ok(res) => {
            let status = res.status();
            if status == reqwest::StatusCode::NO_CONTENT || method_str == "DELETE" {
                return Ok(WebhookResponse {
                    success: true,
                    message_id: None,
                    error: None,
                    not_found: None,
                });
            }
            if status == reqwest::StatusCode::NOT_FOUND {
                return Ok(WebhookResponse {
                    success: false,
                    message_id: None,
                    error: Some("Discord message not found".into()),
                    not_found: Some(true),
                });
            }
            if !status.is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Ok(WebhookResponse {
                    success: false,
                    message_id: None,
                    error: Some(format!("Discord error {}: {}", status, err_text)),
                    not_found: None,
                });
            }

            if let Ok(json_body) = res.json::<serde_json::Value>().await {
                let msg_id = json_body
                    .get("id")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                Ok(WebhookResponse {
                    success: true,
                    message_id: msg_id,
                    error: None,
                    not_found: None,
                })
            } else {
                Ok(WebhookResponse {
                    success: true,
                    message_id: None,
                    error: None,
                    not_found: None,
                })
            }
        }
        Err(err) => Ok(WebhookResponse {
            success: false,
            message_id: None,
            error: Some(err.to_string()),
            not_found: None,
        }),
    }
}

#[tauri::command]
fn hide_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(w) = app_handle.get_webview_window("main") {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
fn quit_app(
    app_handle: AppHandle,
    manager: tauri::State<'_, SharedDiscordManager>,
) -> Result<(), String> {
    manager.lock().unwrap().set_payload(None);
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
fn update_tray_tooltip(app_handle: AppHandle, title: String, artist: String) -> Result<(), String> {
    if let Some(tray) = app_handle.tray_by_id("main-tray") {
        let tooltip = format!("MyuJiku • {} - {}", title, artist);
        let _ = tray.set_tooltip(Some(tooltip));
    }
    Ok(())
}

pub fn run() {
    let discord_manager: SharedDiscordManager = Arc::new(Mutex::new(DiscordManager::new()));
    let worker_manager = discord_manager.clone();

    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("window-close-requested", ());
            }
        })
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(discord_manager)
        .invoke_handler(tauri::generate_handler![
            get_discord_status,
            get_discord_debug_info,
            set_presence,
            clear_presence,
            send_test_presence,
            set_discord_client_id,
            send_discord_webhook,
            hide_window,
            quit_app,
            update_tray_tooltip
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let opener_handle = app.handle().clone();

            // Start background worker to auto-detect and auto-connect Discord IPC
            start_background_discord_worker(app_handle, worker_manager);

            // Load remote site in release, or localhost in debug
            let target_url = if cfg!(debug_assertions) {
                "http://localhost:3000"
            } else {
                PRODUCTION_URL
            };

            let webview_url = match target_url.parse::<tauri::Url>() {
                Ok(url) => WebviewUrl::External(url),
                Err(_) => WebviewUrl::App("../src-tauri/fallback/index.html".into()),
            };

            const BRIDGE_SCRIPT: &str = r#"
(function() {
  // Ensure presence is enabled in desktop localStorage
  try {
    if (localStorage.getItem('myujiku_discord_presence_enabled') !== 'false') {
      localStorage.setItem('myujiku_discord_presence_enabled', 'true');
    }
  } catch (e) {}

  var lastSentJson = '';

  function invokeSetPresence(payload) {
    try {
      var jsonStr = JSON.stringify(payload);
      if (jsonStr === lastSentJson) return;
      lastSentJson = jsonStr;
      console.log('[Desktop Bridge] Invoking set_presence:', payload);
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        window.__TAURI_INTERNALS__.invoke('set_presence', { payload: payload });
      } else if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        window.__TAURI__.core.invoke('set_presence', { payload: payload });
      }
    } catch (err) {
      console.error('[Desktop Bridge] invoke error:', err);
    }
  }

  function syncFromDom() {
    try {
      var el = document.getElementById('myujiku-discord-presence');
      var title = el ? el.getAttribute('data-title') : null;
      var artist = el ? el.getAttribute('data-artist') : null;
      var coverUrl = el ? el.getAttribute('data-cover-url') : null;
      var duration = el ? parseFloat(el.getAttribute('data-duration') || '0') : 0;
      var position = el ? parseFloat(el.getAttribute('data-position') || '0') : 0;
      var status = el ? (el.getAttribute('data-status') || 'paused') : 'paused';
      var roomCode = el ? (el.getAttribute('data-room-code') || '') : '';

      // Fallback: If #myujiku-discord-presence attributes are not yet set, parse from DOM player bar
      if (!title || !title.trim()) {
        var titleElem = document.querySelector('div.flex.flex-col.justify-center.min-w-0.flex-1 p:first-child');
        if (titleElem && titleElem.textContent && titleElem.textContent.trim() !== 'ChillCast • Ready' && titleElem.textContent.trim() !== 'No Track Selected') {
          title = titleElem.textContent.trim();
        }
        var artistElem = document.querySelector('div.flex.flex-col.justify-center.min-w-0.flex-1 p:nth-child(2)');
        if (artistElem && artistElem.textContent && artistElem.textContent.trim() !== 'Ready' && artistElem.textContent.trim() !== 'Select a playlist or track') {
          artist = artistElem.textContent.trim();
        }
        var imgElem = document.querySelector('div.relative.w-14.h-14 img');
        if (imgElem && imgElem.src) {
          coverUrl = imgElem.src;
        }
      }

      if (!title || !title.trim() || title === 'ChillCast • Ready' || title === 'No Track Selected') {
        return;
      }

      var isPaused = status !== 'playing';
      var nowSec = Math.floor(Date.now() / 1000);
      var startTs = !isPaused ? (nowSec - Math.floor(position)) : null;
      var endTs = (!isPaused && duration > 0 && startTs) ? (startTs + Math.floor(duration)) : null;

      if (!coverUrl || !coverUrl.trim()) {
        var imgElem = document.querySelector('div.relative.w-14.h-14 img') || document.querySelector('img[alt="' + (title || '').replace(/"/g, '\\"') + '"]');
        if (imgElem && imgElem.src) {
          coverUrl = imgElem.src;
        }
      }

      var ytMatch = coverUrl ? coverUrl.match(/(?:v=|youtu\.be\/|\/vi\/|[?&]id=)([A-Za-z0-9_-]{11})/) : null;
      var finalCover = ytMatch
        ? ('mp:https://i.ytimg.com/vi/' + ytMatch[1] + '/hqdefault.jpg')
        : (coverUrl && coverUrl.startsWith('https://') && !coverUrl.includes('/api/cover') ? ('mp:' + coverUrl) : (coverUrl && coverUrl.startsWith('mp:') ? coverUrl : null));
      var roomUrl = roomCode ? ('https://myujiku.vercel.app/together/' + roomCode) : null;

      var payload = {
        title: title,
        artist: artist || 'Unknown Artist',
        album: null,
        coverUrl: finalCover,
        startTimestamp: startTs,
        endTimestamp: endTs,
        paused: isPaused,
        roomUrl: roomUrl,
        hideDetails: localStorage.getItem('myujiku_discord_presence_hide_details') === 'true'
      };

      invokeSetPresence(payload);
    } catch (e) {
      console.debug('[Desktop Bridge] sync error:', e);
    }
  }

  function initObserver() {
    var target = document.getElementById('myujiku-discord-presence');
    if (target) {
      var observer = new MutationObserver(syncFromDom);
      observer.observe(target, { attributes: true, childList: true });
    }
    syncFromDom();
    setInterval(syncFromDom, 3000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initObserver();
  } else {
    document.addEventListener('DOMContentLoaded', initObserver);
  }
})();
"#;

            // Build System Tray Menu
            let show_item = MenuItem::with_id(app, "show", "Show MyuJiku", true, None::<&str>)?;
            let play_pause_item = MenuItem::with_id(app, "play_pause", "Play / Pause", true, None::<&str>)?;
            let next_item = MenuItem::with_id(app, "next", "Next Track", true, None::<&str>)?;
            let prev_item = MenuItem::with_id(app, "prev", "Previous Track", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &show_item,
                    &play_pause_item,
                    &next_item,
                    &prev_item,
                    &quit_item,
                ],
            )?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("MyuJiku")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "play_pause" => {
                        let _ = app.emit("tray-play-pause", ());
                    }
                    "next" => {
                        let _ = app.emit("tray-next-track", ());
                    }
                    "prev" => {
                        let _ = app.emit("tray-prev-track", ());
                    }
                    "quit" => {
                        let manager = app.state::<SharedDiscordManager>();
                        manager.lock().unwrap().set_payload(None);
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            let _main_window = tauri::WebviewWindowBuilder::new(app, "main", webview_url)
                .title("MyuJiku")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .resizable(true)
                .drag_and_drop(false)
                .devtools(true)
                .additional_browser_args(
                    "--autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding",
                )
                .initialization_script(BRIDGE_SCRIPT)
                .on_navigation(move |url| {
                    let host = url.host_str().unwrap_or("");
                    let is_allowed = host == "myujiku.vercel.app"
                        || host == "localhost"
                        || host == "127.0.0.1"
                        || host == "discord.com"
                        || host.ends_with(".discord.com")
                        || host == "drtokajdrpcuklkrjdye.supabase.co"
                        || host.ends_with(".supabase.co");

                    if is_allowed {
                        true
                    } else {
                        // Open external link in default desktop browser
                        let _ = opener_handle.opener().open_url(url.as_str(), None::<&str>);
                        false
                    }
                })
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building MyuJiku desktop application");
}
