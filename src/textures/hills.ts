import type { LevelConfig, Terrain } from "../levels";
import {
  GRAIN_TILE, TAU, between, darken, dot, glowStroke, grain, lighten, mix, rgba, strokePts,
  surface, wrapped, type Grain, type Pt, type Rng,
} from "./paint";

/** Hill layer width (tiles horizontally; a multiple of the noise tile) and height. */
export const HILL_PERIOD = 10 * GRAIN_TILE;
export const HILL_H = 150;
/** Scroll speed of each hill layer, back to front, as a fraction of pipe speed. */
export const HILL_PARALLAX = [0.08, 0.16, 0.3];

type HillShape = "rolling" | "dunes" | "peaks";

const TERRAIN_HILLS: Record<Terrain, HillShape> = {
  meadow: "rolling", marsh: "rolling", beach: "dunes", desert: "dunes",
  rocky: "peaks", snow: "peaks", volcanic: "peaks", void: "peaks",
};

/** Back-to-front layers: minimum height, relief, haze toward the horizon colour. */
const HILL_LAYERS: Record<HillShape, { lift: number; amp: number; haze: number; shape: HillShape }[]> = {
  rolling: [
    { lift: 26, amp: 58, haze: 0.45, shape: "rolling" },
    { lift: 10, amp: 48, haze: 0.2, shape: "rolling" },
    { lift: 0, amp: 22, haze: 0, shape: "rolling" },
  ],
  dunes: [
    { lift: 20, amp: 50, haze: 0.4, shape: "dunes" },
    { lift: 6, amp: 44, haze: 0.18, shape: "dunes" },
    { lift: 0, amp: 18, haze: 0, shape: "dunes" },
  ],
  peaks: [
    { lift: 30, amp: 105, haze: 0.5, shape: "peaks" },
    { lift: 12, amp: 70, haze: 0.25, shape: "peaks" },
    { lift: 0, amp: 26, haze: 0, shape: "rolling" },
  ],
};

const tri = (u: number) => 1 - 4 * Math.abs(u - Math.floor(u + 0.5));

/** Periodic elevation profile over HILL_PERIOD, normalised to 0..1 (index HILL_PERIOD wraps to 0). */
function elevation(shape: HillShape, rng: Rng): Float32Array {
  const P = HILL_PERIOD;
  const terms =
    shape === "peaks"
      ? [[3, 1], [6, 0.5], [11, 0.28], [23, 0.14]]
      : shape === "dunes"
        ? [[3, 1], [5, 0.55], [8, 0.3], [19, 0.06]]
        : [[2, 1], [3, 0.6], [5, 0.3], [9, 0.12]];
  const phases = terms.map(() => rng());
  const e = new Float32Array(P + 1);
  for (let x = 0; x <= P; x++) {
    let v = 0;
    terms.forEach(([f, a], i) => {
      const u = (f! * x) / P + phases[i]!;
      // peaks: straight-edged ridges, roughened by a little smooth detail
      if (shape === "peaks") v += a! * tri(u) + (i === 0 ? 0.035 * Math.sin((TAU * 41 * x) / P) + 0.02 * Math.sin((TAU * 79 * x) / P + 1) : 0);
      // dunes: a gentle windward face and a steeper slip face
      else if (shape === "dunes") v += a! * (Math.sin(TAU * u) + 0.38 * Math.sin(2 * TAU * u + 0.9));
      else v += a! * Math.sin(TAU * u);
    });
    e[x] = v;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of e) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  for (let x = 0; x <= P; x++) e[x] = (e[x]! - lo) / (hi - lo);
  e[P] = e[0]!;
  return e;
}

export function paintHillLayer(
  lvl: LevelConfig, terrain: Terrain, layer: number, rng: Rng, grainTile: Grain,
): HTMLCanvasElement {
  const P = HILL_PERIOD;
  const H = HILL_H;
  const L = HILL_LAYERS[TERRAIN_HILLS[terrain]][layer]!;
  const [cv, g] = surface(P, H);
  const e = elevation(L.shape, rng);
  const top = (x: number) => H - L.lift - L.amp * e[Math.max(0, Math.min(P, Math.round(x)))]!;
  const hazeCol = lvl.sky[1];
  const base = mix(lvl.hills!, hazeCol, L.haze);

  const silhouette = () => {
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= P; x += 2) g.lineTo(x, top(x));
    g.lineTo(P, H);
    g.closePath();
  };
  silhouette();
  const fill = g.createLinearGradient(0, H - L.lift - L.amp, 0, H);
  fill.addColorStop(0, lighten(base, 0.06));
  fill.addColorStop(1, mix(base, hazeCol, 0.3));
  g.fillStyle = fill;
  g.fill();

  // Slope lighting: the sun/moon sits top-right, so faces rising to the
  // right are in shade. Two scales: broad faces shade deep (fading with
  // depth), while small ridge facets only shade a thin band at the crest.
  // Shading whole columns by the local slope would turn facets into stripes.
  const at = (x: number) => e[((x % P) + P) % P]!;
  const smoothSlope = (K: number) => {
    const out = new Float32Array(P);
    for (let x = 0; x < P; x++) {
      out[x] = Math.max(-1, Math.min(1, ((at(x + K) - at(x - K)) / (2 * K)) * L.amp * 1.6));
    }
    return out;
  };
  const broad = smoothSlope(28);
  const fine = smoothSlope(3);
  const lit = lvl.dark ? 0.08 : 0.16;
  const tone = (s: number, k: number) =>
    s > 0 ? `rgba(0,0,0,${s * 0.3 * k})` : `rgba(255,255,255,${-s * lit * k})`;
  g.save();
  g.globalCompositeOperation = "source-atop";
  for (let x = 0; x < P; x++) {
    const t = top(x);
    const b = broad[x]!;
    g.fillStyle = tone(b, 1);
    g.fillRect(x, t, 1, 36);
    g.fillStyle = tone(b, 0.6);
    g.fillRect(x, t + 36, 1, 40);
    g.fillStyle = tone(b, 0.3);
    g.fillRect(x, t + 76, 1, H);
    g.fillStyle = tone(fine[x]!, 0.8);
    g.fillRect(x, t, 1, 9);
  }

  if (terrain === "snow") {
    const ph = rng() * TAU;
    const snow = lvl.dark ? mix("#e8f4ff", base, 0.35) : mix("#ffffff", base, 0.1 + L.haze * 0.4);
    const shade = mix(snow, "#7f9cc8", 0.35);
    for (let x = 0; x < P; x++) {
      const cap = H - L.lift - L.amp * (0.48 + 0.07 * Math.sin((TAU * 13 * x) / P + ph) + 0.04 * Math.sin((TAU * 37 * x) / P));
      const t = top(x);
      if (t < cap) {
        g.fillStyle = mix(snow, shade, Math.max(0, Math.min(1, 0.45 + broad[x]! * 1.3)));
        g.fillRect(x, t, 1, cap - t);
      }
    }
  }
  if (terrain === "rocky" || terrain === "volcanic") {
    // tilted strata across the rock faces
    g.strokeStyle = `rgba(0,0,0,${0.1 - L.haze * 0.1})`;
    g.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const y = between(rng, H - L.lift - L.amp, H);
      const x = rng() * P;
      wrapped(P, (o) => strokePts(g, [[x + o - 30, y + 6], [x + o + 30, y - 6]]));
    }
  }
  if (terrain === "desert" || terrain === "beach") {
    // wind ripples that follow the dune crests
    g.strokeStyle = rgba(lighten(base, 0.3), 0.22);
    g.lineWidth = 0.8;
    for (let i = 0; i < 14; i++) {
      const d = between(rng, 5, 30);
      const x0 = rng() * P;
      const len = between(rng, 60, 160);
      const pts: Pt[] = [];
      for (let x = x0; x <= x0 + len; x += 4) pts.push([x, top(x % P) + d]);
      wrapped(P, (o) => strokePts(g, pts, o));
    }
  }
  if (terrain === "marsh") {
    const mist = g.createLinearGradient(0, H - 34, 0, H);
    mist.addColorStop(0, "rgba(220,228,240,0)");
    mist.addColorStop(1, "rgba(220,228,240,0.35)");
    g.fillStyle = mist;
    g.fillRect(0, H - 34, P, 34);
  }
  g.restore();

  if (terrain === "volcanic" && layer < 2) {
    // a live vent on the tallest summit: crater glow, lava rivulets, smoke
    let px = 0;
    for (let x = 0; x < P; x++) if (e[x]! > e[px]!) px = x;
    const py = top(px);
    const rivers: Pt[][] = [];
    for (let i = 0; i < 4; i++) {
      const pts: Pt[] = [];
      let x = px + between(rng, -6, 6);
      const dir = i % 2 ? 1 : -1;
      for (let y = py; y < H; y += 4) {
        x += dir * between(rng, 0.4, 2.2) + between(rng, -1.2, 1.2);
        pts.push([x, Math.max(y, top(((x % P) + P) % P) + 1)]);
      }
      rivers.push(pts);
    }
    const smoke = Array.from({ length: 9 }, (_, i) => ({
      x: px + i * 3.5 + between(rng, -3, 3), y: py - 8 - i * 9, r: 6 + i * 2.2, a: 0.22 - i * 0.02,
    }));
    wrapped(P, (o) => {
      const glow = g.createRadialGradient(px + o, py, 0, px + o, py, 46);
      glow.addColorStop(0, `rgba(255,170,60,${layer ? 0.75 : 0.45})`);
      glow.addColorStop(1, "rgba(255,80,0,0)");
      g.fillStyle = glow;
      g.fillRect(px + o - 46, py - 46, 92, 92);
      g.save();
      silhouette();
      g.clip();
      for (const pts of rivers) glowStroke(g, pts, "#ffb347", "rgba(255,90,10,0.25)", layer ? 1.2 : 0.8, o);
      g.restore();
      for (const p of smoke) {
        g.fillStyle = `rgba(70,50,50,${p.a})`;
        dot(g, p.x + o, p.y, p.r);
      }
    });
  }

  if ((terrain === "meadow" || terrain === "marsh") && layer > 0) {
    // tree clumps sitting on the ridge (allowed to poke above the silhouette)
    const n = layer === 1 ? 14 : 9;
    const leaf = terrain === "marsh" ? darken(base, 0.3) : mix(darken(base, 0.25), "#2f6b3a", lvl.dark ? 0.1 : 0.3);
    const s = layer === 1 ? 0.75 : 1.1;
    for (let i = 0; i < n; i++) {
      const x = rng() * P;
      const count = 3 + ((rng() * 4) | 0);
      const puffs = Array.from({ length: count }, (_, k) => {
        const px = x + (k - count / 2) * 4.5 * s;
        return { px, py: top(((px % P) + P) % P) + 2 - between(rng, 1, 5) * s, r: between(rng, 3.5, 6.5) * s };
      });
      wrapped(P, (o) => {
        for (const { px, py, r } of puffs) {
          g.fillStyle = leaf;
          dot(g, px + o, py, r);
          g.fillStyle = rgba(lighten(base, 0.25), lvl.dark ? 0.12 : 0.25);
          dot(g, px + o + r * 0.25, py - r * 0.35, r * 0.5);
        }
      });
    }
  }

  if (terrain === "beach" && layer === 1) {
    // leaning palms on the near dunes
    const trunk = darken(base, 0.4);
    for (let i = 0; i < 5; i++) {
      const x = rng() * P;
      const h = between(rng, 28, 42);
      const lean = between(rng, -12, 12);
      const jitter = Array.from({ length: 9 }, () => between(rng, -0.08, 0.08));
      wrapped(P, (o) => {
        const bx = x + o;
        const by = top(x) + 3;
        const tx = bx + lean;
        const ty = by - h;
        g.strokeStyle = trunk;
        g.lineCap = "round";
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(bx, by);
        g.quadraticCurveTo(bx + lean * 0.2, by - h * 0.5, tx, ty);
        g.stroke();
        // trunk rings
        g.strokeStyle = rgba(lighten(trunk, 0.3), 0.5);
        g.lineWidth = 0.7;
        for (let k = 1; k < 7; k++) {
          const t = k / 7;
          const cx = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * (bx + lean * 0.2) + t * t * tx;
          const cy = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * (by - h * 0.5) + t * t * ty;
          strokePts(g, [[cx - 1.5, cy], [cx + 1.5, cy - 0.6]]);
        }
        // drooping fronds as filled leaf shapes
        g.fillStyle = trunk;
        for (let k = 0; k < 9; k++) {
          const a = Math.PI + (k / 8) * Math.PI + jitter[k]!;
          const len = 15 + (k % 3) * 3;
          const ex = tx + Math.cos(a) * len;
          const ey = ty + Math.sin(a) * len * 0.45 + 7 + Math.abs(Math.cos(a)) * 6;
          const mx = tx + Math.cos(a) * len * 0.55;
          const my = ty + Math.sin(a) * len * 0.55 - 4;
          g.beginPath();
          g.moveTo(tx, ty);
          g.quadraticCurveTo(mx, my - 2.2, ex, ey);
          g.quadraticCurveTo(mx, my + 2.2, tx, ty);
          g.fill();
        }
        dot(g, tx, ty, 2.4);
        g.lineCap = "butt";
      });
    }
  }

  grain(g, grainTile, P, H, 0.1, 0.04);
  // rim light along the ridge line
  g.strokeStyle = rgba(lighten(base, 0.4), lvl.dark ? 0.22 : 0.4);
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= P; x += 2) g.lineTo(x, top(x) + 0.5);
  g.stroke();
  return cv;
}
