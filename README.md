# Lamzu Aurora (Tauri + React)

A native, **cross-platform** desktop GUI for configuring Lamzu mice — built
with **Tauri 2** (Rust) and **React**, **without Electron**, using **pnpm** as
the package manager.

Instead of loading the Lamzu website (like the Electron wrapper), this app talks
to the mouse directly via **hidapi** — which runs on **Linux, Windows and
macOS**. The reverse-engineered protocol comes from
[LeadSun/lamzu-cfg](https://github.com/LeadSun/lamzu-cfg).

> ⚠️ Unofficial community project. Protocol via reverse engineering.
> Back up your mouse profile before writing.

---

## UI features

- Device bar at the top: model, connection (wired/wireless), battery level,
  max polling rate, USB product ID and serial number.
- Switch profiles 1–4 and set one as active.
- Performance: polling rate (capped to the model's max rate), debounce,
  lift-off distance.
- Options: Motion Sync, Angle Snapping, Ripple Control, Peak/High Performance.
- DPI stages: 1–5 stages, freely editable values (50–26000, independent X/Y),
  active stage selectable by click, color swatch per stage.

## Frontend stack

The frontend is **TypeScript + React + Vite** with **Tailwind CSS v4** and
**shadcn/ui**. shadcn is not a package; it copies components as source code into
`src/components/ui/` — so they already live in the project and are freely
editable. Add more components with:

```bash
pnpm dlx shadcn@latest add dialog tooltip slider
```

The design tokens (colors, radii) live in `src/index.css`. The theme is a dark
"instrument panel" with a cyan accent instead of the default presets.

## How the mouse is addressed

The app embeds **lamzu-cfg directly as a library** (the crate is internally
named `lamzu`). It exports a clean `Mouse` trait API and uses `hidapi` itself,
so it runs wherever hidapi runs (Linux, Windows, macOS). The complete
reverse-engineered protocol lives in the crate — `device.rs` only connects its
methods with the frontend profile. **There are no protocol placeholders left.**

---

## Prerequisites

- **pnpm** 9+  (`npm install -g pnpm` or `corepack enable`)
- **Rust** (stable) + Cargo — https://rustup.rs
- **Linux**: Tauri and hidapi system packages:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
    libudev-dev pkg-config
  ```
- **Windows**: Visual Studio Build Tools + WebView2 (usually preinstalled)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)

---

## Quick start (with mock data, no mouse)

```bash
pnpm install
pnpm tauri dev --no-default-features
```

Shows sample profiles in memory. For UI development only.

## With real hardware

```bash
pnpm tauri dev
```

---

## ⚙️ What you still need to keep in mind

### 1. Supported models

lamzu-cfg was developed/tested with the **Lamzu Atlantis** (Mini Pro).
Devices are detected via their USB product ID: Atlantis Wired (`f50f`),
Wireless 1K (`f50d`), Wireless 4K (`f510`). Other Lamzu models may work but
are untested — in that case add the IDs in `device.rs` / the udev rule and
test at your own risk.

### 2. `packaging/99-lamzu.rules` — Linux only

So the app can access `/dev/hidraw` without root. Enter the USB IDs, then:
```bash
sudo cp packaging/99-lamzu.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules && sudo udevadm trigger
```
Not needed on Windows/macOS.

---

## Builds

```bash
# current platform
pnpm tauri build

# macOS: a single universal binary (Intel + Apple Silicon combined)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target universal-apple-darwin

# Windows / Linux are each built on the respective platform (or via CI)
```

"Universal" has two meanings, both satisfied:
- **Cross-platform** (Linux/Win/macOS) via hidapi
- **macOS universal binary** (Intel+ARM) via `--target universal-apple-darwin`

Real cross-platform builds are best done in CI (e.g. GitHub Actions with one
Linux, one Windows and one macOS runner), since Tauri builds each target on the
respective OS.

---

## Icons

App icons (`.png`, `.ico`, `.icns`) are included in `src-tauri/icons/`. To
replace them with your own logo:
```bash
pnpm tauri icon path/to/logo-1024.png
```
This regenerates all sizes automatically.

---

## License & credits

Protocol knowledge from [LeadSun/lamzu-cfg](https://github.com/LeadSun/lamzu-cfg)
(MIT OR Apache-2.0). When reusing code, keep its license and copyright notices.
