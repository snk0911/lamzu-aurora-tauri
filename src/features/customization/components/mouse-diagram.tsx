// Button-mapping visual, laid out like the official app: mouse shown from the
// TOP (left) and BOTTOM (right), slightly overlapping. Right-angled connector
// lines (no diagonals, no crossings). Each button shows its current mapping;
// clicking the mapping opens a dropdown right there to remap it.
//
// The dropdown is an HTML overlay positioned over the SVG (SVG can't host a
// native menu). Label positions are in viewBox units and converted to % so the
// overlay tracks the label regardless of render size.

import { useState } from "react";

type Btn = {
  key: string;
  label: string;
  tx: number;
  ty: number;
  anchor: "start" | "end";
  points: string;
  dotX: number;
  dotY: number;
};

const VB_W = 965;
const VB_H = 380;

const BUTTONS: Btn[] = [
  { key: "Left", label: "Left Click", tx: 40, ty: 117, anchor: "start", points: "118,113 185,113 185,107 418,107", dotX: 418, dotY: 107 },
  { key: "Middle", label: "Wheel Click", tx: 40, ty: 164, anchor: "start", points: "130,160 200,160 200,150 455,150", dotX: 455, dotY: 150 },
  { key: "Forward", label: "Forward", tx: 40, ty: 211, anchor: "start", points: "108,207 215,207 215,174 375,174", dotX: 375, dotY: 174 },
  { key: "Back", label: "Backward", tx: 40, ty: 258, anchor: "start", points: "122,254 230,254 230,200 375,200", dotX: 375, dotY: 200 },
  { key: "Right", label: "Right Click", tx: 925, ty: 117, anchor: "end", points: "847,113 560,113 560,107 492,107", dotX: 492, dotY: 107 },
  { key: "Bottom", label: "DPI Button", tx: 925, ty: 246, anchor: "end", points: "847,250 600,250 600,201 558,201", dotX: 555, dotY: 201 },
];

export type AssignableAction = { label: string; value: unknown };

export function MouseDiagram({
  actions,
  assignable,
  onAssign,
  actionValueKey,
}: {
  // button key -> formatted action text (for display)
  actions: Record<string, string>;
  // raw current action value per button (to detect complex/macro)
  // selectable actions
  assignable: AssignableAction[];
  // called when the user picks a new action for a button
  onAssign: (buttonKey: string, value: unknown) => void;
  actionValueKey: (v: unknown) => string;
}) {
  // Which button's dropdown is open (null = none).
  const [open, setOpen] = useState<string | null>(null);

  const body =
    "M115 8 C72 8 48 32 42 70 C37 100 35 135 35 175 C35 235 65 285 115 285 C165 285 195 235 195 175 C195 135 193 100 188 70 C182 32 158 8 115 8 Z";

  return (
    <div className="relative w-full">
      {/* Slim, themed scrollbar for the dropdown so it matches shadcn rather
          than the browser default. */}
      <style>{`
        .md-menu { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        .md-menu::-webkit-scrollbar { width: 8px; }
        .md-menu::-webkit-scrollbar-track { background: transparent; }
        .md-menu::-webkit-scrollbar-thumb {
          background-color: var(--border);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .md-menu::-webkit-scrollbar-thumb:hover {
          background-color: var(--muted-foreground);
          background-clip: content-box;
        }
      `}</style>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full">
        <defs>
          <linearGradient id="mdTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a323d" />
            <stop offset="1" stopColor="#171c23" />
          </linearGradient>
          <linearGradient id="mdBot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c232c" />
            <stop offset="1" stopColor="#12161c" />
          </linearGradient>
        </defs>

        {/* BOTTOM VIEW (right) */}
        <g transform="translate(430,55)">
          <path d={body} fill="url(#mdBot)" stroke="#3a4452" strokeWidth="2" />
          {/* DPI button marker — centered on the baseplate (exact spot varies
              by model, so we just point at the middle) */}
          <circle
            cx="115"
            cy="146"
            r="10"
            fill="none"
            stroke="#4fd0dc"
            strokeWidth="2"
            opacity={open === "Bottom" ? 1 : 0.8}
          />
        </g>

        {/* TOP VIEW (left) */}
        <g transform="translate(340,55)">
          <path d={body} fill="url(#mdTop)" stroke="#3a4452" strokeWidth="2" />
          <line x1="115" y1="10" x2="115" y2="135" stroke="#46505e" strokeWidth="1.5" />
          <path d="M35 135 Q115 153 195 135" fill="none" stroke="#46505e" strokeWidth="1.5" />
          <rect x="105" y="40" width="20" height="38" rx="10" fill="#3a4452" />
          <rect x="109" y="44" width="12" height="30" rx="6" fill="#4fd0dc" opacity="0.7" />
          <rect x="35" y="108" width="13" height="22" rx="3" fill="#323c48" />
          <rect x="35" y="134" width="13" height="22" rx="3" fill="#323c48" />
        </g>

        {/* connectors + labels (single line: the current mapping, clickable) */}
        {BUTTONS.map((b) => {
          const isOpen = open === b.key;
          const stroke = isOpen ? "#4fd0dc" : "#46505e";
          return (
            <g key={b.key}>
              <polyline points={b.points} fill="none" stroke={stroke} strokeWidth="1.5" />
              <circle cx={b.dotX} cy={b.dotY} r={isOpen ? 5 : 3.5} fill={stroke} />
              {/* current mapping — clickable to open the dropdown */}
              <text
                x={b.tx}
                y={b.ty + 4}
                fill={isOpen ? "#4fd0dc" : "#cdd6e0"}
                fontSize="15"
                fontWeight="600"
                textAnchor={b.anchor}
                className="cursor-pointer"
                style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}
                onClick={() => setOpen((cur) => (cur === b.key ? null : b.key))}
              >
                {actions[b.key] ?? "Default"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* HTML dropdown overlays, positioned over the clicked mapping */}
      {BUTTONS.map((b) => {
        if (open !== b.key) return null;
        const leftPct = (b.tx / VB_W) * 100;
        const topPct = ((b.ty + 14) / VB_H) * 100;
        const current = actions[b.key];
        return (
          <div
            key={b.key}
            className="absolute z-20"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: b.anchor === "end" ? "translateX(-100%)" : "none",
            }}
          >
            <div className="md-menu max-h-72 w-44 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              {assignable.map((a) => {
                const selected =
                  actionValueKey(a.value) ===
                  (typeof current === "string" ? actionValueKey(a.label) : "");
                return (
                  <button
                    key={actionValueKey(a.value)}
                    className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                      selected ? "font-medium text-primary" : "text-foreground"
                    }`}
                    onClick={() => {
                      onAssign(b.key, a.value);
                      setOpen(null);
                    }}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* click-away backdrop to close the dropdown */}
      {open && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpen(null)}
          aria-hidden
        />
      )}
    </div>
  );
}
