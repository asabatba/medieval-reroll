// =====================================================================
// § the tenement — holdings as things, not as a number.
//
// capacity.ts made the land the binding constraint on this whole model,
// and then represented it as an integer. `holdingsOf` returned 17 and the
// solve counted couples against it. That is enough to regulate a
// population and not nearly enough to be a village: the unit the medieval
// record actually turns on is the named tenement with a size — a virgate,
// a half-virgate, a cottage — which outlives every family that ever holds
// it, and whose successive holders are precisely what a manorial court
// roll series IS.
//
// Giving them identity buys three things the count could not:
//
//  - Succession becomes a fact about a PLACE. An heir does not merely
//    "marry"; he takes his father's holding, the same ground, and the
//    court roll records the transfer. Where there is no heir the holding
//    falls vacant and someone else takes it up, and the surname on it
//    changes.
//  - Wealth stops being purely a class label. A half-virgater and a
//    cottar were both freePeasant; what separated them was fifteen acres.
//  - The village gets the view it was missing: one piece of land, and
//    every family that lived on it across two and a half centuries.
//
// Sizes follow the shape the English manorial surveys show — the Hundred
// Rolls and the manorial extents put roughly a fifth of tenants on a full
// virgate, a third on a half, and the rest on cottages and tofts, which is
// why "peasant" covers a household with thirty acres and one with two.
//
// Pure function of the village address, like everything else in the
// capacity layer: no envelope, no cycle, callable from anywhere.
// =====================================================================
import { holdingsOf } from "./capacity.js";
import { addrHash, makeRng } from "./hash.js";
import { settlementTypeOf } from "./settlement.js";
import type { Couple, Envelope, Person } from "./types.js";

export type TenementSize = "virgate" | "halfVirgate" | "cottage" | "toft";

export interface Tenement {
  /** Index into tenementsOf() — the address segment of this holding's page. */
  idx: number;
  size: TenementSize;
  /** Arable, in the region's own land unit (Region.landUnit). */
  acres: number;
}

/** Typical arable by size class, before the per-holding variation below. */
const ACRES: Record<TenementSize, [number, number]> = {
  virgate: [24, 34],
  halfVirgate: [12, 17],
  cottage: [4, 9],
  toft: [1, 3],
};

/** The stock of tenements a village's fields carry, each with a size.
 *
 * A market town is weighted toward the small end: a borough burgage was a
 * house-plot and a trade, not a ploughland, and its holders fed themselves
 * out of the market rather than off their own strips. */
export function tenementsOf(worldSeed: number, regionKey: string, villageIdx: number): Tenement[] {
  const n = holdingsOf(worldSeed, regionKey, villageIdx);
  const urban = settlementTypeOf(worldSeed, regionKey, villageIdx) === "urban";
  const rng = makeRng(addrHash(worldSeed, [regionKey, "tenements", villageIdx]));
  const mix: ReadonlyArray<[TenementSize, number]> = urban
    ? [
        ["virgate", 1],
        ["halfVirgate", 2],
        ["cottage", 4],
        ["toft", 4],
      ]
    : [
        ["virgate", 2],
        ["halfVirgate", 3],
        ["cottage", 3.2],
        ["toft", 1.6],
      ];
  const out: Tenement[] = [];
  for (let idx = 0; idx < n; idx++) {
    const size = rng.weighted(mix);
    out.push({ idx, size, acres: rng.int(ACRES[size][0], ACRES[size][1]) });
  }
  // Largest first, so a holding's index is also its standing in the village
  // — which is what makes "he took up the second tenement" mean something.
  out.sort((a, b) => b.acres - a.acres);
  return out.map((t, i) => ({ ...t, idx: i }));
}

/** How much land a size class carries, for ranking holdings against the
 * households that want them. */
export function sizeRank(size: TenementSize): number {
  return size === "virgate" ? 3 : size === "halfVirgate" ? 2 : size === "cottage" ? 1 : 0;
}

// ---- reading the assignment back out ----

/** One family's tenure of one holding: the couple that held it, and the
 * years they did. `to` is the year it fell vacant again — the death of the
 * last of the pair, or their departure. */
export interface Tenure {
  coupleIdx: number;
  couple: Couple;
  from: number;
  to: number;
}

/** Whether this person is holding on behalf of `coupleIdx` in `year` —
 * deliberately the same test village.ts's pressureAt uses to decide whether
 * a tenement counts as occupied, so the page and the model that regulates
 * the population can never disagree about who was on the land. A widow
 * holds; a remarried widow has moved to the later union's holding. */
function holdsIn(env: Envelope, p: Person, coupleIdx: number, year: number): boolean {
  if (p.death.year <= year || p.emigrated) return false;
  let current: number | null = null;
  for (const ci of p.unions ?? []) if (env.couples[ci].year <= year) current = ci;
  return current === coupleIdx;
}

/** Everyone who ever held this tenement, in order. The court-roll view of a
 * piece of land: the whole point of giving holdings identity. */
export function tenementHistory(env: Envelope, idx: number): Tenure[] {
  const out: Tenure[] = [];
  env.couples.forEach((c, coupleIdx) => {
    if (c.tenement !== idx) return;
    const H = env.persons[c.husband];
    const W = env.persons[c.wife];
    const limit = Math.max(H.death.year, W.death.year);
    let to = c.year;
    for (let y = c.year; y <= limit; y++) if (holdsIn(env, H, coupleIdx, y) || holdsIn(env, W, coupleIdx, y)) to = y;
    out.push({ coupleIdx, couple: c, from: c.year, to });
  });
  out.sort((a, b) => a.from - b.from || a.coupleIdx - b.coupleIdx);
  return out;
}

/** The tenement a couple actually held, if any. A household with none was
 * an undersettle — living on another man's land, in the village but not of
 * its tenantry, which the surveys record and the count never could. */
export function tenementOfCouple(worldSeed: number, env: Envelope, c: Couple): Tenement | null {
  if (c.tenement == null) return null;
  return tenementsOf(worldSeed, env.regionKey, env.villageIdx)[c.tenement] ?? null;
}

/** The name a holding was known by — the surname of the family found on it
 * first. Real manorial practice: a tenement kept the name of an early
 * holder for generations after the family itself was gone, which is why
 * court rolls are full of holdings named for people who are not in them. */
export function tenementName(env: Envelope, idx: number): string | null {
  const history = tenementHistory(env, idx);
  if (!history.length) return null;
  return env.persons[history[0].couple.husband].surname;
}
