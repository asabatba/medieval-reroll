// § family transitions: male out-migration (the landless-younger-son safety
// valve), remarriage depth (no longer capped at one remarriage), regional
// inheritance customs and the downward mobility they gate, dual surnames in
// Catalonia, and the succession.ts heir predicate several of these lean on.
import { describe, expect, it } from "vitest";
import { CLASS_INFO } from "./data/classes.js";
import { REGIONS } from "./data/regions.js";
import { isFirstBornSon } from "./succession.js";
import type { Envelope } from "./types.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);
const SEED = 1444;

function sampleEnvs(): Envelope[] {
  const envs: Envelope[] = [];
  for (const regionKey of REGION_KEYS) for (const villageIdx of [0, 1, 2, 3, 4]) envs.push(resolveVillage(SEED, regionKey, villageIdx));
  return envs;
}

describe("§ male out-migration", () => {
  const envs = sampleEnvs();

  it("some native men, across the sampled villages, really do emigrate", () => {
    let sawMaleEmigrant = 0;
    for (const env of envs) for (const p of env.persons) if (p.sex === "M" && !p.founder && p.emigrated) sawMaleEmigrant++;
    expect(sawMaleEmigrant).toBeGreaterThan(0);
  });

  it("a male emigrant is never also marked marriedOut (that flag is female-specific narrative)", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (p.sex === "M" && p.emigrated) expect(p.marriedOut).toBeFalsy();
      }
    }
  });

  it("a male emigrant's destination is never his own village (no self-loop), matching the female invariant", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (p.sex !== "M" || !p.emigrateTo) continue;
        const sameVillage = p.emigrateTo.regionKey === env.regionKey && p.emigrateTo.villageIdx === env.villageIdx;
        expect(sameVillage).toBe(false);
      }
    }
  });

  it("a man who emigrated never has a local spouse (mutually exclusive with local marriage)", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (p.sex === "M" && p.emigrated) expect(p.spouse).toBeUndefined();
      }
    }
  });

  it("real immigrant grooms exist (pulled by a local woman, not fabricated) and their origin points at a lower villageIdx in the cluster", () => {
    let sawGroom = 0;
    for (const env of envs) {
      for (const p of env.persons) {
        if (p.sex !== "M" || !p.incomer || p.founder || p.origin == null || p.originId == null) continue;
        sawGroom++;
        if (p.origin.regionKey === env.regionKey) expect(p.origin.villageIdx).toBeLessThan(env.villageIdx);
      }
    }
    expect(sawGroom).toBeGreaterThan(0);
  });

  it("an eldest son (heir) never has clsOrigin from mobility swapped in a way that contradicts eldest-son status — sanity check isFirstBornSon agrees with birth order among full brothers", () => {
    for (const env of envs) {
      const byFather = new Map<number, number[]>();
      for (const p of env.persons) {
        if (p.sex !== "M" || p.father < 0) continue;
        (byFather.get(p.father) ?? byFather.set(p.father, []).get(p.father)!).push(p.id);
      }
      for (const [, sons] of byFather) {
        const sorted = sons.slice().sort((a, b) => env.persons[a].birth - env.persons[b].birth || a - b);
        sorted.forEach((id, i) => {
          expect(isFirstBornSon(env, id)).toBe(i === 0);
        });
      }
    }
  });
});

describe("§ remarriage depth", () => {
  const envs = sampleEnvs();

  it("some people remarry more than once (three or more unions) — depth is not capped at one remarriage", () => {
    let sawTripleUnion = 0;
    for (const env of envs) for (const p of env.persons) if ((p.unions?.length ?? 0) >= 3) sawTripleUnion++;
    expect(sawTripleUnion).toBeGreaterThan(0);
  });

  it("every person's unions are with a distinct spouse each time (never remarries the same person twice)", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (!p.unions || p.unions.length < 2) continue;
        const spouses = p.unions.map((ci) => {
          const c = env.couples[ci];
          return p.id === c.husband ? c.wife : c.husband;
        });
        expect(new Set(spouses).size).toBe(spouses.length);
      }
    }
  });

  it("no one is ever a co-spouse in two overlapping (still-living-spouse) unions at once", () => {
    // strict chronology is already covered in village.test.ts; this checks
    // the complementary fact that a NEW union's spouse was also free then
    for (const env of envs) {
      for (const p of env.persons) {
        if (!p.unions || p.unions.length < 2) continue;
        for (let i = 1; i < p.unions.length; i++) {
          const prevSpouseId = (() => {
            const c = env.couples[p.unions[i - 1]];
            return p.id === c.husband ? c.wife : c.husband;
          })();
          const nextSpouse =
            env.persons[
              (() => {
                const c = env.couples[p.unions[i]];
                return p.id === c.husband ? c.wife : c.husband;
              })()
            ];
          const nextYear = env.couples[p.unions[i]].year;
          // the NEW spouse must not themselves already be alive-and-married
          // to someone else as of the new union's year, unless that someone
          // is this couple's shared prior spouse who has since died (handled
          // by the chronology test) — minimally, the new spouse's own first
          // union (if any) must not still have a living partner at nextYear
          if (nextSpouse.unions) {
            for (const nci of nextSpouse.unions) {
              const c = env.couples[nci];
              if (c.year >= nextYear) continue;
              const other = env.persons[nextSpouse.id === c.husband ? c.wife : c.husband];
              if (other.id === p.id) continue;
              expect(other.death.year).toBeLessThanOrEqual(nextYear);
            }
          }
          void prevSpouseId;
        }
      }
    }
  });
});

describe("§ regional inheritance customs (partible vs impartible)", () => {
  function heirVsNonHeirEmigrationRate(regionKey: string): { heir: number; nonHeir: number } {
    let heirTotal = 0,
      heirEmig = 0,
      nonHeirTotal = 0,
      nonHeirEmig = 0;
    for (let villageIdx = 0; villageIdx < 20; villageIdx++) {
      const env = resolveVillage(SEED, regionKey, villageIdx);
      for (const p of env.persons) {
        if (p.sex !== "M" || p.founder || p.father < 0) continue;
        if (isFirstBornSon(env, p.id)) {
          heirTotal++;
          if (p.emigrated) heirEmig++;
        } else {
          nonHeirTotal++;
          if (p.emigrated) nonHeirEmig++;
        }
      }
    }
    return { heir: heirEmig / heirTotal, nonHeir: nonHeirEmig / nonHeirTotal };
  }

  it("impartible England: a non-heir son emigrates far more often than the eldest", () => {
    const { heir, nonHeir } = heirVsNonHeirEmigrationRate("england");
    expect(nonHeir).toBeGreaterThan(heir * 2);
  });

  it("partible France and Tuscany: eldest and non-eldest sons emigrate at close to the same rate", () => {
    for (const rk of ["france", "italy"]) {
      const { heir, nonHeir } = heirVsNonHeirEmigrationRate(rk);
      // both draw from the same heirBase-equivalent chance under partible
      // custom (village.ts's isHeir), nowhere near England's >2x gap above
      expect(nonHeir).toBeLessThan(heir * 1.6);
    }
  });
});

describe("§ downward mobility", () => {
  function downwardMobilized(env: Envelope) {
    return env.persons.filter((p) => p.clsOrigin && CLASS_INFO[p.cls].wealth < CLASS_INFO[p.clsOrigin].wealth);
  }

  it("happens in impartible regions, and only ever to a non-eldest son", () => {
    let seen = 0;
    for (const regionKey of ["england", "germany", "catalonia"]) {
      for (let villageIdx = 0; villageIdx < 15; villageIdx++) {
        const env = resolveVillage(SEED, regionKey, villageIdx);
        for (const p of downwardMobilized(env)) {
          seen++;
          expect(p.sex).toBe("M");
          expect(isFirstBornSon(env, p.id)).toBe(false);
          expect(p.cls).not.toBe(p.clsOrigin);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("never happens in partible regions (France, Tuscany) — isHeir reads every son as a stakeholder there", () => {
    for (const regionKey of ["france", "italy"]) {
      for (let villageIdx = 0; villageIdx < 20; villageIdx++) {
        const env = resolveVillage(SEED, regionKey, villageIdx);
        expect(downwardMobilized(env)).toEqual([]);
      }
    }
  });
});

describe("§ dual surnames (Catalonia)", () => {
  it("every native Catalan's surname is a compound of her father's and mother's OWN first surname", () => {
    let checked = 0;
    for (let villageIdx = 0; villageIdx < 10; villageIdx++) {
      const env = resolveVillage(SEED, "catalonia", villageIdx);
      for (const p of env.persons) {
        if (p.founder || p.father < 0) continue;
        const parts = p.surname.split(" i ");
        expect(parts.length).toBe(2);
        const father = env.persons[p.father];
        const mother = env.persons[p.mother];
        expect(parts[0]).toBe(father.surname.split(" i ")[0]);
        expect(parts[1]).toBe(mother.surname.split(" i ")[0]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("founders also carry a compound surname (two real region surnames, not one)", () => {
    const env = resolveVillage(SEED, "catalonia", 2);
    const founders = env.persons.filter((p) => p.founder);
    expect(founders.length).toBeGreaterThan(0);
    for (const p of founders) expect(p.surname.split(" i ").length).toBe(2);
  });

  it("no other region's surnames ever contain the Catalan ' i ' joiner", () => {
    for (const regionKey of ["england", "france", "germany", "italy"]) {
      const env = resolveVillage(SEED, regionKey, 3);
      for (const p of env.persons) expect(p.surname).not.toContain(" i ");
    }
  });

  it("a real cross-village Catalan immigrant keeps her own compound surname verbatim, not a locally-fabricated one", () => {
    for (let villageIdx = 1; villageIdx < 200; villageIdx++) {
      const env = resolveVillage(SEED, "catalonia", villageIdx);
      const immigrant = env.persons.find((p) => p.incomer && !p.founder && p.origin && p.originId != null);
      if (!immigrant) continue;
      const originEnv = resolveVillage(SEED, immigrant.origin!.regionKey, immigrant.origin!.villageIdx);
      const native = originEnv.persons[immigrant.originId!];
      expect(immigrant.surname).toBe(native.surname);
      expect(immigrant.surname.split(" i ").length).toBe(2);
      return;
    }
    throw new Error("no real catalonia immigrant found in scan range");
  });
});
