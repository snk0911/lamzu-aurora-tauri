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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DpiStages } from "./dpi-stages";
import { POLL_RATES, PEAK_TIME_PRESETS, TOGGLES } from "@/lib/constants";
import { fmtSeconds } from "@/lib/profile-utils";

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
  lockedStages,
  toggleDpiLock,
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
  lockedStages: Set<number>;
  toggleDpiLock: (stageIndex: number) => void;
  makeActive: (idx: number) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-5">
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
              </div>

              {/* DPI stages — takes all remaining height */}
              <div className="grid min-h-0 flex-1 grid-cols-1">
                <DpiStages
                  profile={profile}
                  activeCount={activeCount}
                  setDpiAxis={setDpiAxis}
                  setCurrentStage={setCurrentStage}
                  activateMore={activateMore}
                  activateLess={activateLess}
                  lockedStages={lockedStages}
                  toggleDpiLock={toggleDpiLock}
                  commit={commit}
                />
              </div>

              {selected !== active && (
                <div className="flex">
                  <Button
                    variant="outline"
                    onClick={() => makeActive(selected)}
                  >
                    Set as active profile
                  </Button>
                </div>
              )}
    </div>
  );
}
