/**
 * UI translations. Level and difficulty names are translated here by index;
 * the English names in levels.ts / difficulty.ts stay the canonical
 * identifiers (sim output, tests). "FLAPPY RUNS" is the brand and stays as is.
 */

export type Lang = "en" | "es" | "fr" | "de" | "pt" | "ja" | "zh";

/** Selectable languages, each named in its own language. */
export const LANGUAGES: { code: Lang; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "简体中文" },
];

export interface Strings {
  /** Menu subtitle under the title. */
  subtitle: (levels: number) => string;
  /** Key legend for the flap action (key names are localised). */
  keyFlap: string;
  flap: string;
  toggleBot: string;
  restart: string;
  jump: string;
  difficulty: (name: string) => string;
  language: (name: string) => string;
  backToMenu: string;
  pressStart: string;
  hudLevel: (n: number, total: number, name: string) => string;
  score: (n: number) => string;
  deaths: (n: number) => string;
  autopilot: string;
  levelClear: (n: number) => string;
  next: (name: string) => string;
  crashed: string;
  atPipe: (i: number, of: number) => string;
  retrying: string;
  retryHint: string;
  victory: (levels: number) => string;
  totalScore: (n: number) => string;
  deathsOn: (deaths: number, difficulty: string) => string;
  playAgain: string;
  /** Page chrome around the canvas. */
  difficultyLabel: string;
  languageLabel: string;
  canvasLabel: (levels: number) => string;
  /** Indexed like DIFFICULTIES. */
  difficulties: string[];
  /** Indexed like LEVELS. */
  levels: string[];
}

const en: Strings = {
  subtitle: (n) => `${n} levels · built-in autopilot`,
  keyFlap: "Space / Click / ↑",
  flap: "flap",
  toggleBot: "toggle autopilot bot",
  restart: "restart level",
  jump: "jump to a level",
  difficulty: (name) => `difficulty: ${name}`,
  language: (name) => `language: ${name}`,
  backToMenu: "back to this menu",
  pressStart: "Press Space to start",
  hudLevel: (n, total, name) => `Level ${n}/${total} — ${name}`,
  score: (n) => `Score ${n}`,
  deaths: (n) => `Deaths ${n}`,
  autopilot: "AUTOPILOT",
  levelClear: (n) => `LEVEL ${n} CLEAR!`,
  next: (name) => `Next: ${name}`,
  crashed: "CRASHED",
  atPipe: (i, of) => `at pipe ${i} of ${of}`,
  retrying: "autopilot retrying…",
  retryHint: "Space — retry · Esc — menu",
  victory: (n) => `ALL ${n} LEVELS CLEAR!`,
  totalScore: (n) => `Total score ${n}`,
  deathsOn: (d, diff) => `Deaths ${d} · ${diff}`,
  playAgain: "Space — play again",
  difficultyLabel: "Difficulty",
  languageLabel: "Language",
  canvasLabel: (n) => `Flappy Runs — a Flappy Bird style game with ${n} levels`,
  difficulties: ["Chill", "Easy", "Normal", "Hard", "Brutal"],
  levels: [
    "First Flight", "Warming Up", "Breezy", "Tight Squeeze", "Rush Hour",
    "Wavy Air", "Turbulence", "Storm Front", "Night Run", "Impossible Sky",
    "Aurora", "Crimson Dusk", "Frostbite", "Ember Fields", "The Void",
  ],
};

const es: Strings = {
  subtitle: (n) => `${n} niveles · piloto automático integrado`,
  keyFlap: "Espacio / Clic / ↑",
  flap: "aletear",
  toggleBot: "alternar piloto automático",
  restart: "reiniciar nivel",
  jump: "saltar a un nivel",
  difficulty: (name) => `dificultad: ${name}`,
  language: (name) => `idioma: ${name}`,
  backToMenu: "volver a este menú",
  pressStart: "Pulsa Espacio para empezar",
  hudLevel: (n, total, name) => `Nivel ${n}/${total} — ${name}`,
  score: (n) => `Puntos ${n}`,
  deaths: (n) => `Choques ${n}`,
  autopilot: "PILOTO AUTO",
  levelClear: (n) => `¡NIVEL ${n} SUPERADO!`,
  next: (name) => `Siguiente: ${name}`,
  crashed: "¡CHOQUE!",
  atPipe: (i, of) => `en la tubería ${i} de ${of}`,
  retrying: "el piloto automático reintenta…",
  retryHint: "Espacio — reintentar · Esc — menú",
  victory: (n) => `¡${n} NIVELES SUPERADOS!`,
  totalScore: (n) => `Puntuación total ${n}`,
  deathsOn: (d, diff) => `Choques ${d} · ${diff}`,
  playAgain: "Espacio — jugar de nuevo",
  difficultyLabel: "Dificultad",
  languageLabel: "Idioma",
  canvasLabel: (n) => `Flappy Runs — un juego al estilo Flappy Bird con ${n} niveles`,
  difficulties: ["Relax", "Fácil", "Normal", "Difícil", "Brutal"],
  levels: [
    "Primer vuelo", "Calentando", "Brisa", "Paso estrecho", "Hora punta",
    "Aire ondulante", "Turbulencia", "Frente de tormenta", "Carrera nocturna", "Cielo imposible",
    "Aurora", "Crepúsculo carmesí", "Congelación", "Campos de brasas", "El vacío",
  ],
};

// French puts a (non-breaking) space before ":" and "!".
const fr: Strings = {
  subtitle: (n) => `${n} niveaux · pilote automatique intégré`,
  keyFlap: "Espace / Clic / ↑",
  flap: "battre des ailes",
  toggleBot: "activer/couper le pilote",
  restart: "recommencer le niveau",
  jump: "aller à un niveau",
  difficulty: (name) => `difficulté : ${name}`,
  language: (name) => `langue : ${name}`,
  backToMenu: "revenir à ce menu",
  pressStart: "Appuyez sur Espace pour jouer",
  hudLevel: (n, total, name) => `Niveau ${n}/${total} — ${name}`,
  score: (n) => `Score ${n}`,
  deaths: (n) => `Chutes ${n}`,
  autopilot: "PILOTE AUTO",
  levelClear: (n) => `NIVEAU ${n} RÉUSSI !`,
  next: (name) => `Suivant : ${name}`,
  crashed: "ÉCRASÉ !",
  atPipe: (i, of) => `au tuyau ${i} sur ${of}`,
  retrying: "le pilote automatique réessaie…",
  retryHint: "Espace — réessayer · Échap — menu",
  victory: (n) => `LES ${n} NIVEAUX RÉUSSIS !`,
  totalScore: (n) => `Score total ${n}`,
  deathsOn: (d, diff) => `Chutes ${d} · ${diff}`,
  playAgain: "Espace — rejouer",
  difficultyLabel: "Difficulté",
  languageLabel: "Langue",
  canvasLabel: (n) => `Flappy Runs — un jeu façon Flappy Bird en ${n} niveaux`,
  difficulties: ["Cool", "Facile", "Normal", "Difficile", "Brutal"],
  levels: [
    "Premier envol", "Échauffement", "Brise légère", "Passage étroit", "Heure de pointe",
    "Air ondulant", "Turbulences", "Front orageux", "Course nocturne", "Ciel impossible",
    "Aurore", "Crépuscule pourpre", "Engelures", "Champs de braises", "Le Néant",
  ],
};

const de: Strings = {
  subtitle: (n) => `${n} Level · eingebauter Autopilot`,
  keyFlap: "Leertaste / Klick / ↑",
  flap: "flattern",
  toggleBot: "Autopilot an/aus",
  restart: "Level neu starten",
  jump: "Level direkt wählen",
  difficulty: (name) => `Schwierigkeit: ${name}`,
  language: (name) => `Sprache: ${name}`,
  backToMenu: "zurück zu diesem Menü",
  pressStart: "Leertaste drücken zum Starten",
  hudLevel: (n, total, name) => `Level ${n}/${total} — ${name}`,
  score: (n) => `Punkte ${n}`,
  deaths: (n) => `Abstürze ${n}`,
  autopilot: "AUTOPILOT",
  levelClear: (n) => `LEVEL ${n} GESCHAFFT!`,
  next: (name) => `Als Nächstes: ${name}`,
  crashed: "ABGESTÜRZT",
  atPipe: (i, of) => `bei Röhre ${i} von ${of}`,
  retrying: "Autopilot versucht es erneut…",
  retryHint: "Leertaste — nochmal · Esc — Menü",
  victory: (n) => `ALLE ${n} LEVEL GESCHAFFT!`,
  totalScore: (n) => `Gesamtpunktzahl ${n}`,
  deathsOn: (d, diff) => `Abstürze ${d} · ${diff}`,
  playAgain: "Leertaste — nochmal spielen",
  difficultyLabel: "Schwierigkeit",
  languageLabel: "Sprache",
  canvasLabel: (n) => `Flappy Runs — ein Spiel im Stil von Flappy Bird mit ${n} Leveln`,
  difficulties: ["Entspannt", "Leicht", "Normal", "Schwer", "Brutal"],
  levels: [
    "Erster Flug", "Aufwärmen", "Frische Brise", "Engpass", "Rushhour",
    "Wellenluft", "Turbulenzen", "Gewitterfront", "Nachtflug", "Unmöglicher Himmel",
    "Polarlicht", "Purpurne Dämmerung", "Frostbiss", "Glutfelder", "Die Leere",
  ],
};

const pt: Strings = {
  subtitle: (n) => `${n} fases · piloto automático embutido`,
  keyFlap: "Espaço / Clique / ↑",
  flap: "bater as asas",
  toggleBot: "ligar/desligar o piloto",
  restart: "reiniciar a fase",
  jump: "ir para uma fase",
  difficulty: (name) => `dificuldade: ${name}`,
  language: (name) => `idioma: ${name}`,
  backToMenu: "voltar a este menu",
  pressStart: "Aperte Espaço para começar",
  hudLevel: (n, total, name) => `Fase ${n}/${total} — ${name}`,
  score: (n) => `Pontos ${n}`,
  deaths: (n) => `Batidas ${n}`,
  autopilot: "PILOTO AUTO",
  levelClear: (n) => `FASE ${n} CONCLUÍDA!`,
  next: (name) => `Próxima: ${name}`,
  crashed: "BATEU!",
  atPipe: (i, of) => `no cano ${i} de ${of}`,
  retrying: "piloto automático tentando de novo…",
  retryHint: "Espaço — tentar de novo · Esc — menu",
  victory: (n) => `TODAS AS ${n} FASES CONCLUÍDAS!`,
  totalScore: (n) => `Pontuação total ${n}`,
  deathsOn: (d, diff) => `Batidas ${d} · ${diff}`,
  playAgain: "Espaço — jogar de novo",
  difficultyLabel: "Dificuldade",
  languageLabel: "Idioma",
  canvasLabel: (n) => `Flappy Runs — um jogo no estilo Flappy Bird com ${n} fases`,
  difficulties: ["Tranquilo", "Fácil", "Normal", "Difícil", "Brutal"],
  levels: [
    "Primeiro voo", "Aquecendo", "Brisa", "Aperto", "Hora do rush",
    "Ar ondulante", "Turbulência", "Frente de tempestade", "Corrida noturna", "Céu impossível",
    "Aurora", "Crepúsculo carmesim", "Congelamento", "Campos de brasa", "O Vazio",
  ],
};

const ja: Strings = {
  subtitle: (n) => `全${n}ステージ · オートパイロット搭載`,
  keyFlap: "スペース / クリック / ↑",
  flap: "はばたく",
  toggleBot: "オートパイロット切替",
  restart: "ステージをやり直す",
  jump: "ステージを選ぶ",
  difficulty: (name) => `難易度: ${name}`,
  language: (name) => `言語: ${name}`,
  backToMenu: "このメニューに戻る",
  pressStart: "スペースでスタート",
  hudLevel: (n, total, name) => `ステージ ${n}/${total} — ${name}`,
  score: (n) => `スコア ${n}`,
  deaths: (n) => `ミス ${n}`,
  autopilot: "オートパイロット",
  levelClear: (n) => `ステージ ${n} クリア!`,
  next: (name) => `次: ${name}`,
  crashed: "クラッシュ!",
  atPipe: (i, of) => `${of}本中 ${i}本目のパイプ`,
  retrying: "オートパイロット再挑戦中…",
  retryHint: "スペース — リトライ · Esc — メニュー",
  victory: (n) => `全${n}ステージ クリア!`,
  totalScore: (n) => `合計スコア ${n}`,
  deathsOn: (d, diff) => `ミス ${d} · ${diff}`,
  playAgain: "スペース — もう一度遊ぶ",
  difficultyLabel: "難易度",
  languageLabel: "言語",
  canvasLabel: (n) => `Flappy Runs — 全${n}ステージのフラッピーバード風ゲーム`,
  difficulties: ["のんびり", "かんたん", "ふつう", "むずかしい", "鬼"],
  levels: [
    "はじめての飛行", "ウォームアップ", "そよ風", "狭き門", "ラッシュアワー",
    "波打つ風", "乱気流", "嵐の前線", "夜間飛行", "不可能な空",
    "オーロラ", "深紅の黄昏", "凍傷", "燃えさかる大地", "虚空",
  ],
};

const zh: Strings = {
  subtitle: (n) => `${n} 个关卡 · 内置自动驾驶`,
  keyFlap: "空格 / 点击 / ↑",
  flap: "振翅",
  toggleBot: "开关自动驾驶",
  restart: "重新开始本关",
  jump: "跳到指定关卡",
  difficulty: (name) => `难度：${name}`,
  language: (name) => `语言：${name}`,
  backToMenu: "返回此菜单",
  pressStart: "按空格键开始",
  hudLevel: (n, total, name) => `第 ${n}/${total} 关 — ${name}`,
  score: (n) => `得分 ${n}`,
  deaths: (n) => `失败 ${n}`,
  autopilot: "自动驾驶",
  levelClear: (n) => `第 ${n} 关完成！`,
  next: (name) => `下一关：${name}`,
  crashed: "撞到了！",
  atPipe: (i, of) => `第 ${i} 根管子（共 ${of} 根）`,
  retrying: "自动驾驶正在重试…",
  retryHint: "空格 — 重试 · Esc — 菜单",
  victory: (n) => `全部 ${n} 关通关！`,
  totalScore: (n) => `总分 ${n}`,
  deathsOn: (d, diff) => `失败 ${d} · ${diff}`,
  playAgain: "空格 — 再玩一次",
  difficultyLabel: "难度",
  languageLabel: "语言",
  canvasLabel: (n) => `Flappy Runs — 一款有 ${n} 个关卡的 Flappy Bird 风格游戏`,
  difficulties: ["休闲", "简单", "普通", "困难", "残酷"],
  levels: [
    "初次飞行", "热身", "微风", "狭路", "高峰时段",
    "波浪气流", "湍流", "风暴前线", "夜间飞行", "不可能的天空",
    "极光", "绯红黄昏", "冻伤", "余烬之野", "虚空",
  ],
};

export const STRINGS: Record<Lang, Strings> = { en, es, fr, de, pt, ja, zh };

let current: Lang = "en";

export function language(): Lang {
  return current;
}

export function setLanguage(lang: Lang): void {
  current = lang;
}

/** Strings for the current language. */
export function strings(): Strings {
  return STRINGS[current];
}

export function isLang(code: string | null | undefined): code is Lang {
  return LANGUAGES.some((l) => l.code === code);
}

/** First supported language among the browser's preferences, by primary subtag (fr-CA → fr). */
export function detectLanguage(prefs: readonly string[]): Lang {
  for (const p of prefs) {
    const primary = p.toLowerCase().split("-")[0];
    if (isLang(primary)) return primary;
  }
  return "en";
}
