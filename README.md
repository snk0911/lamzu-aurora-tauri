# Lamzu Aurora Tauri

A native, cross-platform desktop app for configuring Lamzu mice — built with
**Tauri 2** (Rust) and **React**, no Electron. Instead of wrapping the Lamzu
website, it talks to the mouse directly over **hidapi**, so it runs on Linux,
Windows, and macOS.

> ⚠️ Unofficial community project. The protocol is reverse-engineered from
> [LeadSun/lamzu-cfg](https://github.com/LeadSun/lamzu-cfg). Back up your mouse
> profile before writing, and use at your own risk.

## Features

- **Profiles** — switch between profiles 1–4 and set the active one.
- **Performance** — polling rate (capped to the model's max), debounce,
  lift-off distance, Motion Sync, Angle Snapping, Ripple Control,
  Peak/High Performance.
- **DPI** — up to 5 stages, independent X/Y (50–26000), per-stage color and
  lock, click to select the active stage.
- **Button mapping** — remap any button from an interactive mouse diagram;
  changes write to the mouse instantly.
- **Macros** — record a key sequence for a button with configurable timing
  (record actual delays, no delay, or a fixed delay) and repeat modes.

## Getting started

Requires [Node.js](https://nodejs.org) + [pnpm](https://pnpm.io) and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust toolchain
and your platform's system dependencies).

```bash
pnpm install      # install dependencies
pnpm tauri dev    # run the app in development
pnpm tauri build  # build a release binary
```

On Windows, build from a short path (e.g. `C:\dev\`) to avoid long-path issues.

## Architecture

```
src/                 React frontend (TypeScript, Vite, Tailwind v4, shadcn/ui)
  app/               app shell
  features/          general-settings, customization (feature modules)
  hooks/             use-device — device state and all command handlers
  lib/               API, helpers, constants
src-tauri/src/       Rust backend
  commands.rs        Tauri commands exposed to the frontend
  device.rs          HID communication (the only file touching the device)
  profile.rs         frontend <-> lamzu profile conversion
```

The React UI calls Tauri commands, which drive a single HID layer built on the
`lamzu` crate. The dark "instrument panel" theme and design tokens live in
`src/index.css`.

## Supported hardware

Built and tested against the Lamzu Atlantis / Thorn (vendor ID `0x3554`). Other
Lamzu models using the same protocol may work but are untested.

## License

Dual-licensed under MIT or Apache-2.0, matching the upstream `lamzu-cfg`
project. Lamzu is a trademark of its respective owner; this project is not
affiliated with or endorsed by Lamzu.
