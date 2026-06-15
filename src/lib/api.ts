import { invoke } from "@tauri-apps/api/core";

// Mirrors the Rust Profile struct (profile.rs). Keep in sync when that
// struct changes.
export interface Resolution {
  x: number;
  y: number;
}

export interface Color {
  red: number;
  green: number;
  blue: number;
}

export interface Profile {
  poll_rate: number;
  current_resolution_index: number;
  lift_off_distance: number;
  debounce_ms: number;
  motion_sync: boolean;
  angle_snapping: boolean;
  ripple_control: boolean;
  peak_performance: boolean;
  peak_performance_time: number;
  high_performance: boolean;
  resolutions: Resolution[];
  resolution_colors: Color[];
  // Button assignments as reported by the mouse: button name -> action
  // (string or tagged object). Read-only for now.
  button_map: Record<string, unknown>;
  macros: unknown;
}

export interface DeviceInfo {
  model: string;
  connection: string;
  max_poll_rate: number;
  battery_percent: number | null;
  battery_mv: number | null;
  product_id: string;
  serial: string | null;
  is_known: boolean;
}

// Type-safe wrappers around the Tauri commands from commands.rs.
export const api = {
  deviceConnected: () => invoke<boolean>("device_connected"),
  deviceInfo: () => invoke<DeviceInfo>("device_info"),
  deviceSignature: () => invoke<string>("device_signature"),
  profileCount: () => invoke<number>("profile_count"),
  getProfile: (index: number) => invoke<Profile>("get_profile", { index }),
  setProfile: (index: number, profile: Profile) =>
    invoke<void>("set_profile", { index, profile }),
  getActiveProfile: () => invoke<number>("get_active_profile"),
  setActiveProfile: (index: number) =>
    invoke<void>("set_active_profile", { index }),
};
