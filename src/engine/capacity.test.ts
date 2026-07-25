// § the preventive check, § childbed deaths, § plague waves.
//
// These are aggregate, band-style tests in the spirit of demography.test.ts:
// they scan real resolveVillage() output and assert the SHAPE of what comes
// out, because each of the three mechanisms here is emergent — no single
// person's record shows whether the village regulated itself, buried its
// plague dead together, or told the truth about how its women died.
import { describe, expect, it } from "vitest";
import { holdingsAt } from "./capacity.js";
import { PLAGUES } from "./data/plagues.js";
import { REGIONS } from "./data/regions.js";
import { plagueArrivalYear } from "./mortality.js";
import { villageStateAt } from "./snapshot.js";
import { resolveVillage } from "./village.js";

const SEED = 4242;
const REGION_KEYS = Object.keys(REGIONS);
const VILLAGES = 12;

const envs = REGION_KEYS.flatMap((rk) => Array.from({ length: VILLAGES }, (_, v) => ({ rk, v, env: resolveVillage(SEED, rk, v) })));

/** Resident population of one region's villages, averaged, in a given year. */
function meanPopulation(rk: string, year: number): number {
  const rows = envs.filter((e) => e.rk === rk);
  return rows.reduce((sum, e) => sum + villageStateAt(e.env, year).population, 0) / rows.length;
}

describe("§ the preventive check — villages stay near their land", () => {
  // 1345 is the last pre-plague year the register era offers with a mature
  // age structure; 1360 is past the Black Death everywhere; 1490 is the end.
  it.each(REGION_KEYS)("%s: the Black Death visibly empties the village, and it never fully refills", (rk) => {
    const prePlague = meanPopulation(rk, 1345);
    const postPlague = meanPopulation(rk, 1360);
    const end = meanPopulation(rk, 1490);
    expect(postPlague).toBeLessThan(prePlague * 0.9);
    expect(postPlague).toBeGreaterThan(prePlague * 0.6);
    // The fifteenth century recovers, but onto land the retreat from the
    // margin (capacity.ts's CULTIVATION) has taken partly out of use.
    expect(end).toBeGreaterThan(postPlague);
    expect(end).toBeLessThan(prePlague);
  });

  it.each(REGION_KEYS)("%s: still a living village at the end of the register, never a deserted one", (rk) => {
    // The failure this guards against is the one the check was built for: a
    // sub-replacement village dwindling to a handful of souls by 1490.
    expect(meanPopulation(rk, 1490)).toBeGreaterThan(25);
  });

  it("every region ends the register within the same order of magnitude", () => {
    const ends = REGION_KEYS.map((rk) => meanPopulation(rk, 1490));
    // Before the check, the identical engine produced villages of 8 people
    // and villages of 57 from parameter differences of a year or two in the
    // marriage window — a 7x spread that was pure compounding, not history.
    expect(Math.max(...ends) / Math.min(...ends)).toBeLessThan(2);
  });

  it.each(REGION_KEYS)("%s: households never much outrun the holdings the land offers", (rk) => {
    for (const { v, env } of envs.filter((e) => e.rk === rk)) {
      for (const year of [1345, 1450]) {
        // Couple-households only: snapshot.ts keys the solo and orphan
        // pseudo-households from 100000 up, and neither holds a tenement.
        const held = villageStateAt(env, year).households.filter((h) => h.id >= 0 && h.id < 100000).length;
        expect(held).toBeLessThanOrEqual(holdingsAt(SEED, rk, v, year) * 1.6);
      }
    }
  });
});

describe("§ childbed deaths — the register shows the confinement", () => {
  it("a woman recorded as dying in childbed bore a child that same year, unless her adult life was lived in another register", () => {
    let checked = 0;
    for (const { env } of envs) {
      for (const p of env.persons) {
        if (p.death.cause !== "childbirth") continue;
        const bore = env.persons.some((k) => k.mother === p.id && k.birth === p.death.year);
        if (bore) {
          checked++;
          continue;
        }
        // The two exemptions, both meaning "her confinement isn't this
        // village's to record": an emigrant, whose adult life happened
        // elsewhere, and a residence record whose cause was copied verbatim
        // from the origin register that owns it.
        expect(p.emigrated || p.originId != null).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(50); // the mechanism actually fires
  });

  it("no woman dies in childbed who never married and never bore a child at all", () => {
    for (const { env } of envs) {
      for (const p of env.persons) {
        if (p.death.cause !== "childbirth" || p.emigrated || p.originId != null) continue;
        expect(env.persons.some((k) => k.mother === p.id)).toBe(true);
      }
    }
  });
});

describe("§ plague waves — a parish buries its dead together", () => {
  it("most of a village's Black Death dead fall in the one year the wave reached it", () => {
    let inArrivalYear = 0;
    let total = 0;
    for (const { rk, v, env } of envs) {
      const arrival = plagueArrivalYear(SEED, rk, v, PLAGUES[0]);
      for (const p of env.persons) {
        if (p.death.cause !== "plague" || p.death.year < PLAGUES[0][0] || p.death.year > PLAGUES[0][1]) continue;
        total++;
        if (p.death.year === arrival) inArrivalYear++;
      }
    }
    expect(total).toBeGreaterThan(200);
    // Not all of them: the window's other years keep a residual, the wave
    // lingering rather than visiting twice (mortality.ts).
    expect(inArrivalYear / total).toBeGreaterThan(0.6);
  });

  it("the arrival year is a fact about the village, not about who was born when", () => {
    // Two villages in the same region generally meet the same wave in
    // different years; every person inside one meets it in the same year.
    const years = new Set(Array.from({ length: 24 }, (_, v) => plagueArrivalYear(SEED, "england", v, PLAGUES[0])));
    expect(years.size).toBeGreaterThan(1);
    for (let v = 0; v < 6; v++) {
      const a = plagueArrivalYear(SEED, "england", v, PLAGUES[0]);
      expect(plagueArrivalYear(SEED, "england", v, PLAGUES[0])).toBe(a); // pure function of the address
      expect(a).toBeGreaterThanOrEqual(PLAGUES[0][0]);
      expect(a).toBeLessThanOrEqual(PLAGUES[0][1]);
    }
  });
});
