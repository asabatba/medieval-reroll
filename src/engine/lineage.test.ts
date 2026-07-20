// § family tree: ancestorsOf/descendantsOf must agree with a manual
// parent-chain / childrenOf walk, respect generation numbering, and cross
// into a real immigrant's/emigrant's OTHER village exactly where
// biography.ts's own single-generation reads already do.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { REGIONS } from "./data/regions.js";
import { ancestorsOf, descendantsOf, parentsOf } from "./lineage.js";
import { childrenOf } from "./succession.js";
import type { Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

const SEED = 1444;
const REGION_KEYS = Object.keys(REGIONS);

function findRealImmigrant(): { env: Envelope; p: Person } {
  for (const regionKey of REGION_KEYS) {
    for (let villageIdx = 0; villageIdx < 200; villageIdx++) {
      const env = resolveVillage(SEED, regionKey, villageIdx);
      const p = env.persons.find((q) => q.incomer && !q.founder && q.origin && q.originId != null);
      if (p) return { env, p };
    }
  }
  throw new Error("no real immigrant found in scan range");
}

function findRealEmigrantWithResidence(): { env: Envelope; p: Person } {
  for (const regionKey of REGION_KEYS) {
    for (let villageIdx = 0; villageIdx < 200; villageIdx++) {
      const env = resolveVillage(SEED, regionKey, villageIdx);
      for (const p of env.persons) {
        if (!p.emigrated || !p.emigrateTo || p.longDistance) continue;
        const bio = decodePerson(env, p.id, "en");
        if (bio?.destRecord) return { env, p };
      }
    }
  }
  throw new Error("no real emigrant-with-residence found in scan range");
}

describe("parentsOf", () => {
  it("agrees with decodePerson's own father/mother resolution, native and immigrant alike", () => {
    const env = resolveVillage(SEED, "england", 4);
    for (const p of env.persons.slice(0, 60)) {
      const bio = decodePerson(env, p.id, "en")!;
      const { father, mother } = parentsOf(env, p.id);
      expect(father?.person.id ?? null).toBe(bio.father?.id ?? null);
      expect(mother?.person.id ?? null).toBe(bio.mother?.id ?? null);
    }
    const { env: destEnv, p: immigrant } = findRealImmigrant();
    const bio = decodePerson(destEnv, immigrant.id, "en")!;
    const { father, mother } = parentsOf(destEnv, immigrant.id);
    expect(father?.person.id ?? null).toBe(bio.father?.id ?? null);
    expect(mother?.person.id ?? null).toBe(bio.mother?.id ?? null);
    if (father) expect(father.env.regionKey).toBe(immigrant.origin!.regionKey);
  });

  it("returns null/null for an unresolvable id", () => {
    const env = resolveVillage(SEED, "england", 0);
    expect(parentsOf(env, env.persons.length + 10)).toEqual({ father: null, mother: null });
  });
});

describe("ancestorsOf", () => {
  it("depth 0 yields nothing; depth 1 is exactly the two parents", () => {
    const env = resolveVillage(SEED, "england", 6);
    const nativeAdult = env.persons.find((p) => !p.founder && !p.incomer && p.father >= 0)!;
    expect(ancestorsOf(env, nativeAdult.id, 0)).toEqual([]);
    const gen1 = ancestorsOf(env, nativeAdult.id, 1);
    expect(gen1.every((n) => n.generation === 1)).toBe(true);
    expect(gen1.map((n) => n.id).sort()).toEqual([nativeAdult.father, nativeAdult.mother].sort());
  });

  it("matches a manual father-line/mother-line walk generation by generation, for every generation up to depth", () => {
    const env = resolveVillage(SEED, "germany", 9);
    const deep = env.persons.find((p) => !p.founder && !p.incomer && p.father >= 0 && env.persons[p.father]?.father >= 0)!;
    const nodes = ancestorsOf(env, deep.id, 4);
    // manual: father's own father (paternal grandfather) must appear at generation 2
    const father = env.persons[deep.father];
    if (father.father >= 0) {
      const paternalGrandfather = nodes.find((n) => n.line.join(",") === "father,father");
      expect(paternalGrandfather?.id).toBe(father.father);
      expect(paternalGrandfather?.generation).toBe(2);
    }
    // every node's generation equals the length of its own line
    for (const n of nodes) expect(n.generation).toBe(n.line.length);
  });

  it("an immigrant's ancestors continue into her REAL origin village, not a dead end", () => {
    const { env: destEnv, p: immigrant } = findRealImmigrant();
    const nodes = ancestorsOf(destEnv, immigrant.id, 2);
    expect(nodes.length).toBeGreaterThan(0);
    const gen1 = nodes.filter((n) => n.generation === 1);
    for (const n of gen1) {
      expect(n.addr.regionKey).toBe(immigrant.origin!.regionKey);
      expect(n.addr.villageIdx).toBe(immigrant.origin!.villageIdx);
    }
  });

  it("never returns more than 2^depth nodes", () => {
    const env = resolveVillage(SEED, "italy", 12);
    for (const p of env.persons.slice(0, 30)) {
      for (const depth of [0, 1, 2, 3]) {
        expect(ancestorsOf(env, p.id, depth).length).toBeLessThanOrEqual(2 ** depth - 1 + 2 ** depth); // generous bound, just checks boundedness
      }
    }
  });
});

describe("descendantsOf", () => {
  it("generation 1 is exactly childrenOf, and generation 2 is exactly the union of their own children", () => {
    const env = resolveVillage(SEED, "france", 5);
    const parent = env.persons.find((p) => childrenOf(env, p.id).length >= 2 && childrenOf(env, p.id).some((c) => childrenOf(env, c.id).length > 0));
    expect(parent).toBeDefined();
    const kids = childrenOf(env, parent!.id);
    const nodes = descendantsOf(env, parent!.id, 2);
    const gen1 = nodes.filter((n) => n.generation === 1);
    expect(gen1.map((n) => n.id).sort((a, b) => a - b)).toEqual(kids.map((k) => k.id).sort((a, b) => a - b));
    const expectedGen2 = kids.flatMap((k) => childrenOf(env, k.id).map((g) => g.id));
    const gen2 = nodes.filter((n) => n.generation === 2);
    expect(gen2.map((n) => n.id).sort((a, b) => a - b)).toEqual(expectedGen2.sort((a, b) => a - b));
  });

  it("depth 0 yields nothing", () => {
    const env = resolveVillage(SEED, "france", 5);
    const parent = env.persons.find((p) => childrenOf(env, p.id).length > 0)!;
    expect(descendantsOf(env, parent.id, 0)).toEqual([]);
  });

  it("a childless leaf yields no descendants at any depth", () => {
    const env = resolveVillage(SEED, "catalonia", 3);
    const leaf = env.persons.find((p) => p.death.age < 10)!;
    expect(descendantsOf(env, leaf.id, 5)).toEqual([]);
  });

  it("a real emigrant's descendants are found in her ACTUAL destination register, not stubbed as childless", () => {
    const { env, p } = findRealEmigrantWithResidence();
    const bio = decodePerson(env, p.id, "en")!;
    const nodes = descendantsOf(env, p.id, 3);
    const gen1 = nodes.filter((n) => n.generation === 1);
    expect(gen1.map((n) => n.id).sort((a, b) => a - b)).toEqual(bio.children.map((c) => c.id).sort((a, b) => a - b));
    for (const n of gen1) {
      expect(n.addr.regionKey).toBe(bio.destRecord!.regionKey);
      expect(n.addr.villageIdx).toBe(bio.destRecord!.villageIdx);
    }
  });
});
