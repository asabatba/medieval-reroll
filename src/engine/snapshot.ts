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
//  - adolescents rolled into service (§ service) are counted in the manor
//    pseudo-household; adults in orders in the church pseudo-household.
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
    if (p.service && year >= p.service.from && year < p.service.to) {
      st.inService = true;
      st.householdId = MANOR_HOUSEHOLD;
      joinHousehold(MANOR_HOUSEHOLD, -1, p.id);
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
