use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{Manager, WebviewUrl};
use tauri_plugin_opener::OpenerExt;

const DEFAULT_DISCORD_CLIENT_ID: &str = "1303728080277962803";
const PRODUCTION_URL: &str = "https://myujiku.vercel.app";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresencePayload {
    pub title: String,
    pub artist: String,
    #[serde(rename = "coverUrl")]
    pub cover_url: Option<String>,
    #[serde(rename = "startTimestamp")]
    pub start_timestamp: Option<i64>,
    #[serde(rename = "endTimestamp")]
    pub end_timestamp: Option<i64>,
    pub paused: bool,
    #[serde(rename = "roomUrl")]
    pub room_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookResponse {
    pub success: bool,
    #[serde(rename = "messageId")]
    pub message_id: Option<String>,
    pub error: Option<String>,
    #[serde(rename = "notFound")]
    pub not_found: Option<bool>,
}

struct DiscordState {
    client: Option<DiscordIpcClient>,
    client_id: String,
}

type DiscordStateHandle = Arc<Mutex<DiscordState>>;

#[tauri::command]
fn set_presence(
    payload: PresencePayload,
    state: tauri::State<'_, DiscordStateHandle>,
) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;

    // Attempt connection if not already connected
    if state_guard.client.is_none() {
        let client_id = state_guard.client_id.clone();
        if let Ok(mut new_client) = DiscordIpcClient::new(&client_id) {
            if new_client.connect().is_ok() {
                state_guard.client = Some(new_client);
            }
        }
    }

    if let Some(client) = state_guard.client.as_mut() {
        let mut act = activity::Activity::new();
        act = act.details(&payload.title);
        act = act.state(&payload.artist);

        // Timestamps (only when playing)
        if !payload.paused {
            if let Some(start) = payload.start_timestamp {
                let mut ts = activity::Timestamps::new().start(start);
                if let Some(end) = payload.end_timestamp {
                    ts = ts.end(end);
                }
                act = act.timestamps(ts);
            }
        }

        // Assets
        let mut assets = activity::Assets::new();
        if let Some(cover) = &payload.cover_url {
            assets = assets.large_image(cover);
        } else {
            assets = assets.large_image("myujiku_logo");
        }
        assets = assets.large_text("MyuJiku");

        if payload.paused {
            assets = assets.small_image("pause").small_text("Paused");
        } else {
            assets = assets.small_image("play").small_text("Playing");
        }
        act = act.assets(assets);

        // Buttons: Listen on MyuJiku + optional Join room
        let mut buttons = Vec::new();
        buttons.push(activity::Button::new("Listen on MyuJiku", PRODUCTION_URL));
        if let Some(room_link) = &payload.room_url {
            buttons.push(activity::Button::new("Join room", room_link));
        }
        act = act.buttons(buttons);

        if let Err(err) = client.set_activity(act) {
            log::debug!("[Discord IPC] Failed to set activity: {:?}", err);
            // If pipe broke, drop client to trigger reconnect next time
            state_guard.client = None;
        }
    }

    Ok(())
}

#[tauri::command]
fn clear_presence(state: tauri::State<'_, DiscordStateHandle>) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| e.to_string())?;
    if let Some(client) = state_guard.client.as_mut() {
        let _ = client.clear_activity();
    }
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
                let msg_id = json_body.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
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
    let client_id = std::env::var("DISCORD_CLIENT_ID")
        .unwrap_or_else(|_| DEFAULT_DISCORD_CLIENT_ID.to_string());

    let discord_state: DiscordStateHandle = Arc::new(Mutex::new(DiscordState {
        client: None,
        client_id,
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(discord_state)
        .invoke_handler(tauri::generate_handler![
            set_presence,
            clear_presence,
            send_discord_webhook
        ])
        .setup(|app| {
            let handle = app.handle();
            let opener_handle = handle.clone();

            // Load remote site in release, or localhost in debug
            let target_url = if cfg!(debug_assertions) {
                "http://localhost:3000"
            } else {
                PRODUCTION_URL
            };

            if let Some(window) = app.get_webview_window("main") {
                // Navigate to target URL
                if let Ok(parsed_url) = target_url.parse() {
                    let _ = window.navigate(WebviewUrl::External(parsed_url));
                }

                // Setup navigation rules: allow site, Discord OAuth, Supabase; open others in system browser
                let _ = window.on_navigation(move |url| {
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
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building MyuJiku desktop application");
}
