// =====================================================================
// § the harvest — the subsistence year, and what it did to people.
//
// data/harvest.ts holds the documented failures; this turns them, and the
// ordinary variance around them, into the three things a bad harvest
// actually did to a village:
//
//  1. It killed people — not evenly, but at the two ends of life and in
//     the households with nothing put by. The engine already had this
//     shape for its one hard-coded famine window; now it applies wherever
//     the harvest actually failed.
//  2. It postponed weddings. This is the better-evidenced of the two and
//     the one the old model had no representation of at all. Marriage
//     registers collapse in a dearth year and rebound the year after the
//     good harvest: a couple needed a holding AND the means to stock it,
//     and in a year when bread was at famine price they waited. It is the
//     preventive check operating on a one-year clock rather than a
//     generational one, which is exactly how contemporaries experienced
//     it.
//  3. It thinned the next year's baptisms — conceptions fall in a hunger
//     year, and the trough shows up nine months later.
//
// The ordinary variance is hashed off (world, region, year), so weather
// is a fact about a WORLD rather than a constant of the model: reroll the
// world seed and the 1350s are kind in one and cruel in another, while
// the Great Famine stays where history put it.
// =====================================================================
import { type Dearth, dearthAt } from "./data/harvest.js";
import { addrHash, makeRng } from "./hash.js";

export type { Dearth } from "./data/harvest.js";
export { DEARTHS, dearthAt } from "./data/harvest.js";

/** Yield thresholds. 1.0 is an ordinary year. */
export const GOOD_HARVEST = 1.06;
export const POOR_HARVEST = 0.88;
export const DEARTH = 0.74;
export const FAMINE = 0.6;

/** How a harvest reads, once you stop looking at the number. */
export type HarvestGrade = "good" | "ordinary" | "poor" | "dearth" | "famine";

export function gradeOf(harvest: number): HarvestGrade {
  if (harvest < FAMINE) return "famine";
  if (harvest < DEARTH) return "dearth";
  if (harvest < POOR_HARVEST) return "poor";
  if (harvest >= GOOD_HARVEST) return "good";
  return "ordinary";
}

/** The yield of one region's harvest in one year of one world.
 *
 * A documented failure (data/harvest.ts) wins outright — those are
 * history, not weather. Everything else is drawn from a distribution
 * whose shape is the one the grain-price series imply: most years
 * unremarkable, roughly one in five poor, a severe failure about once a
 * decade, and good years common enough to be worth waiting for.
 *
 * Deliberately regional rather than per-village. A harvest failure was a
 * regional event — that is why it moved prices across a whole kingdom and
 * why the chroniclers name it — and making it per-village would dissolve
 * exactly the shared experience that makes it worth modelling. */
export function harvestAt(worldSeed: number, regionKey: string, year: number): number {
  const known = dearthAt(regionKey, year);
  if (known) return known.yield;
  const rng = makeRng(addrHash(worldSeed, [regionKey, "harvest", year]));
  const roll = rng();
  // Calibrated against what the whole series does to a village, not against
  // the shape in isolation: at a first pass this table put roughly a fifth
  // of all years into dearth or worse, and with the DEARTHS table on top of
  // it that carried famine to 8% of all deaths and drained an English
  // village from 55 souls to 25 with no turn at the end — the "slow death"
  // capacity.ts warns about. An unrecorded failure is rare precisely
  // because the recorded ones are most of what there was.
  if (roll < 0.01) return 0.5 + rng() * 0.1; // a failure nobody wrote down
  if (roll < 0.055) return 0.62 + rng() * 0.12;
  if (roll < 0.25) return 0.75 + rng() * 0.13;
  if (roll < 0.82) return 0.89 + rng() * 0.17;
  return 1.06 + rng() * 0.19;
}

/** The named failure, where the year was one — for the chronicle, which
 * should say "the Great Famine" rather than "a bad year" when it was. */
export function namedDearthAt(regionKey: string, year: number): Dearth | null {
  return dearthAt(regionKey, year);
}

/** § the epidemic year: how much of a subsistence crisis's excess mortality
 * was the fever rather than the hunger.
 *
 * The single best-established correction to a naive famine model, and the
 * one this engine was missing. People in a dearth overwhelmingly did not
 * die of starvation: they died of typhus, of dysentery, of the relapsing
 * fevers that follow when the underfed take to the roads, crowd into
 * towns, and beg at doors. Contemporaries could see the difference — the
 * hunger killed the poorest in their own houses, the fever came afterwards
 * and got into the manor house too.
 *
 * So this is a SPLIT of the crisis budget, not an addition to it. The
 * total excess a failed harvest produces stays where capacity.ts and the
 * population curve were calibrated to have it; a third of it now falls
 * under a different cause, with a flatter age profile and a much shallower
 * wealth gradient, because that is who the fever actually took. */
export const CRISIS_FEVER_SHARE = 0.34;

/** Excess yearly mortality from hunger itself.
 *
 * Shaped like the hazard the old fixed famine window already added, but
 * graded by how bad the year actually was and by whether the household
 * had anything to fall back on. The old and the very young die first,
 * which is what every account of a subsistence crisis says, and the well-
 * off largely do not die of hunger at all — they pay the price and eat.
 *
 * A second bad year running is far worse than the first, because the seed
 * corn is already gone; the caller passes the previous year's yield so
 * that run can be represented rather than each year standing alone.
 *
 * § the epidemic year: this is now the starvation share of the crisis
 * only. `crisisFeverHazard` carries the rest. */
export function dearthHazard(harvest: number, prevHarvest: number, age: number, wealth: number): number {
  return starvationHazard(harvest, prevHarvest, age, wealth) * (1 - CRISIS_FEVER_SHARE);
}

function starvationHazard(harvest: number, prevHarvest: number, age: number, wealth: number): number {
  if (harvest >= POOR_HARVEST) return 0;
  // 0 at the poor-harvest threshold, 1 at total failure.
  const depth = Math.min(1, (POOR_HARVEST - harvest) / (POOR_HARVEST - 0.45));
  const vulnerable = age < 5 || age > 55;
  // The well-off buy grain and largely do not starve — but "largely" is
  // the operative word, and a first pass exempted them outright. That is
  // both wrong (a subsistence crisis reached every household through
  // disease, through servants, through infants) and measurably
  // destabilising: killing only the poor raised the gentry's share of the
  // living past the ceiling the estate model holds it to, because the
  // denominator kept shrinking underneath them.
  if (wealth >= 4) return depth * (vulnerable ? 0.02 : 0.005);
  // Calibrated so that famine ends up a few per cent of all deaths across
  // the register era rather than the 8% a first pass produced: hunger is a
  // real and recurring killer here, but it never was the commonest one, and
  // the fixed window this replaced only ever cost about 3%.
  let h = depth * (vulnerable ? 0.055 : 0.014);
  if (wealth <= 1) h *= 1.3;
  else if (wealth === 3) h *= 0.55;
  // The second failure in a row, with the seed corn eaten.
  if (prevHarvest < DEARTH) h *= 1.5;
  return h;
}

/** § the epidemic year: the fever behind the hunger — the other side of the
 * crisis split, and the reason a dearth's burial register does not read
 * like a list of the starved.
 *
 * Three things distinguish it from `dearthHazard`, and all three are what
 * the evidence says:
 *
 *  - It LAGS. The classic crisis-mortality curve peaks after the worst of
 *    the dearth, not during it, so last year's failure counts nearly as
 *    heavily as this year's — and the fever goes on killing into a year
 *    whose own harvest came in fine.
 *  - It is FLATTER in age. Starvation is a disease of the very young and
 *    the very old; typhus took working adults in numbers hunger alone
 *    never did.
 *  - It reaches the WELL-OFF. Not equally — better houses, fewer beggars
 *    at the door — but a fever crossing a parish does not stop at the
 *    gentry's gate the way an empty barn does.
 *
 * The `harvest`/`prevHarvest` pair is the same one dearthHazard takes, so
 * a caller already computing one gets the other for nothing. */
export function crisisFeverHazard(harvest: number, prevHarvest: number, age: number, wealth: number): number {
  // The lag reaches back only across a genuine DEARTH, not across any
  // year that merely came in under an ordinary one. That distinction is
  // load-bearing rather than cosmetic: roughly a quarter of all years are
  // poor, so a lag keyed to POOR_HARVEST fired in something near half of
  // them and turned a crisis mechanism into a standing tax on adult life
  // — which is net-new mortality the crisis-budget split does not pay
  // for, and it showed up as a measurably thinner fifteenth century and a
  // marriage market short of men.
  if (harvest >= POOR_HARVEST && prevHarvest >= DEARTH) return 0;
  const depthOf = (y: number): number => Math.max(0, Math.min(1, (POOR_HARVEST - y) / (POOR_HARVEST - 0.45)));
  // The lag, made explicit: whichever of the two years weighs heavier,
  // with last year's failure discounted only slightly.
  const depth = Math.max(depthOf(harvest), prevHarvest < DEARTH ? depthOf(prevHarvest) * 0.8 : 0);
  const vulnerable = age < 5 || age > 55;
  // Flatter than starvation's near 4:1, but not flat. A death-neutral
  // reallocation is not a POPULATION-neutral one — moving deaths off the
  // old and onto adults of childbearing age costs the village every child
  // those adults would have had, which measured out as a fifteenth century
  // several per cent thinner than the baseline's. Real, in the right
  // direction, and larger than the evidence will carry at full flatness.
  let h = depth * (vulnerable ? 0.03 : 0.013);
  if (wealth <= 1) h *= 1.15;
  else if (wealth === 3) h *= 0.85;
  else if (wealth >= 4) h *= 0.6;
  return h * CRISIS_FEVER_SHARE;
}

/** Years a couple puts the wedding off because of the year they are in.
 *
 * The strongest and best-evidenced of the harvest's effects: a dearth
 * year empties the marriage register and the next good harvest fills it
 * again. Bounded at two years — beyond that the ordinary preventive check
 * (capacity.ts) is the thing doing the work, and stacking the two would
 * double-count the same restraint. */
export function marriageDeferral(harvest: number): number {
  if (harvest < FAMINE) return 2;
  if (harvest < DEARTH) return 1;
  return 0;
}

/** Multiplier on the chance a couple conceives in a given year. Hunger
 * suppresses conception — through amenorrhoea, through illness, and
 * through spouses who are simply not in the same place — and the deficit
 * shows in the baptisms of the year after. */
export function fertilityMult(harvest: number): number {
  if (harvest < FAMINE) return 0.55;
  if (harvest < DEARTH) return 0.72;
  if (harvest < POOR_HARVEST) return 0.9;
  if (harvest >= GOOD_HARVEST) return 1.06;
  return 1;
}

/** A whole region's yield series, for the UI to draw. */
export function harvestSeries(worldSeed: number, regionKey: string, from: number, to: number): number[] {
  const out: number[] = [];
  for (let y = from; y <= to; y++) out.push(harvestAt(worldSeed, regionKey, y));
  return out;
}
