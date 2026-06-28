import { describe, expect, test } from "bun:test";
import { PLAY_H, createGame, step, type GameState } from "../src/engine";
import { createBot } from "../src/bot";
import { LEVELS } from "../src/levels";

/** Generous cap: no level should need more than 2 simulated minutes. */
const MAX_STEPS = 120 * 60;

function runBotThroughLevel(levelIndex: number): { g: GameState; steps: number } {
  const g = createGame(levelIndex);
  const bot = createBot();
  let steps = 0;
  while (g.status === "playing" && steps < MAX_STEPS) {
    step(g, bot(g));
    steps++;
  }
  return { g, steps };
}

test("the campaign has exactly 15 levels", () => {
  expect(LEVELS.length).toBe(15);
});

describe("bot clears every level", () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i]!;
    test(`level ${level.id} — ${level.name}`, () => {
      const { g, steps } = runBotThroughLevel(i);
      expect(g.status).toBe("complete");
      expect(g.score).toBe(level.pipesToClear);
      expect(steps).toBeLessThan(MAX_STEPS);
    });
  }
});

test("bot clears the full campaign back to back", () => {
  let totalPipes = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    const { g } = runBotThroughLevel(i);
    expect(g.status).toBe("complete");
    totalPipes += g.score;
  }
  expect(totalPipes).toBe(LEVELS.reduce((s, l) => s + l.pipesToClear, 0));
});

describe("engine sanity", () => {
  test("bird dies without input", () => {
    const g = createGame(0);
    for (let i = 0; i < MAX_STEPS && g.status === "playing"; i++) step(g, false);
    expect(g.status).toBe("dead");
  });

  test("levels are deterministic for a given seed", () => {
    const a = createGame(9);
    const b = createGame(9);
    expect(a.pipes).toEqual(b.pipes);
    const bot1 = createBot();
    const bot2 = createBot();
    for (let i = 0; i < 600; i++) {
      step(a, bot1(a));
      step(b, bot2(b));
    }
    expect(a.y).toBe(b.y);
    expect(a.score).toBe(b.score);
  });

  test("every gap stays inside the playfield even at full oscillation", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const g = createGame(i);
      const lvl = LEVELS[i]!;
      for (const p of g.pipes) {
        expect(p.baseCenter - lvl.pipeGap / 2 - lvl.oscAmplitude).toBeGreaterThan(0);
        expect(p.baseCenter + lvl.pipeGap / 2 + lvl.oscAmplitude).toBeLessThan(PLAY_H);
      }
    }
  });
});
