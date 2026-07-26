// § the tenement. The invariant that matters is exclusivity — two
// households can no more share a piece of ground than two lords can hold
// one manor — and it is the one that broke first, because couples are not
// created in chronological order and a same-year check let a household of
// 1380 take ground already promised to one of 1400.
import { describe, expect, it } from "vitest";
import { holdingsOf } from "./capacity.js";
import { REGIONS } from "./data/regions.js";
import { sizeRank, tenementHistory, tenementName, tenementsOf } from "./tenement.js";
import type { Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

/** The occupancy test village.ts's own preventive check uses. */
function holdsIn(env: Envelope, p: Person, coupleIdx: number, year: number): boolean {
  if (p.death.year <= year || p.emigrated) return false;
  let current: number | null = null;
  for (const ci of p.unions ?? []) if (env.couples[ci].year <= year) current = ci;
  return current === coupleIdx;
}

describe("§ the tenement: the land", () => {
  it("has exactly as many holdings as the preventive check counts, in every region", () => {
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 5; v++) {
        expect(tenementsOf(1444, rk, v).length, `${rk}:${v}`).toBe(holdingsOf(1444, rk, v));
      }
    }
  });

  it("ranks them largest first, with plausible arable for each size class", () => {
    for (let v = 0; v < 12; v++) {
      const tens = tenementsOf(1444, "england", v);
      for (let i = 1; i < tens.length; i++) {
        expect(tens[i].acres, `${v}:${i}`).toBeLessThanOrEqual(tens[i - 1].acres);
        expect(tens[i].idx).toBe(i);
      }
      for (const t of tens) {
        expect(t.acres).toBeGreaterThan(0);
        if (t.size === "virgate") expect(t.acres).toBeGreaterThan(20);
        if (t.size === "toft") expect(t.acres).toBeLessThan(5);
      }
    }
  });

  it("gives a village a mix of sizes rather than one kind of peasant", () => {
    const sizes = new Set<string>();
    for (let v = 0; v < 10; v++) for (const t of tenementsOf(1444, "england", v)) sizes.add(t.size);
    expect(sizes.size).toBeGreaterThan(2);
    expect(sizeRank("virgate")).toBeGreaterThan(sizeRank("toft"));
  });

  it("is a pure function of the address", () => {
    expect(JSON.stringify(tenementsOf(1444, "england", 4))).toBe(JSON.stringify(tenementsOf(1444, "england", 4)));
    expect(JSON.stringify(tenementsOf(1445, "england", 4))).not.toBe(JSON.stringify(tenementsOf(1444, "england", 4)));
  });
});

describe("§ the tenement: the assignment", () => {
  it("never puts two households on the same ground in the same year", () => {
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 4; v++) {
        const env = resolveVillage(1444, rk, v);
        for (let y = 1290; y <= 1495; y++) {
          const seen = new Set<number>();
          env.couples.forEach((c, ci) => {
            if (c.tenement == null || c.year > y) return;
            const H = env.persons[c.husband];
            const W = env.persons[c.wife];
            if (!holdsIn(env, H, ci, y) && !holdsIn(env, W, ci, y)) return;
            expect(seen.has(c.tenement), `${rk}:${v} tenement ${c.tenement} in ${y}`).toBe(false);
            seen.add(c.tenement);
          });
        }
      }
    }
  });

  it("only ever names a holding the village actually has", () => {
    for (const rk of REGION_KEYS) {
      const env = resolveVillage(1444, rk, 1);
      const n = tenementsOf(1444, rk, 1).length;
      for (const c of env.couples) {
        if (c.tenement == null) continue;
        expect(c.tenement, rk).toBeGreaterThanOrEqual(0);
        expect(c.tenement, rk).toBeLessThan(n);
      }
    }
  });

  it("puts most households on land, and leaves a few as undersettles", () => {
    const env = resolveVillage(1444, "england", 0);
    const held = env.couples.filter((c) => c.tenement != null).length;
    expect(held / env.couples.length).toBeGreaterThan(0.6);
    // The category has to be reachable — a model where everyone holds land
    // is the count-based model again, with extra steps.
    let undersettles = 0;
    for (let v = 0; v < 12; v++) {
      const e = resolveVillage(1444, "england", v);
      undersettles += e.couples.filter((c) => c.tenement == null).length;
    }
    expect(undersettles).toBeGreaterThan(0);
  });

  it("keeps a remarrying widow or widower on the ground they already hold", () => {
    let checked = 0;
    for (let v = 0; v < 10; v++) {
      const env = resolveVillage(1444, "england", v);
      for (const p of env.persons) {
        if ((p.unions?.length ?? 0) < 2) continue;
        const [first, second] = p.unions!;
        const a = env.couples[first].tenement;
        const b = env.couples[second].tenement;
        if (a == null || b == null) continue;
        // Either they kept it, or it had already gone to somebody else.
        if (a === b) checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("hands some sons their father's own holding — succession as a fact about a place", () => {
    let inherited = 0;
    for (let v = 0; v < 10; v++) {
      const env = resolveVillage(1444, "england", v);
      for (const c of env.couples) {
        if (c.tenement == null) continue;
        const H = env.persons[c.husband];
        if (H.father < 0) continue;
        const fu = env.persons[H.father].unions?.[0];
        if (fu != null && env.couples[fu].tenement === c.tenement) inherited++;
      }
    }
    expect(inherited).toBeGreaterThan(10);
  });
});

describe("§ the tenement: the history", () => {
  it("reads back a succession of families in order, with no overlap", () => {
    const env = resolveVillage(1444, "england", 0);
    let totalTenures = 0;
    for (const t of tenementsOf(1444, "england", 0)) {
      const history = tenementHistory(env, t.idx);
      totalTenures += history.length;
      for (let i = 1; i < history.length; i++) {
        expect(history[i].from, `tenement ${t.idx}`).toBeGreaterThanOrEqual(history[i - 1].from);
        // Successive tenures may not overlap: one household at a time.
        expect(history[i].from, `tenement ${t.idx} overlap`).toBeGreaterThan(history[i - 1].to - 1);
      }
      for (const ten of history) expect(ten.to).toBeGreaterThanOrEqual(ten.from);
    }
    // Every assigned couple turns up in exactly one holding's history.
    expect(totalTenures).toBe(env.couples.filter((c) => c.tenement != null).length);
  });

  it("names a holding for the family found on it first", () => {
    const env = resolveVillage(1444, "england", 0);
    for (const t of tenementsOf(1444, "england", 0)) {
      const history = tenementHistory(env, t.idx);
      const name = tenementName(env, t.idx);
      if (!history.length) {
        expect(name).toBeNull();
        continue;
      }
      expect(name).toBe(env.persons[history[0].couple.husband].surname);
    }
  });

  it("gets some ground through several families across the register era", () => {
    const env = resolveVillage(1444, "england", 0);
    const deepest = Math.max(...tenementsOf(1444, "england", 0).map((t) => tenementHistory(env, t.idx).length));
    expect(deepest).toBeGreaterThan(3);
  });
});
