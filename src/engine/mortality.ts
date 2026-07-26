import type { Locale } from "../i18n/locale.js";
import { demographyOf, periodMult, wealthIdx } from "./data/demography.js";
import { plagueAt } from "./data/plagues.js";
import { dearthHazard } from "./harvest.js";
import { addrHash, hashStr, makeRng } from "./hash.js";
import type { Death, DeathCause, Plague, Region, RiskTrade, Rng, Sex } from "./types.js";

const FALLBACK_WAR: Record<Locale, string> = { en: "the wars", ca: "les guerres" };

export function baseHazard(age: number): number {
  if (age === 0) return 0.19;
  if (age <= 4) return 0.038;
  if (age <= 9) return 0.011;
  if (age <= 14) return 0.009;
  if (age <= 19) return 0.011;
  if (age <= 29) return 0.014;
  if (age <= 39) return 0.019;
  if (age <= 49) return 0.028;
  if (age <= 59) return 0.045;
  if (age <= 69) return 0.085;
  if (age <= 79) return 0.16;
  return 0.3;
}

export function famineAt(year: number, region: Region): boolean {
  return year >= region.famine[0] && year <= region.famine[1];
}

/** § the harvest: the region's own yield in a given year. Passed in rather
 * than looked up here so rollDeath keeps working for the isolated unit
 * calls that have no world to ask about the weather — those simply get the
 * ordinary year the model always assumed. */
export type HarvestReader = (year: number) => number;

export function warAt(year: number, region: Region, locale: Locale = "en"): string | null {
  for (const [a, b] of region.warYears) if (year >= a && year <= b) return region.warNames[a]?.[locale] || FALLBACK_WAR[locale];
  return null;
}

// § plague waves: WHICH YEAR of a multi-year pandemic window the pestilence
// actually reached THIS village. A wave is dated in the chronicles by the
// span it took to cross a kingdom, but any one parish was struck over weeks,
// not years — the dead of 1349 were buried together, and their neighbours
// remembered one year, not five. Seeded per (village, wave), the same
// deterministic, non-memoized pattern as registerBlackoutAt below and
// hierarchy.ts's parishOf/manorOf, so every villager's own death roll agrees
// on when the plague came here without anything having to be threaded
// through the solve. The region key is folded into the hash, so the
// west/south-to-north/east spread the region data implies survives as a
// staggering ACROSS regions — it just no longer smears a single village's
// dead across the whole window.
export function plagueArrivalYear(worldSeed: number, regionKey: string, villageIdx: number, plague: Plague): number {
  const span = plague[1] - plague[0] + 1;
  if (span <= 1) return plague[0];
  return plague[0] + makeRng(addrHash(worldSeed, [regionKey, villageIdx, "plague-arrival", plague[0]])).int(0, span - 1);
}

// § register blackout: real parish registers went dark for everyone in a
// village at once during a crisis — the scribe himself could die of plague
// or flee before soldiers, not just any one villager having bad luck. Seeded
// per (village, year), not per person, so every villager alive that year
// agrees on whether the register kept its count — same deterministic,
// non-memoized pattern as hierarchy.ts's parishOf/manorOf. Famine is
// deliberately excluded: it starves a household, it doesn't kill or scatter
// the scribe.
//
// § plague waves: the year the wave actually reached this village (above) is
// far likelier to break the count than the quiet residual years on either
// side of it — that is the year the clerk himself was burying neighbours, or
// being buried. Without this the register could go dark in a window year in
// which nobody here actually died.
export function registerBlackoutAt(worldSeed: number, regionKey: string, villageIdx: number, year: number, region: Region): boolean {
  const plague = plagueAt(year, regionKey);
  const war = warAt(year, region);
  if (!plague && !war) return false;
  const rng = makeRng(addrHash(worldSeed, [regionKey, villageIdx, "register-blackout", year]));
  if (!plague) return rng.chance(0.15);
  return rng.chance(year === plagueArrivalYear(worldSeed, regionKey, villageIdx, plague) ? 0.55 : 0.1);
}

// § maternal mortality: rollDeath is called before marriage is resolved, so
// there's no actual birth to key off — instead a woman's chance of being
// married and actively bearing children ramps up around the region's own
// female marriage window (regions.ts) and tapers off toward the end of the
// fertile span, rather than switching on/off at a single age.
function fertileRamp(age: number, marriageF: readonly [number, number]): number {
  const rampStart = Math.max(12, marriageF[0] - 3);
  const fullBy = marriageF[0] + 2;
  const declineStart = 42;
  const declineEnd = 46;
  if (age < rampStart || age >= declineEnd) return 0;
  if (age < fullBy) return (age - rampStart) / (fullBy - rampStart);
  if (age < declineStart) return 1;
  return (declineEnd - age) / (declineEnd - declineStart);
}

// Pure per-person mortality walk. Returns {year, age, cause} where cause is
// a coarse category; narrative detail is decoded at Tier 2. `riskTrade`
// (§ occupational mortality) lets a trade the person was always going to be
// decoded into at Tier 2 (miner, sailor, man-at-arms...) actually cost them
// something here, rather than being purely decorative text: a hazardous or
// maritime trade adds flat accident risk (falls in the workplace, shipwreck,
// drowning), and a military one sharply multiplies the existing war hazard.
//
// § calibrated mechanics: the shared Russell-table baseline is modulated by
// the region/period/class dataset in data/demography.ts when `regionKey` is
// given; omitting it keeps the neutral NW-European default (used by unit
// tests that compare trades in isolation).
export function rollDeath(
  rng: Rng,
  birth: number,
  sex: Sex,
  wealth: number,
  region: Region,
  riskTrade: RiskTrade = "normal",
  regionKey?: string,
  // § plague waves: the village whose own arrival year decides when a
  // multi-year wave struck this person. Omitted by the isolated unit tests
  // that compare trades/regions with no village address to speak of, which
  // fall back to the per-person stagger below.
  village?: { worldSeed: number; villageIdx: number },
  // § the harvest: the region's yield series. Omitted by the isolated unit
  // calls, which then see nothing but ordinary years — the behaviour this
  // function had before harvests existed.
  harvest?: HarvestReader,
): Death {
  const demo = demographyOf(regionKey);
  const wi = wealthIdx(wealth);
  let age = 0;
  while (age <= 95) {
    const year = birth + age;
    const plague = plagueAt(year, regionKey);
    // § the harvest: hunger now comes from the year's actual yield, wherever
    // the harvest failed, instead of from one hard-coded window per region.
    // The old rule bit for every year of a fixed span at a flat rate and
    // nowhere else — so Castile starved through the Great Famine, which
    // never reached Iberia, and no village anywhere ever went hungry in the
    // 1370s or the 1430s, when a good many of them did. Where no harvest
    // reader is supplied (the isolated unit calls) this falls back to the
    // region's own named window, which is what those tests were written
    // against.
    const dearth = harvest ? dearthHazard(harvest(year), harvest(year - 1), age, wealth) : 0;
    const famine = harvest ? dearth > 0 : famineAt(year, region) && wealth <= 2;
    const warName = warAt(year, region);
    let h = baseHazard(age);
    if (age === 0) h *= demo.infantMult * demo.infantWealthMult[wi];
    else if (age <= 9) h *= demo.childMult * demo.infantWealthMult[wi];
    else h *= demo.wealthHazardMult[wi];
    h *= demo.hazardMult * periodMult(demo, year);
    let cause: DeathCause | null = null;
    if (plague) {
      // § calibrated mechanics: a multi-year pandemic window doesn't burn a
      // household at full force every year — a given person faces the wave
      // once (the year it actually reached their parish), with only a
      // smouldering residual in the rest of the window. Without this, five
      // compounding years of Black Death hazard kill ~70% of the living,
      // well past the 40–60% the sources support.
      const span = plague[1] - plague[0] + 1;
      // § plague waves: the year the wave reached this person's own village
      // — one year, shared by every villager, so a parish buries its dead
      // together the way it really did. Keyed off the village address
      // (plagueArrivalYear), which also carries the regional stagger.
      //
      // Without a village address (the isolated unit calls), fall back to
      // the older per-person stagger: at minimum the regional offset keeps
      // every person born in the same year anywhere in the modelled world
      // from hitting a given wave's peak in the identical calendar year.
      const regionOffset = regionKey ? hashStr(0, regionKey) : 0;
      const exposureYear =
        village && regionKey
          ? plagueArrivalYear(village.worldSeed, regionKey, village.villageIdx, plague)
          : plague[0] + ((birth * 31 + plague[0] * 7 + regionOffset) % span);
      if (span === 1 || year === exposureYear) {
        let mult = plague[2];
        if (plague[4] && age < 15) mult *= plague[4];
        if (wealth >= 4) mult *= 0.75;
        h = Math.min(0.9, h * mult + (plague[2] >= 10 ? 0.15 : 0.025));
      } else {
        // § plague waves: the residual in the window's other years is what
        // the wave left behind after it passed through — a sickly season,
        // not a second visitation. Kept low deliberately: at the old level
        // the four quiet years of a five-year window still buried a third of
        // the wave's dead between them, so a parish's plague deaths read as
        // a slow attrition rather than the one catastrophic year the
        // chronicles, the burial evidence, and the register blackout above
        // all describe.
        h = Math.min(0.9, h * 1.35 + (plague[2] >= 10 ? 0.004 : 0.002));
      }
    }
    // § the harvest: graded by how badly the harvest actually failed, by
    // age, and by whether the household had anything put by — where the old
    // rule was one flat number for everyone poor.
    if (harvest) h += dearth;
    else if (famine) h += age < 5 || age > 55 ? 0.1 : 0.03;
    let warRisk = 0;
    if (warName && sex === "M" && age >= 16 && age <= 45) {
      warRisk = wealth >= 4 ? 0.012 : 0.005;
      if (riskTrade === "military") warRisk *= 2.2;
      if (region.routiers && wealth <= 2) warRisk += 0.004;
      h += warRisk;
    }
    // § accident: the commonest verdicts in the one medieval source that
    // systematically records how people died. A coroner had to view every
    // sudden death, and what the rolls are full of is drowning — in ditches,
    // wells, millponds and fords, at every age but above all among small
    // children left near water — then carts, falls, horses, mills and trees.
    // None of it is disease, and all of it used to be filed as such.
    //
    // Toddlers carry the highest rate here for the reason the rolls
    // themselves give: they were mobile, unwatched, and the water was where
    // the work was. Infants under one are excluded — a newborn's death is not
    // a coroner's business — as are the very old, whose falls the register
    // records as age.
    let accidentRisk = age === 0 ? 0 : age <= 6 ? 0.003 : age <= 13 ? 0.0016 : age <= 60 ? 0.0018 : 0.0013;
    if (sex === "F") accidentRisk *= 0.55; // the rolls are lopsided: the fatal accidents were where the men worked
    // § occupational mortality: the trade hazard rolled at Tier 1 finally
    // lands in a cause that names it, instead of being added here and then
    // labelled "disease" at the bottom of this same function.
    if (sex === "M" && age >= 14 && age <= 65) {
      if (riskTrade === "hazardous") accidentRisk += 0.006;
      else if (riskTrade === "maritime") accidentRisk += 0.008;
    }
    h += accidentRisk;

    // § violence: homicide, which in medieval England ran at something like
    // twenty per hundred thousand a year — an order of magnitude above any
    // modern western European figure, and concentrated exactly where the
    // eyre rolls put it: on young men, in and around the alehouse, with a
    // knife that everyone was carrying anyway. Distinct from `war`, which is
    // soldiery and routiers in an actual war year.
    let violenceRisk = 0;
    if (age >= 14) {
      violenceRisk = sex === "M" ? (age <= 35 ? 0.0009 : 0.00045) : 0.0002;
      if (region.routiers && wealth <= 2) violenceRisk *= 1.4; // lawless country, and no lord's protection worth the name
    }
    h += violenceRisk;
    // § maternal mortality: a real per-year excess hazard, not a post-hoc
    // relabel of a coincidentally-timed death. Per-birth risk (demography.ts)
    // is spread over the region's own birth spacing to get a per-year rate,
    // then scaled by the same wealth grade that already softens other adult
    // mortality (poorer households: worse-attended, worse-nourished births).
    let maternalRisk = 0;
    if (sex === "F") {
      const ramp = fertileRamp(age, region.marriageF);
      if (ramp > 0) {
        const avgSpacing = (demo.birthSpacing[0] + demo.birthSpacing[1]) / 2;
        maternalRisk = (demo.maternalMortalityPerBirth / avgSpacing) * ramp * demo.wealthHazardMult[wi];
        h += maternalRisk;
      }
    }
    if (rng() < h) {
      if (plague && rng() < 0.8) cause = "plague";
      // § the harvest: the share of the year's hazard that the hunger
      // actually was, rather than a flat 0.7 for anyone poor in a famine
      // window — so a death in a merely poor year is only sometimes hunger,
      // and a death in a total failure usually is.
      else if (famine && rng() < (harvest ? Math.min(0.85, dearth / Math.max(h, 0.001)) : 0.7)) cause = "famine";
      else if (warName && rng() < warRisk / Math.max(h, 0.001)) cause = "war";
      else if (maternalRisk > 0 && rng() < maternalRisk / Math.max(h, 0.001)) cause = "childbirth";
      // Infancy first: a death in the first year is the register's own
      // category and a coroner never sat on one.
      else if (age === 0) cause = "infancy";
      // § accident / § violence: checked BEFORE the childhood and disease
      // defaults, so a drowned five-year-old reads as drowned rather than as
      // an unnamed childhood illness.
      else if (rng() < accidentRisk / Math.max(h, 0.001)) cause = "accident";
      else if (rng() < violenceRisk / Math.max(h, 0.001)) cause = "violence";
      else if (age <= 9) cause = "childhood";
      else cause = age >= 60 && rng() < 0.6 ? "oldage" : "disease";
      return { year, age, cause };
    }
    age++;
  }
  return { year: birth + 95, age: 95, cause: "oldage" };
}
