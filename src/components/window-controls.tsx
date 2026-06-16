import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X } from "lucide-react";

// Custom window buttons for the borderless title bar (decorations:false).
// They sit on the right of the top bar. The bar itself is draggable via
// data-tauri-drag-region — these buttons are deliberately NOT, so a click
// isn't interpreted as a window drag.
// The window is a fixed size (not resizable/maximizable), so there is no
// maximize button — only minimize and close.
export function WindowControls() {
  const win = getCurrentWindow();

  return (
    <div className="flex items-center" data-tauri-drag-region={false}>
      <button
        onClick={() => win.minimize()}
        className="flex h-9 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Minimize"
        aria-label="Minimize"
      >
        <Minus className="size-4" />
      </button>
      <button
        onClick={() => win.close()}
        className="flex h-9 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
        title="Close"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
