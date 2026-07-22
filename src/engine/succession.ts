// =====================================================================
// Inheritance / household succession (§ family transitions).
//
// Derived purely from envelope facts — no new Tier-1 state. The default
// customary rule across the modelled regions is male primogeniture with
// the widow holding in dower until death or remarriage: at a tenant's
// death the holding passes to the eldest son then alive; failing sons, to
// the eldest daughter; failing children, it stays with the surviving
// spouse. Both the biography (Tier 2) and the temporal resolver
// (snapshot.ts) read THIS function, so narrative and household state agree.
// =====================================================================
import type { Envelope, Person } from "./types.js";

/** All children of a person across every union, in birth order — plus any
 * § illegitimate child (village.ts's rollIllegitimateBirths), found by a
 * direct father/mother scan since a natural child's parents were never
 * actually married and so belong to no Couple at all. Genealogically a real
 * child either way (siblings, descendantsOf); heirOf below is what actually
 * excludes her from inheritance. */
export function childrenOf(env: Envelope, id: number): Person[] {
  const p = env.persons[id];
  if (!p) return [];
  const out: Person[] = [];
  if (p.unions) for (const ci of p.unions) for (const cid of env.couples[ci].children) out.push(env.persons[cid]);
  for (const q of env.persons) if (q.illegitimate && (q.father === id || q.mother === id)) out.push(q);
  out.sort((a, b) => a.birth - b.birth || a.id - b.id);
  return out;
}

/** The heir to `deceasedId`'s holding at the moment of their death, or null
 * (no surviving issue — the holding passes to the spouse or escheats). A
 * § illegitimate child is never the heir absent a formal legitimation this
 * model doesn't represent. */
export function heirOf(env: Envelope, deceasedId: number): Person | null {
  const p = env.persons[deceasedId];
  if (!p) return null;
  const kids = childrenOf(env, deceasedId).filter((c) => c.death.year > p.death.year && !c.emigrated && !c.inOrders && !c.illegitimate);
  const son = kids.find((c) => c.sex === "M");
  if (son) return son;
  return kids[0] ?? null;
}

/** True if `personId` inherited their father's holding at the father's death. */
export function inheritedFromFather(env: Envelope, personId: number): boolean {
  const p = env.persons[personId];
  if (!p || p.father < 0) return false;
  const father = env.persons[p.father];
  if (!father || father.death.year >= p.death.year) return false;
  return heirOf(env, father.id)?.id === personId;
}

/** True if `personId` is the eldest-born son among ALL of their father's sons
 * (across every union, i.e. birth order — the § male out-migration heir
 * predicate village.ts uses to decide who is far more likely to leave). This
 * is birth order, not `heirOf`'s "who is alive when the tenement actually
 * changes hands" — an eldest son who himself later dies young or emigrates
 * is still the one the family expected to inherit, which is what a
 * biography's departure narrative wants to explain. */
export function isFirstBornSon(env: Envelope, personId: number): boolean {
  const p = env.persons[personId];
  if (p?.sex !== "M") return true;
  if (p.illegitimate) return false; // § illegitimacy: never the presumed heir
  if (p.father < 0) return true; // no father on record: no inheritance question
  for (const q of env.persons) {
    if (q.id === p.id || q.father !== p.father || q.sex !== "M" || q.illegitimate) continue;
    if (q.birth < p.birth || (q.birth === p.birth && q.id < p.id)) return false;
  }
  return true;
}
