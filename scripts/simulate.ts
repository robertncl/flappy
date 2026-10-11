/**
 * Headless bot run through the whole campaign.
 * Usage: bun run sim [difficulty]   (e.g. `bun run sim hard`; default normal)
 */
import { DT, createGame, step } from "../src/engine";
import { createBot } from "../src/bot";
import { DIFFICULTIES, NORMAL } from "../src/difficulty";
import { LEVELS } from "../src/levels";

const MAX_STEPS = 120 * 60;

const arg = process.argv[2];
const difficulty = arg
  ? DIFFICULTIES.findIndex((d) => d.name.toLowerCase() === arg.toLowerCase())
  : NORMAL;
if (difficulty < 0) {
  console.error(`Unknown difficulty "${arg}". Pick one of: ${DIFFICULTIES.map((d) => d.name).join(", ")}`);
  process.exit(2);
}

console.log(`Autopilot campaign run — ${DIFFICULTIES[difficulty]!.name}\n`);
console.log(
  "lvl".padEnd(5) +
    "name".padEnd(17) +
    "pipes".padEnd(7) +
    "flaps".padEnd(7) +
    "time".padEnd(8) +
    "result",
);
console.log("-".repeat(52));

let allClear = true;
let totalPipes = 0;
let totalTime = 0;

for (let i = 0; i < LEVELS.length; i++) {
  const level = LEVELS[i]!;
  const g = createGame(i, difficulty);
  const bot = createBot();
  let flaps = 0;
  let steps = 0;
  while (g.status === "playing" && steps < MAX_STEPS) {
    const flap = bot(g);
    if (flap) flaps++;
    step(g, flap);
    steps++;
  }
  const time = steps * DT;
  const ok = g.status === "complete";
  if (!ok) allClear = false;
  totalPipes += g.score;
  totalTime += time;
  console.log(
    String(level.id).padEnd(5) +
      level.name.padEnd(17) +
      `${g.score}/${level.pipesToClear}`.padEnd(7) +
      String(flaps).padEnd(7) +
      `${time.toFixed(1)}s`.padEnd(8) +
      (ok ? "CLEAR" : `FAILED (${g.status} at pipe ${g.score + 1})`),
  );
}

console.log("-".repeat(52));
console.log(
  `${allClear ? `All ${LEVELS.length} levels cleared` : "Campaign FAILED"} — ` +
    `${totalPipes} pipes in ${totalTime.toFixed(1)}s of flight time`,
);
process.exit(allClear ? 0 : 1);
