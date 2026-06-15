// Prevents an extra console window on Windows in the release build.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lamzu_aurora_tauri_lib::run()
}
