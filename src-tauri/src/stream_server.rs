use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tiny_http::{Header, Response, Server, StatusCode};

pub struct StreamServerState {
    pub port: u16,
    url_cache: Mutex<HashMap<String, (String, Instant)>>,
    client: reqwest::blocking::Client,
}

impl StreamServerState {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            url_cache: Mutex::new(HashMap::new()),
            client: reqwest::blocking::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| reqwest::blocking::Client::new()),
        }
    }

    pub fn get_cached_url(&self, video_id: &str) -> Option<String> {
        let mut cache = self.url_cache.lock().ok()?;
        if let Some((url, expires_at)) = cache.get(video_id) {
            if *expires_at > Instant::now() {
                return Some(url.clone());
            } else {
                cache.remove(video_id);
            }
        }
        None
    }

    pub fn set_cached_url(&self, video_id: String, url: String) {
        if let Ok(mut cache) = self.url_cache.lock() {
            cache.insert(
                video_id,
                (url, Instant::now() + Duration::from_secs(2 * 3600)),
            );
        }
    }
}

pub fn find_ytdl_binary() -> PathBuf {
    // 1. Check if next to current executable (packaged NSIS app)
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            let candidate = parent.join("yt-dlp.exe");
            if candidate.exists() {
                return candidate;
            }
        }
    }

    // 2. Check development workspace paths
    let dev_candidates = [
        PathBuf::from("yt-dlp.exe"),
        PathBuf::from("../yt-dlp.exe"),
        PathBuf::from("F:\\Vibecode\\chillcast\\yt-dlp.exe"),
        PathBuf::from("C:\\Users\\Sreed\\AppData\\Local\\MyuJiku\\yt-dlp.exe"),
    ];
    for cand in dev_candidates {
        if cand.exists() {
            return cand;
        }
    }

    PathBuf::from("yt-dlp.exe")
}

pub fn resolve_direct_url(state: &StreamServerState, video_id: &str) -> Result<String, String> {
    if let Some(cached) = state.get_cached_url(video_id) {
        return Ok(cached);
    }

    let ytdl_path = find_ytdl_binary();
    let url = format!("https://www.youtube.com/watch?v={}", video_id);

    let mut cmd = Command::new(&ytdl_path);
    cmd.args([
        "-g",
        "-f",
        "bestaudio[ext=m4a][abr>=160]/bestaudio[ext=webm][abr>=160]/bestaudio/best",
        "--audio-quality",
        "0",
        "--extractor-args",
        "youtube:player_client=android,web",
        "--no-playlist",
        "--no-warnings",
        &url,
    ]);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to spawn yt-dlp at {:?}: {}", ytdl_path, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "yt-dlp failed (code {:?}): {}",
            output.status.code(),
            stderr
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let direct_url = stdout
        .lines()
        .find(|l| l.trim().starts_with("http"))
        .ok_or_else(|| "No stream URL found in yt-dlp output".to_string())?
        .trim()
        .to_string();

    state.set_cached_url(video_id.to_string(), direct_url.clone());
    Ok(direct_url)
}

pub fn start_stream_server() -> Result<(u16, Arc<StreamServerState>), String> {
    // Bind to 127.0.0.1 on port 34567, or fallback to port 0 (OS chosen)
    let server = Server::http("127.0.0.1:34567")
        .or_else(|_| Server::http("127.0.0.1:0"))
        .map_err(|e| format!("Failed to bind local stream server: {}", e))?;

    let port = server.server_addr().to_ip().map(|a| a.port()).unwrap_or(34567);
    let state = Arc::new(StreamServerState::new(port));
    let state_clone = Arc::clone(&state);

    std::thread::spawn(move || {
        log::info!(
            "[StreamServer] Local streaming server listening on 127.0.0.1:{}",
            port
        );
        for request in server.incoming_requests() {
            let state = Arc::clone(&state_clone);
            std::thread::spawn(move || {
                handle_client_request(request, &state);
            });
        }
    });

    Ok((port, state))
}

fn handle_client_request(request: tiny_http::Request, state: &StreamServerState) {
    let method = request.method().as_str().to_uppercase();
    let url = request.url().to_string();

    // CORS preflight
    if method == "OPTIONS" {
        let response = Response::empty(StatusCode(204))
            .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
            .with_header(
                Header::from_bytes(
                    &b"Access-Control-Allow-Methods"[..],
                    &b"GET, HEAD, OPTIONS"[..],
                )
                .unwrap(),
            )
            .with_header(
                Header::from_bytes(
                    &b"Access-Control-Allow-Headers"[..],
                    &b"Range, Content-Type, Accept, Authorization"[..],
                )
                .unwrap(),
            )
            .with_header(
                Header::from_bytes(
                    &b"Access-Control-Expose-Headers"[..],
                    &b"Content-Range, Content-Length, Accept-Ranges"[..],
                )
                .unwrap(),
            );
        let _ = request.respond(response);
        return;
    }

    // Extract video ID from /stream?v=...
    let video_id = url.split('?').nth(1).and_then(|query| {
        query.split('&').find_map(|pair| {
            let mut parts = pair.split('=');
            if parts.next()? == "v" {
                Some(parts.next()?.to_string())
            } else {
                None
            }
        })
    });

    let video_id = match video_id {
        Some(v) if v.len() == 11 => v,
        _ => {
            let response = Response::from_string("Missing or invalid v parameter (11 chars required)")
                .with_status_code(StatusCode(400))
                .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
            let _ = request.respond(response);
            return;
        }
    };

    let direct_url = match resolve_direct_url(state, &video_id) {
        Ok(u) => u,
        Err(err) => {
            log::error!("[StreamServer] Failed to resolve video {}: {}", video_id, err);
            let response = Response::from_string(format!("Error: {}", err))
                .with_status_code(StatusCode(500))
                .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
            let _ = request.respond(response);
            return;
        }
    };

    // Forward Range header if present
    let mut req_builder = state.client.get(&direct_url);
    if let Some(range_header) = request
        .headers()
        .iter()
        .find(|h| h.field.as_str().as_bytes().eq_ignore_ascii_case(b"range"))
    {
        req_builder = req_builder.header("Range", range_header.value.as_bytes());
    }

    match req_builder.send() {
        Ok(upstream_res) => {
            let status = upstream_res.status().as_u16();
            let content_type = upstream_res
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("audio/mp4")
                .to_string();

            let content_range = upstream_res
                .headers()
                .get(reqwest::header::CONTENT_RANGE)
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            let content_length = upstream_res
                .headers()
                .get(reqwest::header::CONTENT_LENGTH)
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<usize>().ok());

            let mut response = Response::new(
                StatusCode(status),
                vec![
                    Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
                    Header::from_bytes(&b"Accept-Ranges"[..], &b"bytes"[..]).unwrap(),
                    Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes()).unwrap(),
                ],
                upstream_res,
                content_length,
                None,
            );

            if let Some(cr) = content_range {
                if let Ok(h) = Header::from_bytes(&b"Content-Range"[..], cr.as_bytes()) {
                    response.add_header(h);
                }
            }

            let _ = request.respond(response);
        }
        Err(err) => {
            let response = Response::from_string(format!("Upstream error: {}", err))
                .with_status_code(StatusCode(502))
                .with_header(Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap());
            let _ = request.respond(response);
        }
    }
}
