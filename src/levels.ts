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
  /** Night-time palette: swaps sun+clouds for stars+moon and enables aurora. */
  dark: boolean;
  /** Sky gradient, top to bottom. */
  sky: [string, string];
  /** Pipe palette [light, dark]; defaults derive from `dark`. */
  pipe?: [string, string];
  /** Ground palette [dirt, grass]; defaults derive from `dark`. */
  ground?: [string, string];
  /** Distant-hill silhouette colour for parallax depth. */
  hills?: string;
  /** Falling-particle weather effect. */
  weather?: "snow" | "rain";
  /** Aurora band colours [inner, outer]. Only drawn when `dark` is true. */
  aurora?: [string, string];
}

/**
 * Difficulty ramps monotonically (gap shrinks, speed and oscillation grow)
 * while each level gets its own scenery. The visual fields below are purely
 * cosmetic — the engine only reads the numeric fields, so re-theming a level
 * never changes its pipe layout or the bot's route through it.
 */
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
    // Clear morning: hazy blue, classic green pipes.
    dark: false,
    sky: ["#8fd8ff", "#e8f7ff"],
    pipe: ["#5fd97a", "#1f7a3c"],
    ground: ["#c9a05a", "#6ac95c"],
    hills: "#bfe6c9",
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
    // Dawn: rose sky over warm distant ridges.
    dark: false,
    sky: ["#f7a9b8", "#ffe3b0"],
    pipe: ["#8ed49a", "#357a4d"],
    ground: ["#c99a63", "#5fb567"],
    hills: "#e0a08f",
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
    // Midday meadow: deep blue overhead, rolling green hills.
    dark: false,
    sky: ["#4fb3e8", "#c8ecff"],
    pipe: ["#6ee08a", "#25864a"],
    ground: ["#b5843f", "#57bf52"],
    hills: "#7fc98f",
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
    // Desert canyon: sand haze, terracotta pipes, dune crest for "grass".
    dark: false,
    sky: ["#f3c98b", "#fdeccb"],
    pipe: ["#d98a5a", "#8a4526"],
    ground: ["#c48d51", "#d9b271"],
    hills: "#c98b63",
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
    // Golden hour: blazing sky, pipes reading as warm silhouettes.
    dark: false,
    sky: ["#ff9a4d", "#ffdca8"],
    pipe: ["#c98a4a", "#5e3418"],
    ground: ["#7a4a2a", "#c98a3f"],
    hills: "#a35a35",
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
    // Tropical lagoon: turquoise water light, pale sand shore.
    dark: false,
    sky: ["#38c6d9", "#c8f5f0"],
    pipe: ["#3fd9a8", "#127a5e"],
    ground: ["#d9c48f", "#3fc9a0"],
    hills: "#5fd9c4",
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
    // Overcast downpour: flat grey light, mossy wet pipes.
    dark: false,
    sky: ["#7a8399", "#c2cbd9"],
    pipe: ["#6f8a7a", "#2c4a3c"],
    ground: ["#5a5040", "#4a7a52"],
    hills: "#8a94a8",
    weather: "rain",
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
    // Night thunderhead: bruised indigo, cold steel pipes, driving rain.
    dark: true,
    sky: ["#1e2340", "#4a3f6b"],
    pipe: ["#4a7a8a", "#1a3a48"],
    ground: ["#2a2438", "#3a5a4a"],
    hills: "#2a2f4a",
    weather: "rain",
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
    // Clear starry night: moonlit greens, low navy hills.
    dark: true,
    sky: ["#101a3a", "#3a4a80"],
    pipe: ["#3a8a6a", "#14503a"],
    ground: ["#2a2a3a", "#2f6a48"],
    hills: "#1a2447",
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
    // High altitude: near-black zenith, indigo pipes, faint blue airglow.
    dark: true,
    sky: ["#070a1e", "#26306b"],
    pipe: ["#5a6ec9", "#232f70"],
    ground: ["#0e1024", "#2a3a70"],
    aurora: ["#6a9aff", "#2a4aa8"],
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
    // Arctic night: green-blue curtains over ice, drifting snow.
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
    // Blood-red horizon fading to near-black overhead.
    dark: true,
    sky: ["#2a0a1e", "#8a2338"],
    pipe: ["#c75b6a", "#7a2433"],
    ground: ["#321016", "#7a2f38"],
    hills: "#4a1526",
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
    // Whiteout blizzard: the one bright level this late in the run.
    dark: false,
    sky: ["#bfe6ff", "#f2fbff"],
    pipe: ["#cff0ff", "#5a93c4"],
    ground: ["#cfe4ef", "#a8d8ea"],
    hills: "#cfe2ee",
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
    // Volcanic: charred rock pipes over a lava-lit crust.
    dark: true,
    sky: ["#1a0d08", "#6b2a10"],
    pipe: ["#5a4a3a", "#241d18"],
    ground: ["#2a1108", "#b8481a"],
    hills: "#3f1c0e",
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
    // Deep space: violet nebula bands, no horizon to speak of.
    dark: true,
    sky: ["#030308", "#170a2c"],
    pipe: ["#8a68d9", "#39236e"],
    ground: ["#0a0612", "#3f2d66"],
    aurora: ["#a06cff", "#4a2a9a"],
  },
];
