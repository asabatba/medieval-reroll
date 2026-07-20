// § year layer: villageStateAt() must present a credible resident
// population for any year — nobody dead, unborn, not-yet-arrived, or
// already-departed; everyone in exactly one household; couples together;
// heads alive and present.
import { describe, expect, it } from "vitest";
import { REGIONS } from "./data/regions.js";
import { arrivalYearOf, CHURCH_HOUSEHOLD, emigrationYearOf, MANOR_HOUSEHOLD, villageStateAt } from "./snapshot.js";
import type { Envelope } from "./types.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);
const YEARS = [1300, 1330, 1347, 1352, 1380, 1420, 1460, 1490];

function sampleEnvs(): Envelope[] {
  const envs: Envelope[] = [];
  for (const regionKey of REGION_KEYS) for (const villageIdx of [0, 3, 7]) envs.push(resolveVillage(321, regionKey, villageIdx));
  return envs;
}

describe("villageStateAt invariants", () => {
  const envs = sampleEnvs();

  it("residents are alive, born, arrived, and not yet emigrated", () => {
    for (const env of envs) {
      for (const year of YEARS) {
        const state = villageStateAt(env, year);
        for (const r of state.residents) {
          const p = env.persons[r.id];
          expect(p.birth).toBeLessThanOrEqual(year);
          expect(p.death.year).toBeGreaterThan(year);
          if (p.incomer && !p.founder) expect(year).toBeGreaterThanOrEqual(arrivalYearOf(p, env));
          if (p.emigrated) expect(year).toBeLessThan(emigrationYearOf(p, env));
          expect(r.age).toBe(year - p.birth);
        }
      }
    }
  });

  it("every resident belongs to exactly one household, and memberships back-map", () => {
    for (const env of envs) {
      for (const year of YEARS) {
        const state = villageStateAt(env, year);
        const seen = new Map<number, number>();
        for (const h of state.households) {
          for (const m of h.members) {
            expect(seen.has(m)).toBe(false);
            seen.set(m, h.id);
          }
        }
        for (const r of state.residents) {
          expect(seen.get(r.id)).toBe(r.householdId);
        }
        expect(seen.size).toBe(state.residents.length);
        expect(state.population).toBe(state.residents.length);
      }
    }
  });

  it("married residents live with their spouse and point at each other", () => {
    for (const env of envs) {
      for (const year of YEARS) {
        const state = villageStateAt(env, year);
        const byId = new Map(state.residents.map((r) => [r.id, r]));
        for (const r of state.residents) {
          if (r.maritalStatus !== "married") continue;
          expect(r.spouseId).not.toBeNull();
          const s = byId.get(r.spouseId!);
          // the spouse of a resident is always resident too in this model
          expect(s).toBeDefined();
          expect(s!.spouseId).toBe(r.id);
          expect(s!.householdId).toBe(r.householdId);
        }
      }
    }
  });

  it("household heads are living resident members (real households only)", () => {
    for (const env of envs) {
      for (const year of YEARS) {
        const state = villageStateAt(env, year);
        for (const h of state.households) {
          if (h.id === MANOR_HOUSEHOLD || h.id === CHURCH_HOUSEHOLD) continue;
          expect(h.members).toContain(h.headId);
          expect(env.persons[h.headId].death.year).toBeGreaterThan(year);
        }
      }
    }
  });

  it("a widow heads her late husband's household; orphan sibling groups are headed by the eldest brother of age", () => {
    let sawWidowHead = 0;
    let sawOrphanGroup = 0;
    for (const env of envs) {
      for (const year of YEARS) {
        const state = villageStateAt(env, year);
        const byId = new Map(state.residents.map((r) => [r.id, r]));
        for (const h of state.households) {
          if (h.id < 0) continue;
          if (h.id < env.couples.length) {
            const c = env.couples[h.id];
            if (env.persons[c.husband].death.year <= year && h.members.includes(c.wife)) {
              expect(h.headId).toBe(c.wife);
              expect(byId.get(c.wife)!.maritalStatus).toBe("widowed");
              sawWidowHead++;
            }
          } else if (h.id >= 200000) {
            sawOrphanGroup++;
            const head = env.persons[h.headId];
            const eldestOfAgeMale = h.members
              .map((m) => env.persons[m])
              .filter((m) => m.sex === "M" && year - m.birth >= 14)
              .sort((a, b) => a.birth - b.birth || a.id - b.id)[0];
            if (eldestOfAgeMale) expect(head.id).toBe(eldestOfAgeMale.id);
          }
        }
      }
    }
    expect(sawWidowHead).toBeGreaterThan(0);
    expect(sawOrphanGroup).toBeGreaterThan(0);
  });

  it("the Black Death visibly cuts the resident population (1352 vs 1346, aggregated)", () => {
    let before = 0;
    let after = 0;
    for (const env of envs) {
      before += villageStateAt(env, 1346).population;
      after += villageStateAt(env, 1352).population;
    }
    expect(after).toBeLessThan(before * 0.85);
  });

  it("unmarried children of a living resident parent share that parent's household", () => {
    for (const env of envs) {
      const year = 1400;
      const state = villageStateAt(env, year);
      const byId = new Map(state.residents.map((r) => [r.id, r]));
      for (const r of state.residents) {
        if (r.maritalStatus !== "child") continue;
        if (r.inService || r.householdId < 0) continue;
        const p = env.persons[r.id];
        const dad = p.father >= 0 ? byId.get(p.father) : undefined;
        const mum = p.mother >= 0 ? byId.get(p.mother) : undefined;
        if (dad) expect(r.householdId).toBe(dad.householdId);
        else if (mum) expect(r.householdId).toBe(mum.householdId);
      }
    }
  });
});

// § residency continuity: a real, locally-pulled migrant must never be
// resident in BOTH her origin and destination villages' snapshots in the
// same year, and — the specific seam this fixes — never resident in
// NEITHER either, for any year strictly between her birth and death.
describe("residency continuity across origin/destination registers", () => {
  function findLocalMigrants(regionKey: string): { env: Envelope; migrants: number[] }[] {
    const found: { env: Envelope; migrants: number[] }[] = [];
    for (let villageIdx = 0; villageIdx < 60; villageIdx++) {
      const env = resolveVillage(555, regionKey, villageIdx);
      const migrants = env.persons.filter((p) => p.incomer && !p.founder && p.origin && p.originId != null).map((p) => p.id);
      if (migrants.length) found.push({ env, migrants });
    }
    return found;
  }

  it("no real migrant is resident in both her origin and destination snapshots the same year", () => {
    let checked = 0;
    for (const regionKey of REGION_KEYS) {
      for (const { env: destEnv, migrants } of findLocalMigrants(regionKey)) {
        for (const id of migrants) {
          const resident = destEnv.persons[id];
          const originEnv = resolveVillage(555, resident.origin!.regionKey, resident.origin!.villageIdx);
          const native = originEnv.persons[resident.originId!];
          checked++;
          for (const year of [native.birth + 1, native.birth + 16, native.birth + 25, native.birth + 40, native.death.year - 1]) {
            if (year <= native.birth || year >= native.death.year) continue;
            const inOrigin = villageStateAt(originEnv, year).residents.some((r) => r.id === native.id);
            const inDest = villageStateAt(destEnv, year).residents.some((r) => r.id === id);
            expect(inOrigin && inDest).toBe(false);
          }
        }
      }
      if (checked > 30) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("the ORIGIN snapshot's departure year matches the DESTINATION snapshot's own arrival year exactly (no gap)", () => {
    let checked = 0;
    outer: for (const regionKey of REGION_KEYS) {
      for (const { env: destEnv, migrants } of findLocalMigrants(regionKey)) {
        for (const id of migrants) {
          const resident = destEnv.persons[id];
          const originEnv = resolveVillage(555, resident.origin!.regionKey, resident.origin!.villageIdx);
          const native = originEnv.persons[resident.originId!];
          const departureYear = emigrationYearOf(native, originEnv);
          const arrivalYear = arrivalYearOf(resident, destEnv);
          expect(departureYear).toBe(arrivalYear);
          checked++;
          if (checked > 30) break outer;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
