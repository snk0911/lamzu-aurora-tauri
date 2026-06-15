import type { Profile, DeviceInfo } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, Minus } from "lucide-react";
import { POLL_RATES, PEAK_TIME_PRESETS, TOGGLES, MAX_STAGES } from "@/lib/constants";
import { rgb, fmtSeconds } from "@/lib/profile-utils";

export function GeneralSettings({
  profile,
  info,
  activeCount,
  selected,
  active,
  patchAndSave,
  commit,
  setDpiAxis,
  activateMore,
  activateLess,
  setCurrentStage,
  makeActive,
}: {
  profile: Profile;
  info: DeviceInfo | null;
  activeCount: number;
  selected: number;
  active: number;
  patchAndSave: (changes: Partial<Profile>) => void;
  commit: () => void;
  setDpiAxis: (stageIndex: number, axis: "x" | "y", value: number) => void;
  activateMore: () => void;
  activateLess: () => void;
  setCurrentStage: (stageIndex: number) => void;
  makeActive: (idx: number) => void;
}) {
  return (
    <>
              <div className="grid grid-cols-2 gap-5">
                {/* Performance */}
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Polling Rate</Label>
                      <Select
                        value={String(profile.poll_rate)}
                        onValueChange={(v) => patchAndSave({ poll_rate: Number(v) })}
                      >
                        <SelectTrigger className="h-8 w-32 shrink-0 tabular">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POLL_RATES.filter(
                            (r) => !info || r <= info.max_poll_rate
                          ).map((r) => (
                            <SelectItem
                              key={r}
                              value={String(r)}
                              className="tabular"
                            >
                              {r} Hz
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Debounce</Label>
                      <Select
                        value={String(profile.debounce_ms)}
                        onValueChange={(v) =>
                          patchAndSave({ debounce_ms: Number(v) })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 shrink-0 tabular">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 16 }, (_, i) => i).map((ms) => (
                            <SelectItem
                              key={ms}
                              value={String(ms)}
                              className="tabular"
                            >
                              {ms} ms
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Lift-Off-Distance</Label>
                      <Select
                        value={String(profile.lift_off_distance)}
                        onValueChange={(v) =>
                          patchAndSave({ lift_off_distance: Number(v) })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 shrink-0 tabular">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" className="tabular">
                            1 mm
                          </SelectItem>
                          <SelectItem value="2" className="tabular">
                            2 mm
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Peak Performance: the on/off state and the time are
                        merged into one control. "Off" disables it; picking any
                        time enables it. */}
                    <div className="flex items-center justify-between">
                      <Label>Peak Performance</Label>
                      <Select
                        value={
                          profile.peak_performance
                            ? String(profile.peak_performance_time)
                            : "off"
                        }
                        onValueChange={(v) => {
                          if (v === "off") {
                            patchAndSave({ peak_performance: false });
                          } else {
                            patchAndSave({
                              peak_performance: true,
                              peak_performance_time: Number(v),
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-32 shrink-0 tabular">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Off</SelectItem>
                          {/* Include the current value if it isn't a preset,
                              so the dropdown always shows the real setting. */}
                          {Array.from(
                            new Set([
                              ...PEAK_TIME_PRESETS,
                              profile.peak_performance_time,
                            ]),
                          )
                            .sort((a, b) => a - b)
                            .map((s) => (
                              <SelectItem
                                key={s}
                                value={String(s)}
                                className="tabular"
                              >
                                {fmtSeconds(s)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Options */}
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                      Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {TOGGLES.map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <Label htmlFor={key}>{label}</Label>
                        <Switch
                          id={key}
                          checked={Boolean(profile[key])}
                          onCheckedChange={(v) =>
                            patchAndSave({ [key]: v } as Partial<Profile>)
                          }
                        />
                      </div>
                    ))}

                    {/* Sensor performance mode (LP/HP). The hardware stores a
                        boolean: HP = true, LP = false. When the mouse is wired,
                        it runs in "corded" mode automatically, so we just show
                        that as a disabled state and write nothing. */}
                    <div className="flex items-center justify-between">
                      <Label>Sensor Mode</Label>
                      {info?.connection === "Wired" ? (
                        <Select value="corded" disabled>
                          <SelectTrigger className="h-8 w-32 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corded">Corded</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={profile.high_performance ? "hp" : "lp"}
                          onValueChange={(v) =>
                            patchAndSave({ high_performance: v === "hp" })
                          }
                        >
                          <SelectTrigger className="h-8 w-32 shrink-0">
                            {/* Trigger shows only the short code; the dropdown
                                list below shows the full meaning. */}
                            <span>{profile.high_performance ? "HP" : "LP"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lp">LP — Low Power</SelectItem>
                            <SelectItem value="hp">
                              HP — High Performance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* DPI stages — editable, switchable, add/remove, decoupled X/Y */}
                <Card className="col-span-full">
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
                  <CardContent className="space-y-1.5">
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
                    <p className="pt-1 text-xs text-muted-foreground">
                      The dot on the left selects the active stage. X and Y are
                      independent (50–26000). Use + / − to activate or deactivate
                      stages (1–5); inactive stages are greyed out.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {selected !== active && (
                <div className="mt-7 flex">
                  <Button
                    variant="outline"
                    onClick={() => makeActive(selected)}
                  >
                    Set as active profile
                  </Button>
                </div>
              )}
    </>
  );
}
