// § settlement: settlementTypeOf is a plain deterministic hash lookup
// (same pattern as hierarchy.ts's parishOf/manorOf), so these tests check
// determinism, a non-degenerate rural/urban split, and that the two
// downstream effects wired in village.ts (founders' class/wealth mix) and
// hierarchy.ts (manorOf's naming) actually agree with it.
import { describe, expect, it } from "vitest";
import { CLASS_INFO } from "./data/classes.js";
import { REGIONS } from "./data/regions.js";
import { manorOf } from "./hierarchy.js";
import { settlementTypeOf } from "./settlement.js";
import { resolveVillage } from "./village.js";

const SEED = 1444;
const REGION_KEYS = Object.keys(REGIONS);
const SAMPLE_SIZE = 300;

describe("settlementTypeOf", () => {
  it("is a deterministic function of (worldSeed, regionKey, villageIdx)", () => {
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 20; villageIdx++) {
        const a = settlementTypeOf(SEED, regionKey, villageIdx);
        const b = settlementTypeOf(SEED, regionKey, villageIdx);
        expect(a).toBe(b);
      }
    }
  });

  it("produces both rural and urban villages, roughly matching the intended minority rate", () => {
    for (const regionKey of REGION_KEYS) {
      let urban = 0;
      for (let villageIdx = 0; villageIdx < SAMPLE_SIZE; villageIdx++) {
        if (settlementTypeOf(SEED, regionKey, villageIdx) === "urban") urban++;
      }
      const rate = urban / SAMPLE_SIZE;
      // a minority, not a fixed one-in-N slot: a wide but non-degenerate band
      expect(rate).toBeGreaterThan(0.05);
      expect(rate).toBeLessThan(0.3);
    }
  });

  it("differs across regions and villageIdx (not a constant)", () => {
    const seen = new Set<string>();
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 20; villageIdx++) {
        seen.add(settlementTypeOf(SEED, regionKey, villageIdx));
      }
    }
    expect(seen.has("rural")).toBe(true);
    expect(seen.has("urban")).toBe(true);
  });
});

describe("settlement effects on the village solve", () => {
  // Explicit timeout: cost scales with REGION_KEYS.length (§ Adding a
  // region) — a fixed budget generous enough for the current region count.
  it("urban villages' founders skew toward higher-wealth classes than rural ones", () => {
    let urbanWealthSum = 0;
    let urbanFounders = 0;
    let ruralWealthSum = 0;
    let ruralFounders = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 60; villageIdx++) {
        const env = resolveVillage(SEED, regionKey, villageIdx);
        const founders = env.persons.filter((p) => p.founder);
        const wealthSum = founders.reduce((sum, p) => sum + CLASS_INFO[p.cls].wealth, 0);
        if (settlementTypeOf(SEED, regionKey, villageIdx) === "urban") {
          urbanWealthSum += wealthSum;
          urbanFounders += founders.length;
        } else {
          ruralWealthSum += wealthSum;
          ruralFounders += founders.length;
        }
      }
    }
    expect(urbanFounders).toBeGreaterThan(0);
    expect(ruralFounders).toBeGreaterThan(0);
    const urbanMeanWealth = urbanWealthSum / urbanFounders;
    const ruralMeanWealth = ruralWealthSum / ruralFounders;
    expect(urbanMeanWealth).toBeGreaterThan(ruralMeanWealth);
  }, 20000);

  it("manorOf's wrapping phrase agrees with settlementTypeOf: borough/vila for urban, manor/senyoria for rural", () => {
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 40; villageIdx++) {
        const urban = settlementTypeOf(SEED, regionKey, villageIdx) === "urban";
        const en = manorOf(SEED, regionKey, villageIdx, "en");
        const ca = manorOf(SEED, regionKey, villageIdx, "ca");
        if (urban) {
          expect(en.manor).toContain("the borough of");
          expect(ca.manor).toContain("la vila de");
        } else {
          expect(en.manor).toContain("the manor of");
          expect(ca.manor).toContain("la senyoria de");
        }
      }
    }
  });
});
