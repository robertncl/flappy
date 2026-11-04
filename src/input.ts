import { DIFFICULTIES } from "./difficulty";
import { LANGUAGES, detectLanguage, isLang, language, setLanguage, strings, type Lang } from "./i18n";
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
const LANGUAGE_KEY = "flappy-runs:language";

/** The page controls around the canvas. */
export interface Chrome {
  canvas: HTMLCanvasElement;
  slider: HTMLInputElement;
  sliderOutput: HTMLOutputElement;
  sliderLabel: HTMLElement;
  languageSelect: HTMLSelectElement;
}

// Storage can be blocked (private mode etc.): choices then just don't persist.
function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Re-labels the page controls for the current language and difficulty. */
function refreshChrome(c: Chrome): void {
  const t = strings();
  const name = t.difficulties[state.difficulty]!;
  c.slider.value = String(state.difficulty);
  // Screen readers announce "Hard", not "3".
  c.slider.setAttribute("aria-valuetext", name);
  c.sliderOutput.value = name;
  c.sliderLabel.textContent = t.difficultyLabel;
  // The picker is labelled by a globe icon on screen, so its name lives here.
  c.languageSelect.setAttribute("aria-label", t.languageLabel);
  c.languageSelect.value = language();
  c.canvas.setAttribute("aria-label", t.canvasLabel(LEVELS.length));
  document.documentElement.lang = language();
}

/**
 * Binds the difficulty slider and language picker to state, restoring the
 * last choices (language defaults to the browser's). Returns setters that
 * keep state, controls and storage in sync.
 */
function setupChrome(c: Chrome): { applyDifficulty: (d: number) => void; applyLanguage: (l: Lang) => void } {
  c.slider.max = String(DIFFICULTIES.length - 1);
  for (const { code, name } of LANGUAGES) c.languageSelect.add(new Option(name, code));

  const applyDifficulty = (d: number): void => {
    setDifficulty(d);
    save(DIFFICULTY_KEY, String(state.difficulty));
    refreshChrome(c);
  };
  const applyLanguage = (l: Lang): void => {
    setLanguage(l);
    save(LANGUAGE_KEY, l);
    refreshChrome(c);
  };

  const savedLang = load(LANGUAGE_KEY);
  setLanguage(isLang(savedLang) ? savedLang : detectLanguage(navigator.languages ?? [navigator.language]));
  const savedDifficulty = load(DIFFICULTY_KEY);
  setDifficulty(savedDifficulty === null ? state.difficulty : Number(savedDifficulty));
  refreshChrome(c);

  c.slider.addEventListener("input", () => applyDifficulty(Number(c.slider.value)));
  c.languageSelect.addEventListener("change", () => {
    if (isLang(c.languageSelect.value)) applyLanguage(c.languageSelect.value);
  });
  return { applyDifficulty, applyLanguage };
}

/** Wires keyboard, pointer and the page controls to game actions. */
export function setupInput(c: Chrome): void {
  const { canvas, slider, languageSelect } = c;
  const { applyDifficulty, applyLanguage } = setupChrome(c);

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    // A focused language picker keeps Space/arrows for itself.
    if (e.target === languageSelect && /^(Space|Arrow)/.test(e.code)) return;
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
    if (e.code === "KeyL") {
      const i = LANGUAGES.findIndex((l) => l.code === language());
      applyLanguage(LANGUAGES[(i + 1) % LANGUAGES.length]!.code);
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
    // Hand the keyboard back to the game after using a page control.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    action();
  });
}
