import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, Square, Trash2, X } from "lucide-react";
import type { Macro, MacroEvent, MacroMode } from "@/lib/macros";
import {
  MAX_MACRO_EVENTS,
  isSupportedKey,
  keyLabel,
} from "@/lib/macros";

// Inline panel for recording / editing the macro on a single mouse button.
// A macro lives in the button's slot on the mouse, so it's always edited in the
// context of its button — there are no free-floating macros.
export function MacroRecorder({
  buttonLabel,
  existing,
  verify,
  onSave,
  onDelete,
  onClose,
}: {
  buttonLabel: string;
  existing: Macro | null;
  verify: null | "checking" | "ok" | "missing";
  onSave: (macro: Macro) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<MacroEvent[]>(existing?.events ?? []);
  const [mode, setMode] = useState<MacroMode>(existing?.mode ?? { Repeat: 1 });
  const [recording, setRecording] = useState(false);
  const [lastUnsupported, setLastUnsupported] = useState<string | null>(null);
  // How delays between captured steps are determined:
  //  - "record": measure the real time between key events (default)
  //  - "none":   every step has 0 ms delay (fastest possible)
  //  - "fixed":  every step gets the same `fixedDelay` value
  const [delayMode, setDelayMode] = useState<"record" | "none" | "fixed">(
    "record",
  );
  const [fixedDelay, setFixedDelay] = useState(50);

  const lastTsRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);
  // Mirror delay settings so the once-registered capture handler reads them live.
  const delayModeRef = useRef(delayMode);
  const fixedDelayRef = useRef(fixedDelay);
  useEffect(() => {
    delayModeRef.current = delayMode;
  }, [delayMode]);
  useEffect(() => {
    fixedDelayRef.current = fixedDelay;
  }, [fixedDelay]);

  // Register key capture once; read live state via refs so no event is lost.
  useEffect(() => {
    const handle = (e: KeyboardEvent, state: "Pressed" | "Released") => {
      if (!recordingRef.current) return;
      const code = e.code || e.key;
      if (!code) return;
      e.preventDefault();
      e.stopPropagation();
      if (!isSupportedKey(code)) {
        setLastUnsupported(code);
        return;
      }
      setLastUnsupported(null);
      // Determine this step's delay from the active mode.
      const now = performance.now();
      let delay: number;
      if (delayModeRef.current === "none") {
        delay = 0;
      } else if (delayModeRef.current === "fixed") {
        delay = Math.min(65535, Math.max(0, fixedDelayRef.current));
      } else {
        delay =
          lastTsRef.current === null
            ? 0
            : Math.min(65535, Math.round(now - lastTsRef.current));
      }
      lastTsRef.current = now;
      setEvents((prev) => {
        if (prev.length >= MAX_MACRO_EVENTS) return prev;
        return [...prev, { key_event: { key: code, state }, delay_ms: delay }];
      });
    };
    const down = (e: KeyboardEvent) => handle(e, "Pressed");
    const up = (e: KeyboardEvent) => handle(e, "Released");
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, []);

  const startRecording = () => {
    lastTsRef.current = null;
    setLastUnsupported(null);
    setRecording(true);
  };

  const repeatCount =
    typeof mode === "object" && "Repeat" in mode ? mode.Repeat : 1;
  const canSave = events.length > 0 && !recording;

  return (
    <div className="absolute left-1/2 top-1/2 z-30 w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">
          Macro for <span className="text-primary">{buttonLabel}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Repeat mode */}
      <div className="mb-3 flex items-center gap-3">
        <label className="w-14 shrink-0 text-xs text-muted-foreground">
          Repeat
        </label>
        <Select
          value={typeof mode === "object" ? "Repeat" : mode}
          onValueChange={(v) => {
            if (v === "Repeat") setMode({ Repeat: repeatCount });
            else setMode(v as MacroMode);
          }}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Repeat">Repeat N times</SelectItem>
            <SelectItem value="Toggle">Toggle</SelectItem>
            <SelectItem value="Hold">While held</SelectItem>
            <SelectItem value="UntilPress">Until any key</SelectItem>
          </SelectContent>
        </Select>
        {typeof mode === "object" && "Repeat" in mode && (
          <Input
            type="number"
            min={1}
            max={255}
            value={repeatCount}
            onChange={(e) =>
              setMode({
                Repeat: Math.max(1, Math.min(255, Number(e.target.value) || 1)),
              })
            }
            className="tabular h-8 w-16 text-right"
          />
        )}
      </div>

      {/* Delay mode: how the gap between steps is set while recording */}
      <div className="mb-3 flex items-center gap-3">
        <label className="w-14 shrink-0 text-xs text-muted-foreground">
          Delay
        </label>
        <Select
          value={delayMode}
          onValueChange={(v) =>
            setDelayMode(v as "record" | "none" | "fixed")
          }
        >
          <SelectTrigger className="h-8 w-40" disabled={recording}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="record">Record actual timing</SelectItem>
            <SelectItem value="none">No delay</SelectItem>
            <SelectItem value="fixed">Fixed delay</SelectItem>
          </SelectContent>
        </Select>
        {delayMode === "fixed" && (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={65535}
              value={fixedDelay}
              disabled={recording}
              onChange={(e) =>
                setFixedDelay(
                  Math.max(0, Math.min(65535, Number(e.target.value) || 0)),
                )
              }
              className="tabular h-8 w-20 text-right"
            />
            <span className="text-xs text-muted-foreground">ms</span>
          </div>
        )}
      </div>

      {/* Recorder controls */}
      <div className="mb-2 flex items-center gap-2">
        {recording ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-8 gap-1.5"
            onClick={() => setRecording(false)}
          >
            <Square className="size-3.5" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={startRecording}
          >
            <Circle className="size-3.5 text-destructive" />
            Record
          </Button>
        )}
        {events.length > 0 && !recording && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setEvents([])}
          >
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {recording
            ? lastUnsupported
              ? `"${lastUnsupported}" not supported`
              : "Press keys…"
            : `${events.length} step${events.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Event list */}
      {events.length > 0 && (
        <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
          {events.map((ev, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            >
              <span className="w-5 text-muted-foreground">{i + 1}</span>
              <span className="font-medium">{keyLabel(ev.key_event.key)}</span>
              <span className="text-muted-foreground">
                {ev.key_event.state === "Pressed" ? "↓" : "↑"}
              </span>
              <span className="ml-auto text-muted-foreground">
                {ev.delay_ms} ms
              </span>
              <button
                type="button"
                title="Remove step"
                onClick={() =>
                  setEvents((prev) => prev.filter((_, j) => j !== i))
                }
                className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Verify status: did the macro actually land on the mouse? */}
      {verify && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
            verify === "ok"
              ? "border-primary/40 text-primary"
              : verify === "missing"
                ? "border-destructive/40 text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {verify === "checking" &&
            "Saving… verifying the macro on the mouse."}
          {verify === "ok" &&
            "✓ Confirmed on the mouse — it should survive a restart."}
          {verify === "missing" &&
            "✗ Saved, but the mouse didn't return it on read-back. It may not persist after a restart."}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        {existing ? (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Remove macro
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            {verify === "ok" || verify === "missing" ? "Done" : "Cancel"}
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => onSave({ mode, events })}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
