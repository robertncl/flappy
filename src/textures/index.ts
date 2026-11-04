import { mulberry32 } from "../engine";
import type { LevelConfig } from "../levels";
import { groundPalette, paintGround } from "./ground";
import { paintHillLayer } from "./hills";
import { makeGrain } from "./paint";
import { paintLip, paintPipeBody, pipePalette } from "./pipes";
import { paintCloud, paintSky } from "./sky";

/**
 * Procedural, per-level textures. Everything here is painted once when a
 * level loads into offscreen canvases; the renderer then only blits/tiles
 * them, which is cheaper per frame than the vector drawing it replaces.
 * Painting is seeded from the level, so a level always looks the same.
 */

export { TEX_SCALE } from "./paint";
export { LIP_H, LIP_W } from "./pipes";
export { GROUND_LIP, GROUND_TILE } from "./ground";
export { HILL_H, HILL_PARALLAX, HILL_PERIOD } from "./hills";
export { CLOUD_H, CLOUD_W, paintMoon } from "./sky";

export interface LevelTextures {
  /** PIPE_W × PIPE_TILE, repeats vertically. */
  pipeBody: HTMLCanvasElement;
  /** LIP_W × LIP_H pipe cap. */
  lip: HTMLCanvasElement;
  /** GROUND_TILE × (GROUND_LIP + GROUND_H), repeats horizontally. */
  ground: HTMLCanvasElement;
  /** Back to front, HILL_PERIOD × HILL_H each; empty when the level has no hills. */
  hills: HTMLCanvasElement[];
  /** WIDTH × PLAY_H static sky backdrop. */
  sky: HTMLCanvasElement;
  /** CLOUD_W × CLOUD_H sprite variants (day levels only). */
  clouds: HTMLCanvasElement[];
}

export function buildLevelTextures(lvl: LevelConfig): LevelTextures {
  const rng = mulberry32(lvl.seed ^ 0x5bd1e995);
  const grainTile = makeGrain(rng);
  const style = lvl.pipeStyle ?? "glossy";
  const terrain = lvl.terrain ?? "meadow";
  const pipe = pipePalette(lvl);
  return {
    pipeBody: paintPipeBody(style, pipe, rng, grainTile),
    lip: paintLip(style, pipe, rng, grainTile),
    ground: paintGround(terrain, groundPalette(lvl), rng, grainTile),
    hills: lvl.hills ? [0, 1, 2].map((i) => paintHillLayer(lvl, terrain, i, rng, grainTile)) : [],
    sky: paintSky(lvl, terrain, rng, grainTile),
    clouds: lvl.dark ? [] : Array.from({ length: 4 }, () => paintCloud(lvl, rng)),
  };
}
