import { PIPE_W } from "../engine";
import type { LevelConfig, PipeStyle } from "../levels";
import {
  GRAIN_TILE, TAU, between, crack, darken, dot, glowStroke, grain, lighten, mix, rgba,
  strokePts, surface, wrapped, type Ctx, type Grain, type Rng,
} from "./paint";

/** Pipe body texture height; tiles vertically (one noise tile). */
export const PIPE_TILE = GRAIN_TILE;
export const LIP_W = PIPE_W + 12;
export const LIP_H = 20;

export interface PipePalette { light: string; mid: string; dark: string }

export function pipePalette(lvl: LevelConfig): PipePalette {
  if (lvl.pipe) {
    const [light, dark] = lvl.pipe;
    return { light, mid: mix(light, dark, 0.5), dark };
  }
  return lvl.dark
    ? { light: "#2c8c4f", mid: "#1d6b3a", dark: "#14502b" }
    : { light: "#54ce6f", mid: "#33a852", dark: "#1f7a3c" };
}

type PipePainter = (g: Ctx, w: number, h: number, c: PipePalette, rng: Rng) => void;

function rivet(g: Ctx, x: number, y: number, r: number, c: PipePalette): void {
  g.fillStyle = "rgba(0,0,0,0.35)";
  dot(g, x + 0.6, y + 0.8, r);
  g.fillStyle = c.mid;
  dot(g, x, y, r);
  g.fillStyle = "rgba(255,255,255,0.55)";
  dot(g, x - r * 0.35, y - r * 0.35, r * 0.4);
}

/** Horizontal seam: a dark groove with a catchlight just below it. */
function seam(g: Ctx, w: number, y: number, c: PipePalette): void {
  g.fillStyle = rgba(c.dark, 0.5);
  g.fillRect(0, y, w, 1.5);
  g.fillStyle = rgba(c.light, 0.45);
  g.fillRect(0, y + 1.5, w, 1);
}

/** Courses of bricks/blocks with per-block tint, relief edges and mortar joints. */
function masonry(
  g: Ctx, w: number, h: number, c: PipePalette, rng: Rng,
  o: { course: number; brick: () => number; mortar: string; jitter: number; round: number; stagger: boolean },
): void {
  g.fillStyle = o.mortar;
  g.fillRect(0, 0, w, h);
  for (let y = 0, row = 0; y < h; y += o.course, row++) {
    let x = o.stagger && row % 2 ? -o.brick() / 2 : -rng() * 8;
    while (x < w) {
      const bw = o.brick();
      const t = (rng() * 2 - 1) * o.jitter;
      g.fillStyle = t > 0 ? mix(c.mid, c.light, t) : mix(c.mid, c.dark, -t);
      g.beginPath();
      g.roundRect(x + 1, y + 1, bw - 2, o.course - 2, o.round);
      g.fill();
      g.fillStyle = rgba(c.light, 0.3);
      g.fillRect(x + 2, y + 1, bw - 4, 1);
      g.fillStyle = rgba(c.dark, 0.35);
      g.fillRect(x + 2, y + o.course - 2, bw - 4, 1);
      x += bw;
    }
  }
}

const PIPE_PAINTERS: Record<PipeStyle, PipePainter> = {
  glossy(g, w, h, c) {
    // Enamelled tube: a seam every half tile, each with a pair of rivets.
    for (let y = 0; y < h; y += 48) {
      seam(g, w, y, c);
      rivet(g, 9, y + 8, 2.2, c);
      rivet(g, w - 9, y + 8, 2.2, c);
    }
  },

  bamboo(g, w, h, c, rng) {
    // Fibres along the cane, then a swollen node ring with a leaf scar.
    for (let i = 0; i < 28; i++) {
      g.fillStyle = rgba(rng() < 0.5 ? c.dark : c.light, between(rng, 0.1, 0.24));
      g.fillRect(rng() * w, 0, between(rng, 0.5, 1.6), h);
    }
    for (let y = 0; y < h; y += 48) {
      g.fillStyle = rgba(c.dark, 0.55);
      g.fillRect(0, y, w, 1.5);
      g.fillStyle = rgba(c.light, 0.6);
      g.fillRect(0, y + 1.5, w, 2.5);
      g.fillStyle = rgba(c.dark, 0.2);
      g.fillRect(0, y + 4, w, 3);
      g.strokeStyle = rgba(c.dark, 0.4);
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(between(rng, 14, w - 14), y + 11, 6, 2.2, 0, 0, Math.PI);
      g.stroke();
    }
  },

  adobe(g, w, h, c, rng) {
    masonry(g, w, h, c, rng, {
      course: 16, brick: () => 35, mortar: mix(c.light, "#f6e6c4", 0.45),
      jitter: 0.3, round: 3, stagger: true,
    });
    for (let i = 0; i < 40; i++) {
      g.fillStyle = rgba(c.dark, between(rng, 0.15, 0.35));
      dot(g, rng() * w, rng() * h, between(rng, 0.4, 1.1));
    }
  },

  wood(g, w, h, c, rng) {
    // Barrel staves with wavy grain and a knot, bound by riveted iron hoops.
    const staves = 5;
    const sw = w / staves;
    for (let i = 0; i < staves; i++) {
      const x0 = i * sw;
      g.fillStyle = mix(c.mid, rng() < 0.5 ? c.light : c.dark, between(rng, 0, 0.3));
      g.fillRect(x0, 0, sw, h);
      g.strokeStyle = rgba(c.dark, 0.3);
      g.lineWidth = 0.7;
      for (let k = 0; k < 4; k++) {
        const off = between(rng, 2, sw - 2);
        const cycles = 1 + ((rng() * 3) | 0);
        const ph = rng() * TAU;
        g.beginPath();
        for (let y = 0; y <= h; y += 3) {
          g.lineTo(x0 + off + 1.3 * Math.sin((TAU * cycles * y) / h + ph), y);
        }
        g.stroke();
      }
      g.fillStyle = rgba(darken(c.dark, 0.3), 0.6);
      g.fillRect(x0, 0, 1, h);
    }
    const kx = sw * ((rng() * staves) | 0) + sw / 2;
    const ky = rng() * h;
    wrapped(h, (o) => {
      for (let r = 4; r > 0; r -= 1.3) {
        g.strokeStyle = rgba(c.dark, 0.45);
        g.beginPath();
        g.ellipse(kx, ky + o, r * 0.7, r * 1.4, 0, 0, TAU);
        g.stroke();
      }
    });
    const iron = mix(c.dark, "#2b2b2e", 0.6);
    for (let y = 30; y < h; y += 48) {
      g.fillStyle = iron;
      g.fillRect(0, y, w, 6);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(0, y + 1, w, 1);
      for (let i = 0; i < staves; i++) {
        rivet(g, i * sw + sw / 2, y + 3, 1.3, { light: "#bbbbbb", mid: "#55555a", dark: "#222222" });
      }
    }
  },

  stone(g, w, h, c, rng) {
    // Irregular blocks with moss creeping over their top edges.
    masonry(g, w, h, c, rng, {
      course: 24, brick: () => between(rng, 18, 32), mortar: darken(c.dark, 0.35),
      jitter: 0.4, round: 3, stagger: false,
    });
    const moss = mix("#6b8f3e", c.light, 0.3);
    for (let y = 0; y < h; y += 24) {
      for (let i = 0; i < 4; i++) {
        if (rng() < 0.4) continue;
        const x = rng() * w;
        g.fillStyle = rgba(moss, 0.6);
        for (let k = 0; k < 6; k++) dot(g, x + between(rng, -7, 7), y + 1 + rng() * 3, between(rng, 1.2, 2.8));
        g.fillStyle = rgba(moss, 0.4);
        for (let k = 0; k < 2; k++) g.fillRect(x + between(rng, -5, 5), y + 2, 1.2, between(rng, 3, 10));
      }
    }
  },

  steel(g, w, h, c, rng) {
    // Brushed plate, riveted panel seams and rain/rust streaks below them.
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rgba(rng() < 0.5 ? "#ffffff" : "#000000", between(rng, 0.03, 0.09));
      g.fillRect(rng() * w, 0, 0.6, h);
    }
    for (let y = 0; y < h; y += 48) {
      seam(g, w, y, c);
      for (let i = 0; i < 5; i++) rivet(g, 7 + (i * (w - 14)) / 4, y + 6, 1.8, c);
      for (let i = 0; i < 4; i++) {
        const x = rng() * w;
        const len = between(rng, 10, 38);
        const sg = g.createLinearGradient(0, y + 9, 0, y + 9 + len);
        sg.addColorStop(0, rgba(darken(c.dark, 0.3), 0.32));
        sg.addColorStop(1, rgba(darken(c.dark, 0.3), 0));
        g.fillStyle = sg;
        g.fillRect(x, y + 9, between(rng, 1, 2.5), len);
      }
    }
  },

  patina(g, w, h, c, rng) {
    // Weathered copper: verdigris blooms, bright copper bands, green drips.
    g.fillStyle = mix(c.dark, c.mid, 0.6);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = between(rng, 4, 13);
      wrapped(h, (o) => {
        const bg = g.createRadialGradient(x, y + o, 0, x, y + o, r);
        bg.addColorStop(0, rgba(c.light, 0.5));
        bg.addColorStop(1, rgba(c.light, 0));
        g.fillStyle = bg;
        dot(g, x, y + o, r);
      });
    }
    const copper = mix(c.mid, "#c27c3e", 0.7);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = copper;
      g.fillRect(0, y, w, 5);
      g.fillStyle = "rgba(255,214,170,0.45)";
      g.fillRect(0, y, w, 1);
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.fillRect(0, y + 5, w, 1);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rgba(c.light, 0.35);
        g.fillRect(rng() * w, y + 6, 1.2, between(rng, 5, 18));
      }
    }
  },

  ice(g, w, h, c, rng) {
    // Clear ice: translucent bands, internal fractures, trapped bubbles, frost.
    g.fillStyle = mix(c.light, c.mid, 0.35);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(255,255,255,${between(rng, 0.06, 0.16)})`;
      g.fillRect(rng() * w, 0, between(rng, 3, 10), h);
    }
    for (let i = 0; i < 5; i++) {
      const pts = crack(rng, rng() * w, rng() * h, between(rng, 18, 40), Math.PI / 2 + between(rng, -0.9, 0.9), 0.7);
      wrapped(h, (o) => {
        g.lineWidth = 1.6;
        g.strokeStyle = rgba(c.dark, 0.18);
        strokePts(g, pts, 0.8, o + 0.8);
        g.lineWidth = 0.8;
        g.strokeStyle = "rgba(255,255,255,0.6)";
        strokePts(g, pts, 0, o);
      });
    }
    g.strokeStyle = "rgba(255,255,255,0.5)";
    g.lineWidth = 0.6;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(rng() * w, rng() * h, between(rng, 0.7, 2), 0, TAU);
      g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 50; i++) dot(g, rng() * w, rng() * h, between(rng, 0.3, 0.8));
  },

  brick(g, w, h, c, rng) {
    masonry(g, w, h, c, rng, {
      course: 12, brick: () => 24, mortar: mix(c.dark, "#a89a90", 0.45),
      jitter: 0.45, round: 1.5, stagger: true,
    });
    for (let i = 0; i < 24; i++) {
      g.fillStyle = rgba(darken(c.dark, 0.3), between(rng, 0.2, 0.45));
      dot(g, rng() * w, rng() * h, between(rng, 0.5, 1.4));
    }
  },

  basalt(g, w, h, c, rng) {
    // Columnar basalt split by glowing lava cracks.
    g.fillStyle = mix(c.dark, c.mid, 0.35);
    g.fillRect(0, 0, w, h);
    const cols = 3;
    for (let i = 0; i < cols; i++) {
      const x0 = (i * w) / cols;
      g.fillStyle = rgba(rng() < 0.5 ? c.light : "#000000", between(rng, 0.04, 0.14));
      g.fillRect(x0, 0, w / cols, h);
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.fillRect(x0, 0, 1.5, h);
      g.fillStyle = rgba(c.light, 0.25);
      g.fillRect(x0 + 1.5, 0, 0.8, h);
      for (let k = 0; k < 2; k++) {
        const y = rng() * h;
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillRect(x0, y, w / cols, 1.2);
        g.fillStyle = rgba(c.light, 0.2);
        g.fillRect(x0, y + 1.2, w / cols, 0.8);
      }
    }
    for (let i = 0; i < 3; i++) {
      const pts = crack(rng, rng() * w, rng() * h, between(rng, 26, 50), Math.PI / 2 + between(rng, -0.6, 0.6), 0.6);
      wrapped(h, (o) => glowStroke(g, pts, "#ffc070", "rgba(255,90,20,0.2)", 1, 0, o));
    }
    g.fillStyle = "rgba(255,150,60,0.8)";
    for (let i = 0; i < 6; i++) dot(g, rng() * w, rng() * h, between(rng, 0.4, 0.9));
  },

  crystal(g, w, h, c, rng) {
    // Faceted crystal: bands split into two-tone triangles, glowing veins, glints.
    const rows = Math.max(1, Math.round(h / 16));
    const left = Array.from({ length: rows }, (_, i) => (i * h) / rows + between(rng, -3, 3));
    const right = left.map((y) => y + between(rng, -10, 10));
    for (let i = 0; i < rows; i++) {
      const l0 = left[i]!;
      const r0 = right[i]!;
      const l1 = i + 1 < rows ? left[i + 1]! : left[0]! + h;
      const r1 = i + 1 < rows ? right[i + 1]! : right[0]! + h;
      const split = between(rng, 0.25, 0.75) * w;
      const shadeA = mix(c.mid, c.light, between(rng, 0, 0.55));
      const shadeB = mix(c.mid, c.dark, between(rng, 0, 0.55));
      wrapped(h, (o) => {
        g.fillStyle = shadeA;
        g.beginPath();
        g.moveTo(0, l0 + o);
        g.lineTo(w, r0 + o);
        g.lineTo(split, (l1 + r1) / 2 + o);
        g.lineTo(0, l1 + o);
        g.closePath();
        g.fill();
        g.fillStyle = shadeB;
        g.beginPath();
        g.moveTo(w, r0 + o);
        g.lineTo(w, r1 + o);
        g.lineTo(0, l1 + o);
        g.lineTo(split, (l1 + r1) / 2 + o);
        g.closePath();
        g.fill();
        g.strokeStyle = rgba(lighten(c.light, 0.4), 0.45);
        g.lineWidth = 0.7;
        strokePts(g, [[0, l0], [w, r0]], 0, o);
      });
    }
    for (let i = 0; i < 2; i++) {
      const pts = crack(rng, rng() * w, rng() * h, between(rng, 30, 50), Math.PI / 2 + between(rng, -0.5, 0.5), 0.5);
      wrapped(h, (o) => glowStroke(g, pts, lighten(c.light, 0.6), rgba(c.light, 0.18), 0.8, 0, o));
    }
    g.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = between(rng, 1.5, 3);
      g.beginPath();
      g.moveTo(x, y - r);
      g.lineTo(x + r * 0.25, y);
      g.lineTo(x, y + r);
      g.lineTo(x - r * 0.25, y);
      g.closePath();
      g.moveTo(x - r, y);
      g.lineTo(x, y + r * 0.25);
      g.lineTo(x + r, y);
      g.lineTo(x, y - r * 0.25);
      g.closePath();
      g.fill();
    }
  },
};

/** How blotchy each material's surface is (smooth enamel/ice/crystal barely). */
const PIPE_MOTTLE: Record<PipeStyle, number> = {
  glossy: 0.05, bamboo: 0.08, adobe: 0.16, wood: 0.1, stone: 0.18, steel: 0.06,
  patina: 0.14, ice: 0.05, brick: 0.14, basalt: 0.16, crystal: 0.03,
};

/** Strength of the specular stripe per material. */
const PIPE_GLOSS: Record<PipeStyle, number> = {
  glossy: 0.36, bamboo: 0.26, adobe: 0.08, wood: 0.1, stone: 0.06, steel: 0.32,
  patina: 0.16, ice: 0.5, brick: 0.06, basalt: 0.1, crystal: 0.45,
};

/**
 * Round-tube lighting over a painted material: rims shaded in the material's
 * own darkest tone (not black, which greys out light materials like ice),
 * plus a specular stripe.
 */
function cylinder(g: Ctx, w: number, h: number, gloss: number, c: PipePalette): void {
  g.save();
  g.globalCompositeOperation = "source-atop";
  const deep = darken(c.dark, 0.55);
  const shade = g.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0, rgba(deep, 0.65));
  shade.addColorStop(0.1, rgba(deep, 0.18));
  shade.addColorStop(0.3, rgba(deep, 0));
  shade.addColorStop(0.6, rgba(deep, 0.08));
  shade.addColorStop(0.9, rgba(deep, 0.5));
  shade.addColorStop(1, rgba(deep, 0.72));
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);
  const spec = g.createLinearGradient(0, 0, w, 0);
  spec.addColorStop(0.1, "rgba(255,255,255,0)");
  spec.addColorStop(0.19, `rgba(255,255,255,${gloss})`);
  spec.addColorStop(0.3, "rgba(255,255,255,0)");
  spec.addColorStop(0.72, "rgba(255,255,255,0)");
  spec.addColorStop(0.78, `rgba(255,255,255,${gloss * 0.3})`);
  spec.addColorStop(0.84, "rgba(255,255,255,0)");
  g.fillStyle = spec;
  g.fillRect(0, 0, w, h);
  g.restore();
}

export function paintPipeBody(style: PipeStyle, c: PipePalette, rng: Rng, grainTile: Grain): HTMLCanvasElement {
  const [cv, g] = surface(PIPE_W, PIPE_TILE);
  g.fillStyle = c.mid;
  g.fillRect(0, 0, PIPE_W, PIPE_TILE);
  PIPE_PAINTERS[style](g, PIPE_W, PIPE_TILE, c, rng);
  grain(g, grainTile, PIPE_W, PIPE_TILE, 0.16, PIPE_MOTTLE[style]);
  cylinder(g, PIPE_W, PIPE_TILE, PIPE_GLOSS[style], c);
  g.fillStyle = rgba(darken(c.dark, 0.4), 0.7);
  g.fillRect(0, 0, 1, PIPE_TILE);
  g.fillRect(PIPE_W - 1, 0, 1, PIPE_TILE);
  return cv;
}

export function paintLip(style: PipeStyle, c: PipePalette, rng: Rng, grainTile: Grain): HTMLCanvasElement {
  const [cv, g] = surface(LIP_W, LIP_H);
  g.beginPath();
  g.roundRect(0, 0, LIP_W, LIP_H, 5);
  g.fillStyle = c.mid;
  g.fill();
  g.save();
  g.clip();
  PIPE_PAINTERS[style](g, LIP_W, LIP_H, c, rng);
  g.restore();
  grain(g, grainTile, LIP_W, LIP_H, 0.16, PIPE_MOTTLE[style]);
  cylinder(g, LIP_W, LIP_H, PIPE_GLOSS[style], c);
  // bevel: lit top edge, shaded underside
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(255,255,255,0.32)";
  g.fillRect(0, 1, LIP_W, 2);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.fillRect(0, LIP_H - 4, LIP_W, 4);
  g.restore();
  g.beginPath();
  g.roundRect(0.75, 0.75, LIP_W - 1.5, LIP_H - 1.5, 5);
  g.strokeStyle = rgba(darken(c.dark, 0.45), 0.65);
  g.lineWidth = 1.5;
  g.stroke();
  return cv;
}
