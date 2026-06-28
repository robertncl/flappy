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
  /** Optional pipe palette [light, dark]; defaults derive from `dark`. */
  pipe?: [string, string];
  /** Optional ground palette [dirt, grass]; defaults derive from `dark`. */
  ground?: [string, string];
  /** Optional distant-hill silhouette colour for parallax depth. */
  hills?: string;
  /** Optional falling-particle weather effect. */
  weather?: "snow" | "rain";
  /** Optional aurora band colours for night skies, [inner, outer]. */
  aurora?: [string, string];
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
  {
    id: 11,
    name: "Aurora",
    seed: 111,
    pipesToClear: 16,
    pipeGap: 150,
    pipeSpeed: 212,
    pipeSpacing: 262,
    maxCenterDelta: 128,
    oscAmplitude: 38,
    oscFrequency: 0.36,
    dark: true,
    sky: ["#05203a", "#0a3c4a"],
    pipe: ["#52d0c2", "#1d7a72"],
    ground: ["#13313a", "#2f7a72"],
    weather: "snow",
    aurora: ["#5effb8", "#3aa0ff"],
  },
  {
    id: 12,
    name: "Crimson Dusk",
    seed: 121,
    pipesToClear: 16,
    pipeGap: 148,
    pipeSpeed: 218,
    pipeSpacing: 258,
    maxCenterDelta: 132,
    oscAmplitude: 40,
    oscFrequency: 0.38,
    dark: true,
    sky: ["#2a0a1e", "#7a1f33"],
    pipe: ["#c75b6a", "#7a2433"],
    ground: ["#321016", "#7a2f38"],
    hills: "#3d1322",
  },
  {
    id: 13,
    name: "Frostbite",
    seed: 131,
    pipesToClear: 17,
    pipeGap: 147,
    pipeSpeed: 222,
    pipeSpacing: 255,
    maxCenterDelta: 134,
    oscAmplitude: 42,
    oscFrequency: 0.40,
    dark: false,
    sky: ["#bfe6ff", "#eaf7ff"],
    pipe: ["#bfe9ff", "#5a93c4"],
    ground: ["#d6ecf5", "#9fd0e6"],
    hills: "#c4dcea",
    weather: "snow",
  },
  {
    id: 14,
    name: "Ember Fields",
    seed: 141,
    pipesToClear: 18,
    pipeGap: 145,
    pipeSpeed: 226,
    pipeSpacing: 252,
    maxCenterDelta: 136,
    oscAmplitude: 44,
    oscFrequency: 0.41,
    dark: true,
    sky: ["#1a0d08", "#5c2410"],
    pipe: ["#4a4038", "#241d18"],
    ground: ["#2a1108", "#a8431a"],
    hills: "#3a1b0e",
  },
  {
    id: 15,
    name: "The Void",
    seed: 151,
    pipesToClear: 20,
    pipeGap: 143,
    pipeSpeed: 232,
    pipeSpacing: 248,
    maxCenterDelta: 138,
    oscAmplitude: 46,
    oscFrequency: 0.43,
    dark: true,
    sky: ["#040406", "#150a26"],
    pipe: ["#7a5cc9", "#39236e"],
    ground: ["#0a0612", "#3a2a5e"],
    aurora: ["#9a6cff", "#4a2a9a"],
  },
];
