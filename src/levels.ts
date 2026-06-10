export interface LevelConfig {
  id: number;
  name: string;
  /** Seed for the deterministic pipe layout of this level. */
  seed: number;
  /** Pipes the bird must pass to finish the level. */
  pipesToClear: number;
  /** Vertical opening between the pipe halves, in px. */
  pipeGap: number;
  /** Horizontal scroll speed, in px/s. */
  pipeSpeed: number;
  /** Horizontal distance between consecutive pipes, in px. */
  pipeSpacing: number;
  /** Max vertical distance between consecutive gap centers, in px. */
  maxCenterDelta: number;
  /** Amplitude of the vertical gap oscillation (0 = static pipes), in px. */
  oscAmplitude: number;
  /** Frequency of the gap oscillation, in Hz. */
  oscFrequency: number;
  /** Night-time palette (stars, darker pipes/ground). */
  dark: boolean;
  /** Sky gradient, top to bottom. */
  sky: [string, string];
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "First Flight",
    seed: 11,
    pipesToClear: 5,
    pipeGap: 200,
    pipeSpeed: 130,
    pipeSpacing: 330,
    maxCenterDelta: 120,
    oscAmplitude: 0,
    oscFrequency: 0,
    dark: false,
    sky: ["#8fd8ff", "#dff4ff"],
  },
  {
    id: 2,
    name: "Warming Up",
    seed: 22,
    pipesToClear: 6,
    pipeGap: 190,
    pipeSpeed: 140,
    pipeSpacing: 320,
    maxCenterDelta: 135,
    oscAmplitude: 0,
    oscFrequency: 0,
    dark: false,
    sky: ["#7fcdf5", "#d6f0ff"],
  },
  {
    id: 3,
    name: "Breezy",
    seed: 33,
    pipesToClear: 7,
    pipeGap: 180,
    pipeSpeed: 150,
    pipeSpacing: 305,
    maxCenterDelta: 150,
    oscAmplitude: 0,
    oscFrequency: 0,
    dark: false,
    sky: ["#6fc3ec", "#cdeaff"],
  },
  {
    id: 4,
    name: "Tight Squeeze",
    seed: 44,
    pipesToClear: 8,
    pipeGap: 170,
    pipeSpeed: 160,
    pipeSpacing: 295,
    maxCenterDelta: 160,
    oscAmplitude: 0,
    oscFrequency: 0,
    dark: false,
    sky: ["#5fb6e2", "#c2e2f8"],
  },
  {
    id: 5,
    name: "Rush Hour",
    seed: 55,
    pipesToClear: 9,
    pipeGap: 165,
    pipeSpeed: 178,
    pipeSpacing: 285,
    maxCenterDelta: 165,
    oscAmplitude: 0,
    oscFrequency: 0,
    dark: false,
    sky: ["#ffb45e", "#ffe2b0"],
  },
  {
    id: 6,
    name: "Wavy Air",
    seed: 66,
    pipesToClear: 10,
    pipeGap: 172,
    pipeSpeed: 168,
    pipeSpacing: 295,
    maxCenterDelta: 140,
    oscAmplitude: 20,
    oscFrequency: 0.3,
    dark: false,
    sky: ["#f48c5c", "#ffc9a0"],
  },
  {
    id: 7,
    name: "Turbulence",
    seed: 77,
    pipesToClear: 11,
    pipeGap: 165,
    pipeSpeed: 178,
    pipeSpacing: 285,
    maxCenterDelta: 145,
    oscAmplitude: 28,
    oscFrequency: 0.32,
    dark: false,
    sky: ["#b06a93", "#eda288"],
  },
  {
    id: 8,
    name: "Storm Front",
    seed: 88,
    pipesToClear: 12,
    pipeGap: 158,
    pipeSpeed: 188,
    pipeSpacing: 275,
    maxCenterDelta: 145,
    oscAmplitude: 34,
    oscFrequency: 0.35,
    dark: true,
    sky: ["#46498b", "#8a67a3"],
  },
  {
    id: 9,
    name: "Night Run",
    seed: 99,
    pipesToClear: 13,
    pipeGap: 152,
    pipeSpeed: 200,
    pipeSpacing: 265,
    maxCenterDelta: 140,
    oscAmplitude: 40,
    oscFrequency: 0.38,
    dark: true,
    sky: ["#222a52", "#46498b"],
  },
  {
    id: 10,
    name: "Impossible Sky",
    seed: 1010,
    pipesToClear: 15,
    pipeGap: 148,
    pipeSpeed: 214,
    pipeSpacing: 258,
    maxCenterDelta: 130,
    oscAmplitude: 42,
    oscFrequency: 0.38,
    dark: true,
    sky: ["#101430", "#2c2f63"],
  },
];
