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
