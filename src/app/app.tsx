import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { WindowControls } from "@/components/window-controls";
import { GeneralSettings } from "@/features/general-settings";
import { CustomizationTab } from "@/features/customization";
import { RotateCcw } from "lucide-react";
import { Stat } from "@/components/stat";
import { useDevice } from "@/hooks/use-device";

export default function App() {
  // All device communication + profile editing lives in the hook.
  const {
    count,
    connected,
    info,
    selected,
    setSelected,
    active,
    profile,
    activeCount,
    error,
    charging,
    battery,
    lockedStages,
    toggleDpiLock,
    patchAndSave,
    commit,
    setButtonAction,
    resetButtonMap,
    saveMacroForButton,
    macroVerify,
    resetMacroVerify,
    deleteMacro,
    resetGeneralSettings,
    setDpiAxis,
    activateMore,
    activateLess,
    setCurrentStage,
    makeActive,
  } = useDevice();

  // Which top tab is shown — the only purely-UI state left in App.
  const [tab, setTab] = useState<"general" | "custom">("general");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* === Device bar + title bar at the top === */}
      {/* data-tauri-drag-region makes the whole bar a window drag region */}
      <header
        data-tauri-drag-region
        className="flex items-center gap-6 border-b bg-card/40 py-2.5 pl-6"
      >
        <div className="flex items-center gap-2.5">
          <Logo className="size-8 text-foreground" />
          <span className="text-lg font-bold tracking-tight">
            Lamzu Aurora Tauri
          </span>
        </div>

        <div className="h-8 w-px bg-border" />

        {info ? (
          <>
            <Stat label="Device">{info.model}</Stat>
            <Stat label="Connection">{info.connection}</Stat>

            {battery !== null && (
              <Stat label="Battery">
                <span className="tabular">
                  {battery}%
                  {charging && (
                    <span className="ml-1 text-primary" title="Charging">
                      ⚡
                    </span>
                  )}
                  {typeof info.battery_mv === "number" &&
                    info.battery_mv > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {info.battery_mv} mV
                      </span>
                    )}
                </span>
              </Stat>
            )}

            <Stat label="Max. Poll">
              <span className="tabular">{info.max_poll_rate} Hz</span>
            </Stat>

            <Stat label="USB">
              <span className="tabular text-muted-foreground">
                {info.product_id}
                {info.serial ? ` · ${info.serial}` : ""}
              </span>
            </Stat>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            {connected ? "Lamzu mouse" : "No mouse connected"}
          </span>
        )}

        {/* Window buttons on the far right, flush in the corner */}
        <div className="ml-auto">
          <WindowControls />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar — profile slots */}
        <aside className="flex w-52 flex-col gap-1 overflow-y-auto border-r bg-card/20 p-4">
          <span className="mb-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Profiles
          </span>
          {Array.from({ length: count }, (_, i) => i + 1).map((idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                idx === selected
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>Profile {idx}</span>
              {idx === active && (
                <Badge className="h-5 px-1.5 text-[10px]">active</Badge>
              )}
            </button>
          ))}

          {/* App version, pinned to the bottom of the sidebar */}
          <span className="mt-auto px-1 pt-4 text-[10px] text-muted-foreground/60">
            v{__APP_VERSION__}
          </span>
        </aside>

        {/* Hauptbereich */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
          {/* Tab bar (the sidebar already shows which profile is active) */}
          <div className="mb-6 flex items-center justify-between border-b">
            <div className="flex gap-1">
              {(
                [
                  ["general", "General Settings"],
                  ["custom", "Customization & Macros"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    tab === key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {profile && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-1 h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={
                  tab === "custom" ? resetButtonMap : resetGeneralSettings
                }
              >
                <RotateCcw className="size-3.5" />
                Reset to defaults
              </Button>
            )}
          </div>

          {!connected && (
            <div className="mb-5 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
              No compatible mouse detected. In development mode you're working
              with sample data.
            </div>
          )}
          {error && (
            <div className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
          {info && !info.is_known && (
            <div className="mb-5 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <span className="font-semibold">Unverified model.</span> This Lamzu
              device passed the protocol check but isn't a tested model
              (product ID {info.product_id}). Configuration is experimental —
              settings may map to the wrong values. Back up your config and
              proceed at your own risk.
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">
          {profile && tab === "general" && (
            <GeneralSettings
              profile={profile}
              info={info}
              activeCount={activeCount}
              selected={selected}
              active={active}
              patchAndSave={patchAndSave}
              commit={commit}
              setDpiAxis={setDpiAxis}
              activateMore={activateMore}
              activateLess={activateLess}
              setCurrentStage={setCurrentStage}
              lockedStages={lockedStages}
              toggleDpiLock={toggleDpiLock}
              makeActive={makeActive}
            />
          )}

          {profile && tab === "custom" && (
            <CustomizationTab
              profile={profile}
              setButtonAction={setButtonAction}
              saveMacroForButton={saveMacroForButton}
              macroVerify={macroVerify}
              resetMacroVerify={resetMacroVerify}
              deleteMacro={deleteMacro}
            />
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
