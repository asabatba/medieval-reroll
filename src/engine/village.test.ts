import { describe, expect, it, vi } from "vitest";
import { REGIONS } from "./data/regions.js";
import type { Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);
// A spread of villageIdx values: low (few/no cross-village pulls needed),
// mid, and high (deep into the address space) — since local migration
// clusters are size LOCAL_CLUSTER (6), this also exercises cluster boundaries.
const VILLAGE_IDXS = [0, 1, 5, 6, 7, 23, 100, 4095];
const WORLD_SEEDS = [1444, 7, 2026];

function allEnvelopes(): Envelope[] {
  const envs: Envelope[] = [];
  for (const worldSeed of WORLD_SEEDS) {
    for (const regionKey of REGION_KEYS) {
      for (const villageIdx of VILLAGE_IDXS) {
        envs.push(resolveVillage(worldSeed, regionKey, villageIdx));
      }
    }
  }
  return envs;
}

describe("resolveVillage invariants", () => {
  const envs = allEnvelopes();

  it("assigns ids equal to array index for every person (roster completeness)", () => {
    for (const env of envs) {
      env.persons.forEach((p, i) => {
        expect(p.id).toBe(i);
      });
    }
  });

  it("every death year is at or after birth, and age matches year - birth", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        expect(p.death.year).toBeGreaterThanOrEqual(p.birth);
        expect(p.death.age).toBe(p.death.year - p.birth);
      }
    }
  });

  it("marriage is symmetric: every couple appears in both spouses' unions, in year order", () => {
    for (const env of envs) {
      for (let ci = 0; ci < env.couples.length; ci++) {
        const c = env.couples[ci];
        const H = env.persons[c.husband];
        const W = env.persons[c.wife];
        expect(H.unions).toContain(ci);
        expect(W.unions).toContain(ci);
        // marriage cannot outlive either party
        expect(c.year).toBeLessThan(H.death.year);
        expect(c.year).toBeLessThan(W.death.year);
      }
      for (const p of env.persons) {
        if (!p.unions) continue;
        // first-marriage pointers agree with the unions history
        const first = env.couples[p.unions[0]];
        expect(p.spouse).toBe(p.id === first.husband ? first.wife : first.husband);
        expect(p.marriageYear).toBe(first.year);
        // unions are chronological and never overlap a living spouse:
        // a later marriage starts only after the previous spouse died
        for (let i = 1; i < p.unions.length; i++) {
          const prev = env.couples[p.unions[i - 1]];
          const next = env.couples[p.unions[i]];
          expect(next.year).toBeGreaterThan(prev.year);
          const prevSpouse = env.persons[p.id === prev.husband ? prev.wife : prev.husband];
          expect(next.year).toBeGreaterThan(prevSpouse.death.year);
        }
      }
    }
  });

  // Regression: founders exist solely to found a line, and were previously
  // extended to a death age just short of the marriage-year formula's own
  // range, so a natural death age of 24 (H) or 20 (W) could still fail to
  // outlive a marriage year rolled as high as hb+26/wb+20 — silently
  // leaving the couple unmarried with no diagnostic anywhere.
  it("every founder marries (the death-age extension always outlives the rolled marriage year)", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (!p.founder) continue;
        expect(p.spouse).not.toBeNull();
        expect(p.spouse).not.toBeUndefined();
        expect(p.unions?.length).toBeGreaterThan(0);
      }
    }
  });

  // Regression: sibling-avoidance in matching only compared `.father`,
  // so a widow's children by two different husbands (sharing a mother but
  // not a father) could be matched to each other.
  it("no marriage is between siblings who share a mother, even from different fathers", () => {
    for (const env of envs) {
      for (const c of env.couples) {
        const H = env.persons[c.husband];
        const W = env.persons[c.wife];
        if (H.mother >= 0 && W.mother >= 0) expect(H.mother).not.toBe(W.mother);
      }
    }
  });

  // Regression: names were drawn independently per child from small
  // per-region pools (a dozen or so per sex), so a large family commonly
  // had two or three children of the same sex ALIVE AT THE SAME TIME
  // sharing a name — historically a name was recycled onto a later child
  // once an earlier same-named sibling had died, never worn by two living
  // siblings at once.
  it("no two full siblings of the same sex share a name while both are alive at the same time", () => {
    let sawRecycledName = 0;
    for (const env of envs) {
      for (const c of env.couples) {
        const bySexName = new Map<string, Person[]>();
        for (const cid of c.children) {
          const child = env.persons[cid];
          const key = child.sex + ":" + child.name;
          (bySexName.get(key) ?? bySexName.set(key, []).get(key)!).push(child);
        }
        for (const group of bySexName.values()) {
          if (group.length < 2) continue;
          sawRecycledName++;
          const byBirth = group.slice().sort((a, b) => a.birth - b.birth);
          for (let i = 1; i < byBirth.length; i++) {
            // the earlier-born namesake must already be dead before the next one carrying the same name is born
            expect(byBirth[i - 1].death.year).toBeLessThanOrEqual(byBirth[i].birth);
          }
        }
      }
    }
    // the pool is small enough that name-reuse (onto a LATER, non-overlapping child) still happens often
    expect(sawRecycledName).toBeGreaterThan(0);
  });

  it("coupleOf index agrees with the couples array for every married person", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (p.spouse == null) continue;
        const c = env.couples[env.coupleOf[p.id]];
        expect(c).toBeDefined();
        expect([c.husband, c.wife]).toContain(p.id);
        expect([c.husband, c.wife]).toContain(p.spouse);
      }
    }
  });

  it("every child's father/mother back-reference matches the couple that bore them", () => {
    for (const env of envs) {
      for (const c of env.couples) {
        for (const cid of c.children) {
          const child = env.persons[cid];
          expect(child.father).toBe(c.husband);
          expect(child.mother).toBe(c.wife);
        }
      }
    }
  });

  it("native-born non-founders always have both parents resolvable in-envelope", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (p.founder || p.incomer) continue;
        expect(p.father).toBeGreaterThanOrEqual(0);
        expect(p.mother).toBeGreaterThanOrEqual(0);
        expect(env.persons[p.father]).toBeDefined();
        expect(env.persons[p.mother]).toBeDefined();
      }
    }
  });

  it("children are born after their parents' marriage and before either parent dies", () => {
    for (const env of envs) {
      for (const c of env.couples) {
        const H = env.persons[c.husband];
        const W = env.persons[c.wife];
        for (const cid of c.children) {
          const child = env.persons[cid];
          expect(child.birth).toBeGreaterThan(c.year);
          expect(child.birth).toBeLessThan(H.death.year);
          expect(child.birth).toBeLessThan(W.death.year);
        }
      }
    }
  });

  it("no one is their own ancestor a few generations back (acyclic parentage)", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        const seen = new Set<number>([p.id]);
        let cur: Person | undefined = p;
        for (let depth = 0; depth < 20 && cur && cur.father >= 0; depth++) {
          const nextId: number = cur.father;
          expect(seen.has(nextId)).toBe(false);
          seen.add(nextId);
          cur = env.persons[nextId];
        }
      }
    }
  });

  it("an emigrated woman's destination is never her own village (no self-loop)", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (!p.emigrateTo) continue;
        const sameVillage = p.emigrateTo.regionKey === env.regionKey && p.emigrateTo.villageIdx === env.villageIdx;
        expect(sameVillage).toBe(false);
      }
    }
  });

  it("a real (non-fabricated) immigrant's origin points at a lower villageIdx within the local cluster or is long-distance", () => {
    for (const env of envs) {
      for (const p of env.persons) {
        if (!p.incomer || p.founder || p.origin == null || p.originId == null) continue;
        // Cross-village pulls only ever happen for villageIdx > origin's within the same region (pullImmigrantBride
        // only scans srcIdx < villageIdx) — so this must hold whenever a real originId is set.
        if (p.origin.regionKey === env.regionKey) {
          expect(p.origin.villageIdx).toBeLessThan(env.villageIdx);
        }
      }
    }
  });
});

describe("resolveVillage determinism", () => {
  it("returns the same cached instance on repeated calls (memoization)", () => {
    const a = resolveVillage(1444, "england", 12);
    const b = resolveVillage(1444, "england", 12);
    expect(a).toBe(b);
  });

  it("is a pure function of (worldSeed, regionKey, villageIdx): a fresh module instance reproduces identical facts", async () => {
    const cached: Envelope = resolveVillage(1444, "france", 42);
    vi.resetModules();
    const { resolveVillage: freshResolve } = await import("./village.js");
    const fresh: Envelope = freshResolve(1444, "france", 42);
    expect(fresh.persons.map(stripPerson)).toEqual(cached.persons.map(stripPerson));
    expect(fresh.couples).toEqual(cached.couples);
    expect(fresh.place).toEqual(cached.place);
  });

  it("different world seeds produce different genealogies for the same address", () => {
    const a = resolveVillage(1, "england", 0);
    const b = resolveVillage(2, "england", 0);
    expect(a.persons.map((p) => p.name + p.surname + p.birth)).not.toEqual(b.persons.map((p) => p.name + p.surname + p.birth));
  });
});

function stripPerson(p: Person) {
  // origin is a fresh object literal each solve; compare by value, not identity
  const { origin, ...rest } = p;
  return { ...rest, origin: origin ? { ...origin } : origin };
}
