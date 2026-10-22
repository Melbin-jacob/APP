import { describe, expect, it } from "vitest";
import { createT, loadMessages } from "@/i18n";
import { LOCALES, negotiateLocale } from "@/i18n/locales";
import en from "@/i18n/messages/en";

type Tree = { [k: string]: string | Tree };
const flat = (o: Tree, p = ""): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>(
    (acc, [k, v]) => (typeof v === "string" ? { ...acc, [p + k]: v } : { ...acc, ...flat(v, `${p}${k}.`) }),
    {},
  );
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const source = flat(en);

describe.each(LOCALES.map((l) => l.code))("%s translations", (code) => {
  it("has every key with the same placeholders as English", async () => {
    const msgs = flat((await loadMessages(code)) as unknown as Tree);
    const problems = Object.keys(source).flatMap((k) => {
      if (!msgs[k]?.trim()) return [`${k}: missing`];
      // A singular form may spell the number out ("one professional").
      if (k.endsWith("One")) return [];
      return placeholders(source[k]) === placeholders(msgs[k]) ? [] : [`${k}: {${placeholders(msgs[k])}} vs {${placeholders(source[k])}}`];
    });
    expect(problems).toEqual([]);
  });
});

describe("negotiateLocale", () => {
  it.each([
    ["fr-CA,fr;q=0.9,en;q=0.8", "fr"],
    ["en-US,en;q=0.9", "en"],
    ["xx-YY,es;q=0.5", "es"],
    ["de;q=0.2,ja;q=0.8", "ja"],
    ["", "en"],
    [null, "en"],
    ["tlh", "en"],
  ])("%s → %s", (header, want) => expect(negotiateLocale(header)).toBe(want));
});

describe("translator", () => {
  const t = createT(en);
  it("fills placeholders", () => expect(t("search.resultsOther", { count: 3 })).toBe("3 professionals found"));
  it("falls back for unknown dynamic keys", () => expect(t.maybe("categories.names.unknown", "Fallback")).toBe("Fallback"));
  it("splits rich text around nodes", () =>
    expect(t.rich("review.confirm", { terms: "<LINK>" })).toContain("<LINK>"));
});
