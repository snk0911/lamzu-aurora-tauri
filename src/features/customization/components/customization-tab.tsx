import type { Profile } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MouseDiagram } from "./mouse-diagram";
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
    <div className="flex h-full flex-col gap-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Button Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="mx-auto max-w-3xl">
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

      {/* Macros — takes all remaining height */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Macros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
          <div className="flex w-full flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
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
