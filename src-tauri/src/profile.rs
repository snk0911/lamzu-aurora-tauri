//! Profile data model for the frontend + conversion to/from lamzu::Profile.
//!
//! lamzu's Profile type uses `Option<T>` everywhere (for partial writes) and
//! rich types for button_map/macros. The frontend, in contrast, wants a flat
//! object with concrete values. This file holds the frontend model and
//! translates in both directions.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resolution {
    pub x: u16,
    pub y: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Color {
    pub red: u8,
    pub green: u8,
    pub blue: u8,
}

/// Static info about the connected mouse (for display).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    /// Display name of the model, e.g. "Lamzu Atlantis Wireless (4K)".
    pub model: String,
    /// "Wired" or "Wireless".
    pub connection: String,
    /// Maximum polling rate of the model in Hz.
    pub max_poll_rate: u16,
    /// Battery level in percent (None when wired / not readable).
    pub battery_percent: Option<u8>,
    /// Battery voltage in millivolts (None when not readable).
    pub battery_mv: Option<u16>,
    /// USB product ID as a hex string, e.g. "f510".
    pub product_id: String,
    /// Serial number, if reported by the device.
    pub serial: Option<String>,
    /// Whether this is a recognized/verified model. False for a Lamzu device
    /// that passed the protocol check (REPORT_ID 8) but has an unknown product
    /// ID — configuration is allowed but experimental.
    pub is_known: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub poll_rate: u16,
    pub current_resolution_index: usize,
    pub lift_off_distance: u8,
    pub debounce_ms: u8,
    pub motion_sync: bool,
    pub angle_snapping: bool,
    pub ripple_control: bool,
    pub peak_performance: bool,
    pub peak_performance_time: u16,
    pub high_performance: bool,
    pub resolutions: Vec<Resolution>,
    pub resolution_colors: Vec<Color>,
    // button_map and macros stay as opaque JSON: the frontend displays them
    // or passes them through unchanged. Rebuilding lamzu's rich enums here
    // would be a lot of code for little benefit as long as the UI doesn't edit
    // them.
    #[serde(default)]
    pub button_map: serde_json::Value,
    #[serde(default)]
    pub macros: serde_json::Value,
}

impl Profile {
    /// Sample profile for development without hardware.
    /// Only used in the mock build (--no-default-features); unused in the
    /// real-device build, hence the allow.
    #[cfg_attr(feature = "real-device", allow(dead_code))]
    pub fn mock() -> Self {
        Profile {
            poll_rate: 1000,
            current_resolution_index: 2,
            lift_off_distance: 1,
            debounce_ms: 8,
            motion_sync: true,
            angle_snapping: false,
            ripple_control: false,
            peak_performance: true,
            peak_performance_time: 30,
            high_performance: false,
            resolutions: vec![
                Resolution { x: 400, y: 400 },
                Resolution { x: 800, y: 800 },
                Resolution { x: 1600, y: 1600 },
                Resolution { x: 3200, y: 3200 },
                Resolution { x: 6400, y: 6400 },
            ],
            resolution_colors: vec![
                Color { red: 255, green: 0, blue: 0 },
                Color { red: 0, green: 255, blue: 255 },
                Color { red: 0, green: 255, blue: 0 },
                Color { red: 255, green: 255, blue: 255 },
                Color { red: 255, green: 255, blue: 0 },
            ],
            button_map: serde_json::json!({}),
            macros: serde_json::json!({}),
        }
    }
}

// ---------------------------------------------------------------------------
// Conversion lamzu::Profile  ->  our frontend Profile
// ---------------------------------------------------------------------------
#[cfg(feature = "real-device")]
mod convert {
    use super::*;
    use lamzu::profile::{
        Color as LColor, Profile as LProfile, Resolution as LResolution,
    };

    impl From<&LProfile> for Profile {
        fn from(p: &LProfile) -> Self {
            Profile {
                // lamzu uses Option<T>; fill with defaults for the UI when a
                // field wasn't set on the mouse.
                poll_rate: p.poll_rate.unwrap_or(0),
                current_resolution_index: p.current_resolution_index.unwrap_or(0),
                lift_off_distance: p.lift_off_distance.unwrap_or(0),
                debounce_ms: p.debounce_ms.unwrap_or(0),
                motion_sync: p.motion_sync.unwrap_or(false),
                angle_snapping: p.angle_snapping.unwrap_or(false),
                ripple_control: p.ripple_control.unwrap_or(false),
                peak_performance: p.peak_performance.unwrap_or(false),
                peak_performance_time: p.peak_performance_time.unwrap_or(0),
                high_performance: p.high_performance.unwrap_or(false),
                resolutions: p
                    .resolutions
                    .iter()
                    .map(|r| Resolution { x: r.x, y: r.y })
                    .collect(),
                resolution_colors: p
                    .resolution_colors
                    .iter()
                    .map(|c| Color {
                        red: c.red,
                        green: c.green,
                        blue: c.blue,
                    })
                    .collect(),
                // button_map/macros: serialize as JSON so the frontend can
                // display them. (serde_json can use lamzu's Serialize.)
                button_map: serde_json::to_value(&p.button_map)
                    .unwrap_or(serde_json::json!({})),
                macros: serde_json::to_value(&p.macros)
                    .unwrap_or(serde_json::json!({})),
            }
        }
    }

    impl Profile {
        /// Converts the frontend profile back into a lamzu::Profile for the
        /// write. All fields are set as Some(..) -> full write.
        ///
        /// The button map is deserialized from `self.button_map` (the same JSON
        /// shape lamzu produces on read) straight back into
        /// HashMap<Button, Action> via serde. lamzu then handles the raw byte
        /// encoding + checksums itself, so we don't touch bytes here.
        ///
        /// Macros are intentionally NOT written (left empty): button-click
        /// editing is supported, macro editing is not yet. If the map contains
        /// a Macro/Combo action it's dropped during conversion (see below) so we
        /// never reference an undefined macro.
        pub fn to_lamzu(&self) -> LProfile {
            use lamzu::profile::{Action, Button};
            use std::collections::HashMap;

            // Deserialize the frontend button map back into lamzu's types.
            // Defensive: on any parse failure, fall back to an empty map rather
            // than writing something malformed to the mouse.
            let mut button_map: HashMap<Button, Action> =
                serde_json::from_value(self.button_map.clone())
                    .unwrap_or_default();

            // Macro editing isn't supported yet. Drop any Macro/Combo actions so
            // we never write a button pointing at a macro we didn't define
            // (which lamzu would reject). Plain clicks/DPI/etc. are kept.
            button_map.retain(|_, action| {
                !matches!(action, Action::Macro { .. } | Action::Combo { .. })
            });

            LProfile {
                poll_rate: Some(self.poll_rate),
                current_resolution_index: Some(self.current_resolution_index),
                lift_off_distance: Some(self.lift_off_distance),
                debounce_ms: Some(self.debounce_ms),
                motion_sync: Some(self.motion_sync),
                angle_snapping: Some(self.angle_snapping),
                ripple_control: Some(self.ripple_control),
                peak_performance: Some(self.peak_performance),
                peak_performance_time: Some(self.peak_performance_time),
                high_performance: Some(self.high_performance),
                resolutions: self
                    .resolutions
                    .iter()
                    .map(|r| LResolution { x: r.x, y: r.y })
                    .collect(),
                resolution_colors: self
                    .resolution_colors
                    .iter()
                    .map(|c| LColor {
                        red: c.red,
                        green: c.green,
                        blue: c.blue,
                    })
                    .collect(),
                button_map,
                // Macros not edited here — leave empty.
                macros: Default::default(),
            }
        }
    }
}
