mod discord_ipc;

use discord_ipc::{
    start_background_discord_worker, DiscordConnectionStatus, DiscordManager, PresencePayload,
    SharedDiscordManager, PRODUCTION_URL,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, WebviewUrl};
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

pub fn run() {
    let discord_manager: SharedDiscordManager = Arc::new(Mutex::new(DiscordManager::new()));
    let worker_manager = discord_manager.clone();

    tauri::Builder::default()
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
            send_discord_webhook
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
  function syncFromDom() {
    try {
      var el = document.getElementById('myujiku-discord-presence');
      if (!el) return;
      var title = el.getAttribute('data-title');
      if (!title || !title.trim()) return;
      var artist = el.getAttribute('data-artist') || 'Unknown Artist';
      var coverUrl = el.getAttribute('data-cover-url') || '';
      var duration = parseFloat(el.getAttribute('data-duration') || '0');
      var position = parseFloat(el.getAttribute('data-position') || '0');
      var status = el.getAttribute('data-status') || 'paused';
      var roomCode = el.getAttribute('data-room-code') || '';
      var isPaused = status !== 'playing';

      var nowSec = Math.floor(Date.now() / 1000);
      var startTs = !isPaused ? (nowSec - Math.floor(position)) : null;
      var endTs = (!isPaused && duration > 0 && startTs) ? (startTs + Math.floor(duration)) : null;

      var ytMatch = coverUrl.match(/\/vi\/([A-Za-z0-9_-]{11})\//);
      var finalCover = ytMatch
        ? ('https://myujiku.vercel.app/api/cover?id=' + ytMatch[1])
        : (coverUrl.startsWith('https://') ? coverUrl : null);
      var roomUrl = roomCode ? ('https://myujiku.vercel.app/together/' + roomCode) : null;

      var payload = {
        title: title,
        artist: artist,
        album: null,
        coverUrl: finalCover,
        startTimestamp: startTs,
        endTimestamp: endTs,
        paused: isPaused,
        roomUrl: roomUrl,
        hideDetails: localStorage.getItem('myujiku_discord_presence_hide_details') === 'true'
      };

      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        window.__TAURI_INTERNALS__.invoke('set_presence', { payload: payload });
      }
    } catch (e) {
      console.debug('[Desktop Bridge] sync error:', e);
    }
  }

  function initObserver() {
    var target = document.getElementById('myujiku-discord-presence');
    if (target) {
      var observer = new MutationObserver(syncFromDom);
      observer.observe(target, { attributes: true, childList: true });
      syncFromDom();
    } else {
      setTimeout(initObserver, 400);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initObserver();
  } else {
    document.addEventListener('DOMContentLoaded', initObserver);
  }
})();
"#;

            let _main_window = tauri::WebviewWindowBuilder::new(app, "main", webview_url)
                .title("MyuJiku")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .resizable(true)
                .drag_and_drop(false)
                .additional_browser_args("--autoplay-policy=no-user-gesture-required")
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
