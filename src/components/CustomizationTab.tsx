import type { Profile } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MouseDiagram } from "@/components/MouseDiagram";
import {
  MOUSE_BUTTONS,
  ASSIGNABLE_ACTIONS,
  actionValueKey,
  formatAction,
} from "@/lib/button-actions";

export function CustomizationTab({
  profile,
  setButtonAction,
}: {
  profile: Profile;
  setButtonAction: (buttonKey: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Button Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="mx-auto max-w-2xl">
            <MouseDiagram
              actions={Object.fromEntries(
                MOUSE_BUTTONS.map(([key]) => {
                  const bm = (profile.button_map ?? {}) as Record<
                    string,
                    unknown
                  >;
                  return [key, key in bm ? formatAction(bm[key]) : "Default"];
                }),
              )}
              assignable={ASSIGNABLE_ACTIONS}
              onAssign={setButtonAction}
              actionValueKey={actionValueKey}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Click a mapping to remap that button — changes are written to the
            mouse instantly.
          </p>
        </CardContent>
      </Card>

      {/* Macros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Macros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">No macros yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Macro recording and editing isn't available yet. Button clicks can
              already be remapped above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
