import { useEffect, useState, useCallback, useRef } from "react";
import { api, type Profile, type DeviceInfo } from "@/lib/api";
import { MAX_STAGES, POLL } from "@/lib/constants";
import { batteryPercentFromMv } from "@/lib/battery";
import { DEFAULT_BUTTON_MAP } from "@/lib/button-actions";
import { sameProfile } from "@/lib/profile-utils";

// All device communication + profile editing lives here. The logic is moved
// verbatim from App.tsx — the self-scheduling poll loop, the state/ref mirrors
// that keep it stable, and every editing handler. App.tsx consumes the returned
// object and renders; it owns no device logic itself.
export function useDevice() {
  const [count, setCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [selected, setSelected] = useState(1);
  const [active, setActive] = useState(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  // How many DPI stages are active (1–5). The UI always shows all 5 banks;
  // inactive ones are greyed out and only the active ones are written to the
  // mouse. Stored separately so toggling never destroys the parked values.
  const [activeCount, setActiveCount] = useState(MAX_STAGES);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which DPI stages have X/Y locked together. Each stage is independent: a
  // stage's index is in the set when its X and Y move together (the default).
  // Stages 0..MAX_STAGES-1 all start locked.
  const [lockedStages, setLockedStages] = useState<Set<number>>(
    () => new Set(Array.from({ length: MAX_STAGES }, (_, i) => i)),
  );

  // Toggle the lock for a single stage, leaving the others untouched.
  const toggleDpiLock = (stageIndex: number) => {
    setLockedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageIndex)) next.delete(stageIndex);
      else next.add(stageIndex);
      return next;
    });
  };

  // While an HID write is in progress, status polling pauses so the device
  // accesses don't collide. A ref (not state) is used because the interval
  // would otherwise read a stale closure.
  const busyRef = useRef(false);
  // Last known device signature (product IDs). If it changes, the mouse was
  // (un)plugged -> only then fetch the expensive full info.
  const lastSigRef = useRef<string | null>(null);
  // Timestamp of the last battery query (battery changes slowly).
  const lastBatteryRef = useRef(0);
  // Recent battery voltage samples (mV), newest last, for smoothing.
  const mvSamplesRef = useRef<number[]>([]);
  // Current adaptive battery poll interval (ms) and the last raw voltage, used
  // to decide whether to speed up or slow down.
  const batteryIntervalRef = useRef(15_000);
  const lastMvRef = useRef<number | null>(null);
  // Smoothed battery state derived from the samples.
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  // Refs mirroring state, so the polling closure can read current values
  // without being re-created. Used to refresh the profile from the mouse when
  // it's changed externally (e.g. via the official app) — but only when the
  // user has no unsaved edits.
  const dirtyRef = useRef(false);
  const selectedRef = useRef(1);
  const profileRef = useRef<Profile | null>(null);
  const activeCountRef = useRef(MAX_STAGES);
  // Timestamp of the last external-profile-refresh check.
  const lastProfileCheckRef = useRef(0);

  // Keep the mirror refs in sync with state.
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    activeCountRef.current = activeCount;
  }, [activeCount]);

  // Smart polling:
  //  - periodically: only the cheap signature. No connect(), no battery.
  //  - only on change: expensive full info (model, USB, connection).
  //  - battery: separately, refreshed at most every 10s.
  //
  // Uses a self-scheduling timeout (not setInterval) so a new poll is only
  // scheduled AFTER the previous one finishes. This makes overlapping HID
  // accesses structurally impossible — important on Windows, where a blocking
  // HID read could otherwise let polls pile up and wedge the app.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      if (busyRef.current) {
        // A save/load is in progress — skip this round, try again later.
        schedule();
        return;
      }
      try {
        const sig = await api.deviceSignature();
        if (cancelled) return;

        const connectedNow = sig.length > 0;
        setConnected(connectedNow);

        if (!connectedNow) {
          setInfo(null);
          lastSigRef.current = "";
        } else {
          const now = Date.now();
          const changed = sig !== lastSigRef.current;
          const batteryStale =
            now - lastBatteryRef.current > batteryIntervalRef.current;

          // Only fetch full info if the device changed OR the battery value
          // is stale. Otherwise no expensive HID access at all.
          if (changed || batteryStale) {
            const i = await api.deviceInfo().catch(() => null);
            if (cancelled) return;
            if (i) {
              setInfo(i);
              lastSigRef.current = sig;
              lastBatteryRef.current = now;

              // --- Battery smoothing + charging detection ---
              if (typeof i.battery_mv === "number" && i.battery_mv > 0) {
                const mv = i.battery_mv;

                // Adapt the poll interval: if the voltage moved more than the
                // noise threshold since the last reading, switch to fast
                // polling; otherwise relax to slow. (On the very first reading
                // there's nothing to compare, so we stay slow.)
                if (lastMvRef.current !== null) {
                  const moved =
                    Math.abs(mv - lastMvRef.current) >= POLL.BATTERY_MOVE_MV;
                  batteryIntervalRef.current = moved
                    ? POLL.BATTERY_FAST_MS
                    : POLL.BATTERY_SLOW_MS;
                }
                lastMvRef.current = mv;

                const samples = mvSamplesRef.current;
                samples.push(mv);
                // Keep only the last 5 readings for the moving average.
                if (samples.length > 5) samples.shift();

                const avg =
                  samples.reduce((a, b) => a + b, 0) / samples.length;
                setBatteryPct(batteryPercentFromMv(avg));

                // Charging heuristic: wired AND voltage clearly rising across
                // the buffer. Requires a few samples so a single blip doesn't
                // trigger it. This is a guess (the hardware gives no real
                // charge flag), so we keep it conservative.
                const isWired = i.connection === "Wired";
                const rising =
                  samples.length >= 3 &&
                  samples[samples.length - 1] - samples[0] > 15;
                setCharging(isWired && rising);
              } else {
                // No battery (e.g. wired with no reading) — clear state.
                mvSamplesRef.current = [];
                lastMvRef.current = null;
                batteryIntervalRef.current = POLL.BATTERY_SLOW_MS;
                setBatteryPct(null);
                setCharging(false);
              }
            }
          }

          // --- Refresh the profile if it changed externally (e.g. the
          // official app). Throttled, and skipped while the user has unsaved
          // edits so their work is never overwritten. ---
          if (
            !dirtyRef.current &&
            now - lastProfileCheckRef.current > POLL.PROFILE_CHECK_MS
          ) {
            lastProfileCheckRef.current = now;
            const idx = selectedRef.current;
            const fresh = await api.getProfile(idx).catch(() => null);
            if (cancelled) return;
            // Only apply if still on the same profile, still not dirty, and the
            // data actually differs from what we show (avoids needless renders).
            if (
              fresh &&
              !dirtyRef.current &&
              selectedRef.current === idx &&
              !sameProfile(fresh, profileRef.current, activeCountRef.current)
            ) {
              const realCount = Math.min(
                Math.max(fresh.resolutions.length, 1),
                MAX_STAGES,
              );
              const resolutions = [...fresh.resolutions];
              const resolution_colors = [...fresh.resolution_colors];
              while (resolutions.length < MAX_STAGES) {
                const last = resolutions[resolutions.length - 1] ?? {
                  x: 800,
                  y: 800,
                };
                resolutions.push({ ...last });
                resolution_colors.push(
                  resolution_colors[resolution_colors.length - 1] ?? {
                    red: 255,
                    green: 255,
                    blue: 255,
                  },
                );
              }
              setActiveCount(realCount);
              setProfile({ ...fresh, resolutions, resolution_colors });
              setDirty(false);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setConnected(false);
          setInfo(null);
          lastSigRef.current = "";
        }
      } finally {
        schedule(); // only schedule the next poll after this one finished
      }
    };

    function schedule() {
      if (!cancelled) timer = setTimeout(tick, POLL.TICK_MS);
    }

    // Load profile count + active profile only once (doesn't change).
    (async () => {
      try {
        const [n, a] = await Promise.all([
          api.profileCount(),
          api.getActiveProfile().catch(() => 1),
        ]);
        if (cancelled) return;
        setCount(n);
        setActive(a);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();

    tick(); // start immediately; reschedules itself

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const loadProfile = useCallback(async (idx: number) => {
    busyRef.current = true;
    try {
      setError(null);
      const p = await api.getProfile(idx);

      // The mouse reports only the active stages. We always display 5 banks,
      // so remember how many were active and pad the rest with parked defaults
      // (greyed out in the UI, never written unless reactivated).
      const realCount = Math.min(
        Math.max(p.resolutions.length, 1),
        MAX_STAGES,
      );
      const resolutions = [...p.resolutions];
      const resolution_colors = [...p.resolution_colors];
      while (resolutions.length < MAX_STAGES) {
        const last = resolutions[resolutions.length - 1] ?? { x: 800, y: 800 };
        resolutions.push({ ...last });
        resolution_colors.push(
          resolution_colors[resolution_colors.length - 1] ?? {
            red: 255,
            green: 255,
            blue: 255,
          },
        );
      }

      setActiveCount(realCount);
      setProfile({ ...p, resolutions, resolution_colors });
      setDirty(false);
    } catch (e) {
      setError(String(e));
      setProfile(null);
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (count > 0) loadProfile(selected);
  }, [selected, count, loadProfile]);

  const patch = (changes: Partial<Profile>) => {
    setProfile((p) => (p ? { ...p, ...changes } : p));
    setDirty(true);
  };

  // Patch a value AND write to the mouse immediately. For discrete inputs
  // (dropdowns, toggles) where the change is a single committed action.
  const patchAndSave = (changes: Partial<Profile>) => {
    if (!profile) return;
    const next = { ...profile, ...changes };
    setProfile(next);
    void saveProfile(next);
  };

  // Commit the current (already-patched) profile to the mouse. For number
  // fields that patch locally while typing and save on blur/Enter.
  const commit = () => {
    if (profile && dirty) void saveProfile(profile);
  };

  // Assign an action to a button and write it to the mouse immediately.
  // The value is the exact JSON the mouse expects; on save it round-trips back
  // into lamzu's Action enum. Macros/combos are not assignable here.
  const setButtonAction = (buttonKey: string, value: unknown) => {
    if (!profile) return;
    const bm = { ...((profile.button_map ?? {}) as Record<string, unknown>) };
    bm[buttonKey] = value;
    const next = { ...profile, button_map: bm };
    setProfile(next);
    void saveProfile(next);
  };

  // Reset all button mappings to factory defaults and write immediately.
  const resetButtonMap = () => {
    if (!profile) return;
    const next = { ...profile, button_map: { ...DEFAULT_BUTTON_MAP } };
    setProfile(next);
    void saveProfile(next);
  };

  // Reset general settings (everything except the button map / DPI values) to
  // sensible factory defaults and write immediately. DPI stage values are left
  // untouched — those are the user's chosen sensitivities, not a "setting".
  const resetGeneralSettings = () => {
    if (!profile) return;
    const next: Profile = {
      ...profile,
      poll_rate: profile.poll_rate, // keep current; max varies by connection
      lift_off_distance: 1,
      debounce_ms: 0,
      motion_sync: true,
      angle_snapping: false,
      ripple_control: false,
      peak_performance: false,
      peak_performance_time: 30,
      high_performance: false,
    };
    setProfile(next);
    void saveProfile(next);
  };

  // Set a stage's X or Y resolution. When that stage's X/Y are locked together
  // (the default), both axes get the same value; when unlocked, only the edited
  // axis changes. Each stage's lock is independent.
  const setDpiAxis = (stageIndex: number, axis: "x" | "y", value: number) => {
    if (!profile) return;
    const locked = lockedStages.has(stageIndex);
    const resolutions = profile.resolutions.map((r, i) => {
      if (i !== stageIndex) return r;
      return locked ? { x: value, y: value } : { ...r, [axis]: value };
    });
    patch({ resolutions });
  };

  // Increase the number of active DPI stages (activates the next bank).
  const activateMore = () => {
    if (activeCount >= MAX_STAGES) return;
    const next = activeCount + 1;
    setActiveCount(next);
    if (profile) void saveProfile(profile, next);
  };

  // Decrease the number of active DPI stages (greys out the lowest active one).
  // Keeps the active-stage index within the still-active range.
  const activateLess = () => {
    if (activeCount <= 1) return;
    const next = activeCount - 1;
    setActiveCount(next);
    if (profile && profile.current_resolution_index > next - 1) {
      const p = { ...profile, current_resolution_index: next - 1 };
      setProfile(p);
      void saveProfile(p, next);
    } else if (profile) {
      void saveProfile(profile, next);
    }
  };

  // Mark a stage as the active DPI stage and save immediately.
  const setCurrentStage = (stageIndex: number) => {
    if (stageIndex >= activeCount) return;
    patchAndSave({ current_resolution_index: stageIndex });
  };

  // Write a specific profile to the mouse. Callers that just changed state
  // (e.g. immediate button-map save) pass the updated profile explicitly to
  // avoid the stale-closure problem.
  const saveProfile = async (p: Profile, count = activeCount) => {
    busyRef.current = true;
    setError(null);
    try {
      const toSave: Profile = {
        ...p,
        resolutions: p.resolutions.slice(0, count),
        resolution_colors: p.resolution_colors.slice(0, count),
        current_resolution_index: Math.min(
          p.current_resolution_index,
          count - 1,
        ),
      };
      await api.setProfile(selected, toSave);
      setDirty(false);
    } catch (e) {
      setError(String(e));
    } finally {
      busyRef.current = false;
    }
  };

  const makeActive = async (idx: number) => {
    busyRef.current = true;
    try {
      await api.setActiveProfile(idx);
      setActive(idx);
    } catch (e) {
      setError(String(e));
    } finally {
      busyRef.current = false;
    }
  };

  // Prefer the smoothed percentage; fall back to the raw reading until the
  // first sample has been processed.
  const battery = batteryPct ?? info?.battery_percent ?? null;

  return {
    // state
    count,
    connected,
    info,
    selected,
    setSelected,
    active,
    profile,
    activeCount,
    error,
    charging,
    battery,
    lockedStages,
    toggleDpiLock,
    // handlers
    patchAndSave,
    commit,
    setButtonAction,
    resetButtonMap,
    resetGeneralSettings,
    setDpiAxis,
    activateMore,
    activateLess,
    setCurrentStage,
    makeActive,
  };
}
