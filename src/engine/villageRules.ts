// =====================================================================
// Pure heirship and marriage-impediment rules used by the Tier-1 solve
// (village.ts). No RNG anywhere in this file — every function is a plain
// function of already-resolved persons/couples — so these carry no
// determinism risk regardless of which file they live in; only the ORDER
// their callers invoke the shared-rng solve's own rolls in matters, and
// that order is unchanged by this split.
// =====================================================================
import type { Couple, Person, Region } from "./types.js";

// § illegitimacy / § legitimation: a natural son is never in the running for
// the tenement UNLESS his parents later actually married each other AND
// the region isn't England — the Statute of Merton (1236) had English
// common law refuse to recognize legitimation per subsequens matrimonium
// for inheritance, unlike canon law and most Continental custom. Read by
// both the subject check and the competing-brother scan, so a legitimated
// son (elsewhere) both can be, and can be blocked by, an elder brother
// exactly like any other son born in wedlock.
export function heirEligible(q: Person, regionKey: string): boolean {
  return !q.illegitimate || !!(q.legitimated && regionKey !== "england");
}

// § male out-migration: only the eldest surviving son inherits (male
// primogeniture, mirrored by succession.ts's heirOf/isFirstBornSon for
// decode-time use). Evaluated against the local, still-growing `persons`
// array — safe because persons are always created in non-decreasing birth
// order (a person's elder siblings, if any, already exist by the time they
// themselves are created or matched).
//
// This can still disagree with heirOf's actual answer at the father's
// death: an elder brother who emigrates or takes holy orders isn't
// knowable here, since both are decided at HIS OWN later marriage-matching
// round, long after this presumed-heir reckoning already had to happen for
// every son as each one is born. Predecease is the one cause of that same
// mismatch that IS fully knowable this early — every child of one marriage
// is created synchronously in birth order with their death year rolled
// immediately (mortality.ts), and the father's own death year was fixed
// long before he had children — so an elder "brother" who's already known
// to have died before the father never actually stood between a younger
// son and the holding, and is excluded here rather than wrongly blocking
// him from being treated as the presumed heir.
//
// he neither counts as a competing elder brother against a legitimate son,
// nor (checked first) can he himself ever be presumed the heir: false, not
// the "no father on record" true, since here the non-heir penalty mechanics
// (out-migration, downward mobility) SHOULD apply, exactly as for any other
// non-heir son.
export function eldestSonOf(persons: readonly Person[], p: Person, regionKey: string): boolean {
  if (p.sex !== "M") return true;
  if (!heirEligible(p, regionKey)) return false;
  if (p.father < 0) return true;
  const father = persons[p.father];
  for (const q of persons) {
    if (q.id === p.id || q.father !== p.father || q.sex !== "M" || !heirEligible(q, regionKey)) continue;
    if (q.death.year <= father.death.year) continue; // predeceased the father: never actually in the running
    if (q.birth < p.birth || (q.birth === p.birth && q.id < p.id)) return false;
  }
  return true;
}

// § regional inheritance customs: under partible custom (France, Tuscany —
// see regions.ts) land was divided among the sons instead of passing whole
// to one, so every son had a real stake worth staying for. The various
// "non-heir" mechanical penalties (heavier service, out-migration,
// downward mobility) read THIS, not eldestSonOf directly, so they simply
// never apply in a partible region rather than needing a separate flag at
// every call site.
export function isHeir(persons: readonly Person[], region: Region, regionKey: string, p: Person): boolean {
  return region.inheritance === "partible" || eldestSonOf(persons, p, regionKey);
}

// § consanguinity: do H and W share a grandparent? Not a bar to marriage
// (first-cousin matches were real, especially among gentry consolidating
// property) — just flagged so Tier 2 can narrate the dispensation a match
// this close actually required after Lateran IV (1215).
export function grandparentsOf(persons: readonly Person[], p: Person): Set<number> {
  const gs = new Set<number>();
  const add = (parentId: number) => {
    if (parentId < 0) return;
    const parent = persons[parentId];
    if (parent.father >= 0) gs.add(parent.father);
    if (parent.mother >= 0) gs.add(parent.mother);
  };
  add(p.father);
  add(p.mother);
  return gs;
}

export function isConsanguineous(persons: readonly Person[], H: Person, W: Person): boolean {
  if (H.father < 0 && H.mother < 0) return false;
  if (W.father < 0 && W.mother < 0) return false;
  const gH = grandparentsOf(persons, H);
  for (const g of grandparentsOf(persons, W)) if (gH.has(g)) return true;
  return false;
}

// § affinity: the spouse of p's MOST RECENT union, dead or alive — used to
// detect a remarriage candidate who is a sibling of that spouse (marrying
// a dead wife's sister / a dead husband's brother). A real canon-law
// impediment distinct from consanguinity (no blood tie at all) but
// requiring the same kind of dispensation — flagged, not blocked, same
// as isConsanguineous above.
export function lastSpouseOf(persons: readonly Person[], couples: readonly Couple[], p: Person): Person | null {
  if (!p.unions?.length) return null;
  const c = couples[p.unions[p.unions.length - 1]];
  return persons[p.id === c.husband ? c.wife : c.husband];
}

export function isAffinal(persons: readonly Person[], couples: readonly Couple[], a: Person, b: Person): boolean {
  const lastA = lastSpouseOf(persons, couples, a);
  return !!lastA && ((lastA.father !== -1 && lastA.father === b.father) || (lastA.mother !== -1 && lastA.mother === b.mother));
}
