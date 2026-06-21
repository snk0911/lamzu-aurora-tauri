import { useState } from "react";
import type { Profile } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { MouseDiagram } from "./mouse-diagram";
import type { Macro } from "@/lib/macros";
import {
  MOUSE_BUTTONS,
  ASSIGNABLE_ACTIONS,
  actionValueKey,
  formatAction,
} from "@/lib/button-actions";

export function CustomizationTab({
  profile,
  setButtonAction,
  saveMacroForButton,
  deleteMacro,
  macroVerify,
  resetMacroVerify,
}: {
  profile: Profile;
  setButtonAction: (buttonKey: string, value: unknown) => void;
  // Saves a macro for a button AND points the button at it, in one write.
  saveMacroForButton: (buttonKey: string, macro: Macro) => void;
  deleteMacro: (name: string) => void;
  macroVerify: null | "checking" | "ok" | "missing";
  resetMacroVerify: () => void;
}) {
  const buttonMap = (profile.button_map ?? {}) as Record<string, unknown>;
  const allMacros = (profile.macros ?? {}) as Record<string, Macro>;

  // Which button's macro recorder panel is open (null = none). Lifted here so
  // both the mouse diagram's "Macro…" entry and the list below can open it.
  const [macroFor, setMacroFor] = useState<string | null>(null);

  // Build a button-key -> Macro map. A macro belongs to a button when that
  // button's action is Macro { name } and the macro exists.
  const macrosByButton: Record<string, Macro> = {};
  for (const [btnKey] of MOUSE_BUTTONS) {
    const action = buttonMap[btnKey] as
      | { Macro?: { name?: string } }
      | undefined;
    const name = action?.Macro?.name;
    if (name && allMacros[name]) macrosByButton[btnKey] = allMacros[name];
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col justify-center py-6">
          <div className="mx-auto w-full max-w-4xl">
            <MouseDiagram
              actions={Object.fromEntries(
                MOUSE_BUTTONS.map(([key]) => {
                  return [
                    key,
                    key in buttonMap
                      ? formatAction(buttonMap[key])
                      : "Default",
                  ];
                }),
              )}
              assignable={ASSIGNABLE_ACTIONS}
              onAssign={setButtonAction}
              actionValueKey={actionValueKey}
              macros={macrosByButton}
              onSaveMacro={saveMacroForButton}
              onDeleteMacro={deleteMacro}
              macroVerify={macroVerify}
              resetMacroVerify={resetMacroVerify}
              macroFor={macroFor}
              setMacroFor={setMacroFor}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Click a mapping to remap a button. Choose "Macro..." to record a key
            sequence for that button - changes are written to the mouse
            instantly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
