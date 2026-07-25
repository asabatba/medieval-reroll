// =====================================================================
// § carrying capacity and the preventive check.
//
// Before this existed, a village's population was a pure by-product: the
// birth spacing, the never-marry share and the emigration rates all rolled
// independently of how full the place already was, so the resulting
// trajectory was an unconstrained exponential. Small, defensible parameter
// differences between regions (a birth interval a year wider, a marriage
// window two years later) compounded across eight generations into villages
// three times the size of each other, and — since the product sat below
// replacement nearly everywhere — into English and Scottish parishes that
// held eight living souls by 1490 while Catalan ones grew.
//
// Real communities were not open-ended. They were bounded by their land:
// a fixed stock of holdings, and no marriage without one. What varied was
// not the land but the AGE OF MARRIAGE and the rate of departure — the
// classic preventive check. When holdings were scarce, couples waited,
// more people never married at all, and the surplus left; when plague
// emptied half the tenements, survivors married early into vacant
// holdings and stopped leaving. That feedback is what actually held a
// medieval village near its own ceiling for two centuries, and it is what
// this module supplies.
//
// Everything here is a pure function of the village ADDRESS (capacity) or
// of a ratio the caller measures inside its own solve (the responses), so
// nothing depends on another village's envelope and nothing can cycle.
// =====================================================================
import { addrHash, makeRng } from "./hash.js";
import { settlementTypeOf } from "./settlement.js";

/** Holdings — tenements with land enough to keep a family — that a village's
 * fields can carry. Broadly the range English manorial surveys show for a
 * nucleated village at the pre-plague peak; a chartered market town
 * (settlement.ts) supported a good deal more, since not every household
 * there had to be fed off its own strips.
 *
 * Holdings, not heads, are deliberately the unit. The binding constraint on
 * a medieval village was tenements, not mouths: a household could absorb
 * another child, but there was no room for another HOUSEHOLD without land
 * for it, which is precisely why the pressure fell on marriage. Counting
 * heads instead also mismeasures the one moment that matters most — a
 * village founded on eleven couples holds eleven of its dozen tenements from
 * the first day, while its head count looks like an empty parish waiting to
 * be filled, and reading that as "empty" hands the founding generations a
 * growth licence they should never have had. */
export function holdingsOf(worldSeed: number, regionKey: string, villageIdx: number): number {
  const rng = makeRng(addrHash(worldSeed, [regionKey, "holdings", villageIdx]));
  return settlementTypeOf(worldSeed, regionKey, villageIdx) === "urban" ? rng.int(22, 32) : rng.int(13, 19);
}

// § the retreat from the margin. The land itself is not a constant across
// the register era. What the thirteenth century had put under the plough —
// assarts on the waste, strips on thin upland soils that only made sense
// with mouths to feed and no better ground left — went out of cultivation
// after 1349 and largely stayed out: holdings were engrossed into larger
// ones, arable went down to pasture, and something like a tenth of English
// villages were deserted outright. So the ceiling falls when the population
// does, and the fifteenth-century village sits below its own fourteenth-
// century peak rather than refilling to it. Without this the check still
// works, but it holds the village at a ceiling the fourteenth century set
// and the fifteenth had no intention of farming.
const CULTIVATION: ReadonlyArray<readonly [number, number]> = [
  [1348, 1.0], // the high-water mark: marginal ground under the plough
  [1380, 0.92], // vacant tenements, but heirs and neighbours still take most of them up
  [1450, 0.82], // the deep retreat — engrossment, and the worst ground abandoned for good
  [9999, 0.86], // a slight late recovery, against continuing conversion to pasture
];

/** Holdings actually worth taking up in a given year — the stock above,
 * less whatever the retreat from the margin has taken out of cultivation. */
export function holdingsAt(worldSeed: number, regionKey: string, villageIdx: number, year: number): number {
  const stock = holdingsOf(worldSeed, regionKey, villageIdx);
  for (const [until, share] of CULTIVATION) if (year <= until) return stock * share;
  return stock;
}

// The three responses below all read the same quantity — occupied holdings
// over holdings available — off the same ladder of steps, so "how full is
// it" has one meaning across the whole check. 1.0 is a village with every
// tenement taken; the Black Death takes a parish to roughly half that, and
// the fifteenth century never entirely fills it again.
//
// Stepped and bounded on purpose. A smooth, unbounded response would make
// the feedback an oscillator — one generation marrying nobody, the next
// marrying everybody — while a bounded ladder damps toward the ceiling
// instead. The ends are wide, though: a village at half capacity has to be
// able to actually recover, which is the whole difference between the
// late-medieval trough the sources describe and a parish that just dwindles.
const PRESSURE_STEPS = [1.25, 1.1, 1.0, 0.9, 0.8, 0.7, 0.55] as const;
type Ladder = readonly [number, number, number, number, number, number, number, number];

function respond(pressure: number, ladder: Ladder): number {
  for (let i = 0; i < PRESSURE_STEPS.length; i++) if (pressure >= PRESSURE_STEPS[i]) return ladder[i];
  return ladder[ladder.length - 1];
}

/** Years added to (or taken off) the age a man marries at. The preventive
 * check's main instrument: late marriage was how a crowded village throttled
 * its own fertility, and the years given back in an emptied one are the
 * single biggest part of any post-plague rebound. */
export function marriageAgeShift(pressure: number): number {
  return respond(pressure, [6, 5, 4, 2, 1, 0, 0, -1]);
}

/** Multiplier on the chance a man never marries at all — the other half of
 * the check: where there was no holding to be had, some men simply never
 * set up a household. */
export function celibacyMult(pressure: number): number {
  return respond(pressure, [3.2, 2.6, 2.0, 1.45, 1.1, 0.95, 0.8, 0.65]);
}

/** Multiplier on the chance an unmatched adult leaves the village. Emigration
 * is the release valve for exactly the pressure this measures: a village with
 * vacant tenements kept its young people, and a full one could not. */
export function emigrationMult(pressure: number): number {
  return respond(pressure, [2.0, 1.7, 1.4, 1.15, 1.0, 0.85, 0.7, 0.6]);
}

/** The hard edge of the check, and the one part of it that is not a nudge:
 * a new household needed a holding to stand on, and where every tenement in
 * the village was taken there was simply nowhere to put one. A man at that
 * point waited for dead men's shoes — for his father's holding, or a
 * neighbour's to fall vacant — and if none fell within reach he never
 * married at all.
 *
 * The probabilistic ladder above shapes the approach to the ceiling; this
 * fixes where the ceiling IS, which matters because the ladder alone cannot.
 * A multiplier on a marriage chance can always be outrun by a village with
 * enough young people in it, and the measured equilibrium sat a third above
 * the land however hard the ladder was pushed. A little over 1 rather than
 * exactly 1 because a real village always had a few cottars and undersettles
 * living on scraps of land no survey counted as a holding. */
export const HOLDINGS_FULL = 0.85;

/** How long a man will wait for a holding to fall vacant before giving up on
 * marrying at all. */
export const WAIT_FOR_HOLDING = [3, 6, 9, 12] as const;

/** Below this, holdings are actually standing empty — and an empty holding
 * was the one thing that reliably drew a man in from outside the parish,
 * which is how half-deserted post-plague villages refilled at all instead of
 * quietly dwindling away. */
export const VACANT_HOLDINGS = 0.7;

/** The share of a village's marriages that may take a partner from outside
 * the parish. Parish reconstitution studies put real village exogamy around
 * a quarter to a third of matches, and the ceiling matters more than it
 * looks: the import paths in village.ts fire for any man who found no local
 * bride, and every incomer they bring in founds a household. Left ungated,
 * that outgrew everything else in the model — and worse, it fed back on
 * itself, because emigration only ever fires for people who found NO match,
 * so a village that could always import a spouse never opened its outflow
 * valve at all. Capping the share puts the two flows back in the same order
 * of magnitude, and hands anyone turned away at the ceiling back to the
 * ordinary wait-or-leave machinery. */
export const EXOGAMY_SHARE = 0.3;

/** How far the ceiling above lifts when holdings are standing empty — the
 * post-plague countryside really did refill from outside. */
export const VACANCY_EXOGAMY_BONUS = 1.6;
