use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::os::windows::fs::OpenOptionsExt;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub const DEFAULT_DISCORD_APP_ID: &str = "1303728080277962803";
pub const DISCORD_APP_ID_PLACEHOLDER: &str = "YOUR_DISCORD_APP_ID_HERE";
pub const PRODUCTION_URL: &str = "https://myujiku.vercel.app";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "status", content = "data")]
pub enum DiscordConnectionStatus {
    NotRunning,
    Connecting,
    Connected {
        username: String,
        #[serde(rename = "displayName")]
        display_name: Option<String>,
        #[serde(rename = "avatarUrl")]
        avatar_url: Option<String>,
    },
    AppIdMissing,
    Error {
        kind: String,
    },
}

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
    #[serde(rename = "hideDetails")]
    pub hide_details: Option<bool>,
}

static NONCE_COUNTER: AtomicU64 = AtomicU64::new(1);

fn next_nonce() -> String {
    format!("myujiku-{}", NONCE_COUNTER.fetch_add(1, Ordering::Relaxed))
}

pub struct DiscordIpc {
    file: File,
    #[allow(dead_code)]
    pub user_id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

impl DiscordIpc {
    /// Attempts to open and handshake with any active Discord IPC pipe (0..10)
    pub fn connect(client_id: &str) -> Result<Self, String> {
        let mut last_err = String::from("No active Discord IPC pipes found");

        for i in 0..10 {
            let pipe_path = PathBuf::from(format!(r"\\?\pipe\discord-ipc-{}", i));

            // GENERIC_READ | GENERIC_WRITE = 0x3
            let Ok(mut file) = OpenOptions::new().access_mode(0x3).open(&pipe_path) else {
                continue;
            };

            // Send Handshake: Opcode 0
            let handshake_body = json!({
                "v": 1,
                "client_id": client_id
            })
            .to_string();

            if let Err(e) = Self::write_frame(&mut file, 0, handshake_body.as_bytes()) {
                log::debug!("Failed writing handshake to pipe {}: {}", i, e);
                last_err = e;
                continue;
            }

            // Read Handshake Response
            match Self::read_frame(&mut file) {
                Ok((opcode, payload)) => {
                    // Opcode 2 is an Error frame from Discord (e.g. 4000 Invalid Client ID)
                    if opcode == 2 {
                        let code = payload.get("code").and_then(|c| c.as_i64()).unwrap_or(0);
                        let msg = payload
                            .get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("Unknown error");
                        log::warn!("[Discord IPC] Pipe {} handshake error {}: {}", i, code, msg);
                        return Err(format!("Invalid Client ID: Discord rejected ID with code {}: {}", code, msg));
                    }

                    // Opcode 1 is a DISPATCH frame (READY)
                    if opcode != 1 {
                        continue;
                    }

                    let user_val = payload.get("data").and_then(|d| d.get("user"));
                    let username = user_val
                        .and_then(|u| u.get("username"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Discord User")
                        .to_string();

                    let display_name = user_val
                        .and_then(|u| u.get("global_name"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    let user_id = user_val
                        .and_then(|u| u.get("id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();

                    let avatar_hash = user_val
                        .and_then(|u| u.get("avatar"))
                        .and_then(|v| v.as_str());

                    let avatar_url = if let (Some(hash), false) = (avatar_hash, user_id.is_empty()) {
                        Some(format!(
                            "https://cdn.discordapp.com/avatars/{}/{}.png?size=128",
                            user_id, hash
                        ))
                    } else {
                        None
                    };

                    return Ok(Self {
                        file,
                        user_id,
                        username,
                        display_name,
                        avatar_url,
                    });
                }
                Err(e) => {
                    log::debug!("Failed reading handshake from pipe {}: {}", i, e);
                    last_err = e;
                    continue;
                }
            }
        }

        Err(last_err)
    }

    fn write_frame(file: &mut File, opcode: u32, data: &[u8]) -> Result<(), String> {
        let len = data.len() as u32;
        let mut header = [0u8; 8];
        header[0..4].copy_from_slice(&opcode.to_le_bytes());
        header[4..8].copy_from_slice(&len.to_le_bytes());

        file.write_all(&header).map_err(|e| e.to_string())?;
        file.write_all(data).map_err(|e| e.to_string())?;
        file.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn read_frame(file: &mut File) -> Result<(u32, Value), String> {
        let mut header = [0u8; 8];
        file.read_exact(&mut header).map_err(|e| e.to_string())?;

        let opcode = u32::from_le_bytes(header[0..4].try_into().unwrap());
        let len = u32::from_le_bytes(header[4..8].try_into().unwrap()) as usize;

        if len > 65536 {
            return Err("Frame payload exceeded maximum size".into());
        }

        let mut buf = vec![0u8; len];
        file.read_exact(&mut buf).map_err(|e| e.to_string())?;

        let val: Value = serde_json::from_slice(&buf).map_err(|e| e.to_string())?;
        Ok((opcode, val))
    }

    /// Sets Rich Presence activity with Listening activity type (type: 2)
    pub fn set_activity(&mut self, payload: &PresencePayload) -> Result<(), String> {
        let hide = payload.hide_details.unwrap_or(false);

        let details = if hide {
            "Listening to MyuJiku".to_string()
        } else {
            let t = payload.title.trim();
            if t.len() < 2 {
                format!("{} ", t)
            } else if t.len() > 128 {
                t[..128].to_string()
            } else {
                t.to_string()
            }
        };

        let state = if hide {
            "Lo-Fi Soundscapes".to_string()
        } else {
            let a = payload.artist.trim();
            if a.len() < 2 {
                format!("{} ", a)
            } else if a.len() > 128 {
                a[..128].to_string()
            } else {
                a.to_string()
            }
        };

        let mut act = json!({
            "type": 2, // 2 = Listening!
            "details": details,
            "state": state,
        });

        // Timestamps (only when playing and not hidden)
        if !payload.paused && !hide {
            if let Some(start) = payload.start_timestamp {
                let mut ts = json!({ "start": start });
                if let Some(end) = payload.end_timestamp {
                    ts["end"] = json!(end);
                }
                act["timestamps"] = ts;
            }
        }

        // Assets
        let mut assets = json!({
            "large_text": "MyuJiku",
            "small_image": if payload.paused { "pause" } else { "play" },
            "small_text": if payload.paused { "Paused" } else { "Playing" },
        });

        // Cover image: external URL if valid https, otherwise default asset
        if let Some(ref url) = payload.cover_url {
            if url.starts_with("https://") && url.len() <= 256 {
                assets["large_image"] = json!(url);
            } else {
                assets["large_image"] = json!("myujiku_logo");
            }
        } else {
            assets["large_image"] = json!("myujiku_logo");
        }
        act["assets"] = assets;

        // Buttons
        let mut buttons = vec![json!({
            "label": "Listen on MyuJiku",
            "url": PRODUCTION_URL
        })];

        if let Some(ref room_link) = payload.room_url {
            if !hide && room_link.starts_with("https://") && room_link.len() <= 512 {
                buttons.push(json!({
                    "label": "Join room",
                    "url": room_link
                }));
            }
        }
        act["buttons"] = json!(buttons);

        let frame = json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": std::process::id(),
                "activity": act
            },
            "nonce": next_nonce()
        })
        .to_string();

        Self::write_frame(&mut self.file, 1, frame.as_bytes())
    }

    /// Clears any currently active Rich Presence
    pub fn clear_activity(&mut self) -> Result<(), String> {
        let frame = json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": std::process::id(),
                "activity": null
            },
            "nonce": next_nonce()
        })
        .to_string();

        Self::write_frame(&mut self.file, 1, frame.as_bytes())
    }
}

pub struct DiscordManager {
    ipc: Option<DiscordIpc>,
    status: DiscordConnectionStatus,
    client_id: String,
    current_payload: Option<PresencePayload>,
    paused_at: Option<Instant>,
    backoff_secs: u64,
}

impl DiscordManager {
    pub fn new() -> Self {
        let client_id = std::env::var("DISCORD_CLIENT_ID")
            .ok()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_DISCORD_APP_ID.to_string());

        let status = if client_id.is_empty() || client_id == DISCORD_APP_ID_PLACEHOLDER {
            DiscordConnectionStatus::AppIdMissing
        } else {
            DiscordConnectionStatus::NotRunning
        };

        Self {
            ipc: None,
            status,
            client_id,
            current_payload: None,
            paused_at: None,
            backoff_secs: 10,
        }
    }

    pub fn get_status(&self) -> DiscordConnectionStatus {
        self.status.clone()
    }

    pub fn set_client_id(&mut self, new_id: String) {
        let trimmed = new_id.trim().to_string();
        if trimmed == self.client_id {
            return;
        }
        self.client_id = trimmed;
        self.ipc = None;
        if self.client_id.is_empty() || self.client_id == DISCORD_APP_ID_PLACEHOLDER {
            self.status = DiscordConnectionStatus::AppIdMissing;
        } else {
            self.status = DiscordConnectionStatus::Connecting;
            self.backoff_secs = 2; // quick retry
        }
    }

    pub fn set_payload(&mut self, payload: Option<PresencePayload>) {
        if let Some(ref p) = payload {
            if p.paused {
                if self.paused_at.is_none() {
                    self.paused_at = Some(Instant::now());
                }
            } else {
                self.paused_at = None;
            }
        } else {
            self.paused_at = None;
        }

        self.current_payload = payload;
        self.sync_presence();
    }

    pub fn sync_presence(&mut self) {
        let Some(ref mut ipc) = self.ipc else {
            return;
        };

        if let Some(ref payload) = self.current_payload {
            // Check 5-minute pause timeout
            if let Some(paused_time) = self.paused_at {
                if paused_time.elapsed() > Duration::from_secs(300) {
                    let _ = ipc.clear_activity();
                    return;
                }
            }

            if let Err(e) = ipc.set_activity(payload) {
                log::debug!("[Discord IPC] Pipe broken on set_activity: {}", e);
                self.ipc = None;
                self.status = DiscordConnectionStatus::NotRunning;
            }
        } else {
            let _ = ipc.clear_activity();
        }
    }

    /// Background tick run periodically
    pub fn tick(&mut self) -> Option<DiscordConnectionStatus> {
        if self.client_id.is_empty() || self.client_id == DISCORD_APP_ID_PLACEHOLDER {
            if self.status != DiscordConnectionStatus::AppIdMissing {
                self.status = DiscordConnectionStatus::AppIdMissing;
                return Some(self.status.clone());
            }
            return None;
        }

        if self.ipc.is_none() {
            // Attempt auto-connect
            match DiscordIpc::connect(&self.client_id) {
                Ok(ipc) => {
                    let new_status = DiscordConnectionStatus::Connected {
                        username: ipc.username.clone(),
                        display_name: ipc.display_name.clone(),
                        avatar_url: ipc.avatar_url.clone(),
                    };
                    self.ipc = Some(ipc);
                    self.status = new_status.clone();
                    self.backoff_secs = 10;
                    // Immediately push any pending presence
                    self.sync_presence();
                    return Some(new_status);
                }
                Err(err) => {
                    if err.contains("Invalid Client ID") {
                        if self.status != DiscordConnectionStatus::AppIdMissing {
                            self.status = DiscordConnectionStatus::AppIdMissing;
                            return Some(DiscordConnectionStatus::AppIdMissing);
                        }
                    } else if self.status != DiscordConnectionStatus::NotRunning {
                        self.status = DiscordConnectionStatus::NotRunning;
                        return Some(DiscordConnectionStatus::NotRunning);
                    }
                    // Increase backoff up to 30s
                    self.backoff_secs = (self.backoff_secs + 5).min(30);
                }
            }
        } else {
            // Connected: check 5-minute pause timeout
            if let Some(paused_time) = self.paused_at {
                if paused_time.elapsed() > Duration::from_secs(300) {
                    if let Some(ref mut ipc) = self.ipc {
                        let _ = ipc.clear_activity();
                    }
                }
            }
        }

        None
    }

    pub fn send_test_presence(&mut self) -> Result<(), String> {
        let Some(ref mut ipc) = self.ipc else {
            return Err("Discord is not connected. Make sure Discord is running.".into());
        };

        let now_sec = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let test_payload = PresencePayload {
            title: "Feel Good Inc.".into(),
            artist: "Gorillaz".into(),
            cover_url: Some("https://myujiku.vercel.app/myujiku-logo.png".into()),
            start_timestamp: Some(now_sec),
            end_timestamp: Some(now_sec + 223),
            paused: false,
            room_url: None,
            hide_details: Some(false),
        };

        ipc.set_activity(&test_payload)
    }
}

pub type SharedDiscordManager = Arc<Mutex<DiscordManager>>;

pub fn start_background_discord_worker(app: AppHandle, manager: SharedDiscordManager) {
    std::thread::spawn(move || loop {
        let (maybe_status_changed, sleep_secs) = {
            let mut guard = manager.lock().unwrap();
            let changed = guard.tick();
            let sleep = if guard.ipc.is_some() { 5 } else { guard.backoff_secs };
            (changed, sleep)
        };

        if let Some(new_status) = maybe_status_changed {
            let _ = app.emit("discord-status", new_status);
        }

        std::thread::sleep(Duration::from_secs(sleep_secs));
    });
}
