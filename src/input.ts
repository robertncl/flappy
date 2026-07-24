import { LEVELS } from "./levels";
import { action, startCampaign, startLevel, state, toMenu, toggleBot } from "./state";

/** Wires keyboard and pointer input to game actions. */
export function setupInput(canvas: HTMLCanvasElement): void {
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      action();
      return;
    }
    if (e.code === "KeyB") {
      toggleBot();
      return;
    }
    if (e.code === "KeyR" && state.phase !== "menu") {
      startLevel(state.levelIndex);
      return;
    }
    if (e.code === "Escape") {
      toMenu();
      return;
    }
    const digit = /^Digit(\d)$/.exec(e.code);
    if (digit) {
      const base = digit[1] === "0" ? 10 : Number(digit[1]);
      // Shift jumps to the upper bank (⇧1 = 11 … ⇧5 = 15).
      const n = e.shiftKey ? base + 10 : base;
      if (n >= 1 && n <= LEVELS.length) startCampaign(n - 1);
    }
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    action();
  });
}
