//! Tauri commands: the bridge the React frontend calls via `invoke()`.
//!
//! These functions are intentionally thin. The real logic lives in
//! `device.rs`. Here we only: validate arguments, call the device function,
//! turn errors into strings (that the frontend can display).

use crate::device;
use crate::profile::{DeviceInfo, Profile};

/// Is a compatible mouse connected?
#[tauri::command(async)]
pub fn device_connected() -> bool {
    device::is_connected()
}

/// Returns info about the connected mouse (model, battery, USB details).
#[tauri::command(async)]
pub fn device_info() -> Result<DeviceInfo, String> {
    device::device_info()
}

/// Cheap change check for polling: signature of the connected devices
/// (product IDs). If it changes, the frontend fetches the full info.
#[tauri::command(async)]
pub fn device_signature() -> String {
    device::device_signature()
}

/// How many profile slots are there?
#[tauri::command]
pub fn profile_count() -> u8 {
    device::PROFILE_COUNT
}

/// Reads a single profile (1-indexed).
#[tauri::command(async)]
pub fn get_profile(index: u8) -> Result<Profile, String> {
    device::read_profile(index)
}

/// Writes a single profile (1-indexed).
#[tauri::command(async)]
pub fn set_profile(index: u8, profile: Profile) -> Result<(), String> {
    device::write_profile(index, &profile)
}

/// Which profile is active?
#[tauri::command(async)]
pub fn get_active_profile() -> Result<u8, String> {
    device::active_profile()
}

/// Switch the active profile.
#[tauri::command(async)]
pub fn set_active_profile(index: u8) -> Result<(), String> {
    device::set_active(index)
}

// ---------------------------------------------------------------------------
// ALTERNATIVE: subprocess approach (if lamzu-cfg does NOT export a library).
//
// Instead of the `device` calls above you could call the installed CLI.
// Example (requires `lamzu-cfg` in PATH and usually root for /dev/hidraw):
//
// use std::process::Command;
//
// #[tauri::command]
// pub fn get_profile(index: u8) -> Result<serde_json::Value, String> {
//     let out = Command::new("lamzu-cfg")
//         .args(["get", "--profile", &index.to_string(), "--json"])
//         .output()
//         .map_err(|e| e.to_string())?;
//     if !out.status.success() {
//         return Err(String::from_utf8_lossy(&out.stderr).into_owned());
//     }
//     serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())
// }
//
// Downside: requires a separate CLI install, sudo handling is ugly.
// ---------------------------------------------------------------------------
