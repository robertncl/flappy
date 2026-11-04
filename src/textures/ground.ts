import { GROUND_H } from "../engine";
import type { LevelConfig, Terrain } from "../levels";
import {
  GRAIN_TILE, TAU, between, crack, darken, dot, glowStroke, grain, lighten, mix, pick, rgba,
  strokePts, surface, wrapped, type Ctx, type Grain, type Rng,
} from "./paint";

/** Ground texture width; tiles horizontally (a multiple of the noise tile). */
export const GROUND_TILE = 2 * GRAIN_TILE;
/** Ground texture extends this far above the ground line, for blades, drifts and rocks. */
export const GROUND_LIP = 16;

export interface GroundPalette { dirt: string; grass: string }

export function groundPalette(lvl: LevelConfig): GroundPalette {
  const [dirt, grass] = lvl.ground ?? (lvl.dark ? ["#6e5a3a", "#2f7a44"] : ["#caa157", "#67c357"]);
  return { dirt, grass };
}

const GW = GROUND_TILE;
const GH = GROUND_LIP + GROUND_H;
const Y0 = GROUND_LIP;

/** Periodic offset along the tile width, so edges line up when it repeats. */
function waveAt(x: number, cycles: number, phase: number, amp: number): number {
  return amp * Math.sin((TAU * cycles * x) / GW + phase);
}

function soil(g: Ctx, top: string, bottom: string): void {
  const gr = g.createLinearGradient(0, Y0, 0, GH);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(0, Y0, GW, GH - Y0);
}

/** A wavy band of sediment across the tile. */
function strata(g: Ctx, y: number, thick: number, color: string, rng: Rng): void {
  const ph = rng() * TAU;
  const cycles = 1 + ((rng() * 3) | 0);
  const amp = between(rng, 1.5, 4);
  g.fillStyle = color;
  g.beginPath();
  for (let x = 0; x <= GW; x += 4) g.lineTo(x, y + waveAt(x, cycles, ph, amp));
  for (let x = GW; x >= 0; x -= 4) g.lineTo(x, y + thick + waveAt(x, cycles, ph + 0.7, amp));
  g.closePath();
  g.fill();
}

/** Embedded stones with a shadow and a catchlight. */
function pebbles(g: Ctx, n: number, base: string, rng: Rng, yMin = Y0 + 16): void {
  for (let i = 0; i < n; i++) {
    const x = rng() * GW;
    const y = between(rng, yMin, GH - 4);
    const rx = between(rng, 1.4, 4);
    const ry = rx * between(rng, 0.55, 0.8);
    const col = mix(base, rng() < 0.5 ? "#ffffff" : "#000000", between(rng, 0.05, 0.3));
    wrapped(GW, (o) => {
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.beginPath();
      g.ellipse(x + o + 0.7, y + 0.9, rx, ry, 0, 0, TAU);
      g.fill();
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x + o, y, rx, ry, 0, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath();
      g.ellipse(x + o - rx * 0.3, y - ry * 0.35, rx * 0.4, ry * 0.3, 0, 0, TAU);
      g.fill();
    });
  }
}

function roots(g: Ctx, n: number, color: string, rng: Rng): void {
  g.strokeStyle = color;
  g.lineWidth = 0.8;
  for (let i = 0; i < n; i++) {
    const pts = crack(rng, rng() * GW, Y0 + between(rng, 8, 14), between(rng, 8, 20), Math.PI / 2 + between(rng, -0.6, 0.6), 0.5);
    wrapped(GW, (o) => strokePts(g, pts, o));
  }
}

/** The surface layer (turf, sand crust, snow…) with a wavy underside and contact shadow. */
function band(g: Ctx, depth: number, top: string, bottom: string, rng: Rng): void {
  const ph = rng() * TAU;
  const under = (x: number) => Y0 + depth + waveAt(x, 3, ph, 1.6) + waveAt(x, 7, ph * 2, 0.8);
  const gr = g.createLinearGradient(0, Y0, 0, Y0 + depth + 2);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, Y0);
  g.lineTo(GW, Y0);
  for (let x = GW; x >= 0; x -= 3) g.lineTo(x, under(x));
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.25)";
  g.lineWidth = 1.5;
  g.beginPath();
  for (let x = 0; x <= GW; x += 3) g.lineTo(x, under(x) + 0.8);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.28)";
  g.fillRect(0, Y0, GW, 1.5);
}

/** Curved blades rising from the surface, drawn into the lip above the ground line. */
function blades(g: Ctx, n: number, hMin: number, hMax: number, colors: string[], rng: Rng, width = 1.4): void {
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = rng() * GW;
    const h = between(rng, hMin, hMax);
    const lean = between(rng, -0.6, 0.6);
    const col = pick(rng, colors);
    const lw = width * between(rng, 0.7, 1.2);
    wrapped(GW, (o) => {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(x + o, Y0 + 3);
      g.quadraticCurveTo(x + o + lean * 3, Y0 + 3 - h * 0.6, x + o + lean * 7, Y0 + 3 - h);
      g.stroke();
    });
  }
  g.lineCap = "butt";
}

/** A thin glowing seam along the ground line (lava crust, void edge). */
function glowLine(g: Ctx, color: string): void {
  const gr = g.createLinearGradient(0, Y0 - 7, 0, Y0 + 7);
  gr.addColorStop(0, rgba(color, 0));
  gr.addColorStop(0.5, rgba(color, 0.7));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, Y0 - 7, GW, 14);
  g.fillStyle = lighten(color, 0.45);
  g.fillRect(0, Y0 - 0.5, GW, 1.2);
}

type GroundPainter = (g: Ctx, p: GroundPalette, rng: Rng, grainTile: Grain) => void;

const GROUND_PAINTERS: Record<Terrain, GroundPainter> = {
  meadow(g, { dirt, grass }, rng, gt) {
    soil(g, darken(dirt, 0.05), darken(dirt, 0.4));
    strata(g, Y0 + 30, 5, rgba(darken(dirt, 0.3), 0.3), rng);
    strata(g, Y0 + 56, 4, rgba(lighten(dirt, 0.15), 0.25), rng);
    roots(g, 9, rgba(darken(dirt, 0.55), 0.4), rng);
    pebbles(g, 14, dirt, rng);
    grain(g, gt, GW, GH, 0.2, 0.12);
    band(g, 13, lighten(grass, 0.15), darken(grass, 0.08), rng);
    blades(g, 160, 3, 12, [darken(grass, 0.1), darken(grass, 0.32), lighten(grass, 0.12), grass], rng);
    for (let i = 0; i < 7; i++) {
      const x = rng() * GW;
      const y = Y0 - between(rng, 2, 7);
      const petal = pick(rng, ["#ffffff", "#ffe066", "#ff9ec7", "#c7b3ff"]);
      wrapped(GW, (o) => {
        g.fillStyle = petal;
        for (let k = 0; k < 5; k++) dot(g, x + o + Math.cos((k * TAU) / 5) * 1.4, y + Math.sin((k * TAU) / 5) * 1.4, 1.1);
        g.fillStyle = "#ffc93c";
        dot(g, x + o, y, 0.8);
      });
    }
  },

  desert(g, { dirt, grass }, rng, gt) {
    soil(g, lighten(dirt, 0.05), darken(dirt, 0.32));
    for (let i = 0; i < 4; i++) strata(g, Y0 + 18 + i * 15, 3, rgba(lighten(dirt, 0.25), 0.28), rng);
    pebbles(g, 9, dirt, rng);
    grain(g, gt, GW, GH, 0.16, 0.1);
    band(g, 9, lighten(grass, 0.12), darken(grass, 0.06), rng);
    // wind ripples in the sand crust
    g.strokeStyle = rgba(darken(grass, 0.25), 0.35);
    g.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      const x = rng() * GW;
      const y = Y0 + between(rng, 2.5, 7);
      const len = between(rng, 8, 20);
      wrapped(GW, (o) => {
        g.beginPath();
        g.moveTo(x + o, y);
        g.quadraticCurveTo(x + o + len / 2, y - 1.5, x + o + len, y);
        g.stroke();
      });
    }
    blades(g, 22, 3, 9, [darken(grass, 0.35), darken(grass, 0.5), mix(grass, "#7a5a2a", 0.5)], rng, 1);
    pebbles(g, 5, darken(dirt, 0.1), rng, Y0 - 1);
  },

  beach(g, { dirt, grass }, rng, gt) {
    soil(g, lighten(dirt, 0.1), darken(dirt, 0.2));
    strata(g, Y0 + 12, 6, rgba(darken(dirt, 0.25), 0.3), rng);
    strata(g, Y0 + 40, 3, rgba(lighten(dirt, 0.3), 0.3), rng);
    pebbles(g, 6, dirt, rng);
    for (let i = 0; i < 8; i++) {
      // little shells: a ribbed fan
      const x = rng() * GW;
      const y = between(rng, Y0 + 18, GH - 6);
      const r = between(rng, 1.8, 3.2);
      const tint = pick(rng, ["#fff3e0", "#ffd9c7", "#f6e7ff"]);
      wrapped(GW, (o) => {
        g.fillStyle = tint;
        g.beginPath();
        g.moveTo(x + o, y + r * 0.6);
        g.arc(x + o, y + r * 0.6, r, Math.PI * 1.15, Math.PI * 1.85);
        g.closePath();
        g.fill();
        g.strokeStyle = "rgba(160,110,80,0.5)";
        g.lineWidth = 0.4;
        for (let k = 1; k < 4; k++) {
          const a = Math.PI * (1.15 + (0.7 * k) / 4);
          g.beginPath();
          g.moveTo(x + o, y + r * 0.6);
          g.lineTo(x + o + Math.cos(a) * r, y + r * 0.6 + Math.sin(a) * r);
          g.stroke();
        }
      });
    }
    grain(g, gt, GW, GH, 0.14, 0.08);
    band(g, 7, lighten(grass, 0.2), grass, rng);
    blades(g, 70, 4, 13, [grass, darken(grass, 0.2), lighten(grass, 0.2)], rng, 1.2);
  },

  marsh(g, { dirt, grass }, rng, gt) {
    soil(g, darken(dirt, 0.1), darken(dirt, 0.48));
    strata(g, Y0 + 26, 6, rgba(darken(dirt, 0.35), 0.35), rng);
    strata(g, Y0 + 50, 4, rgba(darken(dirt, 0.35), 0.3), rng);
    roots(g, 12, rgba(darken(dirt, 0.6), 0.4), rng);
    pebbles(g, 6, dirt, rng);
    grain(g, gt, GW, GH, 0.2, 0.12);
    band(g, 12, lighten(grass, 0.08), darken(grass, 0.15), rng);
    for (let i = 0; i < 3; i++) {
      // puddles catching the grey sky
      const x = rng() * GW;
      const rx = between(rng, 8, 15);
      wrapped(GW, (o) => {
        g.fillStyle = rgba(mix(grass, "#d0dcec", 0.65), 0.55);
        g.beginPath();
        g.ellipse(x + o, Y0 + 6, rx, 1.8, 0, 0, TAU);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(x + o - rx * 0.5, Y0 + 5.2, rx * 0.6, 0.6);
      });
    }
    blades(g, 30, 8, 15, [darken(grass, 0.15), darken(grass, 0.35), mix(grass, "#8a8a4a", 0.4)], rng, 1.5);
    for (let i = 0; i < 6; i++) {
      // cattails
      const x = rng() * GW;
      const h = between(rng, 11, 15);
      wrapped(GW, (o) => {
        g.strokeStyle = darken(grass, 0.3);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x + o, Y0 + 3);
        g.lineTo(x + o, Y0 + 3 - h);
        g.stroke();
        g.fillStyle = "#5a3a22";
        g.beginPath();
        g.ellipse(x + o, Y0 + 1 - h + 3, 1.6, 3.4, 0, 0, TAU);
        g.fill();
      });
    }
  },

  rocky(g, { dirt, grass }, rng, gt) {
    soil(g, darken(dirt, 0.25), darken(dirt, 0.55));
    // cobbles: rows that exactly span the tile so it repeats seamlessly
    for (let y = Y0 + 9, row = 0; y < GH; y += 13, row++) {
      const widths: number[] = [];
      let sum = 0;
      while (sum < GW - 14) {
        const w = between(rng, 14, 24);
        widths.push(w);
        sum += w;
      }
      widths.push(GW - sum);
      let x = row % 2 ? 6 : 0;
      for (const w of widths) {
        const col = mix(dirt, rng() < 0.5 ? "#ffffff" : "#000000", between(rng, 0, 0.25));
        wrapped(GW, (o) => {
          g.fillStyle = col;
          g.beginPath();
          g.roundRect(x + o + 1, y + 1, w - 2, 11, 5);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.22)";
          g.fillRect(x + o + 4, y + 2, w - 8, 1.2);
          g.fillStyle = "rgba(0,0,0,0.25)";
          g.fillRect(x + o + 3, y + 10, w - 6, 1.2);
        });
        x += w;
      }
    }
    grain(g, gt, GW, GH, 0.22, 0.12);
    band(g, 7, lighten(grass, 0.1), darken(grass, 0.15), rng);
    blades(g, 40, 2, 7, [darken(grass, 0.15), grass, lighten(grass, 0.1)], rng, 1.2);
  },

  snow(g, { dirt, grass }, rng, gt) {
    soil(g, dirt, darken(dirt, 0.38));
    for (let i = 0; i < 3; i++) strata(g, Y0 + 22 + i * 18, 2.5, "rgba(207,232,255,0.2)", rng);
    pebbles(g, 8, dirt, rng);
    grain(g, gt, GW, GH, 0.16, 0.1);
    // snow drift: bumps rise above the ground line; the underside is wavy
    const ph = rng() * TAU;
    const drift = (x: number) => Y0 - Math.max(0, waveAt(x, 3, ph, 3) + waveAt(x, 7, ph * 1.7, 2));
    const under = (x: number) => Y0 + 12 + waveAt(x, 4, ph, 1.5);
    const snow = mix(grass, "#ffffff", 0.8);
    const sg = g.createLinearGradient(0, Y0 - 5, 0, Y0 + 13);
    sg.addColorStop(0, "#ffffff");
    sg.addColorStop(1, snow);
    g.fillStyle = sg;
    g.beginPath();
    for (let x = 0; x <= GW; x += 2) g.lineTo(x, drift(x));
    for (let x = GW; x >= 0; x -= 3) g.lineTo(x, under(x));
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(darken(grass, 0.25), 0.4);
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 0; x <= GW; x += 3) g.lineTo(x, under(x) + 0.8);
    g.stroke();
    // blue shade on the lee side of each bump
    for (let x = 0; x < GW; x += 1) {
      const slope = drift(x + 1) - drift(x);
      if (slope > 0) {
        g.fillStyle = `rgba(120,160,210,${Math.min(0.35, slope * 0.5)})`;
        g.fillRect(x, drift(x), 1, 5);
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = rng() * GW;
      const len = between(rng, 3, 8);
      wrapped(GW, (o) => {
        const y = under(x);
        g.fillStyle = "rgba(230,246,255,0.8)";
        g.beginPath();
        g.moveTo(x + o - 1.5, y - 1);
        g.lineTo(x + o + 1.5, y - 1);
        g.lineTo(x + o, y + len);
        g.closePath();
        g.fill();
      });
    }
    g.fillStyle = "#ffffff";
    for (let i = 0; i < 30; i++) dot(g, rng() * GW, Y0 + between(rng, -1, 10), between(rng, 0.4, 0.9));
  },

  volcanic(g, { dirt, grass }, rng, gt) {
    soil(g, darken(dirt, 0.1), darken(dirt, 0.6));
    pebbles(g, 10, darken(dirt, 0.2), rng);
    grain(g, gt, GW, GH, 0.26, 0.14);
    for (let i = 0; i < 7; i++) {
      const pts = crack(rng, rng() * GW, between(rng, Y0 + 12, GH - 8), between(rng, 30, 70), between(rng, -0.4, 0.4), 0.6);
      wrapped(GW, (o) => glowStroke(g, pts, "#ffb050", "rgba(255,80,10,0.22)", 1.1, o));
    }
    for (let i = 0; i < 22; i++) {
      g.fillStyle = `rgba(255,${(120 + rng() * 90) | 0},40,${between(rng, 0.5, 0.95)})`;
      dot(g, rng() * GW, between(rng, Y0 + 6, GH), between(rng, 0.5, 1.2));
    }
    band(g, 8, darken(dirt, 0.25), dirt, rng);
    glowLine(g, grass);
    for (let i = 0; i < 14; i++) {
      // jagged rocks sticking out of the crust, lit from the lava below
      const x = rng() * GW;
      const h = between(rng, 2, 7);
      const w = between(rng, 3, 7);
      wrapped(GW, (o) => {
        g.fillStyle = darken(dirt, 0.45);
        g.beginPath();
        g.moveTo(x + o - w / 2, Y0 + 1);
        g.lineTo(x + o - w * 0.1, Y0 + 1 - h);
        g.lineTo(x + o + w / 2, Y0 + 1);
        g.closePath();
        g.fill();
        g.strokeStyle = rgba(grass, 0.6);
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(x + o - w * 0.1, Y0 + 1 - h);
        g.lineTo(x + o + w / 2, Y0 + 1);
        g.stroke();
      });
    }
  },

  void(g, { dirt, grass }, rng, gt) {
    soil(g, darken(dirt, 0.15), "#000000");
    g.strokeStyle = rgba(lighten(grass, 0.35), 0.24);
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x < GW; x += 24) {
      g.moveTo(x + 0.5, Y0);
      g.lineTo(x + 0.5, GH);
    }
    g.stroke();
    for (const [y, a] of [[10, 0.32], [24, 0.24], [42, 0.16], [66, 0.1]] as const) {
      g.fillStyle = rgba(lighten(grass, 0.35), a);
      g.fillRect(0, Y0 + y, GW, 1);
    }
    grain(g, gt, GW, GH, 0.2, 0.08);
    glowLine(g, lighten(grass, 0.2));
    for (let i = 0; i < 12; i++) {
      // crystal shards poking up through the floor
      const x = rng() * GW;
      const h = between(rng, 4, 13);
      const w = between(rng, 2, 4.5);
      const tilt = between(rng, -2, 2);
      wrapped(GW, (o) => {
        const sg = g.createLinearGradient(0, Y0 - h, 0, Y0 + 1);
        sg.addColorStop(0, rgba(lighten(grass, 0.5), 0.95));
        sg.addColorStop(1, rgba(grass, 0.35));
        g.fillStyle = sg;
        g.beginPath();
        g.moveTo(x + o - w / 2, Y0 + 1);
        g.lineTo(x + o + tilt, Y0 - h);
        g.lineTo(x + o + w / 2, Y0 + 1);
        g.closePath();
        g.fill();
      });
    }
    g.fillStyle = rgba(lighten(grass, 0.4), 0.6);
    for (let i = 0; i < 16; i++) dot(g, rng() * GW, between(rng, Y0 + 4, GH), between(rng, 0.3, 0.8));
  },
};

export function paintGround(terrain: Terrain, p: GroundPalette, rng: Rng, grainTile: Grain): HTMLCanvasElement {
  const [cv, g] = surface(GW, GH);
  GROUND_PAINTERS[terrain](g, p, rng, grainTile);
  return cv;
}
