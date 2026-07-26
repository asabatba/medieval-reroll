// § the far end. The claim is that both ends of a long-distance move name
// each other without either depending on the other's solve — so the tests
// that matter are the bijection, the agreement, and the cost.
import { describe, expect, it } from "vitest";
import { REGIONS } from "./data/regions.js";
import { inboundLongDistance, longDistanceDestination, longDistanceOrigin, outboundLongDistance, regionAbove, regionBelow } from "./migration.js";
import { REGION_ORDER } from "./rank.js";
import { clearEnvelopeCache, envelopeCacheSize, resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("§ the far end: the pairing", () => {
  it("walks one rung of the rank ladder, and stops at both ends of it", () => {
    expect(regionBelow(REGION_ORDER[0])).toBeNull();
    expect(regionAbove(REGION_ORDER[REGION_ORDER.length - 1])).toBeNull();
    for (let i = 1; i < REGION_ORDER.length; i++) {
      expect(regionBelow(REGION_ORDER[i])).toBe(REGION_ORDER[i - 1]);
      expect(regionAbove(REGION_ORDER[i - 1])).toBe(REGION_ORDER[i]);
    }
  });

  it("is a bijection: the destination can compute its one possible origin", () => {
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 200; v++) {
        const dest = longDistanceDestination(1444, rk, v);
        if (!dest) {
          expect(regionAbove(rk), rk).toBeNull();
          continue;
        }
        const back = longDistanceOrigin(1444, dest.regionKey, dest.villageIdx);
        expect(back, `${rk}:${v}`).toEqual({ regionKey: rk, villageIdx: v });
      }
    }
  });

  it("never collides — two villages cannot pair to the same address", () => {
    const seen = new Set<number>();
    for (let v = 0; v < 500; v++) {
      const d = longDistanceDestination(1444, "england", v)!;
      expect(seen.has(d.villageIdx), `${v}`).toBe(false);
      seen.add(d.villageIdx);
    }
  });

  it("keeps the paired index in the same order of magnitude, not out in the millions", () => {
    for (let v = 0; v < 50; v++) {
      const d = longDistanceDestination(1444, "england", v)!;
      expect(d.villageIdx).toBeLessThan(2048);
      expect(d.villageIdx).toBeGreaterThanOrEqual(0);
    }
  });

  it("pairs differently in different worlds", () => {
    let differing = 0;
    for (let v = 0; v < 20; v++) {
      if (longDistanceDestination(1, "england", v)!.villageIdx !== longDistanceDestination(1444, "england", v)!.villageIdx) differing++;
    }
    expect(differing).toBeGreaterThan(15);
  });
});

describe("§ the far end: the loop", () => {
  it("sends every long-distance emigrant to the paired village, and nowhere else", () => {
    for (const rk of REGION_KEYS) {
      if (!regionAbove(rk)) continue;
      for (let v = 0; v < 6; v++) {
        const env = resolveVillage(1444, rk, v);
        const paired = longDistanceDestination(1444, rk, v)!;
        for (const p of env.persons) {
          if (!p.longDistance || !p.emigrateTo) continue;
          // A long-distance move goes up the ladder to the paired address;
          // the out-of-cluster case stays inside its own region.
          if (p.emigrateTo.regionKey === rk) continue;
          expect(p.emigrateTo, `${rk}:${v} person ${p.id}`).toEqual(paired);
        }
      }
    }
  });

  it("has the destination find the very people who named it", () => {
    let matched = 0;
    for (const rk of REGION_KEYS) {
      if (!regionBelow(rk)) continue;
      for (let v = 0; v < 8; v++) {
        const inbound = inboundLongDistance(1444, rk, v);
        for (const m of inbound) {
          matched++;
          // Her own register really says she came here.
          expect(m.person.emigrateTo).toEqual({ regionKey: rk, villageIdx: v });
          expect(m.person.longDistance).toBe(true);
          // And she is really in that register, at that id.
          const src = resolveVillage(1444, m.origin.regionKey, m.origin.villageIdx);
          expect(src.persons[m.person.id]).toBe(m.person);
        }
      }
    }
    expect(matched, "some long-distance arrivals are found at all").toBeGreaterThan(0);
  });

  it("agrees in both directions: everyone the origin sent, the destination lists", () => {
    let checked = 0;
    for (const rk of REGION_KEYS) {
      if (!regionAbove(rk)) continue;
      for (let v = 0; v < 6; v++) {
        const env = resolveVillage(1444, rk, v);
        const dest = longDistanceDestination(1444, rk, v)!;
        const sentUp = outboundLongDistance(env).filter((m) => m.person.emigrateTo!.regionKey !== rk);
        if (!sentUp.length) continue;
        const arrived = inboundLongDistance(1444, dest.regionKey, dest.villageIdx);
        const arrivedIds = new Set(arrived.map((m) => m.person.id));
        for (const m of sentUp) {
          expect(arrivedIds.has(m.person.id), `${rk}:${v} person ${m.person.id}`).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("costs the destination exactly one extra village solve, never a cascade", () => {
    // The whole reason this lives outside resolveVillage: a pull inside the
    // solve would drag in a village per region per village, six deep.
    clearEnvelopeCache();
    resolveVillage(1444, "france", 0);
    const afterSolve = envelopeCacheSize();
    inboundLongDistance(1444, "france", 0);
    const afterLookup = envelopeCacheSize();
    // One new envelope: the paired origin (plus whatever ITS own local
    // cluster needs, which is the ordinary cost of any single solve).
    expect(afterLookup - afterSolve).toBeLessThanOrEqual(6);
    expect(afterLookup).toBeGreaterThan(afterSolve);
  });

  it("is stable — asking twice gives the same people", () => {
    const a = inboundLongDistance(1444, "france", 3).map((m) => m.person.id);
    clearEnvelopeCache();
    const b = inboundLongDistance(1444, "france", 3).map((m) => m.person.id);
    expect(b).toEqual(a);
  });

  it("says nothing at the bottom of the ladder, which has no region below", () => {
    expect(inboundLongDistance(1444, REGION_ORDER[0], 0)).toEqual([]);
  });
});
