// § named epidemics. The point of the table is that a `disease` death gets
// named by something that was actually running where and when the person
// died — so the tests worth having are the ones that stop a name leaking
// out of its region, its years, or its cause.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { EPIDEMICS, epidemicAt, epidemicNews } from "./data/epidemics.js";
import { REGIONS } from "./data/regions.js";
import { makeRng } from "./hash.js";
import type { Rng } from "./types.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

/** A real rng with only its `chance` replaced — spreading an Rng would drop
 * its call signature, and epidemicAt is defined against the interface. */
function stubRng(chance: () => boolean): Rng {
  const real = makeRng(1);
  const r = (() => real()) as Rng;
  r.int = real.int;
  r.pick = real.pick;
  r.weighted = real.weighted;
  r.chance = chance;
  return r;
}
const always = () => stubRng(() => true);
const never = () => stubRng(() => false);

describe("§ named epidemics: the table", () => {
  it("is complete in both locales and points at real regions", () => {
    for (const e of EPIDEMICS) {
      expect(e.detail.en.length, e.name.en).toBeGreaterThan(0);
      expect(e.detail.ca.length, e.name.en).toBe(e.detail.en.length);
      expect(e.name.ca.length, e.name.en).toBeGreaterThan(0);
      expect(e.to, e.name.en).toBeGreaterThanOrEqual(e.from);
      expect(e.chance, e.name.en).toBeGreaterThan(0);
      expect(e.chance, e.name.en).toBeLessThanOrEqual(1);
      if (e.regions) for (const rk of e.regions) expect(REGION_KEYS, e.name.en).toContain(rk);
      if (e.news) expect(e.news.ca.length, e.name.en).toBeGreaterThan(20);
    }
  });

  it("keeps a local sickness local and a dated one dated", () => {
    // The sweating sickness was never recorded outside England.
    expect(epidemicAt(1485, "england", 40, always())?.name.en).toBe("the sweating sickness");
    expect(epidemicAt(1485, "catalonia", 40, always())?.name.en).not.toBe("the sweating sickness");
    expect(epidemicAt(1470, "england", 40, always())?.name.en).not.toBe("the sweating sickness");
    // St Anthony's fire belongs to the rye country, not the olive south.
    const cat = epidemicAt(1400, "catalonia", 40, always());
    expect(cat?.name.en).not.toBe("St Anthony's fire");
    // The ague is the standing fact of the Italian lowlands.
    expect(epidemicAt(1400, "italy", 40, always())?.name.en).toBe("the ague");
  });

  it("respects its own age gates", () => {
    for (const rk of REGION_KEYS) {
      for (const age of [0, 3, 8, 12, 30, 70]) {
        for (const year of [1300, 1400, 1439, 1485]) {
          const hit = epidemicAt(year, rk, age, always());
          if (!hit) continue;
          if (hit.ageMin != null) expect(age, `${hit.name.en} ${rk} ${age}`).toBeGreaterThanOrEqual(hit.ageMin);
          if (hit.ageMax != null) expect(age, `${hit.name.en} ${rk} ${age}`).toBeLessThanOrEqual(hit.ageMax);
          if (hit.regions) expect(hit.regions, hit.name.en).toContain(rk);
          expect(year).toBeGreaterThanOrEqual(hit.from);
          expect(year).toBeLessThanOrEqual(hit.to);
        }
      }
    }
  });

  it("claims nothing when no candidate rolls — the grey bucket is still allowed", () => {
    for (const rk of REGION_KEYS) expect(epidemicAt(1400, rk, 40, never()), rk).toBeNull();
  });

  it("falls through a candidate that does not claim, rather than giving up", () => {
    // An Italian who did not die of the ague can still die of a consumption:
    // a failing candidate must not end the search. A stream that fails once
    // then succeeds has to reach the SECOND candidate.
    let calls = 0;
    const hit = epidemicAt(
      1400,
      "italy",
      40,
      stubRng(() => ++calls > 1),
    );
    expect(hit).not.toBeNull();
    expect(hit?.name.en).not.toBe("the ague");
    expect(calls).toBeGreaterThan(1);
  });

  it("only carries news for the dated outbreaks", () => {
    const news = epidemicNews("en");
    expect(news.length).toBeGreaterThan(0);
    for (const n of news) {
      expect(n.to - n.from).toBeLessThan(20);
      expect(n.text.length).toBeGreaterThan(30);
      if (n.regions) for (const rk of n.regions) expect(REGION_KEYS).toContain(rk);
    }
    expect(epidemicNews("ca").length).toBe(news.length);
  });
});

describe("§ named epidemics: in the register", () => {
  it("names a real share of the disease deaths, and only disease deaths", () => {
    const detailOf = (text: string) => EPIDEMICS.find((e) => e.detail.en.some((d) => text.includes(d.slice(0, 34))));
    for (const [rk, idx] of [
      ["italy", 5],
      ["england", 5],
      ["france", 5],
    ] as const) {
      const env = resolveVillage(1444, rk, idx);
      let disease = 0;
      let named = 0;
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en");
        const close = bio?.events.find((e) => e.kind === "death" || e.kind === "elsewhere");
        if (!close) continue;
        const hit = detailOf(close.text);
        if (hit) {
          named++;
          // A named epidemic may only ever claim a `disease` death, and only
          // in a region and year it actually reached.
          expect(p.death.cause, `${rk}: ${hit.name.en}`).toBe("disease");
          if (hit.regions) expect(hit.regions, hit.name.en).toContain(rk);
          expect(p.death.year).toBeGreaterThanOrEqual(hit.from);
          expect(p.death.year).toBeLessThanOrEqual(hit.to);
        }
        if (p.death.cause === "disease") disease++;
      }
      expect(disease, rk).toBeGreaterThan(20);
      expect(named, rk).toBeGreaterThan(disease * 0.2);
    }
  });

  it("gives Italy its ague and France its rye-country fire, and not the other way about", () => {
    const scan = (rk: string, idx: number) => {
      const env = resolveVillage(1444, rk, idx);
      const text = env.persons
        .map(
          (p) =>
            decodePerson(env, p.id, "en")
              ?.events.map((e) => e.text)
              .join(" ") ?? "",
        )
        .join(" ");
      return text;
    };
    const italy = scan("italy", 5);
    const france = scan("france", 5);
    expect(italy).toMatch(/tertian ague|quartan fever|marsh fever/);
    expect(italy).not.toMatch(/St Anthony's fire/);
    expect(france).toMatch(/St Anthony's fire|fire-sickness/);
    expect(france).not.toMatch(/tertian ague/);
  });
});
