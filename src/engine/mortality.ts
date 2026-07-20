import type { Locale } from "../i18n/locale.js";
import { demographyOf, periodMult, wealthIdx } from "./data/demography.js";
import { plagueAt } from "./data/plagues.js";
import type { Death, DeathCause, Region, RiskTrade, Rng, Sex } from "./types.js";

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

export function warAt(year: number, region: Region, locale: Locale = "en"): string | null {
  for (const [a, b] of region.warYears) if (year >= a && year <= b) return region.warNames[a]?.[locale] || FALLBACK_WAR[locale];
  return null;
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
export function rollDeath(rng: Rng, birth: number, sex: Sex, wealth: number, region: Region, riskTrade: RiskTrade = "normal", regionKey?: string): Death {
  const demo = demographyOf(regionKey);
  const wi = wealthIdx(wealth);
  let age = 0;
  while (age <= 95) {
    const year = birth + age;
    const plague = plagueAt(year);
    const famine = famineAt(year, region) && wealth <= 2;
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
      const exposureYear = plague[0] + ((birth * 31 + plague[0] * 7) % span);
      if (span === 1 || year === exposureYear) {
        let mult = plague[2];
        if (plague[4] && age < 15) mult *= plague[4];
        if (wealth >= 4) mult *= 0.75;
        h = Math.min(0.9, h * mult + (plague[2] >= 10 ? 0.15 : 0.025));
      } else {
        h = Math.min(0.9, h * 2 + (plague[2] >= 10 ? 0.02 : 0.008));
      }
    }
    if (famine) h += age < 5 || age > 55 ? 0.1 : 0.03;
    let warRisk = 0;
    if (warName && sex === "M" && age >= 16 && age <= 45) {
      warRisk = wealth >= 4 ? 0.012 : 0.005;
      if (riskTrade === "military") warRisk *= 2.2;
      if (region.routiers && wealth <= 2) warRisk += 0.004;
      h += warRisk;
    }
    if (sex === "M" && age >= 14 && age <= 65) {
      if (riskTrade === "hazardous") h += 0.006;
      else if (riskTrade === "maritime") h += 0.008;
    }
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
      else if (famine && rng() < 0.7) cause = "famine";
      else if (warName && rng() < warRisk / Math.max(h, 0.001)) cause = "war";
      else if (maternalRisk > 0 && rng() < maternalRisk / Math.max(h, 0.001)) cause = "childbirth";
      else if (age === 0) cause = "infancy";
      else if (age <= 9) cause = "childhood";
      else cause = age >= 60 && rng() < 0.6 ? "oldage" : "disease";
      return { year, age, cause };
    }
    age++;
  }
  return { year: birth + 95, age: 95, cause: "oldage" };
}
