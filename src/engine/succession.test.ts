// § family transitions: heirOf/isFirstBornSon/inheritedFromFather encode the
// customary succession rule (eldest surviving son, then eldest daughter, then
// nobody) that both biography.ts's departure narrative and snapshot.ts's
// household state must agree on. Scanned from real resolved villages (never
// hand-built), matching lineage.test.ts's own convention, so every scenario
// exercised is one the engine can actually produce.
import { describe, expect, it } from "vitest";
import { REGIONS } from "./data/regions.js";
import { childrenOf, heirOf, inheritedFromFather, isFirstBornSon } from "./succession.js";
import type { Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

const SEED = 1444;
const REGION_KEYS = Object.keys(REGIONS);

function scanFathers(limit: number, match: (env: Envelope, father: Person, kids: Person[]) => boolean): { env: Envelope; father: Person } | null {
  for (const regionKey of REGION_KEYS) {
    for (let villageIdx = 0; villageIdx < limit; villageIdx++) {
      const env = resolveVillage(SEED, regionKey, villageIdx);
      for (const father of env.persons) {
        const kids = childrenOf(env, father.id);
        if (kids.length && match(env, father, kids)) return { env, father };
      }
    }
  }
  return null;
}

describe("childrenOf", () => {
  it("returns every union's children, in birth order", () => {
    const found = scanFathers(30, (_env, _f, kids) => kids.length >= 3);
    expect(found).not.toBeNull();
    const kids = childrenOf(found!.env, found!.father.id);
    for (let i = 1; i < kids.length; i++) expect(kids[i].birth).toBeGreaterThanOrEqual(kids[i - 1].birth);
  });

  it("is empty for someone who never married", () => {
    const env = resolveVillage(SEED, "england", 0);
    const neverMarried = env.persons.find((p) => !p.unions?.length);
    expect(neverMarried).toBeDefined();
    expect(childrenOf(env, neverMarried!.id)).toEqual([]);
  });
});

describe("isFirstBornSon", () => {
  it("is true for the eldest son and false for every younger brother", () => {
    const found = scanFathers(30, (_env, _f, kids) => kids.filter((c) => c.sex === "M").length >= 2);
    expect(found).not.toBeNull();
    const sons = childrenOf(found!.env, found!.father.id).filter((c) => c.sex === "M");
    expect(isFirstBornSon(found!.env, sons[0].id)).toBe(true);
    for (const younger of sons.slice(1)) expect(isFirstBornSon(found!.env, younger.id)).toBe(false);
  });

  it("is true for anyone with no father on record (a founder)", () => {
    const env = resolveVillage(SEED, "england", 0);
    const founder = env.persons.find((p) => p.founder && p.sex === "M")!;
    expect(isFirstBornSon(env, founder.id)).toBe(true);
  });
});

describe("heirOf", () => {
  it("picks the eldest son who both outlives the father and never emigrated/took orders", () => {
    const found = scanFathers(
      80,
      (_env, father, kids) => kids.filter((c) => c.sex === "M" && c.death.year > father.death.year && !c.emigrated && !c.inOrders).length >= 1,
    );
    expect(found).not.toBeNull();
    const { env, father } = found!;
    const eligibleSons = childrenOf(env, father.id).filter((c) => c.sex === "M" && c.death.year > father.death.year && !c.emigrated && !c.inOrders);
    const heir = heirOf(env, father.id);
    expect(heir?.id).toBe(eligibleSons[0].id);
  });

  it("falls back to the eldest surviving daughter when no son survives to inherit", () => {
    const found = scanFathers(300, (_env, father, kids) => {
      const survivingSons = kids.filter((c) => c.sex === "M" && c.death.year > father.death.year && !c.emigrated && !c.inOrders);
      const survivingDaughters = kids.filter((c) => c.sex === "F" && c.death.year > father.death.year && !c.emigrated && !c.inOrders);
      return survivingSons.length === 0 && survivingDaughters.length >= 1;
    });
    expect(found).not.toBeNull();
    const { env, father } = found!;
    const survivingDaughters = childrenOf(env, father.id).filter((c) => c.sex === "F" && c.death.year > father.death.year && !c.emigrated && !c.inOrders);
    const heir = heirOf(env, father.id);
    expect(heir?.sex).toBe("F");
    expect(heir?.id).toBe(survivingDaughters[0].id);
  });

  it("is null when nobody survives the father to inherit", () => {
    const found = scanFathers(300, (_env, father, kids) => kids.every((c) => c.death.year <= father.death.year || c.emigrated || c.inOrders));
    expect(found).not.toBeNull();
    expect(heirOf(found!.env, found!.father.id)).toBeNull();
  });

  it("is null for an id with no record", () => {
    const env = resolveVillage(SEED, "england", 0);
    expect(heirOf(env, env.persons.length + 50)).toBeNull();
  });
});

describe("inheritedFromFather", () => {
  it("agrees with heirOf: true exactly for the id heirOf(father) names, false for every other child", () => {
    const found = scanFathers(80, (_env, father, kids) => kids.filter((c) => c.death.year > father.death.year && !c.emigrated && !c.inOrders).length >= 1);
    expect(found).not.toBeNull();
    const { env, father } = found!;
    const heir = heirOf(env, father.id)!;
    expect(inheritedFromFather(env, heir.id)).toBe(true);
    for (const sibling of childrenOf(env, father.id)) {
      if (sibling.id !== heir.id) expect(inheritedFromFather(env, sibling.id)).toBe(false);
    }
  });

  it("is false for anyone with no father on record", () => {
    const env = resolveVillage(SEED, "england", 0);
    const founder = env.persons.find((p) => p.founder)!;
    expect(inheritedFromFather(env, founder.id)).toBe(false);
  });
});
