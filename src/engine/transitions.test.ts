// § family transitions: male out-migration (the landless-younger-son safety
// valve), remarriage depth (no longer capped at one remarriage), and the
// succession.ts heir predicate they both lean on.
import { describe, expect, it } from "vitest";
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
