/**
 * Shared painting toolkit for the procedural textures: colour maths, seeded
 * randomness helpers, tileable noise and stroke effects.
 */

/** Device pixels per CSS pixel the textures are painted at (covers DPR ≤ 2). */
export const TEX_SCALE = 2;
/** Noise tile size; every repeating texture's period is a multiple of it. */
export const GRAIN_TILE = 96;

export type Ctx = CanvasRenderingContext2D;
export type Rng = () => number;
export type Pt = [number, number];

export const TAU = Math.PI * 2;

// --- colour helpers ---------------------------------------------------------

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear blend of two #rrggbb colours; returns #rrggbb so results compose. */
export function mix(a: string, b: string, t: number): string {
  const pa = rgbOf(a);
  const pb = rgbOf(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return "#" + ((1 << 24) | (c[0]! << 16) | (c[1]! << 8) | c[2]!).toString(16).slice(1);
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
export const darken = (c: string, t: number) => mix(c, "#000000", t);

// --- drawing helpers ----------------------------------------------------------

/** An offscreen canvas of CSS size w×h whose context draws in CSS px. */
export function surface(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * TEX_SCALE);
  c.height = Math.ceil(h * TEX_SCALE);
  const g = c.getContext("2d")!;
  g.scale(TEX_SCALE, TEX_SCALE);
  return [c, g];
}

/** Draw `fn` at offsets -p, 0, +p so features crossing a tile edge wrap seamlessly. */
export function wrapped(p: number, fn: (o: number) => void): void {
  fn(-p);
  fn(0);
  fn(p);
}

export function dot(g: Ctx, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

export const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[(rng() * xs.length) | 0]!;

/** Two tileable noise overlays: fine grit for surfaces/sky, soft mottling for materials. */
export interface Grain { grit: HTMLCanvasElement; mottle: HTMLCanvasElement }

/**
 * Tileable value noise, stored as signed speckle: white where the noise is
 * above 0.5, black below, alpha = distance. Overlaid with source-atop it
 * roughens any surface without shifting its hue. `octaves` are [cells, weight]
 * pairs over the tile; cells = 0 means independent per-pixel noise.
 */
function makeNoiseTile(rng: Rng, octaves: [number, number][]): HTMLCanvasElement {
  const n = GRAIN_TILE * TEX_SCALE;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  const img = g.createImageData(n, n);
  const lattice = (cells: number) => {
    const v = Array.from({ length: cells * cells }, rng);
    const at = (i: number, j: number) => v[(j % cells) * cells + (i % cells)]!;
    return (x: number, y: number) => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const a = at(x0, y0);
      const b = at(x0 + 1, y0);
      const cc = at(x0, y0 + 1);
      const d = at(x0 + 1, y0 + 1);
      return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy;
    };
  };
  const layers = octaves.map(([cells, w]) => ({ cells, w, f: cells ? lattice(cells) : null }));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = x / n;
      const v = y / n;
      let val = -0.5;
      for (const L of layers) val += L.w * (L.f ? L.f(u * L.cells, v * L.cells) : rng());
      const i = (y * n + x) * 4;
      const w = val > 0 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = w;
      img.data[i + 3] = Math.min(255, Math.abs(val) * 510);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function makeGrain(rng: Rng): Grain {
  return {
    grit: makeNoiseTile(rng, [[32, 0.45], [0, 0.55]]),
    mottle: makeNoiseTile(rng, [[6, 0.65], [12, 0.35]]),
  };
}

/** Overlay grit and mottling on whatever is already painted (source-atop). */
export function grain(g: Ctx, tiles: Grain, w: number, h: number, grit: number, mottle = 0): void {
  g.save();
  g.globalCompositeOperation = "source-atop";
  for (const [tile, strength] of [[tiles.grit, grit], [tiles.mottle, mottle]] as const) {
    if (strength <= 0) continue;
    const p = g.createPattern(tile, "repeat")!;
    p.setTransform(new DOMMatrix([1 / TEX_SCALE, 0, 0, 1 / TEX_SCALE, 0, 0]));
    g.globalAlpha = strength;
    g.fillStyle = p;
    g.fillRect(0, 0, w, h);
  }
  g.restore();
}

/** A jagged polyline, for cracks, veins and lava rivulets. */
export function crack(rng: Rng, x: number, y: number, len: number, angle: number, jag: number): Pt[] {
  const pts: Pt[] = [[x, y]];
  const steps = Math.max(3, Math.round(len / 5));
  for (let i = 0; i < steps; i++) {
    angle += (rng() * 2 - 1) * jag;
    x += (Math.cos(angle) * len) / steps;
    y += (Math.sin(angle) * len) / steps;
    pts.push([x, y]);
  }
  return pts;
}

export function strokePts(g: Ctx, pts: Pt[], dx = 0, dy = 0): void {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
  g.stroke();
}

/** Stroke a path as a glowing line: two wide translucent passes, then a bright core. */
export function glowStroke(g: Ctx, pts: Pt[], core: string, glow: string, width: number, dx = 0, dy = 0): void {
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = glow;
  g.lineWidth = width * 5;
  strokePts(g, pts, dx, dy);
  g.lineWidth = width * 2.4;
  strokePts(g, pts, dx, dy);
  g.strokeStyle = core;
  g.lineWidth = width;
  strokePts(g, pts, dx, dy);
  g.restore();
}
