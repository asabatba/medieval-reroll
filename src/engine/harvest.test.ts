// § the harvest. The documented failures are history and must land exactly
// where history put them; the variance around them is weather and must
// stay a shape rather than a constant. Both are checkable, and so is the
// thing that actually matters — that adding two centuries of bad years did
// not quietly turn every village into a slow death.
import { describe, expect, it } from "vitest";
import { DEARTHS, dearthAt } from "./data/harvest.js";
import { REGIONS } from "./data/regions.js";
import { DEARTH, dearthHazard, FAMINE, fertilityMult, GOOD_HARVEST, gradeOf, harvestAt, marriageDeferral, namedDearthAt, POOR_HARVEST } from "./harvest.js";
import { populationSeries } from "./snapshot.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("§ the harvest: the data", () => {
  it("keeps every documented failure inside the era, in real regions, in both locales", () => {
    for (const d of DEARTHS) {
      expect(d.to, d.name.en).toBeGreaterThanOrEqual(d.from);
      expect(d.from, d.name.en).toBeGreaterThanOrEqual(1290);
      expect(d.to, d.name.en).toBeLessThanOrEqual(1500);
      expect(d.yield, d.name.en).toBeLessThan(POOR_HARVEST);
      expect(d.yield, d.name.en).toBeGreaterThan(0.3);
      expect(d.name.ca.length, d.name.en).toBeGreaterThan(0);
      if (d.regions) for (const rk of d.regions) expect(REGION_KEYS, d.name.en).toContain(rk);
    }
  });

  it("starves the right places: the Great Famine is northern, and never reached Iberia", () => {
    for (const rk of ["england", "france", "germany", "scotland"]) {
      expect(gradeOf(harvestAt(1444, rk, 1316)), rk).toBe("famine");
      expect(namedDearthAt(rk, 1316)?.name.en, rk).toBe("the Great Famine");
    }
    for (const rk of ["castile", "portugal", "italy", "catalonia"]) {
      expect(namedDearthAt(rk, 1316), rk).toBeNull();
    }
    // Each Mediterranean region's own crisis, where the chroniclers put it.
    expect(namedDearthAt("catalonia", 1333)?.name.ca).toBe("lo mal any primer");
    expect(namedDearthAt("italy", 1329)?.name.en).toBe("the great dearth in Tuscany");
    expect(namedDearthAt("castile", 1302)?.name.en).toContain("hunger");
  });

  it("gives the documented years the same yield in every world; the rest is weather", () => {
    for (const seed of [1, 1444, 999999]) {
      expect(harvestAt(seed, "england", 1316)).toBe(dearthAt("england", 1316)!.yield);
    }
    // An ordinary year differs between worlds (checked across a run of
    // years so a single coincidence cannot pass this).
    let differing = 0;
    for (let y = 1350; y < 1370; y++) if (harvestAt(1, "england", y) !== harvestAt(1444, "england", y)) differing++;
    expect(differing).toBeGreaterThan(10);
  });

  it("is deterministic and regional — one region, one harvest, every village", () => {
    expect(harvestAt(1444, "england", 1400)).toBe(harvestAt(1444, "england", 1400));
    // Two regions in the same year are independent weather.
    let same = 0;
    for (let y = 1300; y < 1400; y++) if (harvestAt(1444, "england", y) === harvestAt(1444, "italy", y)) same++;
    expect(same).toBeLessThan(30); // only the shared documented entries
  });

  it("puts most years in the ordinary band and severe failure at about one year in ten", () => {
    for (const rk of REGION_KEYS) {
      const counts: Record<string, number> = { good: 0, ordinary: 0, poor: 0, dearth: 0, famine: 0 };
      for (let y = 1290; y <= 1495; y++) counts[gradeOf(harvestAt(1444, rk, y))]++;
      const total = 206;
      expect((counts.ordinary + counts.good) / total, `${rk} untroubled`).toBeGreaterThan(0.55);
      expect((counts.dearth + counts.famine) / total, `${rk} severe`).toBeGreaterThan(0.02);
      expect((counts.dearth + counts.famine) / total, `${rk} severe`).toBeLessThan(0.2);
    }
  });
});

describe("§ the harvest: the responses", () => {
  it("kills nobody in an ordinary year, and the old and the young first in a bad one", () => {
    expect(dearthHazard(1.0, 1.0, 40, 2)).toBe(0);
    expect(dearthHazard(POOR_HARVEST, 1.0, 40, 2)).toBe(0);
    const adult = dearthHazard(0.45, 1.0, 30, 2);
    const old = dearthHazard(0.45, 1.0, 70, 2);
    const infant = dearthHazard(0.45, 1.0, 2, 2);
    expect(old).toBeGreaterThan(adult);
    expect(infant).toBeGreaterThan(adult);
    // Deeper failure, worse.
    expect(dearthHazard(0.45, 1.0, 30, 2)).toBeGreaterThan(dearthHazard(0.8, 1.0, 30, 2));
    // A second failure running, with the seed corn already eaten.
    expect(dearthHazard(0.5, 0.5, 30, 2)).toBeGreaterThan(dearthHazard(0.5, 1.0, 30, 2));
  });

  it("spares the well-off most of it, but not all of it", () => {
    const poor = dearthHazard(0.45, 1.0, 70, 1);
    const rich = dearthHazard(0.45, 1.0, 70, 4);
    expect(rich).toBeGreaterThan(0);
    expect(rich).toBeLessThan(poor / 2);
  });

  it("postpones a wedding by at most a year at a time, and only in a bad year", () => {
    expect(marriageDeferral(1.0)).toBe(0);
    expect(marriageDeferral(POOR_HARVEST)).toBe(0);
    expect(marriageDeferral(DEARTH - 0.01)).toBeGreaterThan(0);
    expect(marriageDeferral(FAMINE - 0.01)).toBeGreaterThan(marriageDeferral(DEARTH - 0.01));
  });

  it("thins conception in a hunger year and lifts it in a good one", () => {
    expect(fertilityMult(1.0)).toBe(1);
    expect(fertilityMult(GOOD_HARVEST)).toBeGreaterThan(1);
    expect(fertilityMult(DEARTH - 0.01)).toBeLessThan(1);
    expect(fertilityMult(FAMINE - 0.01)).toBeLessThan(fertilityMult(DEARTH - 0.01));
  });
});

describe("§ the harvest: what it does to a village", () => {
  it("makes hunger a real but minor share of the register's deaths", () => {
    for (const rk of ["england", "castile", "italy"]) {
      let famine = 0;
      let n = 0;
      for (let v = 0; v < 6; v++) {
        for (const p of resolveVillage(1444, rk, v).persons) {
          n++;
          if (p.death.cause === "famine") famine++;
        }
      }
      const share = famine / n;
      expect(share, `${rk} famine share`).toBeGreaterThan(0.01);
      expect(share, `${rk} famine share`).toBeLessThan(0.07);
    }
  });

  it("does not turn the register era into a slow death", () => {
    // capacity.ts's own warning: a long trough is history, a village that
    // simply drains away is a broken parameter. Every region must still be
    // recognisably alive at the end, and must have recovered SOMETHING
    // after the plague rather than falling monotonically.
    for (const rk of REGION_KEYS) {
      let end = 0;
      let peak = 0;
      let postPlagueRecovery = 0;
      for (let v = 0; v < 8; v++) {
        const s = populationSeries(resolveVillage(1444, rk, v), 1290, 1495);
        end += s[s.length - 1];
        peak += Math.max(...s);
        postPlagueRecovery += Math.max(...s.slice(1360 - 1290, 1450 - 1290)) - s[1355 - 1290];
      }
      expect(end / 8, `${rk} still inhabited`).toBeGreaterThan(8);
      expect(end / peak, `${rk} end vs peak`).toBeGreaterThan(0.35);
      expect(postPlagueRecovery, `${rk} recovers after the plague`).toBeGreaterThan(0);
    }
  });

  it("deserts a few villages outright, as the century did — but only a few", () => {
    let extinct = 0;
    let scanned = 0;
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 12; v++) {
        scanned++;
        const s = populationSeries(resolveVillage(1444, rk, v), 1290, 1495);
        if (Math.min(...s.slice(60)) === 0) extinct++;
      }
    }
    // Something like a tenth of English villages were deserted; this stays
    // conservatively under that, and must never approach a majority.
    expect(extinct / scanned).toBeLessThan(0.12);
  });
});
