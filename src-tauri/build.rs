fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "get_discord_status",
                "get_discord_debug_info",
                "set_presence",
                "clear_presence",
                "send_test_presence",
                "set_discord_client_id",
                "send_discord_webhook",
            ]),
        ),
    )
    .unwrap();
}
