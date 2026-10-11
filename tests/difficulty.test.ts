import { describe, expect, test } from "bun:test";
import { createBot } from "../src/bot";
import { DIFFICULTIES, NORMAL, applyDifficulty } from "../src/difficulty";
import { PLAY_H, createGame, step } from "../src/engine";
import { LEVELS } from "../src/levels";

/** Generous cap: no level should need more than 2 simulated minutes. */
const MAX_STEPS = 120 * 60;

test("Normal plays every level exactly as authored", () => {
  for (const level of LEVELS) expect(applyDifficulty(level, NORMAL)).toEqual(level);
});

test("settings are ordered easiest first", () => {
  for (let d = 1; d < DIFFICULTIES.length; d++) {
    const easier = DIFFICULTIES[d - 1]!;
    const harder = DIFFICULTIES[d]!;
    expect(harder.gap).toBeLessThan(easier.gap);
    expect(harder.speed).toBeGreaterThan(easier.speed);
    expect(harder.osc).toBeGreaterThanOrEqual(easier.osc);
    expect(harder.delta).toBeGreaterThanOrEqual(easier.delta);
  }
});

test("out-of-range difficulties clamp to the nearest setting", () => {
  const level = LEVELS[5]!;
  expect(applyDifficulty(level, -1)).toEqual(applyDifficulty(level, 0));
  expect(applyDifficulty(level, 99)).toEqual(applyDifficulty(level, DIFFICULTIES.length - 1));
});

test("the game carries its difficulty and scaled level", () => {
  const g = createGame(3, 0);
  expect(g.difficulty).toBe(0);
  expect(g.level).toEqual(applyDifficulty(LEVELS[3]!, 0));
});

for (let d = 0; d < DIFFICULTIES.length; d++) {
  describe(`${DIFFICULTIES[d]!.name}`, () => {
    test("every gap stays inside the playfield even at full oscillation", () => {
      for (let i = 0; i < LEVELS.length; i++) {
        const g = createGame(i, d);
        const { pipeGap, oscAmplitude } = g.level;
        for (const p of g.pipes) {
          expect(p.baseCenter - pipeGap / 2 - oscAmplitude).toBeGreaterThan(0);
          expect(p.baseCenter + pipeGap / 2 + oscAmplitude).toBeLessThan(PLAY_H);
        }
      }
    });

    // The autopilot auto-retries on death, and levels are deterministic, so
    // a setting it can't clear would leave it crashing at the same pipe forever.
    test("the bot clears every level", () => {
      for (let i = 0; i < LEVELS.length; i++) {
        const g = createGame(i, d);
        const bot = createBot();
        for (let s = 0; s < MAX_STEPS && g.status === "playing"; s++) step(g, bot(g));
        expect(`level ${i + 1}: ${g.status}`).toBe(`level ${i + 1}: complete`);
      }
    });
  });
}
