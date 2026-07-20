// =====================================================================
// Lineage traversal (§ family tree): multi-generation ancestors and
// descendants, built on the same cross-village reads biography.ts already
// relies on for a single generation — an immigrant's real origin pointer
// going UP, and the residence-record chain (identity.ts) going DOWN. Both
// directions only ever read ALREADY-RESOLVED envelope facts (no new solve
// that depends on unresolved state), so unlike resolveVillage itself this
// is safe to call regardless of rank: it is pure traversal of a genealogy
// that already exists in full.
// =====================================================================
import { residenceRef } from "./identity.js";
import { childrenOf } from "./succession.js";
import type { Death, Envelope, Person, PersonAddress, Sex } from "./types.js";
import { resolveVillage } from "./village.js";

export interface ParentRecord {
  person: Person;
  env: Envelope;
}

/** A person's own parents, resolved across villages when they're a real
 * immigrant whose parents are on record in her origin village — read,
 * never invented. Shared by biography.ts (one generation) and ancestorsOf
 * (many). */
export function parentsOf(env: Envelope, id: number): { father: ParentRecord | null; mother: ParentRecord | null } {
  const p = env.persons[id];
  if (!p) return { father: null, mother: null };
  if (p.father >= 0) {
    return {
      father: { person: env.persons[p.father], env },
      mother: p.mother >= 0 ? { person: env.persons[p.mother], env } : null,
    };
  }
  if (p.incomer && p.origin && p.originId != null) {
    const originEnv = resolveVillage(env.worldSeed, p.origin.regionKey, p.origin.villageIdx); // lower rank: safe
    const native = originEnv.persons[p.originId];
    if (native) {
      return {
        father: native.father >= 0 ? { person: originEnv.persons[native.father], env: originEnv } : null,
        mother: native.mother >= 0 ? { person: originEnv.persons[native.mother], env: originEnv } : null,
      };
    }
  }
  return { father: null, mother: null };
}

interface LineageBase {
  id: number;
  name: string;
  surname: string;
  sex: Sex;
  birth: number;
  death: Death;
  addr: PersonAddress;
  generation: number;
}

function addrOf(env: Envelope, person: Person): PersonAddress {
  return { regionKey: env.regionKey, villageIdx: env.villageIdx, personId: person.id };
}
function nodeOf(env: Envelope, person: Person, generation: number): LineageBase {
  return {
    id: person.id,
    name: person.name,
    surname: person.surname,
    sex: person.sex,
    birth: person.birth,
    death: person.death,
    addr: addrOf(env, person),
    generation,
  };
}

export interface AncestorNode extends LineageBase {
  /** Path from the subject, e.g. ["father", "mother"] = father's mother (paternal grandmother). */
  line: ("father" | "mother")[];
}

/** Every ancestor up to `depth` generations back (1 = parents, 2 =
 * grandparents, ...), each parent line followed independently so an
 * immigrant ancestor's OWN parents are in turn read from her real origin
 * village. Bounded: at most 2^depth nodes. */
export function ancestorsOf(env: Envelope, id: number, depth: number): AncestorNode[] {
  const out: AncestorNode[] = [];
  function walk(curEnv: Envelope, curId: number, line: ("father" | "mother")[]): void {
    if (line.length >= depth) return;
    const { father, mother } = parentsOf(curEnv, curId);
    if (father) {
      const nextLine = [...line, "father" as const];
      out.push({ ...nodeOf(father.env, father.person, nextLine.length), line: nextLine });
      walk(father.env, father.person.id, nextLine);
    }
    if (mother) {
      const nextLine = [...line, "mother" as const];
      out.push({ ...nodeOf(mother.env, mother.person, nextLine.length), line: nextLine });
      walk(mother.env, mother.person.id, nextLine);
    }
  }
  walk(env, id, []);
  return out;
}

export type DescendantNode = LineageBase;

/** Every descendant up to `depth` generations down (1 = children, 2 =
 * grandchildren, ...), following a locally-emigrated child into her REAL
 * destination register (identity.ts's residenceRef) so her own children —
 * actually born and recorded there, not in this village — are still found. */
export function descendantsOf(env: Envelope, id: number, depth: number): DescendantNode[] {
  const out: DescendantNode[] = [];
  function walk(curEnv: Envelope, curId: number, generation: number): void {
    if (generation > depth) return;
    const ref = residenceRef(curEnv.worldSeed, curEnv, curId);
    const realEnv =
      ref.regionKey === curEnv.regionKey && ref.villageIdx === curEnv.villageIdx ? curEnv : resolveVillage(curEnv.worldSeed, ref.regionKey, ref.villageIdx);
    for (const kid of childrenOf(realEnv, ref.personId)) {
      out.push(nodeOf(realEnv, kid, generation));
      walk(realEnv, kid.id, generation + 1);
    }
  }
  walk(env, id, 1);
  return out;
}
