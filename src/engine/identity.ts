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

/** Find the residence record a destination village keeps for a canonical
 * person, or null if the destination never pulled her (emigration is an
 * offer, not a guarantee). Only meaningful for local emigration. */
export function findResidenceRecord(worldSeed: number, canonical: PersonAddress, dest: Address): PersonAddress | null {
  const destEnv = resolveVillage(worldSeed, dest.regionKey, dest.villageIdx);
  for (const q of destEnv.persons) {
    if (q.originId === canonical.personId && q.origin && q.origin.regionKey === canonical.regionKey && q.origin.villageIdx === canonical.villageIdx) {
      return { regionKey: dest.regionKey, villageIdx: dest.villageIdx, personId: q.id };
    }
  }
  return null;
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
