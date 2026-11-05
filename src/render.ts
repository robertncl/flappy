import {
  BIRD_R,
  BIRD_X,
  GROUND_H,
  HEIGHT,
  PIPE_W,
  PLAY_H,
  WIDTH,
  gapCenterAt,
  mulberry32,
} from "./engine";
import { botView } from "./bot";
import { LANGUAGES, language, strings } from "./i18n";
import { LEVELS } from "./levels";
import { state } from "./state";
import {
  CLOUD_H,
  CLOUD_W,
  GROUND_LIP,
  GROUND_TILE,
  HILL_H,
  HILL_PARALLAX,
  HILL_PERIOD,
  LIP_H,
  LIP_W,
  TEX_SCALE,
  buildLevelTextures,
  paintMoon,
  type LevelTextures,
} from "./textures";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

function resizeCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(WIDTH * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Grab the canvas context and start tracking DPR/resize. Call once at startup. */
export function initRenderer(el: HTMLCanvasElement): void {
  canvas = el;
  // Opaque context: the game paints every pixel every frame, so an alpha
  // channel would only add compositing work.
  ctx = canvas.getContext("2d", { alpha: false })!;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

// --- decorations + textures, regenerated per level ---------------------------

interface Cloud { x: number; y: number; s: number; v: number; sprite: number }
interface Star { x: number; y: number; r: number; tw: number; hue: string }
interface Flake { x: number; y: number; r: number; speed: number; sway: number; phase: number }

/**
 * Everything that is constant for a level. Textures are painted once per
 * level by src/textures.ts; the patterns wrapping them and the aurora
 * gradients are built here once too, so frames only blit and fill.
 */
interface LevelRenderCache {
  tex: LevelTextures;
  /** Pipe body texture, tiled vertically, in pipe-local CSS px. */
  pipe: CanvasPattern;
  /** Ground texture, tiled horizontally, in CSS px. */
  ground: CanvasPattern;
  aurora: [CanvasGradient, CanvasGradient] | null;
}

/**
 * Painted textures by level index: the current level plus, once its banner
 * is up, the next one. Painting takes tens of ms, so the next level's
 * textures are painted during the frozen "level clear" pause rather than on
 * the first frame of play.
 */
const texCache = new Map<number, LevelTextures>();

function texturesFor(i: number): LevelTextures {
  let tex = texCache.get(i);
  if (!tex) {
    // Textures are cosmetic, so they come from the authored level, not the
    // difficulty-scaled copy in game.level.
    tex = buildLevelTextures(LEVELS[i]!);
    texCache.set(i, tex);
  }
  return tex;
}

let decoLevel = -1;
let clouds: Cloud[] = [];
let stars: Star[] = [];
let flakes: Flake[] = [];
let rc: LevelRenderCache | null = null;

// Level-independent gradients/sprites, created lazily on first use and kept forever.
let sunGlow: CanvasGradient | null = null;
let sunDisc: CanvasGradient | null = null;
let moonHalo: CanvasGradient | null = null;
let moonSprite: HTMLCanvasElement | null = null;
let birdBody: CanvasGradient | null = null;
let vignetteDark: CanvasGradient | null = null;
let vignetteLight: CanvasGradient | null = null;

const STAR_HUES = ["#fdf6d8", "#cfe6ff", "#ffe0e8", "#e2ffe9"];
const MOON_R = 26;

/** A pattern over a TEX_SCALE canvas, scaled back so one texel = 1/TEX_SCALE CSS px. */
function texPattern(src: HTMLCanvasElement, repeat: string): CanvasPattern {
  const p = ctx.createPattern(src, repeat)!;
  p.setTransform(new DOMMatrix([1 / TEX_SCALE, 0, 0, 1 / TEX_SCALE, 0, 0]));
  return p;
}

function ensureDeco(): void {
  if (decoLevel === state.levelIndex) return;
  decoLevel = state.levelIndex;
  const { game } = state;
  const lvl = game.level;
  const rng = mulberry32(lvl.seed ^ 0x9e3779b9);
  clouds = Array.from({ length: 6 }, (_, i) => ({
    x: rng() * (WIDTH + 240),
    y: 24 + rng() * 210,
    s: 0.7 + rng() * 0.9,
    v: 0.15 + rng() * 0.15,
    sprite: i % 4,
  }));
  stars = Array.from({ length: 80 }, () => ({
    x: rng() * WIDTH,
    y: rng() * PLAY_H * 0.92,
    r: 0.5 + rng() * 1.5,
    tw: rng() * Math.PI * 2,
    hue: STAR_HUES[(rng() * STAR_HUES.length) | 0]!,
  }));
  const weather = lvl.weather;
  const n = weather === "snow" ? 90 : weather === "rain" ? 120 : 0;
  flakes = Array.from({ length: n }, () => ({
    x: rng() * WIDTH,
    y: rng() * PLAY_H,
    r: weather === "snow" ? 1 + rng() * 2.2 : 0.6 + rng() * 0.8,
    speed: weather === "snow" ? 30 + rng() * 40 : 320 + rng() * 160,
    sway: weather === "snow" ? 0.4 + rng() * 0.8 : 0,
    phase: rng() * Math.PI * 2,
  }));

  let aurora: LevelRenderCache["aurora"] = null;
  if (lvl.aurora) {
    aurora = [0, 1].map((i) => {
      const g = ctx.createLinearGradient(0, 0, 0, PLAY_H * 0.72);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.4, lvl.aurora![i]!);
      g.addColorStop(1, "rgba(0,0,0,0)");
      return g;
    }) as [CanvasGradient, CanvasGradient];
  }

  const tex = texturesFor(state.levelIndex);
  for (const k of texCache.keys()) if (k !== state.levelIndex) texCache.delete(k);
  rc = {
    tex,
    pipe: texPattern(tex.pipeBody, "repeat"),
    ground: texPattern(tex.ground, "repeat-x"),
    aurora,
  };
}

// --- rendering --------------------------------------------------------------

function drawSky(): void {
  // Only the playfield: the ground fill fully overdraws the bottom strip.
  ctx.drawImage(rc!.tex.sky, 0, 0, WIDTH, PLAY_H);
}

function drawAurora(): void {
  const a = rc!.aurora;
  if (!a) return;
  const { game } = state;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const maxY = PLAY_H * 0.72;
  for (let i = 0; i < 3; i++) {
    const t = game.t * 0.25 + i * 2.1;
    const cx = (Math.sin(t) * 0.5 + 0.5) * WIDTH;
    const w = 110 + 36 * Math.sin(t * 1.7 + i);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = a[i % 2]!;
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
  const { game } = state;
  const layers = rc!.tex.hills;
  for (let i = 0; i < layers.length; i++) {
    const off = (game.t * game.level.pipeSpeed * HILL_PARALLAX[i]!) % HILL_PERIOD;
    const y = PLAY_H - HILL_H;
    ctx.drawImage(layers[i]!, -off, y, HILL_PERIOD, HILL_H);
    if (HILL_PERIOD - off < WIDTH) ctx.drawImage(layers[i]!, HILL_PERIOD - off, y, HILL_PERIOD, HILL_H);
  }
}

function drawStars(): void {
  ensureDeco();
  const { game } = state;
  for (const s of stars) {
    ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(game.t * 2 + s.tw));
    ctx.fillStyle = s.hue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // moon: soft halo, then the pre-painted cratered disc (fixed spot)
  const mx = WIDTH - 78;
  const my = 78;
  if (!moonHalo) {
    moonHalo = ctx.createRadialGradient(mx, my, 8, mx, my, 62);
    moonHalo.addColorStop(0, "rgba(244,238,203,0.4)");
    moonHalo.addColorStop(1, "rgba(244,238,203,0)");
    moonSprite = paintMoon(MOON_R);
  }
  ctx.fillStyle = moonHalo;
  ctx.beginPath();
  ctx.arc(mx, my, 62, 0, Math.PI * 2);
  ctx.fill();
  const size = MOON_R * 2 + 2;
  ctx.drawImage(moonSprite!, mx - size / 2, my - size / 2, size, size);
}

function drawClouds(): void {
  ensureDeco();
  const { game } = state;
  // sun with soft glow (gradients cached — fixed spot)
  const sx = WIDTH - 68;
  const sy = 72;
  if (!sunGlow) {
    sunGlow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 92);
    sunGlow.addColorStop(0, "rgba(255,244,200,0.85)");
    sunGlow.addColorStop(1, "rgba(255,244,200,0)");
    sunDisc = ctx.createRadialGradient(sx - 6, sy - 6, 4, sx, sy, 30);
    sunDisc.addColorStop(0, "#fffdf0");
    sunDisc.addColorStop(1, "#ffe79a");
  }
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sx, sy, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sunDisc!;
  ctx.beginPath();
  ctx.arc(sx, sy, 30, 0, Math.PI * 2);
  ctx.fill();

  const sprites = rc!.tex.clouds;
  const span = WIDTH + 240;
  for (const c of clouds) {
    const cx = ((((c.x - game.t * game.level.pipeSpeed * c.v) % span) + span) % span) - 120;
    const w = CLOUD_W * c.s * 0.75;
    const h = CLOUD_H * c.s * 0.75;
    ctx.drawImage(sprites[c.sprite]!, cx - w / 2, c.y - h * 0.6, w, h);
  }
}

function drawPipes(): void {
  const { game } = state;
  const lvl = game.level;
  const { pipe, tex } = rc!;
  ctx.fillStyle = pipe;
  for (const p of game.pipes) {
    if (p.x + PIPE_W < -10) continue;
    if (p.x > WIDTH + 10) break; // pipes are sorted by x
    const c = gapCenterAt(p, lvl, game.t);
    const gapTop = c - lvl.pipeGap / 2;
    const gapBot = c + lvl.pipeGap / 2;

    // Bodies: the texture is anchored at each gap edge so it travels with
    // oscillating pipes instead of sliding under them.
    ctx.save();
    ctx.translate(p.x, gapTop);
    ctx.fillRect(0, -gapTop - 2, PIPE_W, gapTop + 2);
    ctx.translate(0, gapBot - gapTop);
    ctx.fillRect(0, 0, PIPE_W, PLAY_H - gapBot);
    ctx.restore();

    // inner rim shadow at the gap edges, for depth
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(p.x, gapTop - 6, PIPE_W, 6);
    ctx.fillRect(p.x, gapBot, PIPE_W, 6);
    ctx.fillStyle = pipe;

    ctx.drawImage(tex.lip, p.x - 6, gapTop - LIP_H, LIP_W, LIP_H);
    ctx.drawImage(tex.lip, p.x - 6, gapBot, LIP_W, LIP_H);
  }
}

function drawGround(): void {
  ensureDeco();
  const { game } = state;
  // The texture starts GROUND_LIP above the ground line, so blades, drifts
  // and rocks overlap the pipe bases; below the line it is fully opaque.
  const off = (game.t * game.level.pipeSpeed) % GROUND_TILE;
  ctx.save();
  ctx.translate(-off, PLAY_H - GROUND_LIP);
  ctx.fillStyle = rc!.ground;
  ctx.fillRect(0, 0, WIDTH + GROUND_TILE, GROUND_H + GROUND_LIP);
  ctx.restore();
}

function drawBird(): void {
  const { game, phase, phaseT } = state;
  let y = game.y;
  let angle = Math.max(-0.4, Math.min(1.1, game.vy / 520));
  if (phase === "menu") {
    y = PLAY_H / 2 + Math.sin(phaseT * 2.2) * 9;
    angle = Math.sin(phaseT * 2.2 + 1) * 0.12;
  }
  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate(angle);
  // body with volumetric radial shading (gradient cached — local coords)
  if (!birdBody) {
    birdBody = ctx.createRadialGradient(-4, -5, 2, 0, 0, BIRD_R + 3);
    birdBody.addColorStop(0, "#ffe9a0");
    birdBody.addColorStop(0.55, "#ffd34e");
    birdBody.addColorStop(1, "#f0ae2a");
  }
  ctx.fillStyle = birdBody;
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
  const { game, phase } = state;
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
  const { game } = state;
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

function makeVignette(edgeAlpha: number): CanvasGradient {
  const g = ctx.createRadialGradient(
    WIDTH / 2, PLAY_H / 2, PLAY_H * 0.35,
    WIDTH / 2, PLAY_H / 2, PLAY_H * 0.95,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${edgeAlpha})`);
  return g;
}

function drawVignette(): void {
  if (state.game.level.dark) {
    ctx.fillStyle = (vignetteDark ??= makeVignette(0.38));
  } else {
    ctx.fillStyle = (vignetteLight ??= makeVignette(0.15));
  }
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawBotAim(): void {
  const { aim } = botView(state.game);
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

/**
 * `font` with its px size scaled down just enough for `text` to fit
 * `maxWidth`. Translations run longer than the English the panels were
 * sized for, so long strings shrink rather than spill out.
 */
function fitFont(text: string, font: string, maxWidth: number): string {
  ctx.font = font;
  const w = ctx.measureText(text).width;
  if (w <= maxWidth) return font;
  return font.replace(/(\d+(?:\.\d+)?)px/, (_, px: string) => `${((Number(px) * maxWidth) / w).toFixed(1)}px`);
}

function shadowText(
  text: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  align: CanvasTextAlign = "left",
  maxWidth = Infinity,
): void {
  // Two-pass draw instead of shadowBlur: blur shadows force an expensive
  // Gaussian pass per fillText, and at these sizes a hard offset reads the same.
  ctx.font = fitFont(text, font, maxWidth);
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillText(text, x + 1, y + 2);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
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
  const { game, levelIndex, phase, phaseT, totalScore, deaths, botOn } = state;
  const lvl = game.level;
  const t = strings();
  shadowText(
    t.hudLevel(levelIndex + 1, LEVELS.length, t.levels[levelIndex]!),
    14, 26, "600 15px system-ui, sans-serif", "#fff", "left", 330,
  );
  for (let i = 0; i < lvl.pipesToClear; i++) {
    ctx.fillStyle = i < game.score ? "#ffd34e" : "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(19 + i * 13, 40, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const liveScore = totalScore + (phase === "playing" || phase === "dead" ? game.score : 0);
  shadowText(t.score(liveScore), WIDTH - 14, 26, "600 15px system-ui, sans-serif", "#fff", "right");
  shadowText(t.deaths(deaths), WIDTH - 14, 46, "500 13px system-ui, sans-serif", "rgba(255,255,255,0.85)", "right");
  // The menu shows the pending selection itself; in play, show what this run uses.
  if (phase !== "menu") {
    shadowText(t.difficulties[game.difficulty]!, WIDTH - 14, 64, "600 12px system-ui, sans-serif", "rgba(255,255,255,0.85)", "right");
  }

  if (botOn) {
    const pulse = 0.75 + 0.25 * Math.sin(phaseT * 5);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#17c97e";
    ctx.beginPath();
    ctx.roundRect(WIDTH / 2 - 56, 50, 112, 24, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = fitFont(t.autopilot, "700 12px system-ui, sans-serif", 100);
    ctx.textAlign = "center";
    ctx.fillStyle = "#05291a";
    ctx.fillText(t.autopilot, WIDTH / 2, 66);
  }
}

function drawMenu(): void {
  const { phaseT, difficulty } = state;
  const t = strings();
  const langName = LANGUAGES.find((l) => l.code === language())!.name;
  const { y } = panel(390, 372, HEIGHT / 2 - 20);
  shadowText("FLAPPY RUNS", WIDTH / 2, y + 62, "800 42px system-ui, sans-serif", "#ffd34e", "center");
  shadowText(t.subtitle(LEVELS.length), WIDTH / 2, y + 92, "500 15px system-ui, sans-serif", "#cfe3ff", "center", 360);
  const lines: Array<[string, string]> = [
    [t.keyFlap, t.flap],
    ["B", t.toggleBot],
    ["R", t.restart],
    ["1–0 · ⇧1–5", t.jump],
    ["← / →", t.difficulty(t.difficulties[difficulty]!)],
    ["L", t.language(langName)],
    ["Esc", t.backToMenu],
  ];
  let ly = y + 136;
  for (const [key, what] of lines) {
    shadowText(key, WIDTH / 2 - 16, ly, "700 15px system-ui, sans-serif", "#fff", "right", 165);
    shadowText(what, WIDTH / 2 + 2, ly, "400 15px system-ui, sans-serif", "rgba(255,255,255,0.85)", "left", 178);
    ly += 27;
  }
  const pulse = 0.55 + 0.45 * Math.sin(phaseT * 3.5);
  ctx.globalAlpha = pulse;
  shadowText(t.pressStart, WIDTH / 2, y + 346, "700 18px system-ui, sans-serif", "#ffd34e", "center", 360);
  ctx.globalAlpha = 1;
}

function drawLevelDone(): void {
  const { levelIndex } = state;
  const t = strings();
  const { y } = panel(340, 130, HEIGHT / 2 - 40);
  shadowText(t.levelClear(levelIndex + 1), WIDTH / 2, y + 52, "800 30px system-ui, sans-serif", "#7bf1a8", "center", 312);
  const next = t.levels[levelIndex + 1];
  if (next) {
    shadowText(t.next(next), WIDTH / 2, y + 92, "500 16px system-ui, sans-serif", "#fff", "center", 312);
  }
}

function drawDead(): void {
  const { game, phaseT, botOn } = state;
  const flash = Math.max(0, 0.3 - phaseT * 0.6);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${flash})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  const t = strings();
  const { y } = panel(340, 150, HEIGHT / 2 - 40);
  shadowText(t.crashed, WIDTH / 2, y + 50, "800 32px system-ui, sans-serif", "#ff7a6b", "center", 312);
  shadowText(
    t.atPipe(Math.min(game.score + 1, game.level.pipesToClear), game.level.pipesToClear),
    WIDTH / 2, y + 80, "500 15px system-ui, sans-serif", "#fff", "center", 312,
  );
  shadowText(
    botOn ? t.retrying : t.retryHint,
    WIDTH / 2, y + 114, "600 15px system-ui, sans-serif", "#ffd34e", "center", 312,
  );
}

function drawVictory(): void {
  const { phaseT, totalScore, deaths, game } = state;
  const t = strings();
  const { y } = panel(380, 210, HEIGHT / 2 - 40);
  shadowText(t.victory(LEVELS.length), WIDTH / 2, y + 58, "800 30px system-ui, sans-serif", "#ffd34e", "center", 352);
  shadowText(t.totalScore(totalScore), WIDTH / 2, y + 102, "600 19px system-ui, sans-serif", "#fff", "center", 352);
  shadowText(
    t.deathsOn(deaths, t.difficulties[game.difficulty]!),
    WIDTH / 2, y + 130, "500 16px system-ui, sans-serif", "rgba(255,255,255,0.85)", "center", 352,
  );
  const pulse = 0.55 + 0.45 * Math.sin(phaseT * 3.5);
  ctx.globalAlpha = pulse;
  shadowText(t.playAgain, WIDTH / 2, y + 178, "700 16px system-ui, sans-serif", "#7bf1a8", "center", 352);
  ctx.globalAlpha = 1;
}

export function render(): void {
  ensureDeco(); // (re)build per-level decorations and gradient cache
  if (state.phase === "levelDone" && state.phaseT > 0.15) texturesFor(state.levelIndex + 1);
  const { game, phase, botOn } = state;
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
