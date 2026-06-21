//! Device abstraction — now uses the real lamzu-cfg library.
//!
//! `real`  : real lamzu (feature "real-device", default)
//! `mock`  : in-memory simulation for UI development without a mouse
//!
//! The hard protocol work lives entirely in the lamzu crate. Here we only
//! connect its `Mouse` trait with our frontend Profile.

use crate::profile::Profile;

/// lamzu::Atlantis has NUM_PROFILES = 4 (see atlantis.rs). We mirror that.
pub const PROFILE_COUNT: u8 = 4;

// ===========================================================================
// REAL DEVICE (lamzu-cfg)
// ===========================================================================
#[cfg(feature = "real-device")]
mod real {
    use super::*;
    use lamzu::{Atlantis, Mouse};
    use std::sync::Mutex;

    // Global serialization lock for ALL HID access.
    //
    // The commands now run on a background thread pool (#[tauri::command(async)]),
    // so two of them (e.g. the periodic poll and a "save") could otherwise talk
    // to the same physical mouse concurrently — which HID devices don't tolerate
    // and which can fail or hang on Windows. This mutex guarantees one HID
    // operation at a time.
    //
    // The guarded data is just (): we use the mutex purely to serialize, not to
    // protect shared state (there is no persistent connection — every call
    // re-opens the device).
    //
    // IMPORTANT: std::sync::Mutex is NOT reentrant. The lock is therefore taken
    // ONLY at the public entry points below. The private `connect()` helper must
    // NOT lock, because it is always called from a function that already holds
    // the lock — locking again would deadlock.
    static HID_LOCK: Mutex<()> = Mutex::new(());

    /// Runs `f` while holding the global HID lock. If the lock was poisoned by a
    /// panic in a previous operation, we recover the guard rather than
    /// propagating the panic, so one bad call can't permanently wedge the app.
    fn with_lock<T>(f: impl FnOnce() -> T) -> T {
        let _guard = HID_LOCK.lock().unwrap_or_else(|p| p.into_inner());
        f()
    }

    /// Convert a single-cell LiPo voltage (in millivolts) to a percentage using
    /// a realistic discharge curve.
    ///
    /// A LiPo cell does NOT discharge linearly: it drops quickly from 4.2V,
    /// then sits flat around 3.7-3.8V for most of its usable charge, then falls
    /// off steeply near empty. A straight line (as lamzu-cfg uses) reads far too
    /// high in the middle. The anchor points below approximate a typical
    /// discharge curve; we linearly interpolate between them.
    ///
    /// These are grossly calibrated. If exact agreement with the official app
    /// is needed, adjust the anchor points to measured (mV, %) pairs.
    fn battery_percent_from_mv(mv: u16) -> u8 {
        // (millivolts, percent), ordered from full to empty.
        // Calibrated against the official Aurora app and the user's own cell:
        //  - Full (resting, just off charger) measures ~4150-4172 mV, so we treat
        //    >= 4150 mV as 100% (Aurora shows 100% there too). This also absorbs
        //    the normal post-charge voltage drift instead of dipping to 97%.
        //  - Mid anchor: 3833 mV -> 45% (matches Aurora).
        const CURVE: &[(u16, u8)] = &[
            (4150, 100),
            (4100, 93),
            (4000, 80),
            (3950, 72),
            (3900, 60),
            (3850, 51),
            (3833, 45),
            (3800, 40),
            (3780, 36),
            (3750, 30),
            (3700, 22),
            (3650, 15),
            (3600, 10),
            (3500, 5),
            (3400, 2),
            (3300, 0),
        ];

        if mv >= CURVE[0].0 {
            return 100;
        }
        if mv <= CURVE[CURVE.len() - 1].0 {
            return 0;
        }
        // Find the segment [hi, lo] that brackets mv and interpolate.
        for pair in CURVE.windows(2) {
            let (hi_mv, hi_pct) = pair[0];
            let (lo_mv, lo_pct) = pair[1];
            if mv <= hi_mv && mv >= lo_mv {
                let span = (hi_mv - lo_mv) as f32;
                let frac = (mv - lo_mv) as f32 / span;
                let pct = lo_pct as f32 + frac * (hi_pct - lo_pct) as f32;
                return pct.round() as u8;
            }
        }
        0
    }

    /// Connects to the first compatible mouse.
    ///
    /// lamzu::devices() lists (HidDevice, Product) by connection priority.
    /// Atlantis::connect checks compatibility via the report descriptor.
    ///
    /// NOTE: does NOT take HID_LOCK — callers already hold it (see above).
    fn connect() -> Result<Atlantis, String> {
        let devices = lamzu::devices().map_err(|e| format!("HID error: {e}"))?;
        let (device, _product) = devices
            .into_iter()
            .next()
            .ok_or_else(|| "No compatible Lamzu mouse found.".to_string())?;
        Atlantis::connect(device).map_err(|e| format!("Connection failed: {e}"))
    }

    pub fn is_connected() -> bool {
        with_lock(|| {
            // devices() is cheaper than a full connect(); for a status indicator
            // "is there any device at all?" is enough.
            lamzu::devices().map(|d| !d.is_empty()).unwrap_or(false)
        })
    }

    /// Cheap "did anything change?" check for the frontend polling.
    /// Only lists the devices (no connect(), no battery HID transfer) and
    /// returns a signature built from the product IDs. If it changes, the
    /// mouse was (un)plugged -> the frontend then fetches the full info.
    /// Empty string = no device.
    pub fn device_signature() -> String {
        with_lock(|| match lamzu::devices() {
            Ok(devices) => {
                let mut ids: Vec<String> = devices
                    .iter()
                    .filter_map(|(d, _)| {
                        d.get_device_info()
                            .ok()
                            .map(|i| format!("{:04x}", i.product_id()))
                    })
                    .collect();
                ids.sort();
                ids.join(",")
            }
            Err(_) => String::new(),
        })
    }

    pub fn device_info() -> Result<crate::profile::DeviceInfo, String> {
        use lamzu::Product;

        with_lock(|| {
            // Get the (HidDevice, Product) pair first, BEFORE we connect:
            // model name, max poll rate and USB details come from it.
            let devices =
                lamzu::devices().map_err(|e| format!("HID error: {e}"))?;
            let (device, product) = devices
                .into_iter()
                .next()
                .ok_or_else(|| "No compatible Lamzu mouse found.".to_string())?;

            let is_known = product != Product::Unknown;
            // Display name. We map this ourselves instead of using lamzu's
            // Display impl, so we control the labels.
            //
            // NOTE: the Atlantis Wireless 1K and the Thorn 1K report the SAME
            // USB product ID (3554:F50D) and share the same protocol, so they
            // are indistinguishable here — the label names both honestly.
            let model = match product {
                Product::AtlantisWired => "Lamzu Atlantis (Wired)".to_string(),
                Product::AtlantisWireless1K => {
                    "Lamzu Atlantis 1K / Thorn 1K".to_string()
                }
                Product::AtlantisWireless4K => {
                    "Lamzu Atlantis Wireless (4K)".to_string()
                }
                Product::Unknown => "Unknown Lamzu device".to_string(),
            };
            let max_poll_rate = product.max_poll_rate();
            let connection = match product {
                Product::AtlantisWired => "Wired",
                Product::AtlantisWireless1K | Product::AtlantisWireless4K => {
                    "Wireless"
                }
                Product::Unknown => "Unknown",
            }
            .to_string();

            // USB details from hidapi.
            let info = device
                .get_device_info()
                .map_err(|e| format!("Read device info: {e}"))?;
            let product_id = format!("{:04x}", info.product_id());
            let serial = info.serial_number().map(|s| s.to_string());

            // Battery only makes sense for wireless. Atlantis::connect consumes
            // the device, so do it afterwards. battery_voltage may fail
            // (e.g. wired) — then None instead of an error.
            //
            // We read the raw voltage and compute the percentage ourselves via
            // a realistic LiPo discharge curve. lamzu's own battery_percentage()
            // uses a LINEAR voltage->percent mapping, which massively
            // overestimates in the mid/low range (a LiPo cell sits flat around
            // 3.7-3.8V for most of its charge), so it disagreed with the
            // official app. The curve below is much closer to reality.
            let battery_mv = match Atlantis::connect(device) {
                Ok(mouse) => mouse.battery_voltage().ok(),
                Err(_) => None,
            };
            let battery_percent = battery_mv.map(battery_percent_from_mv);

            Ok(crate::profile::DeviceInfo {
                model,
                connection,
                max_poll_rate,
                battery_percent,
                battery_mv,
                product_id,
                serial,
                is_known,
            })
        })
    }

    pub fn read_profile(index: u8) -> Result<Profile, String> {
        with_lock(|| {
            let mouse = connect()?;
            // lamzu indexes profiles from 0, our frontend from 1.
            let lprofile = mouse
                .profile((index.saturating_sub(1)) as usize)
                .map_err(|e| format!("Read profile: {e}"))?;
            Ok(Profile::from(&lprofile))
        })
    }

    pub fn write_profile(index: u8, profile: &Profile) -> Result<(), String> {
        with_lock(|| {
            let mouse = connect()?;
            // to_lamzu now returns Result: a macro/button-map that doesn't
            // match lamzu's expected shape surfaces here instead of silently
            // writing empty data (which caused macros to vanish on restart).
            let lprofile = profile.to_lamzu()?;
            mouse
                .set_profile((index.saturating_sub(1)) as usize, &lprofile)
                .map_err(|e| format!("Write profile: {e}"))
        })
    }

    pub fn active_profile() -> Result<u8, String> {
        with_lock(|| {
            let mouse = connect()?;
            let idx = mouse
                .active_profile()
                .map_err(|e| format!("Read active profile: {e}"))?;
            // 0-indexed -> 1-indexed
            Ok((idx as u8).saturating_add(1))
        })
    }

    pub fn set_active(index: u8) -> Result<(), String> {
        with_lock(|| {
            let mouse = connect()?;
            mouse
                .set_active_profile((index.saturating_sub(1)) as usize)
                .map_err(|e| format!("Set active profile: {e}"))
        })
    }

    /// Bonus: battery level as a percentage. Uses our LiPo curve (via the raw
    /// voltage), not lamzu's linear mapping, to stay consistent with device_info.
    #[allow(dead_code)]
    pub fn battery_percentage() -> Result<u8, String> {
        with_lock(|| {
            let mouse = connect()?;
            let mv = mouse
                .battery_voltage()
                .map_err(|e| format!("Read battery level: {e}"))?;
            Ok(battery_percent_from_mv(mv))
        })
    }
}

// ===========================================================================
// MOCK (no hardware)
// ===========================================================================
#[cfg(not(feature = "real-device"))]
mod mock {
    use super::*;
    use std::sync::Mutex;

    static STATE: Mutex<Option<Vec<Profile>>> = Mutex::new(None);
    static ACTIVE: Mutex<u8> = Mutex::new(1);

    fn ensure_init(g: &mut Option<Vec<Profile>>) {
        if g.is_none() {
            *g = Some((0..PROFILE_COUNT).map(|_| Profile::mock()).collect());
        }
    }

    pub fn read_profile(index: u8) -> Result<Profile, String> {
        let mut g = STATE.lock().unwrap();
        ensure_init(&mut g);
        g.as_ref()
            .unwrap()
            .get(index.saturating_sub(1) as usize)
            .cloned()
            .ok_or_else(|| format!("Invalid profile index: {index}"))
    }

    pub fn write_profile(index: u8, profile: &Profile) -> Result<(), String> {
        let mut g = STATE.lock().unwrap();
        ensure_init(&mut g);
        let slot = g
            .as_mut()
            .unwrap()
            .get_mut(index.saturating_sub(1) as usize)
            .ok_or_else(|| format!("Invalid profile index: {index}"))?;
        *slot = profile.clone();
        Ok(())
    }

    pub fn active_profile() -> Result<u8, String> {
        Ok(*ACTIVE.lock().unwrap())
    }

    pub fn set_active(index: u8) -> Result<(), String> {
        if index < 1 || index > PROFILE_COUNT {
            return Err(format!("Invalid profile index: {index}"));
        }
        *ACTIVE.lock().unwrap() = index;
        Ok(())
    }

    pub fn is_connected() -> bool {
        true
    }

    pub fn device_signature() -> String {
        "f510".to_string()
    }

    pub fn device_info() -> Result<crate::profile::DeviceInfo, String> {
        Ok(crate::profile::DeviceInfo {
            model: "Lamzu Atlantis 1K / Thorn 1K [Mock]".to_string(),
            connection: "Wireless".to_string(),
            max_poll_rate: 4000,
            battery_percent: Some(82),
            battery_mv: Some(4050),
            product_id: "f510".to_string(),
            serial: Some("MOCK-0001".to_string()),
            is_known: true,
        })
    }
}

#[cfg(feature = "real-device")]
pub use real::*;
#[cfg(not(feature = "real-device"))]
pub use mock::*;
