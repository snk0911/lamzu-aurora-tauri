// LiPo voltage (mV) -> percent. MUST match the curve in src-tauri device.rs.
// We smooth the voltage on the frontend and recompute the percent from it, so
// the displayed number stays steady instead of jittering with each reading.
// Calibrated against Aurora + the user's cell: >= 4150 mV = 100% (full, drift-
// safe), 3833 mV -> 45% (mid anchor).
export const BATTERY_CURVE: [number, number][] = [
  [4150, 100],
  [4100, 93],
  [4000, 80],
  [3950, 72],
  [3900, 60],
  [3850, 51],
  [3833, 45],
  [3800, 40],
  [3780, 36],
  [3750, 30],
  [3700, 22],
  [3650, 15],
  [3600, 10],
  [3500, 5],
  [3400, 2],
  [3300, 0],
];

export function batteryPercentFromMv(mv: number): number {
  if (mv >= BATTERY_CURVE[0][0]) return 100;
  if (mv <= BATTERY_CURVE[BATTERY_CURVE.length - 1][0]) return 0;
  for (let i = 0; i < BATTERY_CURVE.length - 1; i++) {
    const [hiMv, hiPct] = BATTERY_CURVE[i];
    const [loMv, loPct] = BATTERY_CURVE[i + 1];
    if (mv <= hiMv && mv >= loMv) {
      const frac = (mv - loMv) / (hiMv - loMv);
      return Math.round(loPct + frac * (hiPct - loPct));
    }
  }
  return 0;
}
