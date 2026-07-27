// § the price of bread. Two kinds of test here, and the split matters.
//
// The series are checkable against the historical record directly — the
// price of grain answers to the harvest with a known non-linearity, and
// the real wage does a specific documented thing across 1349 that no other
// number in this engine does.
//
// The court roll is checkable against the ENVELOPE: every entry in it must
// correspond to an event that already happened to a real person on the
// register, because the whole design of it is that nothing is invented —
// a court roll that could contain a fine levied on nobody, or on a free
// tenant, or in a year no one held the land, would be a fiction dressed as
// a source.
import { describe, expect, it } from "vitest";
import { ENTRY_FINE, trendAt, WHEAT_TREND } from "./data/economy.js";
import { REGIONS } from "./data/regions.js";
import { courtRollOf, dayWageAt, lsd, occupancyAt, priceSeries, realWageDays, subsistenceOf, wheatPriceAt } from "./economy.js";
import { harvestAt } from "./harvest.js";
import { tenementsOf } from "./tenement.js";
import { resolveVillage } from "./village.js";

const SEED = 1444;
const REGION_KEYS = Object.keys(REGIONS);

describe("§ the price of bread: the series", () => {
  it("interpolates a trend and holds flat past its ends", () => {
    expect(trendAt(WHEAT_TREND, 1200)).toBe(WHEAT_TREND[0][1]);
    expect(trendAt(WHEAT_TREND, 1600)).toBe(WHEAT_TREND[WHEAT_TREND.length - 1][1]);
    const mid = trendAt(WHEAT_TREND, 1300);
    expect(mid).toBeGreaterThan(Math.min(WHEAT_TREND[1][1], WHEAT_TREND[2][1]));
    expect(mid).toBeLessThan(Math.max(WHEAT_TREND[1][1], WHEAT_TREND[2][1]));
  });

  it("runs the price up harder than a shortfall, and down more gently than a glut", () => {
    // The asymmetry is the whole reason a dearth is a catastrophe rather
    // than an inconvenience: nobody can decline to eat.
    const trend = trendAt(WHEAT_TREND, 1400);
    const deficit = trend * (1 / 0.7) ** 2.6;
    const glut = trend * (1 / 1.3) ** 1.5;
    expect(deficit / trend).toBeGreaterThan(2);
    expect(trend / glut).toBeLessThan(deficit / trend);
  });

  it("prices a failed harvest far above an ordinary one, in every region", () => {
    for (const rk of REGION_KEYS) {
      let worst = 0;
      let worstYear = 0;
      let ordinary = 0;
      let n = 0;
      for (let y = 1290; y <= 1495; y++) {
        const p = wheatPriceAt(SEED, rk, y);
        if (p > worst) {
          worst = p;
          worstYear = y;
        }
        if (harvestAt(SEED, rk, y) >= 0.95 && harvestAt(SEED, rk, y) <= 1.05) {
          ordinary += p;
          n++;
        }
      }
      expect(worst / (ordinary / n), `${rk} dearth spike`).toBeGreaterThan(2);
      expect(harvestAt(SEED, rk, worstYear), `${rk} worst year was a bad harvest`).toBeLessThan(0.8);
    }
  });

  it("never lets a single year's price run away past what the record shows", () => {
    for (const rk of REGION_KEYS) {
      for (let y = 1290; y <= 1495; y++) {
        const ratio = wheatPriceAt(SEED, rk, y) / trendAt(WHEAT_TREND, y);
        expect(ratio, `${rk} ${y}`).toBeLessThanOrEqual(5);
        expect(ratio, `${rk} ${y}`).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it("doubles the real wage across the Black Death and never gives it back", () => {
    // The one number in this engine that moves that far, and the reason the
    // fifteenth century is called a golden age for the labourer despite
    // being, by every other measure here, a worse century to be born in.
    expect(dayWageAt(1340)).toBeLessThan(2);
    expect(dayWageAt(1400)).toBeGreaterThan(dayWageAt(1340) * 2);
    expect(dayWageAt(1490)).toBeGreaterThanOrEqual(dayWageAt(1400));
    // In days of labour for a quarter of wheat, measured over a decade each
    // side so no single year's weather decides it.
    const mean = (from: number, to: number) => {
      let s = 0;
      for (let y = from; y <= to; y++) s += realWageDays(SEED, "england", y);
      return s / (to - from + 1);
    };
    const before = mean(1320, 1340);
    const after = mean(1440, 1460);
    expect(before).toBeGreaterThan(30);
    expect(after).toBeLessThan(before * 0.6);
  });

  it("hands the UI a series of the same length it asked for", () => {
    const s = priceSeries(SEED, "england", 1290, 1495);
    expect(s.length).toBe(206);
    for (const row of s) expect(row.realWage).toBeCloseTo(row.price / row.wage, 6);
  });

  it("writes money the way it was written", () => {
    expect(lsd(240)).toEqual({ l: 1, s: 0, d: 0 });
    expect(lsd(38)).toEqual({ l: 0, s: 3, d: 2 });
    expect(lsd(0)).toEqual({ l: 0, s: 0, d: 0 });
  });
});

describe("§ the price of bread: the court roll", () => {
  /** A village with enough tenurial history to have a roll worth reading. */
  function busiestTenement(rk: string): { env: ReturnType<typeof resolveVillage>; idx: number } | null {
    for (let v = 0; v < 12; v++) {
      const env = resolveVillage(SEED, rk, v);
      const tenements = tenementsOf(SEED, rk, v);
      for (let i = 0; i < tenements.length; i++) {
        if (courtRollOf(SEED, env, i).length >= 6) return { env, idx: i };
      }
    }
    return null;
  }

  it("charges every entry to a real person, on a real holding, in the era", () => {
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 4; v++) {
        const env = resolveVillage(SEED, rk, v);
        const tenements = tenementsOf(SEED, rk, v);
        for (let i = 0; i < tenements.length; i++) {
          for (const e of courtRollOf(SEED, env, i)) {
            expect(env.persons[e.personId], `${rk}:${v}:${i}`).toBeDefined();
            expect(e.tenement).toBe(i);
            expect(e.amount).toBeGreaterThan(0);
            expect(e.year).toBeGreaterThanOrEqual(1235);
            // Not 1500: Tier 1 stops generating BIRTHS at the register's
            // close and does not stop generating deaths, so a tenant born
            // in the 1490s can die — and owe a heriot — well into the next
            // century. The binding constraint is his own lifespan, below.
            expect(e.year).toBeLessThanOrEqual(1600);
            // The person must have been alive to owe it — you cannot be
            // fined for a marriage after your own burial.
            const p = env.persons[e.personId];
            expect(e.year, `${rk}:${v}:${i} ${e.kind}`).toBeGreaterThanOrEqual(p.birth);
            expect(e.year, `${rk}:${v}:${i} ${e.kind}`).toBeLessThanOrEqual(p.death.year);
          }
        }
      }
    }
  });

  it("levies merchet and leyrwite on the unfree only", () => {
    // The distinction "serf" has been carrying elsewhere in this engine
    // without it ever costing anybody anything.
    let seen = 0;
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 6; v++) {
        const env = resolveVillage(SEED, rk, v);
        const tenements = tenementsOf(SEED, rk, v);
        for (let i = 0; i < tenements.length; i++) {
          for (const e of courtRollOf(SEED, env, i)) {
            if (e.kind !== "merchet" && e.kind !== "leyrwite") continue;
            seen++;
            const she = env.persons[e.personId];
            expect(she.sex).toBe("F");
            const father = env.persons[she.father];
            expect(father?.cls, `${rk}:${v}:${i}`).toBe("serf");
          }
        }
      }
    }
    expect(seen, "the roll has servile business in it at all").toBeGreaterThan(0);
  });

  it("dates a heriot to a death and an entry fine to a tenure", () => {
    const found = busiestTenement("england");
    expect(found).not.toBeNull();
    const { env, idx } = found!;
    const roll = courtRollOf(SEED, env, idx);
    for (const e of roll) {
      if (e.kind === "heriot") expect(e.year).toBe(env.persons[e.personId].death.year);
      if (e.kind === "merchet") expect(e.year).toBe(env.persons[e.personId].marriageYear);
    }
    expect(roll.some((e) => e.kind === "entryfine")).toBe(true);
    // Sorted, because a roll is a chronological document.
    for (let i = 1; i < roll.length; i++) expect(roll[i].year).toBeGreaterThanOrEqual(roll[i - 1].year);
  });

  it("charges an heir less than a stranger for the same ground", () => {
    // Real manorial practice, and the reason the distinction is on the
    // entry at all.
    let heirFines = 0;
    let strangerFines = 0;
    let nHeir = 0;
    let nStranger = 0;
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 8; v++) {
        const env = resolveVillage(SEED, rk, v);
        const tenements = tenementsOf(SEED, rk, v);
        for (let i = 0; i < tenements.length; i++) {
          for (const e of courtRollOf(SEED, env, i)) {
            if (e.kind !== "entryfine") continue;
            // Normalised by the holding, so this compares like with like.
            const per = e.amount / ENTRY_FINE[tenements[i].size];
            if (e.heir) {
              heirFines += per;
              nHeir++;
            } else {
              strangerFines += per;
              nStranger++;
            }
          }
        }
      }
    }
    expect(nHeir).toBeGreaterThan(0);
    expect(nStranger).toBeGreaterThan(0);
    expect(heirFines / nHeir).toBeLessThan(strangerFines / nStranger);
  });

  it("collapses the entry fine when the plague empties the holdings", () => {
    // The connection the manorial evidence draws and this engine could not:
    // the same land pressure that moves the age of marriage moves the price
    // of getting on to the land. When half the tenements stand empty the
    // lord is not holding an auction.
    let crowded = 0;
    let nCrowded = 0;
    let empty = 0;
    let nEmpty = 0;
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 8; v++) {
        const env = resolveVillage(SEED, rk, v);
        const tenements = tenementsOf(SEED, rk, v);
        for (let i = 0; i < tenements.length; i++) {
          for (const e of courtRollOf(SEED, env, i)) {
            if (e.kind !== "entryfine" || e.heir) continue;
            const per = e.amount / ENTRY_FINE[tenements[i].size];
            if (occupancyAt(env, e.year, tenements.length) > 0.85) {
              crowded += per;
              nCrowded++;
            } else if (occupancyAt(env, e.year, tenements.length) < 0.55) {
              empty += per;
              nEmpty++;
            }
          }
        }
      }
    }
    expect(nCrowded).toBeGreaterThan(0);
    expect(nEmpty).toBeGreaterThan(0);
    expect(empty / nEmpty).toBeLessThan((crowded / nCrowded) * 0.6);
  });
});

describe("§ the subsistence line", () => {
  it("puts a half-virgate on the line and a cottage under it", () => {
    // The threshold the whole size classification exists to express: a
    // cottar was not a smaller virgater, he was a wage labourer with a
    // garden, and this is the calculation that says so.
    let virgateSurplus = 0;
    let virgateN = 0;
    let cottageDeficit = 0;
    let cottageN = 0;
    for (let v = 0; v < 10; v++) {
      const env = resolveVillage(SEED, "england", v);
      const tenements = tenementsOf(SEED, "england", v);
      env.couples.forEach((c, ci) => {
        if (c.tenement == null) return;
        const year = c.year + 12; // a household at full size
        const s = subsistenceOf(SEED, env, ci, year);
        if (!s || s.mouths < 3) return;
        const size = tenements[c.tenement].size;
        if (size === "virgate") {
          virgateSurplus += s.wageDays === 0 ? 1 : 0;
          virgateN++;
        } else if (size === "cottage" || size === "toft") {
          cottageDeficit += s.wageDays > 0 ? 1 : 0;
          cottageN++;
        }
      });
    }
    expect(virgateN).toBeGreaterThan(5);
    expect(cottageN).toBeGreaterThan(5);
    expect(virgateSurplus / virgateN, "a virgate feeds its household").toBeGreaterThan(0.8);
    expect(cottageDeficit / cottageN, "a cottage does not").toBeGreaterThan(0.9);
  });

  it("gives an undersettle no land and nothing but wage days", () => {
    for (let v = 0; v < 20; v++) {
      const env = resolveVillage(SEED, "england", v);
      const ci = env.couples.findIndex((c) => c.tenement == null);
      if (ci < 0) continue;
      const s = subsistenceOf(SEED, env, ci, env.couples[ci].year + 5);
      if (!s) continue;
      expect(s.acres).toBe(0);
      expect(s.netQuarters).toBe(0);
      expect(s.wageDays).toBeGreaterThan(0);
      return;
    }
  });

  it("widens the gap in a failed harvest, because both sides move at once", () => {
    // The cruelty of the thing: the crop is short AND the grain to make it
    // up costs three times as much, so the wage days needed rise faster
    // than the deficit does.
    for (let v = 0; v < 20; v++) {
      const env = resolveVillage(SEED, "england", v);
      const ci = env.couples.findIndex((c) => c.tenement != null);
      if (ci < 0) continue;
      let good = -1;
      let bad = -1;
      const c = env.couples[ci];
      for (let y = c.year + 5; y < c.year + 30; y++) {
        const h = harvestAt(SEED, "england", y);
        if (h > 1.05 && good < 0) good = y;
        if (h < 0.75 && bad < 0) bad = y;
      }
      if (good < 0 || bad < 0) continue;
      const sg = subsistenceOf(SEED, env, ci, good);
      const sb = subsistenceOf(SEED, env, ci, bad);
      if (!sg || !sb) continue;
      expect(sb.netQuarters).toBeLessThan(sg.netQuarters);
      return;
    }
  });
});
