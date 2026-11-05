import { describe, expect, test } from "bun:test";
import { DIFFICULTIES } from "../src/difficulty";
import { LANGUAGES, STRINGS, detectLanguage, isLang } from "../src/i18n";
import { LEVELS } from "../src/levels";

test("every listed language has a string table, and vice versa", () => {
  expect(LANGUAGES.map((l): string => l.code).sort()).toEqual(Object.keys(STRINGS).sort());
});

test("English names match the canonical level and difficulty names", () => {
  expect(STRINGS.en.levels).toEqual(LEVELS.map((l) => l.name));
  expect(STRINGS.en.difficulties).toEqual(DIFFICULTIES.map((d) => d.name));
});

for (const { code } of LANGUAGES) {
  describe(code, () => {
    const t = STRINGS[code];

    test("names every level and difficulty", () => {
      expect(t.levels).toHaveLength(LEVELS.length);
      expect(t.difficulties).toHaveLength(DIFFICULTIES.length);
      for (const name of [...t.levels, ...t.difficulties]) expect(name.trim()).not.toBe("");
    });

    test("templates keep the numbers and names they are given", () => {
      expect(t.hudLevel(7, 15, "X")).toContain("7");
      expect(t.hudLevel(7, 15, "X")).toContain("15");
      expect(t.hudLevel(7, 15, "X")).toContain("X");
      expect(t.atPipe(3, 8)).toContain("3");
      expect(t.atPipe(3, 8)).toContain("8");
      expect(t.deathsOn(4, "Y")).toContain("4");
      expect(t.deathsOn(4, "Y")).toContain("Y");
      for (const s of [t.score(12), t.deaths(12), t.totalScore(12), t.levelClear(12), t.victory(12)]) {
        expect(s).toContain("12");
      }
    });
  });
}

describe("detectLanguage", () => {
  test("matches on the primary subtag", () => {
    expect(detectLanguage(["fr-CA"])).toBe("fr");
    expect(detectLanguage(["pt-BR"])).toBe("pt");
    expect(detectLanguage(["ZH-hans-CN"])).toBe("zh");
  });

  test("takes the first supported preference", () => {
    expect(detectLanguage(["ko-KR", "de-AT", "en"])).toBe("de");
  });

  test("falls back to English", () => {
    expect(detectLanguage(["ko-KR"])).toBe("en");
    expect(detectLanguage([])).toBe("en");
  });
});

test("isLang only accepts supported codes", () => {
  expect(isLang("ja")).toBe(true);
  expect(isLang("xx")).toBe(false);
  expect(isLang(null)).toBe(false);
});
