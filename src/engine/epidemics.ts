// =====================================================================
// § the epidemic year — the dated outbreaks, as mortality.
//
// data/epidemics.ts holds the table and explains which half of it is
// allowed a hazard at all (the dated outbreaks: excess events on top of an
// ordinary year; never the endemic entries, which are the `disease`
// background already inside the life table). This turns that half into an
// actual yearly risk, the way harvest.ts turns data/harvest.ts into one.
//
// Two properties are worth stating because they are what makes an outbreak
// read as an outbreak rather than as a slightly worse decade:
//
//  - It is SHORT. A wave got into a parish, killed for a season, and was
//    over. The window in the table is how long the thing was abroad in the
//    world; the first year of it is when it was here. So the excess is
//    full in the opening year and a quarter of it afterwards, rather than
//    a plateau across three years that would bury more people than the
//    chroniclers ever counted.
//  - It has an AGE. Every named epidemic in the record is remembered for
//    whom it took, and in the sweating sickness's case that is the entire
//    reason it has a name: it killed grown men in their strength and
//    passed over the old and the poor, and everyone alive in 1485 knew
//    within a week that this was not the plague come back.
// =====================================================================
import { EPIDEMICS, type Epidemic, type EpidemicAgeShape } from "./data/epidemics.js";
import { POOR_HARVEST } from "./harvest.js";

/** The dated outbreak in force in this region and year, if any — the ones
 * that carry a hazard, so the endemic background can never be returned
 * here. First match wins, as in the table's own order. */
export function outbreakAt(year: number, regionKey: string | undefined, age: number): Epidemic | null {
  for (const e of EPIDEMICS) {
    if (e.excess == null) continue;
    if (year < e.from || year > e.to) continue;
    if (e.regions && (regionKey == null || !e.regions.includes(regionKey))) continue;
    if (e.ageMin != null && age < e.ageMin) continue;
    if (e.ageMax != null && age > e.ageMax) continue;
    return e;
  }
  return null;
}

/** How much of an outbreak's excess an age of this age bore. */
function ageWeight(shape: EpidemicAgeShape, age: number): number {
  if (shape === "adults") {
    // The inversion: full weight on working adults, little on the old,
    // nothing on children — the sweat's whole signature.
    if (age < 12) return 0;
    if (age < 15) return 0.4;
    if (age <= 45) return 1;
    if (age <= 60) return 0.5;
    return 0.25;
  }
  if (shape === "old") {
    if (age < 40) return 0.1;
    if (age < 60) return 0.4;
    return 1;
  }
  // "all": everyone, with the usual two ends of life bearing more.
  return age < 5 || age > 55 ? 1 : 0.7;
}

/** Excess yearly mortality from a dated outbreak.
 *
 * `harvest` is only consulted for a `harvestDriven` entry — an outbreak
 * that rode a subsistence crisis, whose weight therefore has to answer to
 * the yield THIS world gave those years rather than to a constant. */
export function outbreakHazard(year: number, regionKey: string | undefined, age: number, harvest: number): number {
  const e = outbreakAt(year, regionKey, age);
  if (!e?.excess) return 0;
  let h = e.excess * ageWeight(e.shape ?? "all", age);
  // The wave is here in the window's first year and trailing thereafter.
  if (year > e.from) h *= 0.25;
  if (e.harvestDriven) {
    // Scaled by how far below an ordinary year the crop actually came in,
    // and never more than the entry's own weight.
    const depth = Math.max(0, Math.min(1, (POOR_HARVEST - harvest) / (POOR_HARVEST - 0.45)));
    h *= 0.25 + 0.75 * depth;
  }
  return h;
}
