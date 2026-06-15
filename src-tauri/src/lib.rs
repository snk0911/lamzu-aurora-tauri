//! Entry point of the Tauri application (library part).
//! main.rs only calls `run()`.

mod commands;
mod device;
mod profile;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::device_connected,
            commands::device_info,
            commands::device_signature,
            commands::profile_count,
            commands::get_profile,
            commands::set_profile,
            commands::get_active_profile,
            commands::set_active_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
