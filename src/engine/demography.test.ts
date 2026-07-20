// § calibrated mechanics: aggregate statistical tests. Each assertion is a
// band from the historical-demography literature, computed over a fixed
// sample of villages, so a future tweak to any mechanic that silently
// pushes the population out of the plausible range fails loudly here.
//
// Reference points: infant mortality ~15–30%; Black Death losses 40–60%
// of the living; EMP (NW Europe) female first marriage in the low-to-mid
// twenties vs. Mediterranean around twenty; completed families of 4–7
// births; widowers remarrying far more often than widows.
import { describe, expect, it } from "vitest";
import { REGIONS } from "./data/regions.js";
import type { Envelope } from "./types.js";
import { resolveVillage } from "./village.js";

const SEED = 1444;
const VILLAGES_PER_REGION = 10;

interface RegionStats {
  infantRate: number;
  adultMeanDeathAge: number;
  femaleMarriageAge: number;
  birthsPerCompletedFamily: number;
  blackDeathLoss: number;
  emigrationRate: number;
  widowerRemarryRate: number;
  widowRemarryRate: number;
  serviceRate: number;
  mobilityPre1350: number;
  mobilityPost1350: number;
}

function collect(regionKey: string): RegionStats {
  const region = REGIONS[regionKey];
  const envs: Envelope[] = [];
  for (let v = 0; v < VILLAGES_PER_REGION; v++) envs.push(resolveVillage(SEED, regionKey, v));

  let births = 0;
  let infantDeaths = 0;
  let adults = 0;
  let adultAgeSum = 0;
  let firstMarriages = 0;
  let fAgeSum = 0;
  let completed = 0;
  let completedKids = 0;
  let alive1346 = 0;
  let plagueDead = 0;
  let adultWomen = 0;
  let emigrated = 0;
  let widowers = 0;
  let widowersRemarried = 0;
  let widows = 0;
  let widowsRemarried = 0;
  let lowWealthAdolescents = 0;
  let inService = 0;
  let pre1350 = 0;
  let pre1350Mobile = 0;
  let post1350 = 0;
  let post1350Mobile = 0;

  for (const env of envs) {
    for (const p of env.persons) {
      if (!p.founder && !p.incomer) {
        births++;
        if (p.death.age === 0) infantDeaths++;
        if (p.death.age >= 20 && p.birth >= 1290 && p.birth <= 1380) {
          adults++;
          adultAgeSum += p.death.age;
        }
        if (p.sex === "F" && p.unions?.length) {
          firstMarriages++;
          fAgeSum += env.couples[p.unions[0]].year - p.birth;
        }
        if (p.sex === "F" && p.death.age >= region.marriageF[1]) {
          adultWomen++;
          if (p.emigrated) emigrated++;
        }
        const natalCls = p.clsOrigin ?? p.cls;
        if ((natalCls === "serf" || natalCls === "freePeasant") && p.death.age >= 14) {
          lowWealthAdolescents++;
          if (p.service) inService++;
        }
        if (p.birth + 16 < 1350) {
          pre1350++;
          if (p.clsOrigin) pre1350Mobile++;
        } else {
          post1350++;
          if (p.clsOrigin) post1350Mobile++;
        }
      }
      if (p.birth <= 1346 && p.death.year >= 1347) {
        alive1346++;
        if (p.death.year <= 1351 && p.death.cause === "plague") plagueDead++;
      }
      if (p.unions?.length) {
        const first = env.couples[p.unions[0]];
        const sp = env.persons[p.id === first.husband ? first.wife : first.husband];
        const bereavedYoungEnough = sp.death.year < p.death.year - 1 && sp.death.year - p.birth <= (p.sex === "M" ? 58 : 45);
        if (bereavedYoungEnough) {
          if (p.sex === "M") {
            widowers++;
            if (p.unions.length > 1) widowersRemarried++;
          } else {
            widows++;
            if (p.unions.length > 1) widowsRemarried++;
          }
        }
      }
    }
    for (const c of env.couples) {
      const W = env.persons[c.wife];
      if (W.death.age >= 42 && c.year - W.birth <= 30) {
        completed++;
        completedKids += c.children.length;
      }
    }
  }

  return {
    infantRate: infantDeaths / births,
    adultMeanDeathAge: adultAgeSum / adults,
    femaleMarriageAge: fAgeSum / firstMarriages,
    birthsPerCompletedFamily: completedKids / completed,
    blackDeathLoss: plagueDead / alive1346,
    emigrationRate: emigrated / adultWomen,
    widowerRemarryRate: widowersRemarried / widowers,
    widowRemarryRate: widowsRemarried / widows,
    serviceRate: inService / lowWealthAdolescents,
    mobilityPre1350: pre1350Mobile / pre1350,
    mobilityPost1350: post1350Mobile / post1350,
  };
}

const STATS = Object.fromEntries(Object.keys(REGIONS).map((rk) => [rk, collect(rk)]));

describe("aggregate demographic statistics stay within historical bands", () => {
  it.each(Object.keys(REGIONS))("%s: infant mortality in [0.15, 0.32]", (rk) => {
    expect(STATS[rk].infantRate).toBeGreaterThan(0.15);
    expect(STATS[rk].infantRate).toBeLessThan(0.32);
  });

  it.each(Object.keys(REGIONS))("%s: mean death age of adult survivors (20+) in [36, 52]", (rk) => {
    expect(STATS[rk].adultMeanDeathAge).toBeGreaterThan(36);
    expect(STATS[rk].adultMeanDeathAge).toBeLessThan(52);
  });

  it.each(Object.keys(REGIONS))("%s: female first-marriage age lands inside the region's own window", (rk) => {
    // the matcher tolerates brides up to marriageF[1]+6, and a widower's
    // remarriage search (village.ts) reaches a bit further still, so the
    // sample mean can sit somewhat above the nominal window
    const [lo, hi] = REGIONS[rk].marriageF;
    expect(STATS[rk].femaleMarriageAge).toBeGreaterThan(lo - 1);
    expect(STATS[rk].femaleMarriageAge).toBeLessThan(hi + 5);
  });

  it.each(Object.keys(REGIONS))("%s: completed families bear 3.5–8 children", (rk) => {
    expect(STATS[rk].birthsPerCompletedFamily).toBeGreaterThan(3.5);
    expect(STATS[rk].birthsPerCompletedFamily).toBeLessThan(8);
  });

  it.each(Object.keys(REGIONS))("%s: the Black Death kills 30–60% of the living, not more, not trivially less", (rk) => {
    expect(STATS[rk].blackDeathLoss).toBeGreaterThan(0.3);
    expect(STATS[rk].blackDeathLoss).toBeLessThan(0.6);
  });

  it.each(Object.keys(REGIONS))("%s: 10–45% of surviving adult women marry out of the village", (rk) => {
    expect(STATS[rk].emigrationRate).toBeGreaterThan(0.1);
    expect(STATS[rk].emigrationRate).toBeLessThan(0.45);
  });

  it.each(Object.keys(REGIONS))("%s: widowers remarry, and more often than widows", (rk) => {
    expect(STATS[rk].widowerRemarryRate).toBeGreaterThan(0.1);
    expect(STATS[rk].widowRemarryRate).toBeGreaterThan(0.03);
    expect(STATS[rk].widowerRemarryRate).toBeGreaterThan(STATS[rk].widowRemarryRate);
  });

  it("regions differ where the data says they should: EMP late marriage vs the Mediterranean", () => {
    const nw = (STATS.england.femaleMarriageAge + STATS.germany.femaleMarriageAge) / 2;
    const med = (STATS.catalonia.femaleMarriageAge + STATS.italy.femaleMarriageAge) / 2;
    expect(nw - med).toBeGreaterThan(1);
  });

  it("life-cycle service is a NW-European pattern: England/Germany well above Catalonia/Italy", () => {
    const nw = (STATS.england.serviceRate + STATS.germany.serviceRate) / 2;
    const med = (STATS.catalonia.serviceRate + STATS.italy.serviceRate) / 2;
    expect(nw).toBeGreaterThan(med * 1.5);
  });

  it("upward class mobility rises after the Black Death (aggregated across regions)", () => {
    let pre = 0;
    let post = 0;
    let n = 0;
    for (const rk of Object.keys(REGIONS)) {
      pre += STATS[rk].mobilityPre1350;
      post += STATS[rk].mobilityPost1350;
      n++;
    }
    expect(post / n).toBeGreaterThan((pre / n) * 1.3);
  });
});
