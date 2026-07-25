// =====================================================================
// Temporal resolver (§ year layer): the village AS OF a chosen year.
//
// The envelope is a genealogy — every life the register will ever hold,
// 1235–1495. This module answers the orthogonal question a visitor to the
// village in year X would ask: who is alive, who actually lives here right
// now, who is married to whom, and which household is each person in.
// Pure derivation from envelope facts (plus succession.ts for headship) —
// no new Tier-1 state, so it can never disagree with the biographies.
//
// Residence rules mirror the migration model (village.ts):
//  - an immigrant (residence record) is present from her marriage year;
//    before that she lives in her origin village.
//  - an emigrant is present until she actually leaves. When the destination
//    is resolvable (local, non-long-distance emigration), that's read as
//    the REAL residence record's own arrival year — the same year the
//    destination snapshot starts counting her — so there is no gap or
//    overlap between the two villages' snapshots for the same real person
//    (§ residency continuity). Only when no destination record exists
//    (never pulled, or long-distance — narrated, not tracked) does this
//    fall back to a birth+marriage-age heuristic.
// Household rules:
//  - a married couple (latest union as of the year) is its own household,
//    headed by the husband; a surviving spouse keeps it as widow/widower.
//  - unmarried children live in a living parent's current household —
//    following a remarried parent into the new marriage's household.
//  - full orphans stay together as a sibling group on the natal holding,
//    headed by the eldest brother of age (male-primogeniture succession),
//    else the eldest sibling.
//  - a servant (§ service) is counted under the roof of the master his spell
//    was assigned to at Tier 1 (service.ts), and only in the manorial
//    pseudo-household when that master is gone or was never found; adults in
//    orders are in the church pseudo-household.
//  - § stem family: anyone the rules above would leave keeping house ALONE
//    is taken in by the nearest married kin — a widow by her married son,
//    an unmarried adult by a married sibling, an orphaned minor by a
//    married sibling or an uncle. Only married couple households take
//    anyone in, so this can never cascade.
// =====================================================================
import { findResidenceRecord } from "./identity.js";
import type { Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

export type MaritalStatus = "child" | "single" | "married" | "widowed";

/** Pseudo-household ids for people not living under a family roof. */
export const MANOR_HOUSEHOLD = -1;
export const CHURCH_HOUSEHOLD = -2;

export interface PersonState {
  id: number;
  age: number;
  maritalStatus: MaritalStatus;
  /** Living spouse at the chosen year (latest union), if any. */
  spouseId: number | null;
  householdId: number;
  headOfHousehold: boolean;
  inService: boolean;
  inOrders: boolean;
}

export interface HouseholdState {
  id: number;
  /** -1 for the manor/church pseudo-households. */
  headId: number;
  members: number[];
}

export interface VillageState {
  year: number;
  population: number;
  residents: PersonState[];
  households: HouseholdState[];
  /** Natives who have already married out to another village by this year (and are still alive). */
  emigrated: number[];
}

const ORPHAN_BASE = 200000;
const SOLO_BASE = 100000;

function aliveAt(p: Person, year: number): boolean {
  return p.birth <= year && p.death.year > year;
}

/** The year an emigrant's own register stops carrying her (see biography.ts).
 * § residency continuity: for a locally (non-long-distance) emigrated
 * person whose destination actually pulled them, this is the REAL year
 * their residence record begins there — not an independent guess — so an
 * origin and destination snapshot can never both (or neither) claim them. */
export function emigrationYearOf(p: Person, env: Envelope): number {
  if (p.emigrateTo && !p.longDistance) {
    const canonical = { regionKey: env.regionKey, villageIdx: env.villageIdx, personId: p.id };
    const res = findResidenceRecord(env.worldSeed, canonical, p.emigrateTo);
    if (res) {
      const destEnv = resolveVillage(env.worldSeed, res.regionKey, res.villageIdx);
      const arrival = arrivalYearOf(destEnv.persons[res.personId], destEnv);
      return arrival;
    }
  }
  return p.birth + (p.sex === "M" ? env.region.marriageM[1] : env.region.marriageF[1]);
}

/** The year an immigrant's residence record begins: her marriage here. */
export function arrivalYearOf(p: Person, env: Envelope): number {
  if (!p.incomer || p.founder) return p.birth;
  const first = p.unions?.[0];
  return first != null ? env.couples[first].year : p.birth;
}

export function residentAt(p: Person, env: Envelope, year: number): boolean {
  if (!aliveAt(p, year)) return false;
  if (p.incomer && !p.founder && year < arrivalYearOf(p, env)) return false;
  if (p.emigrated && year >= emigrationYearOf(p, env)) return false;
  return true;
}

/** § population curve: the resident head count for every year in a span, in
 * one pass.
 *
 * Deliberately not `villageStateAt(y).population` per year: that builds the
 * whole household structure for each of two hundred years, and the resident
 * test itself calls into other villages' envelopes to date an emigrant's
 * departure. Here each person's residency is resolved ONCE into the interval
 * they were actually on the register for, and the interval is added to the
 * years it covers — so the curve costs about what a single snapshot does.
 *
 * The interval below has to agree with residentAt exactly, or the curve and
 * the household view would disagree about the same year. */
export function populationSeries(env: Envelope, from: number, to: number): number[] {
  const counts = new Array(Math.max(0, to - from + 1)).fill(0);
  for (const p of env.persons) {
    const start = p.incomer && !p.founder ? Math.max(p.birth, arrivalYearOf(p, env)) : p.birth;
    const end = p.emigrated ? Math.min(p.death.year, emigrationYearOf(p, env)) : p.death.year; // exclusive
    for (let y = Math.max(from, start); y <= Math.min(to, end - 1); y++) counts[y - from]++;
  }
  return counts;
}

export function villageStateAt(env: Envelope, year: number): VillageState {
  const residents = env.persons.filter((p) => residentAt(p, env, year));
  const states = new Map<number, PersonState>();
  const households = new Map<number, HouseholdState>();

  function joinHousehold(hid: number, headId: number, pid: number): void {
    let h = households.get(hid);
    if (!h) {
      h = { id: hid, headId, members: [] };
      households.set(hid, h);
    }
    h.members.push(pid);
  }

  // latest union whose marriage happened by `year`
  function currentUnion(p: Person): number | null {
    if (!p.unions) return null;
    let found: number | null = null;
    for (const ci of p.unions) if (env.couples[ci].year <= year) found = ci;
    return found;
  }

  // Pass 1 — married and widowed residents anchor the couple households.
  const unassigned: Person[] = [];
  for (const p of residents) {
    const ci = currentUnion(p);
    if (ci == null) {
      unassigned.push(p);
      continue;
    }
    const c = env.couples[ci];
    const other = env.persons[p.id === c.husband ? c.wife : c.husband];
    const married = aliveAt(other, year);
    const st: PersonState = {
      id: p.id,
      age: year - p.birth,
      maritalStatus: married ? "married" : "widowed",
      spouseId: married ? other.id : null,
      householdId: ci,
      headOfHousehold: false,
      inService: false,
      inOrders: !!p.inOrders,
    };
    states.set(p.id, st);
    joinHousehold(ci, c.husband, p.id);
  }
  // Couple-household headship: the husband while he lives here, else the widow.
  for (const h of households.values()) {
    const c = env.couples[h.id];
    h.headId = h.members.includes(c.husband) ? c.husband : c.wife;
  }

  // Pass 2 — the unmarried: orders, service, a living parent's roof, or an
  // orphaned sibling group holding the natal tenement.
  const orphanHids = new Set<number>();
  for (const p of unassigned) {
    const age = year - p.birth;
    const st: PersonState = {
      id: p.id,
      age,
      maritalStatus: age < 12 ? "child" : "single",
      spouseId: null,
      householdId: SOLO_BASE + p.id,
      headOfHousehold: false,
      inService: false,
      inOrders: !!p.inOrders,
    };
    states.set(p.id, st);

    if (p.inOrders && age >= 16) {
      st.householdId = CHURCH_HOUSEHOLD;
      joinHousehold(CHURCH_HOUSEHOLD, -1, p.id);
      continue;
    }
    // § service placement: a servant lived under his master's roof and was
    // counted in that household by every listing that survives — not in a
    // pseudo-household of his own. The master is fixed for the whole spell
    // at Tier 1 (service.ts); the manorial familia is the fallback for a
    // spell whose master died, left, or was never found in the first place,
    // which is also where such a child really would have ended up.
    if (p.service && year >= p.service.from && year < p.service.to) {
      st.inService = true;
      const master = p.serviceMaster != null ? states.get(p.serviceMaster) : undefined;
      const masterHh = master && master.householdId >= 0 ? households.get(master.householdId) : undefined;
      if (masterHh) {
        st.householdId = masterHh.id;
        joinHousehold(masterHh.id, masterHh.headId, p.id);
      } else {
        st.householdId = MANOR_HOUSEHOLD;
        joinHousehold(MANOR_HOUSEHOLD, -1, p.id);
      }
      continue;
    }
    const father = p.father >= 0 ? env.persons[p.father] : null;
    const mother = p.mother >= 0 ? env.persons[p.mother] : null;
    const parent = (father && states.has(father.id) ? father : null) ?? (mother && states.has(mother.id) ? mother : null);
    if (parent) {
      // Usually a parent has a union (they had this child) and so was
      // housed by pass 1 — but § illegitimacy means an unmarried mother can
      // reach this same branch already housed by PASS 2 instead (her own
      // orphan/solo household), which is exactly why headship below reads
      // the household's actual membership rather than a separately-tracked
      // list that only this branch's own natalIdx path used to populate.
      const ph = states.get(parent.id)!;
      st.householdId = ph.householdId;
      joinHousehold(ph.householdId, households.get(ph.householdId)?.headId ?? parent.id, p.id);
      continue;
    }
    // § illegitimacy/legitimation: an unlegitimated natural child belongs to
    // no Couple of her parents' — even if they happen to marry EACH OTHER
    // later for unrelated reasons (the ordinary market, not village.ts's own
    // immediate legitimation check), that marriage's `children` are a
    // separate group she isn't spliced into, so the natalIdx lookup below
    // would otherwise wrongly find that couple by pure (father, mother) id
    // match and group her with children who aren't really her father-and-
    // mother-holding siblings. A legitimated child (already spliced into her
    // parents' real marriage) is unaffected by this guard.
    if (p.father >= 0 && !(p.illegitimate && !p.legitimated)) {
      // full orphan: group with siblings on the natal holding
      const natalIdx = (env.persons[p.father].unions ?? []).find((ci) => env.couples[ci].wife === p.mother);
      if (natalIdx != null) {
        const hid = ORPHAN_BASE + natalIdx;
        st.householdId = hid;
        orphanHids.add(hid);
        joinHousehold(hid, -1, p.id);
        continue;
      }
    }
    // founders/fabricated incomers with no kin left: a household of one
    joinHousehold(st.householdId, p.id, p.id);
  }

  // Orphan-group headship: eldest brother of age, else the eldest sibling.
  // Reads the household's ACTUAL membership (not a separately-tracked list
  // built only from the direct-orphan branch above) — § illegitimacy means
  // an unmarried mother can herself be a member of one of these households
  // (her own orphan/solo one) with her own unmarried child then following
  // HER into it via the `parent` branch above, never touching this branch
  // at all, but still a real member whose age/sex the headship pick must see.
  for (const hid of orphanHids) {
    const h = households.get(hid);
    if (!h) continue;
    const sorted = h.members.map((id) => env.persons[id]).sort((a, b) => a.birth - b.birth || a.id - b.id);
    const head = sorted.find((m) => m.sex === "M" && year - m.birth >= 14) ?? sorted[0];
    h.headId = head.id;
  }

  // =====================================================================
  // Pass 3 — § stem family. Everything above houses people by the one
  // relationship it can read off a Couple: you live with your spouse, or
  // with the parent who had you. That leaves everyone whose spouse and
  // parents are both gone standing alone on a holding, and the result was
  // a village in which the ONE-PERSON household was the modal household —
  // a quarter to a third of every hearth in every region sampled, against
  // the five to eight per cent that the actual listings show.
  //
  // Real communities absorbed those people, and the direction they moved
  // in is well attested. A widow whose son had married did not keep house
  // alone next door to him: he had the tenement precisely BECAUSE she had
  // given it up (which is what let him marry at all — the same dead men's
  // shoes capacity.ts's hard edge makes him wait for), and she lived in it
  // with him. An unmarried brother or sister of the head stayed in the
  // house they were born in rather than setting up alone, since there was
  // no holding to set up ON. And an orphan too young to hold anything went
  // to the nearest married kin — the wardship biography.ts already narrates.
  //
  // Only married couple households take anyone in, so a move can never
  // cascade or depend on the order the solitaries are processed in.
  // =====================================================================
  // A house with someone else already under its roof can take another in.
  // Deliberately NOT "both spouses living": a widowed son keeping house with
  // his own children is exactly as able to shelter his mother as a married
  // one, and requiring an intact couple left the commonest case of all — the
  // widow whose only surviving child had himself been widowed — stranded on
  // her own. Every host has two members or more and so is never itself a
  // solitary, which is what keeps a move from cascading or depending on the
  // order the solitaries are walked in.
  const hostable = [...households.values()].filter((h) => h.id >= 0 && h.id < env.couples.length && h.members.length >= 2);

  function sharesParent(a: Person, b: Person): boolean {
    return a.id !== b.id && ((a.father >= 0 && a.father === b.father) || (a.mother >= 0 && a.mother === b.mother));
  }

  /** How near the couple heading `h` stands to `p` — the kin degree first,
   * then a preference for taking shelter on the male side (the house is the
   * son's or the brother's, and the holding descended through him), then
   * seniority. Null where the tie is too distant to have moved anyone. */
  function kinScore(p: Person, h: HouseholdState, minor: boolean): number | null {
    const c = env.couples[h.id];
    // Only the spouses actually under this roof this year can be the tie —
    // a dead or departed one names a household his kin no longer live in.
    const pair = [env.persons[c.husband], env.persons[c.wife]].filter((q) => h.members.includes(q.id));
    const degreeOf = (q: Person): number | null => {
      if (!minor && (q.father === p.id || q.mother === p.id)) return 0; // a married child's house
      if (sharesParent(q, p)) return 1; // a married sibling's house
      // An orphaned minor with no married sibling goes to an uncle or aunt —
      // the wardship biography.ts already narrates. An adult who has outlived
      // spouse, parents and siblings' households alike keeps their own hearth
      // rather than being billeted on a cousin.
      if (minor && ((p.father >= 0 && sharesParent(q, env.persons[p.father])) || (p.mother >= 0 && sharesParent(q, env.persons[p.mother])))) return 2;
      return null;
    };
    let best: number | null = null;
    for (const q of pair) {
      const d = degreeOf(q);
      if (d == null) continue;
      const score = d * 10000 + (q.sex === "M" ? 0 : 1000) + q.birth - 1200;
      if (best == null || score < best) best = score;
    }
    return best;
  }

  const solitary = [...households.values()].filter((h) => h.id >= 0 && h.members.length === 1).sort((a, b) => a.id - b.id);
  for (const h of solitary) {
    const p = env.persons[h.members[0]];
    const st = states.get(p.id)!;
    const minor = st.age < 16;
    let host: HouseholdState | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cand of hostable) {
      const score = kinScore(p, cand, minor);
      if (score == null || score >= bestScore) continue;
      bestScore = score;
      host = cand;
    }
    if (!host) continue;
    households.delete(h.id);
    st.householdId = host.id;
    host.members.push(p.id);
  }

  // headOfHousehold flags
  for (const h of households.values()) {
    const st = states.get(h.headId);
    if (st && st.householdId === h.id) st.headOfHousehold = true;
  }

  const emigrated = env.persons.filter((p) => p.emigrated && year >= emigrationYearOf(p, env) && aliveAt(p, year)).map((p) => p.id);

  return {
    year,
    population: residents.length,
    residents: residents.map((p) => states.get(p.id)!),
    households: [...households.values()].sort((a, b) => a.id - b.id),
    emigrated,
  };
}
