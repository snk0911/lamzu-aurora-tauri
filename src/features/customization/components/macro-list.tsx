import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Macro } from "@/lib/macros";
import { describeMode, summarizeEvents } from "@/lib/macros";
import { MOUSE_BUTTONS } from "@/lib/button-actions";

// The mouse has one macro slot per physical button. This list shows all the
// buttons, each row showing its macro (or "empty"), so it mirrors the hardware
// exactly — there are no free-floating macros, just up to one per button.
export function MacroList({
  macrosByButton,
  onEdit,
  onDelete,
}: {
  macrosByButton: Record<string, Macro>;
  onEdit: (buttonKey: string) => void;
  onDelete: (buttonKey: string) => void;
}) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          Macros
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {MOUSE_BUTTONS.map(([key, label]) => {
          const macro = macrosByButton[key];
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <div className="w-28 shrink-0 text-sm font-medium">{label}</div>
              <div className="min-w-0 flex-1">
                {macro ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {describeMode(macro.mode)} · {summarizeEvents(macro.events)}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground/60">
                    No macro
                  </div>
                )}
              </div>
              <button
                type="button"
                title={macro ? "Edit macro" : "Record macro"}
                onClick={() => onEdit(key)}
                className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {macro ? (
                  <Pencil className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                title="Remove macro"
                disabled={!macro}
                onClick={() => onDelete(key)}
                className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
