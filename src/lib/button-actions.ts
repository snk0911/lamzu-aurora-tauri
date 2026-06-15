// The 6 physical buttons, in display order, with friendly labels.
export const MOUSE_BUTTONS: [string, string][] = [
  ["Left", "Left Click"],
  ["Right", "Right Click"],
  ["Middle", "Middle (Wheel)"],
  ["Forward", "Forward"],
  ["Back", "Back"],
  ["Bottom", "Bottom"],
];

// Actions a button can be remapped to (button-clicks/simple actions only — no
// macros or key combos yet). `value` is the exact JSON the mouse expects, which
// round-trips straight back into lamzu's Action enum on save. Data-carrying
// actions (DPI Lock) are handled separately in the UI.
export const ASSIGNABLE_ACTIONS: { label: string; value: unknown }[] = [
  { label: "Left Click", value: "LeftClick" },
  { label: "Right Click", value: "RightClick" },
  { label: "Middle Click", value: "MiddleClick" },
  { label: "Back", value: "BackClick" },
  { label: "Forward", value: "ForwardClick" },
  { label: "DPI Loop", value: "ResolutionLoop" },
  { label: "DPI +", value: "ResolutionUp" },
  { label: "DPI −", value: "ResolutionDown" },
  { label: "Poll Rate Loop", value: "PollRateLoop" },
  { label: "Wheel Left", value: "WheelLeft" },
  { label: "Wheel Right", value: "WheelRight" },
  { label: "Wheel Up", value: "WheelUp" },
  { label: "Wheel Down", value: "WheelDown" },
  { label: "Disabled", value: "Disabled" },
];

// Serialize an assignable action value to a stable string for the <Select>.
export function actionValueKey(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

// Factory-default button mapping: each button does its natural action.
export const DEFAULT_BUTTON_MAP: Record<string, unknown> = {
  Left: "LeftClick",
  Right: "RightClick",
  Middle: "MiddleClick",
  Forward: "ForwardClick",
  Back: "BackClick",
  Bottom: "ResolutionLoop",
};

// Turn a lamzu Action (string or tagged object) into readable text.
// The mouse reports these as JSON, e.g. "LeftClick" or
// { "ResolutionLock": { "resolution": 800 } }.
export function formatAction(action: unknown): string {
  if (action == null) return "—";
  if (typeof action === "string") {
    const map: Record<string, string> = {
      Disabled: "Disabled",
      LeftClick: "Left Click",
      RightClick: "Right Click",
      MiddleClick: "Middle Click",
      BackClick: "Back",
      ForwardClick: "Forward",
      ResolutionLoop: "DPI Loop",
      ResolutionUp: "DPI +",
      ResolutionDown: "DPI −",
      PollRateLoop: "Poll Rate Loop",
      WheelLeft: "Wheel Left",
      WheelRight: "Wheel Right",
      WheelUp: "Wheel Up",
      WheelDown: "Wheel Down",
    };
    return map[action] ?? action;
  }
  if (typeof action === "object") {
    const obj = action as Record<string, unknown>;
    const key = Object.keys(obj)[0];
    const val = obj[key] as Record<string, unknown>;
    switch (key) {
      case "ResolutionLock":
        return `DPI Lock (${val?.resolution ?? "?"})`;
      case "Fire":
        return `Rapid Fire (×${val?.repeat ?? "?"})`;
      case "Combo":
        return "Key Combo";
      case "Macro":
        return `Macro: ${val?.name ?? "?"}`;
      default:
        return key ?? "Unknown";
    }
  }
  return "Unknown";
}
