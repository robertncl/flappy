import { DIFFICULTIES } from "./difficulty";
import { LEVELS } from "./levels";
import {
  action,
  setDifficulty,
  startCampaign,
  startLevel,
  state,
  toMenu,
  toggleBot,
} from "./state";

const DIFFICULTY_KEY = "flappy-runs:difficulty";

/**
 * Binds the difficulty slider to state and restores the last choice.
 * Returns a setter that keeps state, slider and storage in sync.
 */
function setupDifficulty(
  slider: HTMLInputElement,
  output: HTMLOutputElement,
): (d: number) => void {
  slider.max = String(DIFFICULTIES.length - 1);
  const apply = (d: number): void => {
    setDifficulty(d);
    const { name } = DIFFICULTIES[state.difficulty]!;
    slider.value = String(state.difficulty);
    // Screen readers announce "Hard", not "3".
    slider.setAttribute("aria-valuetext", name);
    output.value = name;
    try {
      localStorage.setItem(DIFFICULTY_KEY, String(state.difficulty));
    } catch {
      // Storage blocked (private mode etc.): the choice just won't persist.
    }
  };
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(DIFFICULTY_KEY);
  } catch {}
  apply(saved === null ? state.difficulty : Number(saved));
  slider.addEventListener("input", () => apply(Number(slider.value)));
  return apply;
}

/** Wires keyboard, pointer and the difficulty slider to game actions. */
export function setupInput(
  canvas: HTMLCanvasElement,
  slider: HTMLInputElement,
  sliderOutput: HTMLOutputElement,
): void {
  const applyDifficulty = setupDifficulty(slider, sliderOutput);

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      action();
      return;
    }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      // A focused slider already handles its own arrow keys.
      if (e.target !== slider) {
        applyDifficulty(state.difficulty + (e.code === "ArrowRight" ? 1 : -1));
      }
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
