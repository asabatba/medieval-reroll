// =====================================================================
// § service placement. Two Tier-1 post-passes that finish what
// villageMobility.ts's rollService starts.
//
// rollService decides WHETHER a child goes into service and when it
// begins. It cannot decide either of the two things that actually make
// service legible, because neither is known yet when a child is created:
//
//  - WHEN IT ENDS. Life-cycle service ended at marriage. That is the whole
//    point of the institution — a servant worked for bed, board and a wage
//    precisely until there was a holding and a spouse to leave for, which
//    is why the same NW-European regions that show heavy service also show
//    the latest marriage ages in Europe. A fixed four-to-eight-year spell
//    from age twelve instead discharges everyone at sixteen to twenty and
//    leaves them idle at home for the decade that matters most.
//
//  - WHOSE HOUSE IT IS IN. A servant lived under a master's roof, counted
//    in his household by every listing that survives. Parking them in a
//    manorial pseudo-household instead made servants invisible in the one
//    place they should dominate — the household structure — and left the
//    village a grid of solitaries: before this, one-person households were
//    the MODAL household in every region sampled, at a quarter to a third
//    of all hearths, against the five to eight per cent the listings show.
//
// Both passes run after the marriage matching (they read its results) and
// draw only from per-person streams of their own — namespaces 910000 and
// 920000, never the shared village rng — so neither perturbs the
// marriage/migration draw sequence by a single call.
// =====================================================================
import { CLASS_INFO } from "./data/classes.js";
import { makeRng, personStream } from "./hash.js";
import type { Couple, Person } from "./types.js";

/** The oldest a life-cycle servant plausibly still served before the
 * arrangement stopped being adolescence and started being a career. Servants
 * who never married did stay on into their thirties, but the ordinary spell
 * ends at marriage, and this is the backstop for the ones it never comes for.
 * Jittered per person so a village's servants aren't all discharged in the
 * same year of their lives. */
const SERVICE_MAX_AGE: readonly [number, number] = [24, 30];

/** The year a person's first marriage begins, or null. */
function firstMarriageYear(p: Person, couples: readonly Couple[]): number | null {
  const first = p.unions?.[0];
  return first == null ? null : couples[first].year;
}

/** § service: close each spell where it really closed — at the servant's own
 * marriage, or at the age the arrangement lapsed, whichever came first, and
 * never past death. A spell left with nothing to close it (never married,
 * long-lived) runs to the jittered ceiling above rather than to the arbitrary
 * four-to-eight years rollService could only guess at. */
export function resolveServiceSpells(persons: Person[], couples: readonly Couple[], vHash: number): void {
  for (const p of persons) {
    if (!p.service) continue;
    const r = makeRng(personStream(vHash, 910000, p.id));
    let end = p.birth + r.int(SERVICE_MAX_AGE[0], SERVICE_MAX_AGE[1]);
    const married = firstMarriageYear(p, couples);
    if (married != null) end = Math.min(end, married);
    end = Math.min(end, p.death.year);
    // A spell that no longer contains a single whole year isn't one: the
    // child married or died almost immediately after being placed out.
    if (end <= p.service.from) {
      p.service = undefined;
      continue;
    }
    p.service = { from: p.service.from, to: end };
  }
}

/** Whether `master` was heading a household of his own across `year` — the
 * minimum a house needed to take a servant in. */
function headingHouseholdAt(master: Person, couples: readonly Couple[], year: number): boolean {
  if (master.death.year <= year || master.emigrated) return false;
  for (const ci of master.unions ?? []) if (couples[ci].year <= year) return true;
  return false;
}

/** § service placement: which house each servant served in. Chosen once, for
 * the whole spell, from the households actually standing when it began.
 *
 * Servants moved UP: a smallholder's or cottar's child went to a substantial
 * tenant, a craftsman, or the manor — nobody sent a child out to a poorer
 * house than their own, and apprenticeship in particular was a step the
 * family paid for. So candidates are filtered to households at or above the
 * servant's own natal grade, and a servant's own parents are excluded, since
 * working at home was the thing service was an alternative TO.
 *
 * Where the village has nobody suitable standing that year — the founding
 * generation, or a parish gutted by plague — `serviceMaster` is simply left
 * unset, and snapshot.ts falls back to the manorial familia, which is where
 * such a child really would have ended up. */
export function assignServiceMasters(persons: Person[], couples: readonly Couple[], vHash: number): void {
  for (const p of persons) {
    if (!p.service) continue;
    const year = p.service.from;
    const ownGrade = CLASS_INFO[p.clsOrigin ?? p.cls].wealth;
    const candidates = persons.filter(
      (m) =>
        m.sex === "M" &&
        m.id !== p.id &&
        m.id !== p.father &&
        m.id !== p.mother &&
        CLASS_INFO[m.cls].wealth >= ownGrade &&
        headingHouseholdAt(m, couples, year) &&
        // he has to still be there for a decent part of the spell, not die
        // the season after taking the child on
        m.death.year > year + 2,
    );
    if (!candidates.length) continue;
    p.serviceMaster = makeRng(personStream(vHash, 920000, p.id)).pick(candidates).id;
  }
}
