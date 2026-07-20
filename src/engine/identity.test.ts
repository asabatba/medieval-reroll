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
    for (const p of immigrants) {
      const originEnv = resolveVillage(SEED, p.origin!.regionKey, p.origin!.villageIdx);
      const bio = decodePerson(originEnv, p.originId!, "en")!;
      expect(bio.destRecord).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx, personId: p.id });
      // her destination union, seen from the origin side
      const destCouple = destEnv.couples[p.unions![0]];
      const husband = destEnv.persons[destCouple.husband];
      expect(bio.spouse).not.toBeNull();
      expect(bio.spouse!.id).toBe(husband.id);
      expect(bio.spouse!.addr).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx });
      expect(bio.marriageYear).toBe(destCouple.year);
      expect(bio.children.map((c) => c.id)).toEqual(destCouple.children);
      for (const c of bio.children) expect(c.addr).toEqual({ regionKey: destEnv.regionKey, villageIdx: destEnv.villageIdx });
      // and the marriage event names the real husband
      const marriage = bio.events.find((e) => e.kind === "marriage");
      expect(marriage).toBeDefined();
      expect(marriage!.text).toContain(husband.name);
    }
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
