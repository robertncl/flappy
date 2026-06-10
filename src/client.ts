import {
  BIRD_R,
  BIRD_X,
  DT,
  GROUND_H,
  HEIGHT,
  PIPE_W,
  PLAY_H,
  WIDTH,
  createGame,
  gapCenterAt,
  mulberry32,
  step,
  type GameState,
} from "./engine";
import { botView, createBot } from "./bot";
import { LEVELS } from "./levels";

type Phase = "menu" | "playing" | "levelDone" | "dead" | "victory";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;

let levelIndex = 0;
let game: GameState = createGame(0);
let phase: Phase = "menu";
let phaseT = 0;
let botOn = false;
let bot = createBot();
let totalScore = 0;
let deaths = 0;
let flapQueued = false;

function setupCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(WIDTH * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();
window.addEventListener("resize", setupCanvas);

function startLevel(i: number): void {
  levelIndex = i;
  game = createGame(i);
  bot = createBot();
  phase = "playing";
  phaseT = 0;
  flapQueued = false;
}

function toMenu(): void {
  phase = "menu";
  phaseT = 0;
  levelIndex = 0;
  game = createGame(0);
}

function action(): void {
  if (phase === "menu") {
    totalScore = 0;
    deaths = 0;
    startLevel(levelIndex);
  } else if (phase === "playing") {
    flapQueued = true;
  } else if (phase === "dead") {
    startLevel(levelIndex);
  } else if (phase === "victory") {
    toMenu();
  }
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    action();
    return;
  }
  if (e.code === "KeyB") {
    botOn = !botOn;
    bot = createBot();
    return;
  }
  if (e.code === "KeyR" && phase !== "menu") {
    startLevel(levelIndex);
    return;
  }
  if (e.code === "Escape") {
    toMenu();
    return;
  }
  const digit = /^Digit(\d)$/.exec(e.code);
  if (digit) {
    const n = digit[1] === "0" ? 10 : Number(digit[1]);
    if (n >= 1 && n <= LEVELS.length) {
      totalScore = 0;
      deaths = 0;
      startLevel(n - 1);
    }
  }
});
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  action();
});

function update(): void {
  phaseT += DT;
  if (phase === "playing") {
    const flap = botOn ? bot(game) : flapQueued;
    flapQueued = false;
    step(game, flap);
    if (game.status === "complete") {
      totalScore += game.score;
      phase = levelIndex === LEVELS.length - 1 ? "victory" : "levelDone";
      phaseT = 0;
    } else if (game.status === "dead") {
      deaths++;
      phase = "dead";
      phaseT = 0;
    }
  } else if (phase === "levelDone") {
    if (phaseT > 1.4) startLevel(levelIndex + 1);
  } else if (phase === "dead") {
    if (botOn && phaseT > 0.9) startLevel(levelIndex);
  }
}

// --- decorations (clouds / stars), regenerated per level -------------------

interface Cloud { x: number; y: number; s: number; v: number }
interface Star { x: number; y: number; r: number; tw: number }
let decoLevel = -1;
let clouds: Cloud[] = [];
let stars: Star[] = [];

function ensureDeco(): void {
  if (decoLevel === levelIndex) return;
  decoLevel = levelIndex;
  const rng = mulberry32(game.level.seed ^ 0x9e3779b9);
  clouds = Array.from({ length: 6 }, () => ({
    x: rng() * (WIDTH + 240),
    y: 24 + rng() * 230,
    s: 0.7 + rng() * 0.9,
    v: 0.15 + rng() * 0.15,
  }));
  stars = Array.from({ length: 70 }, () => ({
    x: rng() * WIDTH,
    y: rng() * PLAY_H * 0.92,
    r: 0.5 + rng() * 1.4,
    tw: rng() * Math.PI * 2,
  }));
}

// --- rendering --------------------------------------------------------------

function drawSky(): void {
  const [top, bottom] = game.level.sky;
  const grad = ctx.createLinearGradient(0, 0, 0, PLAY_H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawStars(): void {
  ensureDeco();
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(game.t * 2 + s.tw));
    ctx.fillStyle = "#fdf6d8";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // moon
  ctx.fillStyle = "#f4eecb";
  ctx.beginPath();
  ctx.arc(WIDTH - 70, 80, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = game.level.sky[0];
  ctx.beginPath();
  ctx.arc(WIDTH - 80, 72, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(): void {
  ensureDeco();
  // sun
  ctx.fillStyle = "rgba(255,244,200,0.9)";
  ctx.beginPath();
  ctx.arc(WIDTH - 64, 70, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const span = WIDTH + 240;
  for (const c of clouds) {
    const cx = ((((c.x - game.t * game.level.pipeSpeed * c.v) % span) + span) % span) - 120;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, 34 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 24 * c.s, c.y + 4 * c.s, 24 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 26 * c.s, c.y + 5 * c.s, 20 * c.s, 9 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pipeGradient(x: number): CanvasGradient {
  const dark = game.level.dark;
  const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  grad.addColorStop(0, dark ? "#2c8c4f" : "#54ce6f");
  grad.addColorStop(0.45, dark ? "#1d6b3a" : "#33a852");
  grad.addColorStop(1, dark ? "#14502b" : "#1f7a3c");
  return grad;
}

function drawPipes(): void {
  const lvl = game.level;
  for (const p of game.pipes) {
    if (p.x > WIDTH + 10 || p.x + PIPE_W < -10) continue;
    const c = gapCenterAt(p, lvl, game.t);
    const gapTop = c - lvl.pipeGap / 2;
    const gapBot = c + lvl.pipeGap / 2;
    ctx.fillStyle = pipeGradient(p.x);
    ctx.fillRect(p.x, -2, PIPE_W, gapTop + 2);
    ctx.fillRect(p.x, gapBot, PIPE_W, PLAY_H - gapBot);
    // lips
    ctx.fillRect(p.x - 5, gapTop - 20, PIPE_W + 10, 20);
    ctx.fillRect(p.x - 5, gapBot, PIPE_W + 10, 20);
    ctx.strokeStyle = "rgba(0,40,15,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 5, gapTop - 20, PIPE_W + 10, 20);
    ctx.strokeRect(p.x - 5, gapBot, PIPE_W + 10, 20);
  }
}

function drawGround(): void {
  const dark = game.level.dark;
  ctx.fillStyle = dark ? "#6e5a3a" : "#caa157";
  ctx.fillRect(0, PLAY_H, WIDTH, GROUND_H);
  ctx.fillStyle = dark ? "#2f7a44" : "#67c357";
  ctx.fillRect(0, PLAY_H, WIDTH, 14);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  const stripe = 36;
  const off = (game.t * game.level.pipeSpeed) % stripe;
  for (let x = -stripe; x < WIDTH + stripe; x += stripe) {
    ctx.beginPath();
    ctx.moveTo(x - off, PLAY_H + 14);
    ctx.lineTo(x - off + 18, PLAY_H + 14);
    ctx.lineTo(x - off + 8, HEIGHT);
    ctx.lineTo(x - off - 10, HEIGHT);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBird(): void {
  let y = game.y;
  let angle = Math.max(-0.4, Math.min(1.1, game.vy / 520));
  if (phase === "menu") {
    y = PLAY_H / 2 + Math.sin(phaseT * 2.2) * 9;
    angle = Math.sin(phaseT * 2.2 + 1) * 0.12;
  }
  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate(angle);
  // body
  ctx.fillStyle = "#ffd34e";
  ctx.strokeStyle = "#d9a418";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // belly
  ctx.fillStyle = "rgba(255,243,196,0.9)";
  ctx.beginPath();
  ctx.arc(-1, 5, 7, 0, Math.PI * 2);
  ctx.fill();
  // wing
  const flapping = phase === "playing" && game.vy < 0;
  const wingRot = flapping ? Math.sin(game.t * 30) * 0.9 : 0.45;
  ctx.save();
  ctx.translate(-3, 1);
  ctx.rotate(wingRot);
  ctx.fillStyle = "#f5b62f";
  ctx.strokeStyle = "#d9a418";
  ctx.beginPath();
  ctx.ellipse(-3, 0, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(5, -4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = "#ff8c42";
  ctx.beginPath();
  ctx.moveTo(10, -1);
  ctx.lineTo(19, 1.5);
  ctx.lineTo(10, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBotAim(): void {
  const { aim } = botView(game);
  ctx.save();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, aim);
  ctx.lineTo(WIDTH, aim);
  ctx.stroke();
  ctx.restore();
}

function shadowText(
  text: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  align: CanvasTextAlign = "left",
): void {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function panel(w: number, h: number, cy: number): { x: number; y: number } {
  const x = (WIDTH - w) / 2;
  const y = cy - h / 2;
  ctx.fillStyle = "rgba(8,12,24,0.68)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  return { x, y };
}

function drawHud(): void {
  const lvl = game.level;
  shadowText(
    `Level ${levelIndex + 1}/${LEVELS.length} — ${lvl.name}`,
    14, 26, "600 15px system-ui, sans-serif", "#fff",
  );
  for (let i = 0; i < lvl.pipesToClear; i++) {
    ctx.fillStyle = i < game.score ? "#ffd34e" : "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(19 + i * 13, 40, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const liveScore =
    totalScore + (phase === "playing" || phase === "dead" ? game.score : 0);
  shadowText(`Score ${liveScore}`, WIDTH - 14, 26, "600 15px system-ui, sans-serif", "#fff", "right");
  shadowText(`Deaths ${deaths}`, WIDTH - 14, 46, "500 13px system-ui, sans-serif", "rgba(255,255,255,0.85)", "right");

  if (botOn) {
    const pulse = 0.75 + 0.25 * Math.sin(phaseT * 5);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#17c97e";
    ctx.beginPath();
    ctx.roundRect(WIDTH / 2 - 56, 50, 112, 24, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#05291a";
    ctx.fillText("AUTOPILOT", WIDTH / 2, 66);
  }
}

function drawMenu(): void {
  const { y } = panel(390, 330, HEIGHT / 2 - 20);
  shadowText("FLAPPY RUNS", WIDTH / 2, y + 62, "800 42px system-ui, sans-serif", "#ffd34e", "center");
  shadowText("10 levels · built-in autopilot", WIDTH / 2, y + 92, "500 15px system-ui, sans-serif", "#cfe3ff", "center");
  const lines: Array<[string, string]> = [
    ["Space / Click / ↑", "flap"],
    ["B", "toggle autopilot bot"],
    ["R", "restart level"],
    ["1–9, 0", "jump to a level"],
    ["Esc", "back to this menu"],
  ];
  let ly = y + 136;
  for (const [key, what] of lines) {
    shadowText(key, WIDTH / 2 - 16, ly, "700 15px system-ui, sans-serif", "#fff", "right");
    shadowText(what, WIDTH / 2 + 2, ly, "400 15px system-ui, sans-serif", "rgba(255,255,255,0.85)");
    ly += 27;
  }
  const pulse = 0.55 + 0.45 * Math.sin(phaseT * 3.5);
  ctx.globalAlpha = pulse;
  shadowText("Press Space to start", WIDTH / 2, y + 304, "700 18px system-ui, sans-serif", "#ffd34e", "center");
  ctx.globalAlpha = 1;
}

function drawLevelDone(): void {
  const { y } = panel(340, 130, HEIGHT / 2 - 40);
  shadowText(`LEVEL ${levelIndex + 1} CLEAR!`, WIDTH / 2, y + 52, "800 30px system-ui, sans-serif", "#7bf1a8", "center");
  const next = LEVELS[levelIndex + 1];
  if (next) {
    shadowText(`Next: ${next.name}`, WIDTH / 2, y + 92, "500 16px system-ui, sans-serif", "#fff", "center");
  }
}

function drawDead(): void {
  const flash = Math.max(0, 0.3 - phaseT * 0.6);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${flash})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  const { y } = panel(340, 150, HEIGHT / 2 - 40);
  shadowText("CRASHED", WIDTH / 2, y + 50, "800 32px system-ui, sans-serif", "#ff7a6b", "center");
  shadowText(
    `at pipe ${Math.min(game.score + 1, game.level.pipesToClear)} of ${game.level.pipesToClear}`,
    WIDTH / 2, y + 80, "500 15px system-ui, sans-serif", "#fff", "center",
  );
  shadowText(
    botOn ? "autopilot retrying…" : "Space — retry · Esc — menu",
    WIDTH / 2, y + 114, "600 15px system-ui, sans-serif", "#ffd34e", "center",
  );
}

function drawVictory(): void {
  const { y } = panel(380, 210, HEIGHT / 2 - 40);
  shadowText("ALL 10 LEVELS CLEAR!", WIDTH / 2, y + 58, "800 30px system-ui, sans-serif", "#ffd34e", "center");
  shadowText(`Total score ${totalScore}`, WIDTH / 2, y + 102, "600 19px system-ui, sans-serif", "#fff", "center");
  shadowText(`Deaths ${deaths}`, WIDTH / 2, y + 130, "500 16px system-ui, sans-serif", "rgba(255,255,255,0.85)", "center");
  const pulse = 0.55 + 0.45 * Math.sin(phaseT * 3.5);
  ctx.globalAlpha = pulse;
  shadowText("Space — play again", WIDTH / 2, y + 178, "700 16px system-ui, sans-serif", "#7bf1a8", "center");
  ctx.globalAlpha = 1;
}

function render(): void {
  drawSky();
  if (game.level.dark) drawStars();
  else drawClouds();
  drawPipes();
  drawGround();
  if (botOn && phase === "playing") drawBotAim();
  drawBird();
  drawHud();
  if (phase === "menu") drawMenu();
  else if (phase === "levelDone") drawLevelDone();
  else if (phase === "dead") drawDead();
  else if (phase === "victory") drawVictory();
}

// --- main loop: fixed-timestep simulation, render once per frame ------------

let last = performance.now();
let acc = 0;

function frame(now: number): void {
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (acc >= DT) {
    update();
    acc -= DT;
  }
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame((t) => {
  last = t;
  requestAnimationFrame(frame);
});
