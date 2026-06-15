import type { Profile, Color } from "@/lib/api";

export function rgb(c: Color) {
  return `rgb(${c.red}, ${c.green}, ${c.blue})`;
}

// Format a seconds value the way the Lamzu app does: "30s", "1min", "5min".
// Whole minutes render as "Nmin", otherwise as seconds.
export function fmtSeconds(s: number): string {
  if (s > 0 && s % 60 === 0) {
    return `${s / 60}min`;
  }
  return `${s}s`;
}

// Compare a freshly-read mouse profile against the one currently displayed.
// The displayed profile is padded to MAX_STAGES, so only the first
// `activeCount` resolutions are meaningful. Returns true if they're equal
// (i.e. nothing changed externally).
export function sameProfile(
  fresh: Profile,
  shown: Profile | null,
  activeCount: number,
): boolean {
  if (!shown) return false;
  if (
    fresh.poll_rate !== shown.poll_rate ||
    fresh.current_resolution_index !== shown.current_resolution_index ||
    fresh.lift_off_distance !== shown.lift_off_distance ||
    fresh.debounce_ms !== shown.debounce_ms ||
    fresh.motion_sync !== shown.motion_sync ||
    fresh.angle_snapping !== shown.angle_snapping ||
    fresh.ripple_control !== shown.ripple_control ||
    fresh.peak_performance !== shown.peak_performance ||
    fresh.peak_performance_time !== shown.peak_performance_time ||
    fresh.high_performance !== shown.high_performance
  ) {
    return false;
  }
  // Stage count must match (mouse reports only active stages).
  if (fresh.resolutions.length !== activeCount) return false;
  for (let i = 0; i < fresh.resolutions.length; i++) {
    const a = fresh.resolutions[i];
    const b = shown.resolutions[i];
    if (!b || a.x !== b.x || a.y !== b.y) return false;
    const ca = fresh.resolution_colors[i];
    const cb = shown.resolution_colors[i];
    if (!cb || ca.red !== cb.red || ca.green !== cb.green || ca.blue !== cb.blue)
      return false;
  }
  return true;
}
