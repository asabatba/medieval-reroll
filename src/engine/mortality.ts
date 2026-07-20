import type { Locale } from "../i18n/locale.js";
import { plagueAt } from "./data/plagues.js";
import type { Death, DeathCause, Region, Rng, Sex } from "./types.js";

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

// Pure per-person mortality walk. Returns {year, age, cause} where cause is
// a coarse category; narrative detail is decoded at Tier 2.
export function rollDeath(rng: Rng, birth: number, sex: Sex, wealth: number, region: Region): Death {
  let age = 0;
  while (age <= 95) {
    const year = birth + age;
    const plague = plagueAt(year);
    const famine = famineAt(year, region) && wealth <= 2;
    const warName = warAt(year, region);
    let h = baseHazard(age);
    let cause: DeathCause | null = null;
    if (plague) {
      let mult = plague[2];
      if (plague[4] && age < 15) mult *= plague[4];
      if (wealth >= 4) mult *= 0.75;
      h = Math.min(0.9, h * mult + (plague[2] >= 10 ? 0.15 : 0.025));
    }
    if (famine) h += age < 5 || age > 55 ? 0.1 : 0.03;
    let warRisk = 0;
    if (warName && sex === "M" && age >= 16 && age <= 45) {
      warRisk = wealth >= 4 ? 0.012 : 0.005;
      if (region.routiers && wealth <= 2) warRisk += 0.004;
      h += warRisk;
    }
    if (rng() < h) {
      if (plague && rng() < 0.8) cause = "plague";
      else if (famine && rng() < 0.7) cause = "famine";
      else if (warName && rng() < warRisk / Math.max(h, 0.001)) cause = "war";
      else if (age === 0) cause = "infancy";
      else if (age <= 9) cause = "childhood";
      else cause = age >= 60 && rng() < 0.6 ? "oldage" : "disease";
      return { year, age, cause };
    }
    age++;
  }
  return { year: birth + 95, age: 95, cause: "oldage" };
}
