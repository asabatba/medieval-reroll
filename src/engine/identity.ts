// =====================================================================
// Canonical cross-village identity (§ canonical identity).
//
// A person who migrates has TWO records: the natal one in her origin
// village's envelope (the canonical identity — where her id was minted and
// her death was rolled) and, if a destination actually pulled her, a
// residence record there carrying `origin`+`originId` back-pointers. These
// helpers resolve either record to the other, so callers can follow one
// consistent person across registers instead of treating the residence
// record as a separate life.
//
// Direction of resolution matters for boundedness:
//  - residence → canonical is a plain pointer read (origin/originId).
//  - canonical → residence must SEARCH the destination envelope; that is
//    only done for local (non-longDistance) emigration, where the
//    destination is a cluster-mate and resolving it is bounded by rank.ts.
// =====================================================================
import type { Address, Envelope, PersonAddress } from "./types.js";
import { resolveVillage } from "./village.js";

/** The one canonical address of the person behind a record: for a real
 * immigrant's residence record, her natal record; otherwise the record itself. */
export function canonicalRef(env: Envelope, id: number): PersonAddress {
  const p = env.persons[id];
  if (p?.incomer && p.origin && p.originId != null) {
    return { regionKey: p.origin.regionKey, villageIdx: p.origin.villageIdx, personId: p.originId };
  }
  return { regionKey: env.regionKey, villageIdx: env.villageIdx, personId: id };
}

// § performance: findResidenceRecord is called on every origin-side decode
// of an emigrant AND on every villageStateAt() computation for a locally
// emigrated resident, so a linear scan of the destination's persons array
// repeats on every call. A lazy, per-envelope index turns repeated lookups
// into a single Map read. Keyed by envelope OBJECT identity (a WeakMap), so
// it never needs manual invalidation: resolveVillage's LRU cache returns
// the same object for repeated resolves of one address until evicted, and
// an eviction's re-solve produces a genuinely new object with its own fresh
// (lazily-built) index — this is purely a cache, never a correctness input.
const _residenceIndex = new WeakMap<Envelope, Map<string, number>>();

function residenceIndexOf(env: Envelope): Map<string, number> {
  let idx = _residenceIndex.get(env);
  if (idx) return idx;
  idx = new Map();
  for (const q of env.persons) {
    if (q.origin && q.originId != null) idx.set(`${q.origin.regionKey}:${q.origin.villageIdx}:${q.originId}`, q.id);
  }
  _residenceIndex.set(env, idx);
  return idx;
}

/** Find the residence record a destination village keeps for a canonical
 * person, or null if the destination never pulled her (emigration is an
 * offer, not a guarantee). Only meaningful for local emigration. */
export function findResidenceRecord(worldSeed: number, canonical: PersonAddress, dest: Address): PersonAddress | null {
  const destEnv = resolveVillage(worldSeed, dest.regionKey, dest.villageIdx);
  const personId = residenceIndexOf(destEnv).get(`${canonical.regionKey}:${canonical.villageIdx}:${canonical.personId}`);
  return personId != null ? { regionKey: dest.regionKey, villageIdx: dest.villageIdx, personId } : null;
}

/** Where a person's adult life is actually recorded: the destination
 * residence record for a locally-emigrated woman who was really pulled,
 * otherwise their own record. */
export function residenceRef(worldSeed: number, env: Envelope, id: number): PersonAddress {
  const p = env.persons[id];
  const self: PersonAddress = { regionKey: env.regionKey, villageIdx: env.villageIdx, personId: id };
  if (p?.emigrated && p.emigrateTo && !p.longDistance) {
    return findResidenceRecord(worldSeed, self, p.emigrateTo) ?? self;
  }
  return self;
}
