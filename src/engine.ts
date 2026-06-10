import { LEVELS, type LevelConfig } from "./levels";

export const WIDTH = 480;
export const HEIGHT = 640;
export const GROUND_H = 80;
export const PLAY_H = HEIGHT - GROUND_H;
export const PIPE_W = 70;
export const BIRD_X = 120;
export const BIRD_R = 13;
export const GRAVITY = 1500;
export const FLAP_VY = -380;
export const MAX_FALL = 600;
/** Fixed simulation timestep (s). The engine is deterministic at this rate. */
export const DT = 1 / 60;

/** Margin kept between a gap's extremes and the ceiling/ground at spawn time. */
const SPAWN_MARGIN = 46;

export interface Pipe {
  x: number;
  baseCenter: number;
  phase: number;
  scored: boolean;
}

export type Status = "playing" | "dead" | "complete";

export interface GameState {
  level: LevelConfig;
  levelIndex: number;
  /** Bird vertical position (canvas coords, y grows downward). */
  y: number;
  vy: number;
  t: number;
  pipes: Pipe[];
  score: number;
  status: Status;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Small deterministic PRNG so level layouts are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gapCenterAt(pipe: Pipe, level: LevelConfig, t: number): number {
  if (level.oscAmplitude === 0) return pipe.baseCenter;
  return (
    pipe.baseCenter +
    level.oscAmplitude * Math.sin(2 * Math.PI * level.oscFrequency * t + pipe.phase)
  );
}

export function createGame(levelIndex: number): GameState {
  const level = LEVELS[levelIndex];
  if (!level) throw new Error(`No such level: ${levelIndex}`);
  const rng = mulberry32(level.seed);
  const minCenter = level.pipeGap / 2 + SPAWN_MARGIN + level.oscAmplitude;
  const maxCenter = PLAY_H - level.pipeGap / 2 - SPAWN_MARGIN - level.oscAmplitude;
  const pipes: Pipe[] = [];
  let center = PLAY_H / 2;
  for (let i = 0; i < level.pipesToClear; i++) {
    center = clamp(
      center + (rng() * 2 - 1) * level.maxCenterDelta,
      minCenter,
      maxCenter,
    );
    pipes.push({
      x: WIDTH + 120 + i * level.pipeSpacing,
      baseCenter: center,
      phase: rng() * Math.PI * 2,
      scored: false,
    });
  }
  return {
    level,
    levelIndex,
    y: PLAY_H / 2,
    vy: 0,
    t: 0,
    pipes,
    score: 0,
    status: "playing",
  };
}

function circleHitsRect(
  cx: number, cy: number, r: number,
  rx: number, ry: number, rw: number, rh: number,
): boolean {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/** Advance the game by one fixed timestep. Mutates `g` in place. */
export function step(g: GameState, flap: boolean): void {
  if (g.status !== "playing") return;
  g.t += DT;

  if (flap) g.vy = FLAP_VY;
  g.vy = Math.min(g.vy + GRAVITY * DT, MAX_FALL);
  g.y += g.vy * DT;
  if (g.y < BIRD_R) {
    g.y = BIRD_R;
    if (g.vy < 0) g.vy = 0;
  }

  const dx = g.level.pipeSpeed * DT;
  for (const p of g.pipes) {
    p.x -= dx;
    if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
      p.scored = true;
      g.score++;
    }
  }
  if (g.score >= g.level.pipesToClear) {
    g.status = "complete";
    return;
  }

  if (g.y + BIRD_R >= PLAY_H) {
    g.y = PLAY_H - BIRD_R;
    g.status = "dead";
    return;
  }

  for (const p of g.pipes) {
    if (p.x > BIRD_X + BIRD_R || p.x + PIPE_W < BIRD_X - BIRD_R) continue;
    const c = gapCenterAt(p, g.level, g.t);
    const gapTop = c - g.level.pipeGap / 2;
    const gapBot = c + g.level.pipeGap / 2;
    if (
      circleHitsRect(BIRD_X, g.y, BIRD_R, p.x, -200, PIPE_W, gapTop + 200) ||
      circleHitsRect(BIRD_X, g.y, BIRD_R, p.x, gapBot, PIPE_W, PLAY_H + 200 - gapBot)
    ) {
      g.status = "dead";
      return;
    }
  }
}
