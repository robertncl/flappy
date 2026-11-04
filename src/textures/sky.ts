import { PLAY_H, WIDTH, mulberry32 } from "../engine";
import type { LevelConfig, Terrain } from "../levels";
import { between, dot, grain, lighten, mix, rgba, surface, type Grain, type Rng } from "./paint";

/** Unscaled cloud sprite size. */
export const CLOUD_W = 150;
export const CLOUD_H = 72;

export function paintSky(lvl: LevelConfig, terrain: Terrain, rng: Rng, grainTile: Grain): HTMLCanvasElement {
  const [cv, g] = surface(WIDTH, PLAY_H);
  const [zenith, horizon] = lvl.sky;
  const gr = g.createLinearGradient(0, 0, 0, PLAY_H);
  gr.addColorStop(0, zenith);
  gr.addColorStop(0.55, mix(zenith, horizon, 0.55));
  gr.addColorStop(0.88, horizon);
  gr.addColorStop(1, lighten(horizon, lvl.dark ? 0.08 : 0.2));
  g.fillStyle = gr;
  g.fillRect(0, 0, WIDTH, PLAY_H);

  if (!lvl.dark) {
    // broad warm bloom around the sun, then faint high cirrus streaks
    const bloom = g.createRadialGradient(WIDTH - 68, 72, 20, WIDTH - 68, 72, 420);
    bloom.addColorStop(0, "rgba(255,246,214,0.35)");
    bloom.addColorStop(1, "rgba(255,246,214,0)");
    g.fillStyle = bloom;
    g.fillRect(0, 0, WIDTH, PLAY_H);
    for (let i = 0; i < 9; i++) {
      const x = rng() * WIDTH;
      const y = between(rng, 20, PLAY_H * 0.45);
      const len = between(rng, 60, 160);
      g.save();
      g.translate(x, y);
      g.rotate(between(rng, -0.12, 0.05));
      g.scale(1, 0.08);
      const c = g.createRadialGradient(0, 0, 0, 0, 0, len);
      c.addColorStop(0, `rgba(255,255,255,${between(rng, 0.12, 0.25)})`);
      c.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = c;
      dot(g, 0, 0, len);
      g.restore();
    }
  } else {
    // a Milky Way band of soft blobs, dark dust lanes and fine static stars
    const glowCol = lvl.aurora ? mix(lvl.aurora[0], "#ffffff", 0.3) : lighten(horizon, 0.45);
    const nebula = terrain === "void";
    const x0 = -40;
    const y0 = PLAY_H * 0.75;
    const x1 = WIDTH + 40;
    const y1 = PLAY_H * 0.05;
    for (let i = 0; i < (nebula ? 70 : 45); i++) {
      const t = rng();
      const x = x0 + (x1 - x0) * t + between(rng, -30, 30);
      const y = y0 + (y1 - y0) * t + between(rng, -40, 40);
      const r = between(rng, 20, nebula ? 70 : 50);
      const col = nebula && lvl.aurora && rng() < 0.5 ? lvl.aurora[1] : glowCol;
      const b = g.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, rgba(col, between(rng, 0.04, nebula ? 0.12 : 0.08)));
      b.addColorStop(1, rgba(col, 0));
      g.fillStyle = b;
      dot(g, x, y, r);
    }
    for (let i = 0; i < 10; i++) {
      const t = rng();
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t + between(rng, -12, 12);
      const r = between(rng, 10, 26);
      const b = g.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, rgba(zenith, 0.35));
      b.addColorStop(1, rgba(zenith, 0));
      g.fillStyle = b;
      dot(g, x, y, r);
    }
    for (let i = 0; i < 420; i++) {
      // denser near the band
      const t = rng();
      const near = rng() < 0.6;
      const x = near ? x0 + (x1 - x0) * t + between(rng, -50, 50) : rng() * WIDTH;
      const y = near ? y0 + (y1 - y0) * t + between(rng, -60, 60) : rng() * PLAY_H * 0.9;
      g.fillStyle = `rgba(255,255,255,${between(rng, 0.15, 0.6)})`;
      dot(g, x, y, between(rng, 0.25, 0.7));
    }
  }
  // dither so the long gradients don't band
  grain(g, grainTile, WIDTH, PLAY_H, 0.03);
  return cv;
}

/**
 * A soft volumetric cloud. The puffs are first merged into one silhouette,
 * then lit as a whole (bright crown, sky-tinted underside) with faint shading
 * between lobes, so it reads as one mass rather than a cluster of balls.
 */
export function paintCloud(lvl: LevelConfig, rng: Rng): HTMLCanvasElement {
  const [cv, g] = surface(CLOUD_W, CLOUD_H);
  const under = mix(mix("#ffffff", lvl.sky[0], 0.5), "#5a6880", 0.28);
  const baseY = CLOUD_H - 14;
  const puffs: { x: number; y: number; r: number }[] = [];
  const n = 9 + ((rng() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = between(rng, 11, 17) * (1 - Math.abs(t - 0.5) * 0.8);
    puffs.push({ x: 20 + t * (CLOUD_W - 40), y: baseY - r * between(rng, 0.2, 0.6), r });
  }
  const crowns = 3 + ((rng() * 2) | 0);
  for (let i = 0; i < crowns; i++) {
    const t = (i + 0.5) / crowns;
    puffs.push({ x: CLOUD_W * (0.28 + t * 0.44) + between(rng, -6, 6), y: baseY - between(rng, 16, 26), r: between(rng, 13, 20) });
  }

  g.save();
  g.beginPath();
  g.rect(0, 0, CLOUD_W, baseY + 2);
  g.clip(); // flat base
  g.fillStyle = "#ffffff";
  for (const p of puffs) dot(g, p.x, p.y, p.r);
  g.restore();

  g.save();
  g.globalCompositeOperation = "source-atop";
  const light = g.createLinearGradient(0, baseY - 46, 0, baseY + 2);
  light.addColorStop(0, "#ffffff");
  light.addColorStop(0.45, mix("#ffffff", under, 0.15));
  light.addColorStop(1, under);
  g.fillStyle = light;
  g.fillRect(0, 0, CLOUD_W, CLOUD_H);
  // faint shade tucked under each lobe, so the folds read
  for (const p of puffs) {
    const sx = p.x + p.r * 0.35;
    const sy = p.y + p.r * 0.55;
    const sh = g.createRadialGradient(sx, sy, 0, sx, sy, p.r * 0.9);
    sh.addColorStop(0, rgba(under, 0.28));
    sh.addColorStop(1, rgba(under, 0));
    g.fillStyle = sh;
    dot(g, sx, sy, p.r * 0.9);
  }
  // sunlit crowns (light from the top right)
  for (const p of puffs.slice(n)) {
    const hx = p.x + p.r * 0.2;
    const hy = p.y - p.r * 0.45;
    const hl = g.createRadialGradient(hx, hy, 0, hx, hy, p.r * 0.8);
    hl.addColorStop(0, "rgba(255,255,255,0.7)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl;
    dot(g, hx, hy, p.r * 0.8);
  }
  g.restore();

  // feather the edges where the browser supports canvas filters
  const [soft, sg] = surface(CLOUD_W, CLOUD_H);
  if ("filter" in sg) sg.filter = "blur(0.7px)";
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.drawImage(cv, 0, 0);
  return soft;
}

/** The moon disc with maria and rimmed craters (level-independent). */
export function paintMoon(r: number): HTMLCanvasElement {
  const size = r * 2 + 2;
  const [cv, g] = surface(size, size);
  const c = size / 2;
  const disc = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.15, c, c, r);
  disc.addColorStop(0, "#fbf6d8");
  disc.addColorStop(1, "#cfc79c");
  g.fillStyle = disc;
  dot(g, c, c, r);
  g.save();
  g.globalCompositeOperation = "source-atop";
  const rng = mulberry32(42);
  for (let i = 0; i < 6; i++) {
    const x = c + between(rng, -r * 0.6, r * 0.6);
    const y = c + between(rng, -r * 0.6, r * 0.6);
    const mr = between(rng, r * 0.2, r * 0.42);
    const m = g.createRadialGradient(x, y, 0, x, y, mr);
    m.addColorStop(0, "rgba(150,142,110,0.45)");
    m.addColorStop(1, "rgba(150,142,110,0)");
    g.fillStyle = m;
    dot(g, x, y, mr);
  }
  for (let i = 0; i < 9; i++) {
    const x = c + between(rng, -r * 0.7, r * 0.7);
    const y = c + between(rng, -r * 0.7, r * 0.7);
    const cr = between(rng, 1.2, 3.6);
    g.fillStyle = "rgba(140,132,100,0.5)";
    dot(g, x, y, cr);
    g.strokeStyle = "rgba(255,255,240,0.55)";
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(x, y, cr, 0.2 * Math.PI, 1.2 * Math.PI, true);
    g.stroke();
  }
  // terminator shade on the far side from the light
  const term = g.createLinearGradient(c - r, c - r, c + r, c + r);
  term.addColorStop(0.55, "rgba(0,0,20,0)");
  term.addColorStop(1, "rgba(0,0,20,0.28)");
  g.fillStyle = term;
  g.fillRect(0, 0, size, size);
  g.restore();
  return cv;
}
