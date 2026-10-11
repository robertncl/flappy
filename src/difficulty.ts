import type { LevelConfig } from "./levels";

export interface Difficulty {
  name: string;
  /** Multiplier on the vertical gap opening. */
  gap: number;
  /** Multiplier on the scroll speed (pipe spacing stays put, so this also sets the pace). */
  speed: number;
  /** Multiplier on the gap oscillation amplitude. */
  osc: number;
  /** Multiplier on the max jump between consecutive gap centers. */
  delta: number;
}

/**
 * Global difficulty settings, easiest first. Each one scales every level's
 * numeric fields, so the campaign's own ramp is kept at every setting.
 * "Normal" is the identity: it plays the levels exactly as authored.
 *
 * Above Normal the late levels are already near the bot's limit, so harder
 * settings lean on speed rather than more oscillation or jitter; the values
 * were picked so the bot still clears every level (see tests/difficulty.test.ts).
 */
export const DIFFICULTIES: Difficulty[] = [
  { name: "Chill", gap: 1.25, speed: 0.8, osc: 0.5, delta: 0.8 },
  { name: "Easy", gap: 1.12, speed: 0.9, osc: 0.75, delta: 0.9 },
  { name: "Normal", gap: 1, speed: 1, osc: 1, delta: 1 },
  { name: "Hard", gap: 0.96, speed: 1.15, osc: 1, delta: 1 },
  { name: "Brutal", gap: 0.94, speed: 1.3, osc: 1, delta: 1 },
];

export const NORMAL = DIFFICULTIES.findIndex((d) => d.name === "Normal");

export function clampDifficulty(d: number): number {
  if (!Number.isFinite(d)) return NORMAL;
  return Math.min(Math.max(Math.round(d), 0), DIFFICULTIES.length - 1);
}

/** The level as it plays at difficulty `d` (an index into DIFFICULTIES). */
export function applyDifficulty(level: LevelConfig, d: number): LevelConfig {
  const k = DIFFICULTIES[clampDifficulty(d)]!;
  return {
    ...level,
    pipeGap: Math.round(level.pipeGap * k.gap),
    pipeSpeed: Math.round(level.pipeSpeed * k.speed),
    oscAmplitude: Math.round(level.oscAmplitude * k.osc),
    maxCenterDelta: Math.round(level.maxCenterDelta * k.delta),
  };
}
