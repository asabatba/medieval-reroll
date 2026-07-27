// § named epidemics. The point of the table is that a `disease` death gets
// named by something that was actually running where and when the person
// died — so the tests worth having are the ones that stop a name leaking
// out of its region, its years, or its cause.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { EPIDEMICS, epidemicAt, epidemicNews } from "./data/epidemics.js";
import { REGIONS } from "./data/regions.js";
import { outbreakAt, outbreakHazard } from "./epidemics.js";
import { CRISIS_FEVER_SHARE, crisisFeverHazard, dearthHazard, harvestAt } from "./harvest.js";
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

describe("§ the epidemic year: the hazard", () => {
  it("gives a hazard to the dated outbreaks and never to the endemic background", () => {
    // The rule the whole split rests on: the endemic entries decompose the
    // life table's disease background, so a hazard on them would count the
    // same deaths twice. This is checkable straight off the table.
    for (const e of EPIDEMICS) {
      const dated = e.to - e.from < 20;
      if (dated) {
        expect(e.excess, e.name.en).toBeGreaterThan(0);
        expect(e.shape, e.name.en).toBeDefined();
      } else {
        expect(e.excess, e.name.en).toBeUndefined();
      }
    }
    // And no endemic entry can be reached through the hazard lookup at all.
    for (const rk of REGION_KEYS) {
      for (const year of [1300, 1400, 1450]) {
        expect(outbreakAt(year, rk, 40), `${rk} ${year}`).toBeNull();
      }
    }
  });

  it("keeps the sweat in England, in its own years, and on grown men", () => {
    expect(outbreakHazard(1485, "england", 30, 1)).toBeGreaterThan(0);
    expect(outbreakHazard(1485, "catalonia", 30, 1)).toBe(0);
    expect(outbreakHazard(1480, "england", 30, 1)).toBe(0);
    // The inversion that gave it its name: it passed over children and the
    // old and took adults in their strength.
    expect(outbreakHazard(1485, "england", 8, 1)).toBe(0);
    expect(outbreakHazard(1485, "england", 30, 1)).toBeGreaterThan(outbreakHazard(1485, "england", 70, 1));
  });

  it("makes a wave one bad year with a tail, not a plateau", () => {
    expect(outbreakHazard(1486, "england", 30, 1)).toBeLessThan(outbreakHazard(1485, "england", 30, 1) / 2);
  });

  it("lets the world's own harvest decide how hard the dear-years fever hit", () => {
    // The one harvest-driven entry: documented years, but a weight that
    // answers to the yield rather than to a constant.
    const bad = outbreakHazard(1438, "england", 30, 0.5);
    const fine = outbreakHazard(1438, "england", 30, 1.0);
    expect(bad).toBeGreaterThan(fine);
    expect(fine).toBeGreaterThan(0);
  });

  it("runs the crisis fever behind the hunger, flatter and further up the social scale", () => {
    expect(crisisFeverHazard(1.0, 1.0, 30, 2)).toBe(0);
    // It lags: a fine harvest after a failed one still carries fever.
    expect(crisisFeverHazard(1.0, 0.5, 30, 2)).toBeGreaterThan(0);
    // Flatter in age than starvation, and shallower in wealth.
    const feverRatio = crisisFeverHazard(0.5, 1.0, 70, 2) / crisisFeverHazard(0.5, 1.0, 30, 2);
    const hungerRatio = dearthHazard(0.5, 1.0, 70, 2) / dearthHazard(0.5, 1.0, 30, 2);
    expect(feverRatio).toBeLessThan(hungerRatio);
    const feverWealth = crisisFeverHazard(0.5, 1.0, 30, 5) / crisisFeverHazard(0.5, 1.0, 30, 2);
    const hungerWealth = dearthHazard(0.5, 1.0, 30, 5) / dearthHazard(0.5, 1.0, 30, 2);
    expect(feverWealth).toBeGreaterThan(hungerWealth);
  });

  it("splits the crisis budget rather than adding to it", () => {
    // The calibration promise: hunger plus fever together stay close to
    // what hunger alone used to be, so the population curve the whole
    // capacity model was tuned against does not move under this.
    for (const age of [2, 30, 70]) {
      for (const wealth of [1, 2, 4]) {
        const total = dearthHazard(0.5, 1.0, age, wealth) + crisisFeverHazard(0.5, 1.0, age, wealth);
        const before = dearthHazard(0.5, 1.0, age, wealth) / (1 - CRISIS_FEVER_SHARE);
        expect(total, `age ${age} wealth ${wealth}`).toBeGreaterThan(before * 0.7);
        expect(total, `age ${age} wealth ${wealth}`).toBeLessThan(before * 1.4);
      }
    }
  });
});

describe("§ the epidemic year: in the register", () => {
  it("actually kills someone in the sweating sickness, and only in England", () => {
    // The point of the whole change: before it, no named outbreak in the
    // table killed a single person — it only relabelled deaths the model
    // was going to produce anyway.
    let englishSweat = 0;
    for (let v = 0; v < 20; v++) {
      for (const p of resolveVillage(1444, "england", v).persons) {
        if (p.death.cause === "epidemic" && p.death.year >= 1485 && p.death.year <= 1487) englishSweat++;
      }
    }
    expect(englishSweat).toBeGreaterThan(0);
    // Catalonia never saw it, so no Catalan may die of an epidemic in a
    // year whose only outbreak was the sweat.
    for (let v = 0; v < 20; v++) {
      for (const p of resolveVillage(1444, "catalonia", v).persons) {
        if (p.death.year >= 1485 && p.death.year <= 1487 && p.death.cause === "epidemic") {
          // Only admissible if a harvest failure was behind it.
          expect(harvestAt(1444, "catalonia", p.death.year) < 0.88 || harvestAt(1444, "catalonia", p.death.year - 1) < 0.88).toBe(true);
        }
      }
    }
  });

  it("makes epidemic a real but minor share of the register's deaths", () => {
    for (const rk of ["england", "castile", "italy"]) {
      let epidemic = 0;
      let n = 0;
      for (let v = 0; v < 6; v++) {
        for (const p of resolveVillage(1444, rk, v).persons) {
          n++;
          if (p.death.cause === "epidemic") epidemic++;
        }
      }
      const share = epidemic / n;
      expect(share, `${rk} epidemic share`).toBeGreaterThan(0.002);
      expect(share, `${rk} epidemic share`).toBeLessThan(0.06);
    }
  });

  it("names an epidemic death with the outbreak that caused it, not with a fresh roll", () => {
    // A death whose cause IS epidemic already knows what killed it, so the
    // burial entry must agree with the table rather than draw again.
    const detailOf = (text: string) => EPIDEMICS.find((e) => e.detail.en.some((d) => text.includes(d.slice(0, 34))));
    let checked = 0;
    for (let v = 0; v < 20 && checked < 5; v++) {
      const env = resolveVillage(1444, "england", v);
      for (const p of env.persons) {
        if (p.death.cause !== "epidemic") continue;
        const known = outbreakAt(p.death.year, "england", p.death.age);
        if (!known) continue;
        const bio = decodePerson(env, p.id, "en");
        const close = bio?.events.find((e) => e.kind === "death" || e.kind === "elsewhere");
        if (!close) continue;
        const hit = detailOf(close.text);
        if (!hit) continue;
        expect(hit.name.en, `${p.death.year}`).toBe(known.name.en);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
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
          // § the epidemic year: a named epidemic may claim either of two
          // causes, and WHICH one is the whole split. An endemic entry has
          // no hazard, so it can only ever be a naming of a `disease`
          // death; a dated outbreak carries one, so it may also own an
          // `epidemic` death outright. What must never happen is the
          // reverse — an endemic entry claiming a death that a hazard it
          // does not have was supposed to have caused.
          if (hit.excess == null) expect(p.death.cause, `${rk}: ${hit.name.en}`).toBe("disease");
          else expect(["disease", "epidemic"], `${rk}: ${hit.name.en}`).toContain(p.death.cause);
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
