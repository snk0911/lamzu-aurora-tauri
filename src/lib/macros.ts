// Macro data model — mirrors lamzu's serde shape exactly so the JSON
// round-trips straight back into HashMap<String, Macro> on the Rust side.
//
//   Macro      = { mode: MacroMode, events: MacroEvent[] }
//   MacroEvent = { key_event: { key: KeyMappingId, state: "Pressed"|"Released" }, delay_ms: number }
//   MacroMode  = "Toggle" | "Hold" | "UntilPress" | { Repeat: number }
//
// `key` is a W3C key code (e.g. "KeyA", "ShiftLeft", "ArrowDown"), which is
// exactly what the browser's KeyboardEvent.code reports — so recording can pass
// the captured code straight through, and the keycode crate accepts it.

export type KeyState = "Pressed" | "Released";

export type KeyEvent = {
  key: string;
  state: KeyState;
};

export type MacroEvent = {
  key_event: KeyEvent;
  delay_ms: number;
};

export type MacroMode = "Toggle" | "Hold" | "UntilPress" | { Repeat: number };

export type Macro = {
  mode: MacroMode;
  events: MacroEvent[];
};

// The hardware limits (from lamzu-cfg): name length and event count.
export const MAX_MACRO_NAME_LEN = 30;
export const MAX_MACRO_EVENTS = 69; // lamzu asserts 1..MAX_MACRO_EVENTS (70)

// W3C key codes the keycode crate (and thus the mouse) understands. We only
// allow recording/selecting these so a captured code can never fail to
// deserialize on the Rust side. This list covers the standard keyboard.
export const SUPPORTED_KEYS: { code: string; label: string }[] = [
  // Letters
  ...Array.from({ length: 26 }, (_, i) => {
    const L = String.fromCharCode(65 + i);
    return { code: `Key${L}`, label: L };
  }),
  // Digits
  ...Array.from({ length: 10 }, (_, i) => ({
    code: `Digit${i}`,
    label: String(i),
  })),
  // Function keys
  ...Array.from({ length: 12 }, (_, i) => ({
    code: `F${i + 1}`,
    label: `F${i + 1}`,
  })),
  // Modifiers
  { code: "ControlLeft", label: "Left Ctrl" },
  { code: "ControlRight", label: "Right Ctrl" },
  { code: "ShiftLeft", label: "Left Shift" },
  { code: "ShiftRight", label: "Right Shift" },
  { code: "AltLeft", label: "Left Alt" },
  { code: "AltRight", label: "Right Alt" },
  { code: "MetaLeft", label: "Left Meta" },
  { code: "MetaRight", label: "Right Meta" },
  // Navigation / editing
  { code: "Enter", label: "Enter" },
  { code: "Escape", label: "Esc" },
  { code: "Backspace", label: "Backspace" },
  { code: "Tab", label: "Tab" },
  { code: "Space", label: "Space" },
  { code: "CapsLock", label: "Caps Lock" },
  { code: "ArrowUp", label: "↑" },
  { code: "ArrowDown", label: "↓" },
  { code: "ArrowLeft", label: "←" },
  { code: "ArrowRight", label: "→" },
  { code: "Home", label: "Home" },
  { code: "End", label: "End" },
  { code: "PageUp", label: "Page Up" },
  { code: "PageDown", label: "Page Down" },
  { code: "Insert", label: "Insert" },
  { code: "Delete", label: "Delete" },
  // Punctuation
  { code: "Minus", label: "-" },
  { code: "Equal", label: "=" },
  { code: "BracketLeft", label: "[" },
  { code: "BracketRight", label: "]" },
  { code: "Backslash", label: "\\" },
  { code: "Semicolon", label: ";" },
  { code: "Quote", label: "'" },
  { code: "Comma", label: "," },
  { code: "Period", label: "." },
  { code: "Slash", label: "/" },
  { code: "Backquote", label: "`" },
];

const KEY_LABELS: Record<string, string> = Object.fromEntries(
  SUPPORTED_KEYS.map((k) => [k.code, k.label]),
);

// Whether a captured key code is one we support writing to the mouse.
export function isSupportedKey(code: string): boolean {
  return code in KEY_LABELS;
}

// Friendly label for a key code (falls back to the raw code).
export function keyLabel(code: string): string {
  return KEY_LABELS[code] ?? code;
}

// Human-readable description of a macro's repeat mode.
export function describeMode(mode: MacroMode): string {
  if (mode === "Toggle") return "Toggle (until pressed again)";
  if (mode === "Hold") return "While held";
  if (mode === "UntilPress") return "Until any key";
  if (typeof mode === "object" && "Repeat" in mode) {
    return `Repeat ${mode.Repeat}×`;
  }
  return "Unknown";
}

// Short summary of a macro's events, e.g. "Ctrl ↓ · C ↓ · C ↑ · Ctrl ↑".
export function summarizeEvents(events: MacroEvent[]): string {
  if (events.length === 0) return "No steps";
  return events
    .map(
      (e) =>
        `${keyLabel(e.key_event.key)} ${e.key_event.state === "Pressed" ? "↓" : "↑"}`,
    )
    .join(" · ");
}
