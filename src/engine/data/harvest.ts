// =====================================================================
// § the harvest — the year that actually varied.
//
// Until now a region had exactly one famine: a fixed two- or three-year
// window in regions.ts, and two centuries of identical weather on either
// side of it. That is the wrong shape for a grain economy. What killed
// people in a medieval village, year in and year out, was not one famous
// famine but the ordinary variance of the harvest — a wet August, a
// failed sowing, the second bad year in a row when the seed corn had
// already been eaten — and that variance is one of the best-measured
// things about the period, because grain prices were written down.
//
// Two layers, the engine's usual rule:
//
//  - The DEARTHS below are history. Where the chronicles and the price
//    series agree that a harvest failed, it fails here, in the right
//    region, in the right years, at roughly the right depth. These do not
//    vary between worlds.
//  - Everything else is hashed off (world, region, year): most years
//    ordinary, a fifth poor, a severe failure every decade or so. That
//    distribution is the shape the English and Tuscan price series show;
//    the particular sequence is this world's own weather.
//
// The index is a yield: 1.0 is an ordinary year, above it a good one,
// and the thresholds in harvest.ts turn the bottom of the range into
// hunger. Grain, not money — a price series inverted, so that the reader
// of a village page sees "the harvest failed" rather than "wheat was 11s
// 4d the quarter", which is true but says nothing to anyone.
// =====================================================================
import type { LocalText } from "../types.js";

export interface Dearth {
  from: number;
  to: number;
  /** Regions it reached; null for a failure general across the modelled world. */
  regions: string[] | null;
  /** The yield index for those years — see harvest.ts's thresholds. */
  yield: number;
  name: LocalText;
}

/** Documented harvest failures. Ordered by year; the first match wins, so
 * a regional entry may sit inside a general one and deepen it. */
export const DEARTHS: Dearth[] = [
  {
    // Castile's early-century famine, and the one Alfonso XI's chroniclers
    // remember before the plague.
    from: 1301,
    to: 1303,
    regions: ["castile", "portugal"],
    yield: 0.6,
    name: { en: "the hunger of the first years of the century", ca: "la fam dels primers anys del segle" },
  },
  {
    // The Great Famine. Two and a half years of rain across northern
    // Europe, the seed corn eaten, the plough oxen dead of murrain — the
    // worst subsistence crisis of the European Middle Ages, and the one
    // event here whose depth is not in question.
    from: 1315,
    to: 1317,
    regions: ["england", "france", "germany", "scotland"],
    yield: 0.42,
    name: { en: "the Great Famine", ca: "la Gran Fam" },
  },
  {
    from: 1321,
    to: 1322,
    regions: ["england", "france", "germany", "scotland"],
    yield: 0.66,
    name: { en: "the second failure", ca: "la segona fallida" },
  },
  {
    // Florence's famine, and the failure of the Bardi and Peruzzi behind it.
    from: 1328,
    to: 1330,
    regions: ["italy"],
    yield: 0.58,
    name: { en: "the great dearth in Tuscany", ca: "la gran carestia a la Toscana" },
  },
  {
    // "Lo mal any primer" — the first bad year, 1333, the date Catalan
    // chroniclers themselves use to mark where the good century ended.
    from: 1333,
    to: 1334,
    regions: ["catalonia"],
    yield: 0.5,
    name: { en: "the first bad year", ca: "lo mal any primer" },
  },
  {
    from: 1343,
    to: 1344,
    regions: ["castile", "portugal"],
    yield: 0.68,
    name: { en: "the dearth of the forties", ca: "la carestia dels anys quaranta" },
  },
  {
    // The bad harvests that ran immediately before the plague reached the
    // west — a population already short of food when it arrived.
    from: 1346,
    to: 1347,
    regions: null,
    yield: 0.72,
    name: { en: "the dear years before the pestilence", ca: "els anys cars abans de la pestilència" },
  },
  {
    from: 1369,
    to: 1371,
    regions: ["england", "france"],
    yield: 0.68,
    name: { en: "the dear years of the seventies", ca: "els anys cars dels setanta" },
  },
  {
    from: 1374,
    to: 1375,
    regions: ["england", "france", "germany"],
    yield: 0.63,
    name: { en: "the great dearth of 1374", ca: "la gran carestia de 1374" },
  },
  {
    from: 1390,
    to: 1391,
    regions: null,
    yield: 0.67,
    name: { en: "the dearth of 1390", ca: "la carestia de 1390" },
  },
  {
    // The Parisian famine of the civil war and the English occupation.
    from: 1420,
    to: 1422,
    regions: ["france"],
    yield: 0.55,
    name: { en: "the famine of the wars", ca: "la fam de les guerres" },
  },
  {
    // Two failed harvests running, and the worst English subsistence crisis
    // between the Great Famine and the sixteenth century.
    from: 1437,
    to: 1440,
    regions: ["england", "scotland"],
    yield: 0.5,
    name: { en: "the dear years", ca: "els anys cars" },
  },
  {
    from: 1473,
    to: 1474,
    regions: ["castile", "portugal"],
    yield: 0.62,
    name: { en: "the hunger of the seventies", ca: "la fam dels anys setanta" },
  },
  {
    from: 1482,
    to: 1483,
    regions: ["england", "france", "germany"],
    yield: 0.65,
    name: { en: "the dearth of 1482", ca: "la carestia de 1482" },
  },
];

export function dearthAt(regionKey: string, year: number): Dearth | null {
  let found: Dearth | null = null;
  for (const d of DEARTHS) {
    if (year < d.from || year > d.to) continue;
    if (d.regions && !d.regions.includes(regionKey)) continue;
    // A regional entry deepening a general one wins on depth.
    if (!found || d.yield < found.yield) found = d;
  }
  return found;
}
