import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, Square, Trash2, Plus, Pencil, X } from "lucide-react";
import type { Macro, MacroEvent, MacroMode } from "@/lib/macros";
import {
  MAX_MACRO_EVENTS,
  MAX_MACRO_NAME_LEN,
  isSupportedKey,
  keyLabel,
  describeMode,
  summarizeEvents,
} from "@/lib/macros";

export function MacrosCard({
  macros,
  saveMacro,
  deleteMacro,
}: {
  macros: Record<string, Macro>;
  saveMacro: (name: string, macro: Macro | null) => void;
  deleteMacro: (name: string) => void;
}) {
  const names = Object.keys(macros);
  // Which macro is open in the editor (null = list view, "" = new macro).
  const [editing, setEditing] = useState<string | null>(null);

  if (editing !== null) {
    return (
      <MacroEditor
        initialName={editing}
        initial={editing ? macros[editing] : null}
        existingNames={names}
        onCancel={() => setEditing(null)}
        onSave={(name, macro) => {
          // If the name changed, remove the old entry.
          if (editing && editing !== name) deleteMacro(editing);
          saveMacro(name, macro);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Macros
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setEditing("")}
          >
            <Plus className="size-3.5" />
            New macro
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {names.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">No macros yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Record a key sequence, then assign it to a button in the mapping
              above.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {names.map((name) => (
              <div
                key={name}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {describeMode(macros[name].mode)} ·{" "}
                    {summarizeEvents(macros[name].events)}
                  </div>
                </div>
                <button
                  type="button"
                  title="Edit macro"
                  onClick={() => setEditing(name)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete macro"
                  onClick={() => deleteMacro(name)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function MacroEditor({
  initialName,
  initial,
  existingNames,
  onCancel,
  onSave,
}: {
  initialName: string;
  initial: Macro | null;
  existingNames: string[];
  onCancel: () => void;
  onSave: (name: string, macro: Macro) => void;
}) {
  const [name, setName] = useState(initialName);
  const [events, setEvents] = useState<MacroEvent[]>(initial?.events ?? []);
  const [mode, setMode] = useState<MacroMode>(initial?.mode ?? { Repeat: 1 });
  const [recording, setRecording] = useState(false);
  // Timestamp of the previous captured event, to compute delays.
  const lastTsRef = useRef<number | null>(null);
  // Mirror of `recording` so the key listener always sees the current value
  // without being re-registered (avoids stale-closure event loss).
  const recordingRef = useRef(false);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);
  // Last key code we tried but couldn't support, shown as a hint.
  const [lastUnsupported, setLastUnsupported] = useState<string | null>(null);

  // Capture key events while recording. Delays are measured between events.
  // Registered once (empty deps); reads live state via refs and functional
  // updates so no event is lost between re-renders.
  useEffect(() => {
    const handle = (e: KeyboardEvent, state: "Pressed" | "Released") => {
      if (!recordingRef.current) return;
      // Some WebViews leave e.code empty; fall back to e.key.
      const code = e.code || e.key;
      if (!code) return;
      e.preventDefault();
      e.stopPropagation();
      if (!isSupportedKey(code)) {
        setLastUnsupported(code);
        return;
      }
      setLastUnsupported(null);
      const now = performance.now();
      const delay =
        lastTsRef.current === null
          ? 0
          : Math.min(65535, Math.round(now - lastTsRef.current));
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

  const trimmedName = name.trim();
  const nameError =
    trimmedName.length === 0
      ? "Name required"
      : trimmedName.length > MAX_MACRO_NAME_LEN
        ? `Max ${MAX_MACRO_NAME_LEN} characters`
        : trimmedName !== initialName && existingNames.includes(trimmedName)
          ? "Name already used"
          : null;

  const canSave = !nameError && events.length > 0 && !recording;

  const repeatCount =
    typeof mode === "object" && "Repeat" in mode ? mode.Repeat : 1;

  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            {initialName ? "Edit Macro" : "New Macro"}
          </CardTitle>
          <button
            type="button"
            onClick={onCancel}
            className="flex size-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Cancel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {/* Name */}
        <div className="flex items-center gap-3">
          <label className="w-16 shrink-0 text-sm text-muted-foreground">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My macro"
            className="h-8 max-w-xs"
          />
          {nameError && (
            <span className="text-xs text-destructive">{nameError}</span>
          )}
        </div>

        {/* Repeat mode */}
        <div className="flex items-center gap-3">
          <label className="w-16 shrink-0 text-sm text-muted-foreground">
            Repeat
          </label>
          <Select
            value={
              typeof mode === "object"
                ? "Repeat"
                : (mode as "Toggle" | "Hold" | "UntilPress")
            }
            onValueChange={(v) => {
              if (v === "Repeat") setMode({ Repeat: repeatCount });
              else setMode(v as MacroMode);
            }}
          >
            <SelectTrigger className="h-8 w-44">
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
                  Repeat: Math.max(
                    1,
                    Math.min(255, Number(e.target.value) || 1),
                  ),
                })
              }
              className="tabular h-8 w-20 text-right"
            />
          )}
        </div>

        {/* Recorder */}
        <div className="flex items-center gap-3">
          <label className="w-16 shrink-0 text-sm text-muted-foreground">
            Steps
          </label>
          {recording ? (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5"
              onClick={() => setRecording(false)}
            >
              <Square className="size-3.5" />
              Stop recording
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
                ? `"${lastUnsupported}" isn't supported — try another key.`
                : "Press keys… they're captured with timing."
              : `${events.length} step${events.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {/* Event list */}
        {events.length > 0 && (
          <div className="space-y-1">
            {events.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md border px-3 py-1.5 text-sm"
              >
                <span className="w-6 text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span className="font-medium">
                  {keyLabel(ev.key_event.key)}
                </span>
                <span className="text-muted-foreground">
                  {ev.key_event.state === "Pressed" ? "press ↓" : "release ↑"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  after {ev.delay_ms} ms
                </span>
                <button
                  type="button"
                  title="Remove step"
                  onClick={() =>
                    setEvents((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t p-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!canSave}
          onClick={() => onSave(trimmedName, { mode, events })}
        >
          Save macro
        </Button>
      </div>
    </Card>
  );
}
