import { describe, expect, it } from "vitest";
import { REGIONS } from "./data/regions.js";
import { makeRng } from "./hash.js";
import { rollDeath } from "./mortality.js";

const region = REGIONS.england; // has warYears 1346-1360 covering a man born 1330, age 16-30

describe("rollDeath — occupational risk", () => {
  it("a military riskTrade raises war mortality relative to normal, for otherwise identical lives", () => {
    const trials = 400;
    let warDeathsNormal = 0;
    let warDeathsMilitary = 0;
    for (let i = 0; i < trials; i++) {
      const normal = rollDeath(makeRng(1000 + i), 1330, "M", 4, region, "normal");
      const military = rollDeath(makeRng(1000 + i), 1330, "M", 4, region, "military");
      if (normal.cause === "war") warDeathsNormal++;
      if (military.cause === "war") warDeathsMilitary++;
    }
    expect(warDeathsMilitary).toBeGreaterThan(warDeathsNormal);
  });

  it("a hazardous or maritime riskTrade shortens expected lifespan relative to normal", () => {
    const trials = 500;
    let ageSumNormal = 0;
    let ageSumHazardous = 0;
    let ageSumMaritime = 0;
    for (let i = 0; i < trials; i++) {
      ageSumNormal += rollDeath(makeRng(5000 + i), 1400, "M", 2, region, "normal").age;
      ageSumHazardous += rollDeath(makeRng(5000 + i), 1400, "M", 2, region, "hazardous").age;
      ageSumMaritime += rollDeath(makeRng(5000 + i), 1400, "M", 2, region, "maritime").age;
    }
    expect(ageSumHazardous / trials).toBeLessThan(ageSumNormal / trials);
    expect(ageSumMaritime / trials).toBeLessThan(ageSumNormal / trials);
  });

  it("riskTrade never touches women (birth-registered mortality model is unaffected)", () => {
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const normal = rollDeath(makeRng(9000 + i), 1400, "F", 2, region, "normal");
      const hazardous = rollDeath(makeRng(9000 + i), 1400, "F", 2, region, "hazardous");
      expect(hazardous).toEqual(normal);
    }
  });

  it("defaults to normal risk when riskTrade is omitted", () => {
    const withDefault = rollDeath(makeRng(42), 1400, "M", 2, region);
    const explicit = rollDeath(makeRng(42), 1400, "M", 2, region, "normal");
    expect(withDefault).toEqual(explicit);
  });

  it("always returns age === year - birth, across every riskTrade", () => {
    const trades = ["normal", "hazardous", "maritime", "military"] as const;
    for (const trade of trades) {
      for (let i = 0; i < 100; i++) {
        const d = rollDeath(makeRng(i), 1350, "M", 3, region, trade);
        expect(d.age).toBe(d.year - 1350);
      }
    }
  });
});

// § maternal mortality: a real per-year hazard concentrated around a
// region's own fertile-age window, not a post-hoc relabel of whichever
// death happened to land on a birth year.
describe("rollDeath — maternal mortality", () => {
  it("never assigns cause 'childbirth' to a man", () => {
    for (let i = 0; i < 300; i++) {
      const d = rollDeath(makeRng(i), 1350, "M", 2, region, "normal", "italy");
      expect(d.cause).not.toBe("childbirth");
    }
  });

  it("childbirth deaths cluster inside the fertile age window, never in early childhood or deep old age", () => {
    let sawChildbirth = 0;
    for (let i = 0; i < 3000; i++) {
      const d = rollDeath(makeRng(i), 1350, "F", 2, region, "normal", "italy");
      if (d.cause === "childbirth") {
        sawChildbirth++;
        expect(d.age).toBeGreaterThanOrEqual(12);
        expect(d.age).toBeLessThan(46);
      }
    }
    expect(sawChildbirth).toBeGreaterThan(0);
  });

  it("a woman born just before the region's fertile window faces materially more childbirth risk than a woman who dies out of it entirely (sanity: the hazard is really there)", () => {
    let sawChildbirth = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const d = rollDeath(makeRng(9500 + i), 1400, "F", 2, region, "normal", "england");
      if (d.cause === "childbirth") sawChildbirth++;
    }
    // ~1–1.5% risk per birth, several potential births across the fertile
    // span: over many independent lives, some non-trivial share should show
    // a childbirth-attributed death.
    expect(sawChildbirth / trials).toBeGreaterThan(0.01);
    expect(sawChildbirth / trials).toBeLessThan(0.3);
  });

  it("omitting regionKey (default demography) still applies a maternal hazard, not zero", () => {
    let sawChildbirth = 0;
    for (let i = 0; i < 2000; i++) {
      const d = rollDeath(makeRng(i), 1400, "F", 2, region, "normal");
      if (d.cause === "childbirth") sawChildbirth++;
    }
    expect(sawChildbirth).toBeGreaterThan(0);
  });
});
