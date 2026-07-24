import { DT, createGame, step, type GameState } from "./engine";
import { createBot } from "./bot";
import { LEVELS } from "./levels";

export type Phase = "menu" | "playing" | "levelDone" | "dead" | "victory";

/** All state that changes during play, grouped so input/render share one import. */
export const state = {
  levelIndex: 0,
  game: createGame(0) as GameState,
  phase: "menu" as Phase,
  phaseT: 0,
  botOn: false,
  bot: createBot(),
  totalScore: 0,
  deaths: 0,
  flapQueued: false,
};

export function startLevel(i: number): void {
  state.levelIndex = i;
  state.game = createGame(i);
  state.bot = createBot();
  state.phase = "playing";
  state.phaseT = 0;
  state.flapQueued = false;
}

/** Reset the campaign score and jump into a level (menu start / level-select). */
export function startCampaign(i: number): void {
  state.totalScore = 0;
  state.deaths = 0;
  startLevel(i);
}

export function toMenu(): void {
  state.phase = "menu";
  state.phaseT = 0;
  state.levelIndex = 0;
  state.game = createGame(0);
}

export function toggleBot(): void {
  state.botOn = !state.botOn;
  state.bot = createBot();
}

/** Fires on Space / click / ArrowUp: the context-dependent primary action. */
export function action(): void {
  if (state.phase === "menu") startCampaign(state.levelIndex);
  else if (state.phase === "playing") state.flapQueued = true;
  else if (state.phase === "dead") startLevel(state.levelIndex);
  else if (state.phase === "victory") toMenu();
}

/** Advance one fixed simulation timestep. */
export function update(): void {
  state.phaseT += DT;
  if (state.phase === "playing") {
    const flap = state.botOn ? state.bot(state.game) : state.flapQueued;
    state.flapQueued = false;
    step(state.game, flap);
    if (state.game.status === "complete") {
      state.totalScore += state.game.score;
      state.phase = state.levelIndex === LEVELS.length - 1 ? "victory" : "levelDone";
      state.phaseT = 0;
    } else if (state.game.status === "dead") {
      state.deaths++;
      state.phase = "dead";
      state.phaseT = 0;
    }
  } else if (state.phase === "levelDone") {
    if (state.phaseT > 1.4) startLevel(state.levelIndex + 1);
  } else if (state.phase === "dead") {
    if (state.botOn && state.phaseT > 0.9) startLevel(state.levelIndex);
  }
}
