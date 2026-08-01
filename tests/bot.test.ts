import { describe, expect, test } from "bun:test";
import { BIRD_R, PLAY_H, createGame, step, type GameState, type Pipe } from "../src/engine";
import { botView, createBot } from "../src/bot";
import { LEVELS, type LevelConfig } from "../src/levels";

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

  test("the bird's rise stops at the ceiling instead of leaving the playfield", () => {
    const g = createGame(0);
    g.y = BIRD_R - 5; // already pressed against the top edge
    g.vy = -300; // still climbing
    step(g, false);
    expect(g.y).toBe(BIRD_R);
    expect(g.vy).toBe(0);
    expect(g.status).toBe("playing");
  });

  test("the bird dies on hitting a pipe body, not only the ground", () => {
    const g = createGame(0);
    g.y = 40; // well above the ground, inside the reach of a pipe's upper body
    g.vy = 0;
    // Drop a pipe directly under the bird with its gap far below, so this
    // step's collision check must find the hit in the pipe loop, not the
    // ground check that runs just before it.
    const pipe: Pipe = { x: 110, baseCenter: PLAY_H - 40, phase: 0, scored: false }; // spans BIRD_X ± PIPE_W/2
    g.pipes = [pipe];
    step(g, false);
    expect(g.status).toBe("dead");
    expect(g.y).toBeLessThan(PLAY_H / 2); // didn't fall all the way to a ground death
  });
});

describe("botView", () => {
  test("tightens the aim line when the default margin would clip the top lip", () => {
    // A gap this narrow leaves no room for the bot's usual bottom-hugging
    // margin without risking the top lip, so botView should split the
    // difference instead of aiming at the (unreachable) default line.
    const level: LevelConfig = {
      id: 0,
      name: "test",
      seed: 1,
      pipesToClear: 1,
      pipeGap: 30,
      pipeSpeed: 150,
      pipeSpacing: 300,
      maxCenterDelta: 0,
      oscAmplitude: 0,
      oscFrequency: 0,
      dark: false,
      sky: ["#000000", "#000000"],
    };
    const pipe: Pipe = { x: 120, baseCenter: 300, phase: 0, scored: false };
    const g: GameState = {
      level,
      levelIndex: 0,
      y: 0,
      vy: 0,
      t: 0,
      pipes: [pipe],
      score: 0,
      status: "playing",
    };

    const { aim, gapTopBound, gapBotBound } = botView(g);
    const margin = Math.min(24, level.pipeGap * 0.16);
    const untightened = gapBotBound - BIRD_R - margin;
    const highestSafe = gapTopBound + BIRD_R + 10;

    expect(untightened).toBeLessThan(highestSafe); // confirms this gap needs tightening
    expect(aim).toBeCloseTo((highestSafe + gapBotBound - BIRD_R) / 2, 5);
  });
});
