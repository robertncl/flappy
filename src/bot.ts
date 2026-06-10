import {
  BIRD_R,
  BIRD_X,
  FLAP_VY,
  GRAVITY,
  PIPE_W,
  PLAY_H,
  gapCenterAt,
  type GameState,
} from "./engine";

/** Minimum time between bot flaps (s); caps climb rate and avoids jitter. */
const COOLDOWN = 0.1;
/** How far ahead the bot extrapolates its fall when deciding to flap (s). */
const LOOKAHEAD = 0.06;

export interface BotView {
  /** The y line the bot tries to ride (it flaps whenever it sinks past it). */
  aim: number;
  /** Most restrictive gap edges over the bird's transit through the pipe. */
  gapTopBound: number;
  gapBotBound: number;
  /** Seconds until the bird's nose reaches the target pipe. */
  timeToPipe: number;
}

/**
 * Where the bot wants to fly right now. The strategy is to "ride" a line a
 * little above the bottom lip of the next gap: a flap lifts the bird
 * ~|FLAP_VY|^2 / 2g px, so as long as that rise stays below the top lip the
 * bird can hover through the gap indefinitely. For oscillating pipes the gap
 * edges are sampled over the whole transit window and the most restrictive
 * values are used.
 */
export function botView(g: GameState): BotView {
  const lvl = g.level;
  const target = g.pipes.find((p) => p.x + PIPE_W >= BIRD_X - BIRD_R);
  let aim: number;
  let gapTopBound = -Infinity;
  let gapBotBound = Infinity;
  let timeToPipe = Infinity;

  if (target) {
    const tEnter = Math.max(0, (target.x - (BIRD_X + BIRD_R)) / lvl.pipeSpeed);
    const tExit = Math.max(0, (target.x + PIPE_W + BIRD_R - BIRD_X) / lvl.pipeSpeed);
    timeToPipe = tEnter;
    for (const tau of [tEnter, (tEnter + tExit) / 2, tExit]) {
      const c = gapCenterAt(target, lvl, g.t + tau);
      gapTopBound = Math.max(gapTopBound, c - lvl.pipeGap / 2);
      gapBotBound = Math.min(gapBotBound, c + lvl.pipeGap / 2);
    }
    const margin = Math.min(24, lvl.pipeGap * 0.16);
    aim = gapBotBound - BIRD_R - margin;
    const highestSafe = gapTopBound + BIRD_R + 10;
    if (aim < highestSafe) {
      aim = (highestSafe + gapBotBound - BIRD_R) / 2;
    }
  } else {
    aim = PLAY_H * 0.55;
  }
  aim = Math.min(aim, PLAY_H - BIRD_R - 26);

  return { aim, gapTopBound, gapBotBound, timeToPipe };
}

function wantsFlap(g: GameState): boolean {
  const { aim, gapTopBound, gapBotBound, timeToPipe } = botView(g);

  const predY = g.y + g.vy * LOOKAHEAD + 0.5 * GRAVITY * LOOKAHEAD * LOOKAHEAD;
  if (predY < aim) return false;

  // Near or inside a pipe, don't flap into the top lip unless skipping the
  // flap would drop the bird into the bottom lip instead.
  if (timeToPipe < 0.4) {
    const flapPeak = g.y - (FLAP_VY * FLAP_VY) / (2 * GRAVITY);
    const mustFlap = g.y + g.vy * 0.05 > gapBotBound - BIRD_R - 8;
    if (!mustFlap && flapPeak < gapTopBound + BIRD_R + 6) return false;
  }
  return true;
}

/** A bot instance holds its flap cooldown; create one per level attempt. */
export function createBot(): (g: GameState) => boolean {
  let lastFlapT = -Infinity;
  return (g) => {
    if (g.status !== "playing") return false;
    if (g.t - lastFlapT < COOLDOWN) return false;
    if (!wantsFlap(g)) return false;
    lastFlapT = g.t;
    return true;
  };
}
