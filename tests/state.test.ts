import { describe, expect, test } from "bun:test";
import { DT } from "../src/engine";
import { LEVELS } from "../src/levels";
import {
  action,
  startCampaign,
  startLevel,
  state,
  toMenu,
  toggleBot,
  update,
  type Phase,
} from "../src/state";

// Setting state.phase to a literal narrows its type for the rest of the test
// even across calls into state.ts, so later `expect(state.phase).toBe(...)`
// checks against a *different* literal fail to typecheck. Casting through
// the union type here keeps the assignment honestly typed as `Phase`.
function setPhase(p: Phase): void {
  state.phase = p;
}

describe("startLevel", () => {
  test("enters playing on a fresh game at the given level", () => {
    startLevel(2);
    expect(state.levelIndex).toBe(2);
    expect(state.phase).toBe("playing");
    expect(state.phaseT).toBe(0);
    expect(state.flapQueued).toBe(false);
    expect(state.game.levelIndex).toBe(2);
    expect(state.game.status).toBe("playing");
  });

  test("gives the level a fresh bot instance", () => {
    startLevel(0);
    const before = state.bot;
    startLevel(0);
    expect(state.bot).not.toBe(before);
  });
});

describe("startCampaign", () => {
  test("resets score and deaths before starting the level", () => {
    startLevel(0);
    state.totalScore = 40;
    state.deaths = 3;
    startCampaign(1);
    expect(state.totalScore).toBe(0);
    expect(state.deaths).toBe(0);
    expect(state.levelIndex).toBe(1);
    expect(state.phase).toBe("playing");
  });
});

describe("toMenu", () => {
  test("returns to the menu at level 0, leaving score/deaths untouched", () => {
    startCampaign(3);
    state.totalScore = 12;
    state.deaths = 2;
    toMenu();
    expect(state.phase).toBe("menu");
    expect(state.levelIndex).toBe(0);
    expect(state.phaseT).toBe(0);
    expect(state.totalScore).toBe(12);
    expect(state.deaths).toBe(2);
  });
});

describe("toggleBot", () => {
  test("flips botOn and swaps in a new bot instance", () => {
    startLevel(0);
    state.botOn = false;
    const before = state.bot;
    toggleBot();
    expect(state.botOn).toBe(true);
    expect(state.bot).not.toBe(before);
    toggleBot();
    expect(state.botOn).toBe(false);
  });
});

describe("action", () => {
  test("from the menu, starts the campaign at the selected level", () => {
    toMenu();
    state.levelIndex = 4;
    state.totalScore = 99;
    action();
    expect(state.phase).toBe("playing");
    expect(state.totalScore).toBe(0);
    expect(state.levelIndex).toBe(4);
  });

  test("while playing, queues a flap without changing phase", () => {
    startLevel(0);
    state.flapQueued = false;
    action();
    expect(state.flapQueued).toBe(true);
    expect(state.phase).toBe("playing");
  });

  test("while dead, retries the same level without resetting score/deaths", () => {
    startLevel(2);
    setPhase("dead");
    state.totalScore = 20;
    state.deaths = 3;
    action();
    expect(state.phase).toBe("playing");
    expect(state.levelIndex).toBe(2);
    expect(state.totalScore).toBe(20);
    expect(state.deaths).toBe(3);
  });

  test("at victory, returns to the menu", () => {
    startLevel(0);
    setPhase("victory");
    action();
    expect(state.phase).toBe("menu");
    expect(state.levelIndex).toBe(0);
  });
});

describe("update", () => {
  test("always advances phaseT by one fixed timestep", () => {
    startLevel(0);
    state.phaseT = 0;
    update();
    expect(state.phaseT).toBeCloseTo(DT, 10);
  });

  test("consumes a queued flap during play and applies it to the game", () => {
    startLevel(0);
    state.flapQueued = true;
    const vyBefore = state.game.vy;
    update();
    expect(state.flapQueued).toBe(false);
    expect(state.game.vy).toBeLessThan(vyBefore);
  });

  test("on completing a non-final level, banks the score and moves to levelDone", () => {
    startLevel(0);
    state.game.status = "complete";
    state.game.score = 5;
    state.totalScore = 10;
    update();
    expect(state.totalScore).toBe(15);
    expect(state.phase).toBe("levelDone");
    expect(state.phaseT).toBe(0);
  });

  test("on completing the final level, moves to victory instead", () => {
    startLevel(LEVELS.length - 1);
    state.game.status = "complete";
    state.game.score = state.game.level.pipesToClear;
    update();
    expect(state.phase).toBe("victory");
  });

  test("on dying, counts a death and moves to dead", () => {
    startLevel(0);
    state.deaths = 0;
    state.game.status = "dead";
    update();
    expect(state.deaths).toBe(1);
    expect(state.phase).toBe("dead");
    expect(state.phaseT).toBe(0);
  });

  test("levelDone auto-advances to the next level after its delay", () => {
    startLevel(0);
    setPhase("levelDone");
    state.phaseT = 1.39; // + DT crosses the 1.4s threshold
    update();
    expect(state.phase).toBe("playing");
    expect(state.levelIndex).toBe(1);
  });

  test("levelDone does not advance before its delay elapses", () => {
    startLevel(0);
    setPhase("levelDone");
    state.phaseT = 0.5;
    update();
    expect(state.phase).toBe("levelDone");
    expect(state.levelIndex).toBe(0);
  });

  test("dead auto-retries the same level when autopilot is on, after its delay", () => {
    startLevel(3);
    setPhase("dead");
    state.botOn = true;
    state.phaseT = 0.89; // + DT crosses the 0.9s threshold
    update();
    expect(state.phase).toBe("playing");
    expect(state.levelIndex).toBe(3);
  });

  test("dead does not auto-retry when autopilot is off", () => {
    startLevel(3);
    setPhase("dead");
    state.botOn = false;
    state.phaseT = 5; // well past the delay
    update();
    expect(state.phase).toBe("dead");
  });
});
