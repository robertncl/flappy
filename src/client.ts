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
    const base = digit[1] === "0" ? 10 : Number(digit[1]);
    // Shift jumps to the upper bank (⇧1 = 11 … ⇧5 = 15).
    const n = e.shiftKey ? base + 10 : base;
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
interface Star { x: number; y: number; r: number; tw: number; hue: string }
interface Tuft { x: number; h: number; lean: number; shade: number }
interface Speck { x: number; y: number; r: number; a: number }
interface Flake { x: number; y: number; r: number; speed: number; sway: number; phase: number }
let decoLevel = -1;
let clouds: Cloud[] = [];
let stars: Star[] = [];
let tufts: Tuft[] = [];
let specks: Speck[] = [];
let flakes: Flake[] = [];

const GRASS_SPAN = WIDTH + 60;
const STAR_HUES = ["#fdf6d8", "#cfe6ff", "#ffe0e8", "#e2ffe9"];

function ensureDeco(): void {
  if (decoLevel === levelIndex) return;
  decoLevel = levelIndex;
  const rng = mulberry32(game.level.seed ^ 0x9e3779b9);
  clouds = Array.from({ length: 6 }, () => ({
    x: rng() * (WIDTH + 240),
    y: 24 + rng() * 210,
    s: 0.7 + rng() * 0.9,
    v: 0.15 + rng() * 0.15,
  }));
  stars = Array.from({ length: 80 }, () => ({
    x: rng() * WIDTH,
    y: rng() * PLAY_H * 0.92,
    r: 0.5 + rng() * 1.5,
    tw: rng() * Math.PI * 2,
    hue: STAR_HUES[(rng() * STAR_HUES.length) | 0]!,
  }));
  tufts = Array.from({ length: 46 }, () => ({
    x: rng() * GRASS_SPAN,
    h: 6 + rng() * 9,
    lean: (rng() * 2 - 1) * 0.5,
    shade: 0.55 + rng() * 0.45,
  }));
  specks = Array.from({ length: 60 }, () => ({
    x: rng() * WIDTH,
    y: PLAY_H + 18 + rng() * (GROUND_H - 22),
    r: 0.6 + rng() * 1.6,
    a: 0.05 + rng() * 0.12,
  }));
  const weather = game.level.weather;
  const n = weather === "snow" ? 90 : weather === "rain" ? 120 : 0;
  flakes = Array.from({ length: n }, () => ({
    x: rng() * WIDTH,
    y: rng() * PLAY_H,
    r: weather === "snow" ? 1 + rng() * 2.2 : 0.6 + rng() * 0.8,
    speed: weather === "snow" ? 30 + rng() * 40 : 320 + rng() * 160,
    sway: weather === "snow" ? 0.4 + rng() * 0.8 : 0,
    phase: rng() * Math.PI * 2,
  }));
}

/** Linear blend of two #rrggbb hex colours; returns an rgb() string. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
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

function drawAurora(): void {
  const a = game.level.aurora;
  if (!a) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const maxY = PLAY_H * 0.72;
  for (let i = 0; i < 3; i++) {
    const t = game.t * 0.25 + i * 2.1;
    const cx = (Math.sin(t) * 0.5 + 0.5) * WIDTH;
    const w = 110 + 36 * Math.sin(t * 1.7 + i);
    const grad = ctx.createLinearGradient(0, 0, 0, maxY);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.4, i % 2 ? a[1] : a[0]);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let y = 0; y <= maxY; y += 18) {
      const sx = cx + Math.sin(y * 0.012 + t * 2) * 28;
      ctx.lineTo(sx - w / 2, y);
    }
    for (let y = maxY; y >= 0; y -= 18) {
      const sx = cx + Math.sin(y * 0.012 + t * 2) * 28;
      ctx.lineTo(sx + w / 2, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawHills(): void {
  const color = game.level.hills;
  if (!color) return;
  const speed = game.level.pipeSpeed;
  const layers = [
    { amp: 32, base: PLAY_H - 22, k: 0.0125, v: 0.16, alpha: 0.5 },
    { amp: 52, base: PLAY_H - 2, k: 0.0085, v: 0.3, alpha: 0.85 },
  ];
  for (const L of layers) {
    const off = game.t * speed * L.v;
    ctx.globalAlpha = L.alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, PLAY_H);
    for (let x = 0; x <= WIDTH; x += 10) {
      const y =
        L.base -
        L.amp * (0.5 + 0.5 * Math.sin((x + off) * L.k)) -
        L.amp * 0.28 * Math.sin((x + off) * L.k * 2.3 + 1);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WIDTH, PLAY_H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStars(): void {
  ensureDeco();
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(game.t * 2 + s.tw));
    ctx.fillStyle = s.hue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // moon: soft halo, shaded disc, a few craters
  const mx = WIDTH - 78;
  const my = 78;
  const halo = ctx.createRadialGradient(mx, my, 8, mx, my, 62);
  halo.addColorStop(0, "rgba(244,238,203,0.4)");
  halo.addColorStop(1, "rgba(244,238,203,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, 62, 0, Math.PI * 2);
  ctx.fill();
  const disc = ctx.createRadialGradient(mx - 8, my - 8, 4, mx, my, 28);
  disc.addColorStop(0, "#fbf6d8");
  disc.addColorStop(1, "#d8d2a8");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(mx, my, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(176,168,128,0.5)";
  for (const [dx, dy, r] of [[-8, -4, 4], [6, 3, 5], [2, -9, 3]] as const) {
    ctx.beginPath();
    ctx.arc(mx + dx, my + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds(): void {
  ensureDeco();
  // sun with soft glow
  const sx = WIDTH - 68;
  const sy = 72;
  const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 92);
  glow.addColorStop(0, "rgba(255,244,200,0.85)");
  glow.addColorStop(1, "rgba(255,244,200,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 92, 0, Math.PI * 2);
  ctx.fill();
  const disc = ctx.createRadialGradient(sx - 6, sy - 6, 4, sx, sy, 30);
  disc.addColorStop(0, "#fffdf0");
  disc.addColorStop(1, "#ffe79a");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sx, sy, 30, 0, Math.PI * 2);
  ctx.fill();

  const span = WIDTH + 240;
  for (const c of clouds) {
    const cx = ((((c.x - game.t * game.level.pipeSpeed * c.v) % span) + span) % span) - 120;
    const grad = ctx.createLinearGradient(0, c.y - 16 * c.s, 0, c.y + 16 * c.s);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(1, "rgba(213,228,245,0.7)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, 36 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 26 * c.s, c.y + 5 * c.s, 26 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 28 * c.s, c.y + 6 * c.s, 22 * c.s, 11 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 4 * c.s, c.y - 9 * c.s, 20 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pipeColors(): [string, string, string] {
  const lvl = game.level;
  if (lvl.pipe) {
    const [light, dark] = lvl.pipe;
    return [light, mix(light, dark, 0.5), dark];
  }
  return lvl.dark
    ? ["#2c8c4f", "#1d6b3a", "#14502b"]
    : ["#54ce6f", "#33a852", "#1f7a3c"];
}

function pipeGradient(x: number, light: string, mid: string, dark: string): CanvasGradient {
  const grad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  grad.addColorStop(0, dark);
  grad.addColorStop(0.18, light);
  grad.addColorStop(0.42, mid);
  grad.addColorStop(1, dark);
  return grad;
}

function drawPipes(): void {
  const lvl = game.level;
  const [light, mid, dark] = pipeColors();
  const seg = 26;
  for (const p of game.pipes) {
    if (p.x > WIDTH + 10 || p.x + PIPE_W < -10) continue;
    const c = gapCenterAt(p, lvl, game.t);
    const gapTop = c - lvl.pipeGap / 2;
    const gapBot = c + lvl.pipeGap / 2;

    // bodies (cylindrical gradient)
    ctx.fillStyle = pipeGradient(p.x, light, mid, dark);
    ctx.fillRect(p.x, -2, PIPE_W, gapTop + 2);
    ctx.fillRect(p.x, gapBot, PIPE_W, PLAY_H - gapBot);

    // glossy vertical highlight band
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(p.x + PIPE_W * 0.16, -2, 5, gapTop + 2);
    ctx.fillRect(p.x + PIPE_W * 0.16, gapBot, 5, PLAY_H - gapBot);

    // horizontal segment banding for surface texture
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    for (let y = Math.ceil(0 / seg) * seg; y < gapTop - 20; y += seg) {
      ctx.beginPath();
      ctx.moveTo(p.x, y);
      ctx.lineTo(p.x + PIPE_W, y);
      ctx.stroke();
    }
    for (let y = Math.ceil((gapBot + 20) / seg) * seg; y < PLAY_H; y += seg) {
      ctx.beginPath();
      ctx.moveTo(p.x, y);
      ctx.lineTo(p.x + PIPE_W, y);
      ctx.stroke();
    }

    // inner rim shadow at the gap edges, for depth
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(p.x, gapTop - 4, PIPE_W, 4);
    ctx.fillRect(p.x, gapBot, PIPE_W, 4);

    // capped lips with their own gradient + top gloss
    const lipGrad = ctx.createLinearGradient(p.x - 6, 0, p.x + PIPE_W + 6, 0);
    lipGrad.addColorStop(0, dark);
    lipGrad.addColorStop(0.2, light);
    lipGrad.addColorStop(0.5, mid);
    lipGrad.addColorStop(1, dark);
    const lip = (y: number): void => {
      ctx.beginPath();
      ctx.roundRect(p.x - 6, y, PIPE_W + 12, 20, 5);
      ctx.fillStyle = lipGrad;
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(p.x - 4, y + 3, PIPE_W + 8, 3);
      ctx.beginPath();
      ctx.roundRect(p.x - 6, y, PIPE_W + 12, 20, 5);
      ctx.strokeStyle = "rgba(0,40,15,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    lip(gapTop - 20);
    lip(gapBot);
  }
}

function drawGround(): void {
  ensureDeco();
  const lvl = game.level;
  const [dirt, grass] = lvl.ground ?? (lvl.dark ? ["#6e5a3a", "#2f7a44"] : ["#caa157", "#67c357"]);

  // dirt with vertical shading
  const dg = ctx.createLinearGradient(0, PLAY_H, 0, HEIGHT);
  dg.addColorStop(0, mix(dirt, "#000000", 0.05));
  dg.addColorStop(1, mix(dirt, "#000000", 0.34));
  ctx.fillStyle = dg;
  ctx.fillRect(0, PLAY_H, WIDTH, GROUND_H);

  // scrolling dirt speckles
  const off = (game.t * lvl.pipeSpeed) % WIDTH;
  ctx.fillStyle = "#000";
  for (const s of specks) {
    const x = (((s.x - off) % WIDTH) + WIDTH) % WIDTH;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // grass band with a bright top edge
  const gg = ctx.createLinearGradient(0, PLAY_H, 0, PLAY_H + 16);
  gg.addColorStop(0, mix(grass, "#ffffff", 0.18));
  gg.addColorStop(1, grass);
  ctx.fillStyle = gg;
  ctx.fillRect(0, PLAY_H, WIDTH, 16);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(0, PLAY_H, WIDTH, 2);

  // scrolling grass tufts
  const goff = (game.t * lvl.pipeSpeed) % GRASS_SPAN;
  ctx.lineWidth = 2;
  for (const t of tufts) {
    const x = (((t.x - goff) % GRASS_SPAN) + GRASS_SPAN) % GRASS_SPAN;
    if (x > WIDTH + 6) continue;
    ctx.strokeStyle = mix(grass, "#0a3a1e", 1 - t.shade);
    ctx.beginPath();
    ctx.moveTo(x, PLAY_H + 15);
    ctx.quadraticCurveTo(
      x + t.lean * 6, PLAY_H + 15 - t.h * 0.6,
      x + t.lean * 10, PLAY_H + 15 - t.h,
    );
    ctx.stroke();
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
  // body with volumetric radial shading
  const body = ctx.createRadialGradient(-4, -5, 2, 0, 0, BIRD_R + 3);
  body.addColorStop(0, "#ffe9a0");
  body.addColorStop(0.55, "#ffd34e");
  body.addColorStop(1, "#f0ae2a");
  ctx.fillStyle = body;
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

function drawBirdShadow(): void {
  if (phase === "menu") return;
  const groundY = PLAY_H - 3;
  const k = 1 - Math.min(Math.max(0, groundY - game.y) / PLAY_H, 1);
  ctx.save();
  ctx.globalAlpha = 0.1 + 0.2 * k;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(BIRD_X, groundY, BIRD_R * (1.1 + 0.5 * k), 4 + 2 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWeather(): void {
  ensureDeco();
  if (flakes.length === 0) return;
  const snow = game.level.weather === "snow";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = "rgba(190,205,235,0.5)";
  ctx.lineWidth = 1;
  for (const f of flakes) {
    const y = (f.y + game.t * f.speed) % (PLAY_H + 10);
    if (snow) {
      const x = f.x + Math.sin(game.t * f.sway + f.phase) * 14;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(f.phase + game.t);
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(f.x, y);
      ctx.lineTo(f.x - 2, y + 10);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawVignette(): void {
  const g = ctx.createRadialGradient(
    WIDTH / 2, PLAY_H / 2, PLAY_H * 0.35,
    WIDTH / 2, PLAY_H / 2, PLAY_H * 0.95,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, game.level.dark ? "rgba(0,0,0,0.38)" : "rgba(0,0,0,0.15)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
  shadowText(`${LEVELS.length} levels · built-in autopilot`, WIDTH / 2, y + 92, "500 15px system-ui, sans-serif", "#cfe3ff", "center");
  const lines: Array<[string, string]> = [
    ["Space / Click / ↑", "flap"],
    ["B", "toggle autopilot bot"],
    ["R", "restart level"],
    ["1–0 · ⇧1–5", "jump to a level"],
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
  shadowText(`ALL ${LEVELS.length} LEVELS CLEAR!`, WIDTH / 2, y + 58, "800 30px system-ui, sans-serif", "#ffd34e", "center");
  shadowText(`Total score ${totalScore}`, WIDTH / 2, y + 102, "600 19px system-ui, sans-serif", "#fff", "center");
  shadowText(`Deaths ${deaths}`, WIDTH / 2, y + 130, "500 16px system-ui, sans-serif", "rgba(255,255,255,0.85)", "center");
  const pulse = 0.55 + 0.45 * Math.sin(phaseT * 3.5);
  ctx.globalAlpha = pulse;
  shadowText("Space — play again", WIDTH / 2, y + 178, "700 16px system-ui, sans-serif", "#7bf1a8", "center");
  ctx.globalAlpha = 1;
}

function render(): void {
  drawSky();
  if (game.level.dark) {
    drawAurora();
    drawStars();
  } else {
    drawClouds();
  }
  drawHills();
  drawPipes();
  drawGround();
  drawBirdShadow();
  if (botOn && phase === "playing") drawBotAim();
  drawBird();
  drawWeather();
  drawVignette();
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
