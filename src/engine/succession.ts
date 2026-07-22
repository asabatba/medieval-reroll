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

/** § legitimation: whether `q` counts as heir-eligible in `env`'s region —
 * either never illegitimate, or illegitimate but legitimated by her natural
 * parents' later marriage, EXCEPT in England, where the Statute of Merton
 * (1236) had common law refuse to recognize legitimation per subsequens
 * matrimonium for inheritance (village.ts's heirEligible is the Tier-1
 * mirror of this same rule). */
function heirEligible(q: Person, env: Envelope): boolean {
  return !q.illegitimate || !!(q.legitimated && env.regionKey !== "england");
}

/** All children of a person across every union, in birth order — plus any
 * § illegitimate child NOT already covered by a union (village.ts's
 * rollIllegitimateBirths), found by a direct father/mother scan since an
 * unlegitimated natural child's parents were never actually married and so
 * belongs to no Couple at all. A LEGITIMATED child (her parents did marry)
 * is already spliced into that marriage's own Couple.children by village.ts,
 * so she's excluded from this second scan to avoid listing her twice.
 * Genealogically a real child either way (siblings, descendantsOf); heirOf
 * below is what actually excludes an unlegitimated one from inheritance. */
export function childrenOf(env: Envelope, id: number): Person[] {
  const p = env.persons[id];
  if (!p) return [];
  const out: Person[] = [];
  if (p.unions) for (const ci of p.unions) for (const cid of env.couples[ci].children) out.push(env.persons[cid]);
  for (const q of env.persons) if (q.illegitimate && !q.legitimated && (q.father === id || q.mother === id)) out.push(q);
  out.sort((a, b) => a.birth - b.birth || a.id - b.id);
  return out;
}

/** The heir to `deceasedId`'s holding at the moment of their death, or null
 * (no surviving issue — the holding passes to the spouse or escheats). An
 * unlegitimated § illegitimate child is never the heir; a legitimated one is
 * treated exactly like any other child, except in England (heirEligible). */
export function heirOf(env: Envelope, deceasedId: number): Person | null {
  const p = env.persons[deceasedId];
  if (!p) return null;
  const kids = childrenOf(env, deceasedId).filter((c) => c.death.year > p.death.year && !c.emigrated && !c.inOrders && heirEligible(c, env));
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
  if (!heirEligible(p, env)) return false; // § illegitimacy/legitimation
  if (p.father < 0) return true; // no father on record: no inheritance question
  for (const q of env.persons) {
    if (q.id === p.id || q.father !== p.father || q.sex !== "M" || !heirEligible(q, env)) continue;
    if (q.birth < p.birth || (q.birth === p.birth && q.id < p.id)) return false;
  }
  return true;
}
