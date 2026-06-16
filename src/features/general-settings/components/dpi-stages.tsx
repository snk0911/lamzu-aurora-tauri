import type { Profile } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Plus, Minus, Link, Link2Off } from "lucide-react";
import { MAX_STAGES } from "@/lib/constants";
import { rgb } from "@/lib/profile-utils";

export function DpiStages({
  profile,
  activeCount,
  setDpiAxis,
  setCurrentStage,
  activateMore,
  activateLess,
  lockedStages,
  toggleDpiLock,
  commit,
}: {
  profile: Profile;
  activeCount: number;
  setDpiAxis: (stageIndex: number, axis: "x" | "y", value: number) => void;
  setCurrentStage: (stageIndex: number) => void;
  activateMore: () => void;
  activateLess: () => void;
  lockedStages: Set<number>;
  toggleDpiLock: (stageIndex: number) => void;
  commit: () => void;
}) {
  return (
                <Card className="flex h-full flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                        DPI Stages
                      </CardTitle>
                      {/* Active-stage-count stepper (1–MAX_STAGES). Doesn't add
                          or delete banks — just activates/greys them out. */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={activateLess}
                          disabled={activeCount <= 1}
                          title="Activate one fewer stage"
                          className="flex size-6 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="tabular w-5 text-center text-sm">
                          {activeCount}
                        </span>
                        <button
                          onClick={activateMore}
                          disabled={activeCount >= MAX_STAGES}
                          title="Activate one more stage"
                          className="flex size-6 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col">
                    {/* Stages, vertically centred in the available space */}
                    <div className="flex min-h-0 flex-1 flex-col justify-center space-y-1.5 overflow-y-auto">
                    {profile.resolutions.map((res, i) => {
                      const color = profile.resolution_colors[i];
                      const isActive = i < activeCount;
                      const isCurrent =
                        isActive && i === profile.current_resolution_index;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 rounded-md border px-3 py-1.5 transition-colors ${
                            isCurrent
                              ? "border-primary/50 bg-primary/10"
                              : "border-transparent hover:bg-accent/40"
                          } ${isActive ? "" : "opacity-40"}`}
                        >
                          {/* Select active stage (only for active banks) */}
                          <button
                            onClick={() => setCurrentStage(i)}
                            disabled={!isActive}
                            title={
                              isActive
                                ? "Set as active DPI stage"
                                : "Inactive stage"
                            }
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isCurrent
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 text-transparent hover:border-primary"
                            } disabled:pointer-events-none`}
                          >
                            <Check className="size-3" />
                          </button>

                          {/* Color swatch of the stage */}
                          <span
                            className="size-4 shrink-0 rounded-sm ring-1 ring-white/15"
                            style={{
                              background: color ? rgb(color) : "#555",
                            }}
                          />

                          <span className="w-16 shrink-0 text-sm text-muted-foreground">
                            Stage {i + 1}
                          </span>

                          {/* Decoupled X / Y inputs (disabled when inactive) */}
                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              X
                            </span>
                            <Input
                              type="number"
                              min={50}
                              max={26000}
                              step={50}
                              value={res.x}
                              disabled={!isActive}
                              onChange={(e) =>
                                setDpiAxis(
                                  i,
                                  "x",
                                  Math.max(
                                    50,
                                    Math.min(26000, Number(e.target.value)),
                                  ),
                                )
                              }
                              onBlur={commit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              className="tabular h-8 w-24 text-right"
                            />
                            {/* Lock toggle: per-stage. When locked, this
                                stage's X and Y move together. */}
                            <button
                              type="button"
                              disabled={!isActive}
                              onClick={() => toggleDpiLock(i)}
                              title={
                                lockedStages.has(i)
                                  ? "X and Y locked together — click to edit independently"
                                  : "X and Y independent — click to lock together"
                              }
                              className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-40 ${
                                lockedStages.has(i)
                                  ? "border-primary/40 text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {lockedStages.has(i) ? (
                                <Link className="size-3.5" />
                              ) : (
                                <Link2Off className="size-3.5" />
                              )}
                            </button>
                            <span className="text-xs text-muted-foreground">
                              Y
                            </span>
                            <Input
                              type="number"
                              min={50}
                              max={26000}
                              step={50}
                              value={res.y}
                              disabled={!isActive}
                              onChange={(e) =>
                                setDpiAxis(
                                  i,
                                  "y",
                                  Math.max(
                                    50,
                                    Math.min(26000, Number(e.target.value)),
                                  ),
                                )
                              }
                              onBlur={commit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              className="tabular h-8 w-24 text-right"
                            />
                            <span className="w-8 text-sm text-muted-foreground">
                              DPI
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    {/* Help text pinned to the bottom, uniform spacing */}
                    <p className="pt-4 text-xs text-muted-foreground">
                      The dot on the left selects the active stage. X and Y are
                      independent (50–26000). Use + / − to activate or deactivate
                      stages (1–5); inactive stages are greyed out.
                    </p>
                  </CardContent>
                </Card>
  );
}
