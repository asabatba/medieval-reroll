// § canonical identity: a migrant has ONE identity (her natal record's
// address) and possibly a residence record in her destination village.
// These tests prove the two records agree and resolve to each other, and
// that the origin-side biography now links to the destination life instead
// of showing a dead-end "married out" stub.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { canonicalRef, findResidenceRecord, residenceRef } from "./identity.js";
import type { Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

const SEED = 1444;

/** Scan a run of villages for real (non-fabricated) immigrants. */
function findRealImmigrants(): { destEnv: Envelope; immigrants: Person[] } {
  for (let villageIdx = 0; villageIdx < 200; villageIdx++) {
    const destEnv = resolveVillage(SEED, "england", villageIdx);
    const immigrants = destEnv.persons.filter((p) => p.incomer && !p.founder && p.origin && p.originId != null);
    if (immigrants.length) return { destEnv, immigrants };
  }
  throw new Error("no real immigrant found in scan range");
}

describe("cross-village identity", () => {
  const { destEnv, immigrants } = findRealImmigrants();

  it("a residence record resolves to its canonical natal record, and back", () => {
    for (const p of immigrants) {
      const canonical = canonicalRef(destEnv, p.id);
      expect(canonical).toEqual({ regionKey: p.origin!.regionKey, villageIdx: p.origin!.villageIdx, personId: p.originId });
      // canonical → residence closes the loop
      const originEnv = resolveVillage(SEED, canonical.regionKey, canonical.villageIdx);
      const native = originEnv.persons[canonical.personId];
      expect(native.emigrated).toBe(true);
      const res = findResidenceRecord(SEED, canonical, native.emigrateTo!);
      expect(res).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx, personId: p.id });
      expect(residenceRef(SEED, originEnv, canonical.personId)).toEqual(res);
    }
  });

  it("natal and residence records never disagree on name, birth, or death", () => {
    for (const p of immigrants) {
      const originEnv = resolveVillage(SEED, p.origin!.regionKey, p.origin!.villageIdx);
      const native = originEnv.persons[p.originId!];
      expect(p.name).toBe(native.name);
      expect(p.surname).toBe(native.surname);
      expect(p.birth).toBe(native.birth);
      expect(p.death).toEqual(native.death);
    }
  });

  it("the ORIGIN biography of a pulled emigrant links to her destination marriage (spouse, year, children)", () => {
    // Real cross-village pulls now go both ways (§ male out-migration): a
    // woman pulled as a bride, or a man pulled as a groom. Either way, the
    // ORIGIN-side biography should link to the REAL destination spouse.
    for (const p of immigrants) {
      const originEnv = resolveVillage(SEED, p.origin!.regionKey, p.origin!.villageIdx);
      const bio = decodePerson(originEnv, p.originId!, "en")!;
      expect(bio.destRecord).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx, personId: p.id });
      // her/his destination union, seen from the origin side
      const destCouple = destEnv.couples[p.unions![0]];
      const spouseId = p.id === destCouple.husband ? destCouple.wife : destCouple.husband;
      const destSpouse = destEnv.persons[spouseId];
      expect(bio.spouse).not.toBeNull();
      expect(bio.spouse!.id).toBe(destSpouse.id);
      expect(bio.spouse!.addr).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx });
      expect(bio.marriageYear).toBe(destCouple.year);
      expect(bio.children.map((c) => c.id)).toEqual(destCouple.children);
      for (const c of bio.children) expect(c.addr).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx });
      // and the marriage event names the real spouse
      const marriage = bio.events.find((e) => e.kind === "marriage");
      expect(marriage).toBeDefined();
      expect(marriage!.text).toContain(destSpouse.name);
    }
  });

  it("real cross-village pulls include both immigrant brides and immigrant grooms (§ male out-migration)", () => {
    let sawFemale = 0;
    let sawMale = 0;
    for (let villageIdx = 0; villageIdx < 300; villageIdx++) {
      const env = resolveVillage(SEED, "england", villageIdx);
      for (const p of env.persons) {
        if (!p.incomer || p.founder || !p.origin || p.originId == null) continue;
        if (p.sex === "F") sawFemale++;
        else sawMale++;
      }
      if (sawFemale > 0 && sawMale > 0) break;
    }
    expect(sawFemale).toBeGreaterThan(0);
    expect(sawMale).toBeGreaterThan(0);
  });

  it("for everyone else, canonical and residence are simply their own record", () => {
    const env = resolveVillage(SEED, "england", 0);
    for (const p of env.persons.slice(0, 30)) {
      if (p.incomer && p.originId != null) continue;
      const self = { regionKey: env.regionKey, villageIdx: env.villageIdx, personId: p.id };
      expect(canonicalRef(env, p.id)).toEqual(self);
      if (!p.emigrated || p.longDistance) expect(residenceRef(SEED, env, p.id)).toEqual(self);
    }
  });
});

// § performance: findResidenceRecord is now backed by a lazy per-envelope
// index (identity.ts) instead of a linear scan on every call. These tests
// only check for CORRECTNESS across repeated/out-of-order calls — the
// index must be invisible to behavior, not just fast.
describe("findResidenceRecord index correctness", () => {
  const { destEnv, immigrants } = findRealImmigrants();

  it("repeated lookups for the same person return the identical result every time", () => {
    // `emigrateTo` lives on the ORIGIN native record, not the destination
    // residence record (`p`) — the destination is where she IS, not where
    // she's going.
    for (const p of immigrants) {
      const canonical = { regionKey: p.origin!.regionKey, villageIdx: p.origin!.villageIdx, personId: p.originId! };
      const originEnv = resolveVillage(SEED, canonical.regionKey, canonical.villageIdx);
      const dest = originEnv.persons[canonical.personId].emigrateTo!;
      const first = findResidenceRecord(SEED, canonical, dest);
      for (let i = 0; i < 20; i++) {
        expect(findResidenceRecord(SEED, canonical, dest)).toEqual(first);
      }
    }
  });

  it("looking up every immigrant in an arbitrary (non-insertion) order still resolves each one correctly", () => {
    const shuffled = immigrants.slice().reverse();
    for (const p of shuffled) {
      const canonical = { regionKey: p.origin!.regionKey, villageIdx: p.origin!.villageIdx, personId: p.originId! };
      const originEnv = resolveVillage(SEED, canonical.regionKey, canonical.villageIdx);
      const dest = originEnv.persons[canonical.personId].emigrateTo!;
      const res = findResidenceRecord(SEED, canonical, dest);
      expect(res).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx, personId: p.id });
    }
  });

  it("a canonical address with no real residence record anywhere still correctly returns null (index isn't fooled by a miss)", () => {
    // an address that structurally can't be anyone's origin (personId far past any real roster)
    const bogus = { regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx, personId: 999999 };
    expect(findResidenceRecord(SEED, bogus, { regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx + 1 })).toBeNull();
  });
});
