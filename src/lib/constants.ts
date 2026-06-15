import type { Profile } from "@/lib/api";

export const POLL_RATES = [125, 250, 500, 1000, 2000, 4000, 8000];

// Max number of DPI stages shown in the UI. The hardware accepts up to 8
// (lamzu-cfg MAX_RESOLUTION_COUNT), but the official Lamzu Aurora app limits
// this to 5, so we match it.
export const MAX_STAGES = 5;

// Peak Performance Time presets, in seconds. The hardware stores this in
// 10-second steps (byte * 10), so every value here is a multiple of 10.
// Adjust this list if the official Lamzu presets turn out to differ.
export const PEAK_TIME_PRESETS = [10, 30, 60, 120, 300, 600];

export const TOGGLES: [keyof Profile, string][] = [
  ["motion_sync", "Motion Sync"],
  ["angle_snapping", "Angle Snapping"],
  ["ripple_control", "Ripple Control"],
];

// --- Polling configuration (one global self-scheduling tick drives all of
// these; each piece of work runs at its own cadence via timestamp checks). ---
export const POLL = {
  // How often the tick fires. Cheap status (signature) runs every tick.
  TICK_MS: 1_000,
  // Battery is adaptive: fast while the voltage moves, slow when stable.
  BATTERY_FAST_MS: 3_000,
  BATTERY_SLOW_MS: 15_000,
  // Voltage change (mV) between readings that counts as real movement, not
  // noise. Idle jitter was ~±6 mV in testing, so 10 is a safe threshold.
  BATTERY_MOVE_MV: 10,
  // How often to re-read the profile so external changes (e.g. the official
  // app switching 125 -> 1000 Hz) show up. The hardware can't push changes,
  // so this poll is the fastest safe way to notice them.
  PROFILE_CHECK_MS: 1_000,
} as const;
