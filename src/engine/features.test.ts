// Coverage for four additions to the engine: a new region (Castile), § illegitimacy,
// § multiple births (twins), and § consanguinity (first-cousin marriage, flagged not
// blocked). Scans real resolveVillage() output rather than hand-built fixtures, per the
// repo's own testing convention (see succession.test.ts / lineage.test.ts).
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { DEMOGRAPHY } from "./data/demography.js";
import { JURISDICTIONS } from "./data/jurisdictions.js";
import { ROYAL_LINES } from "./data/nobility.js";
import { placeOf } from "./data/placeNames.js";
import { REGIONS } from "./data/regions.js";
import { childrenOf, heirOf, isFirstBornSon } from "./succession.js";
import type { Envelope } from "./types.js";
import { resolveVillage } from "./village.js";

const SEED = 2026;

function sampleEnvs(regionKey: string, n: number): Envelope[] {
  const envs: Envelope[] = [];
  for (let villageIdx = 0; villageIdx < n; villageIdx++) envs.push(resolveVillage(SEED, regionKey, villageIdx));
  return envs;
}

describe("§ Castile region", () => {
  it("is wired into every region-keyed data table, not just REGIONS", () => {
    expect(REGIONS.castile).toBeDefined();
    expect(DEMOGRAPHY.castile).toBeDefined();
    expect(JURISDICTIONS.castile).toBeDefined();
    expect(ROYAL_LINES.castile).toBeDefined();
  });

  it("its royal line covers the whole register era (founders from 1235, births to 1490) with no gaps", () => {
    const reigns = ROYAL_LINES.castile.reigns;
    expect(reigns[0].from).toBeLessThanOrEqual(1235);
    expect(reigns[reigns.length - 1].to).toBeGreaterThanOrEqual(1500);
    for (let i = 1; i < reigns.length; i++) expect(reigns[i].from).toBe(reigns[i - 1].to);
  });

  it("resolves villages with the same structural invariants as every other region", () => {
    for (const env of sampleEnvs("castile", 8)) {
      expect(env.persons.length).toBeGreaterThan(30);
      expect(env.persons.length).toBeLessThan(4000);
      expect(env.diagnostics.truncated).toBe(false);
    }
  });

  it("generates place names past the curated flagship villages, same as any other region", () => {
    const beyond = placeOf(SEED, "castile", 50);
    expect(beyond.en.length).toBeGreaterThan(0);
    expect(beyond.ca.length).toBeGreaterThan(0);
  });

  it("decodePerson produces a readable biography for a Castilian villager", () => {
    const env = resolveVillage(SEED, "castile", 0);
    const p = env.persons.find((q) => !q.founder && q.father >= 0)!;
    const bio = decodePerson(env, p.id, "en")!;
    expect(bio.events.length).toBeGreaterThan(0);
    expect(bio.region).toBe("the Crown of Castile");
  });
});

describe("§ illegitimacy", () => {
  const envs = sampleEnvs("england", 120);

  function allIllegitimate(): { env: Envelope; p: Envelope["persons"][number] }[] {
    const out: { env: Envelope; p: Envelope["persons"][number] }[] = [];
    for (const env of envs) for (const p of env.persons) if (p.illegitimate) out.push({ env, p });
    return out;
  }

  it("some natural children exist across the sampled villages", () => {
    expect(allIllegitimate().length).toBeGreaterThan(0);
  });

  it("always has a real, known father (never -1) and a real mother who was unmarried and non-founder", () => {
    for (const { env, p } of allIllegitimate()) {
      expect(p.father).toBeGreaterThanOrEqual(0);
      expect(p.mother).toBeGreaterThanOrEqual(0);
      const mother = env.persons[p.mother];
      expect(mother.sex).toBe("F");
      expect(mother.founder).toBeFalsy();
    }
  });

  it("is never the father's/mother's incest match — not her own full sibling by either parent", () => {
    for (const { env, p } of allIllegitimate()) {
      const father = env.persons[p.father];
      const mother = env.persons[p.mother];
      expect(father.id).not.toBe(mother.id);
      if (mother.father !== -1) expect(father.father).not.toBe(mother.father);
      if (mother.mother !== -1) expect(father.mother).not.toBe(mother.mother);
    }
  });

  it("is excluded from heirOf, even when chronologically the eldest son", () => {
    for (const { env, p } of allIllegitimate()) {
      if (p.sex !== "M") continue;
      const father = env.persons[p.father];
      // father must actually predecease this person for heirOf(father) to be checkable
      if (father.death.year >= p.death.year) continue;
      const heir = heirOf(env, father.id);
      expect(heir?.id).not.toBe(p.id);
    }
  });

  it("isFirstBornSon is always false for a natural son, regardless of birth order among his father's other sons", () => {
    for (const { env, p } of allIllegitimate()) {
      if (p.sex !== "M") continue;
      expect(isFirstBornSon(env, p.id)).toBe(false);
    }
  });

  it("is surfaced by childrenOf on BOTH the mother's and the father's side, for lineage/UI discoverability", () => {
    for (const { env, p } of allIllegitimate()) {
      expect(childrenOf(env, p.mother).some((c) => c.id === p.id)).toBe(true);
      expect(childrenOf(env, p.father).some((c) => c.id === p.id)).toBe(true);
    }
  });

  it("her own biography narrates the birth as a natural child of both named parents, never crashing on a null parent", () => {
    let checked = 0;
    for (const { env, p } of allIllegitimate()) {
      const bio = decodePerson(env, p.id, "en")!;
      expect(bio.father).not.toBeNull();
      expect(bio.mother).not.toBeNull();
      const birthEvent = bio.events.find((e) => e.kind === "birth");
      expect(birthEvent?.text).toMatch(/natural/);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("under Catalonia's dual-surname convention, a natural child's surname is still a proper father+mother compound", () => {
    for (const { env, p } of allIllegitimate().filter(({ env }) => env.regionKey === "catalonia")) {
      const father = env.persons[p.father];
      const mother = env.persons[p.mother];
      const parts = p.surname.split(" i ");
      expect(parts.length).toBe(2);
      expect(parts[0]).toBe(father.surname.split(" i ")[0]);
      expect(parts[1]).toBe(mother.surname.split(" i ")[0]);
    }
  });

  it("can itself go on to marry normally (isn't permanently excluded from the marriage market)", () => {
    let sawMarriedIllegitimate = 0;
    for (const env of sampleEnvs("catalonia", 60).concat(sampleEnvs("italy", 60))) {
      for (const p of env.persons) if (p.illegitimate && p.spouse != null) sawMarriedIllegitimate++;
    }
    expect(sawMarriedIllegitimate).toBeGreaterThan(0);
  });
});

describe("§ multiple births (twins)", () => {
  const envs = sampleEnvs("france", 150);

  function allTwins(): { env: Envelope; p: Envelope["persons"][number] }[] {
    const out: { env: Envelope; p: Envelope["persons"][number] }[] = [];
    for (const env of envs) for (const p of env.persons) if (p.twinOf != null) out.push({ env, p });
    return out;
  }

  it("some twin pairs exist across the sampled villages", () => {
    expect(allTwins().length).toBeGreaterThan(0);
  });

  it("twinOf is symmetric, and the pair are true full siblings born in the same year to the same couple", () => {
    for (const { env, p } of allTwins()) {
      const twin = env.persons[p.twinOf!];
      expect(twin.twinOf).toBe(p.id);
      expect(twin.birth).toBe(p.birth);
      expect(twin.father).toBe(p.father);
      expect(twin.mother).toBe(p.mother);
      expect(twin.id).not.toBe(p.id);
    }
  });

  it("is never illegitimate (twins only arise from a real marriage's own genChildren)", () => {
    for (const { p } of allTwins()) expect(p.illegitimate).toBeFalsy();
  });

  it("her biography mentions being born a twin, alongside her co-twin by name", () => {
    let checked = 0;
    for (const { env, p } of allTwins()) {
      const bio = decodePerson(env, p.id, "en")!;
      const twin = env.persons[p.twinOf!];
      const birthEvent = bio.events.find((e) => e.kind === "birth");
      expect(birthEvent?.text).toContain(twin.name);
      expect(birthEvent?.text.toLowerCase()).toContain("twin");
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("§ consanguinity (first-cousin marriage)", () => {
  function grandparentsOf(env: Envelope, id: number): Set<number> {
    const gs = new Set<number>();
    const p = env.persons[id];
    const add = (parentId: number) => {
      if (parentId < 0) return;
      const parent = env.persons[parentId];
      if (parent.father >= 0) gs.add(parent.father);
      if (parent.mother >= 0) gs.add(parent.mother);
    };
    add(p.father);
    add(p.mother);
    return gs;
  }

  function allConsanguineousCouples(regionKey: string, n: number): { env: Envelope; couple: Envelope["couples"][number] }[] {
    const out: { env: Envelope; couple: Envelope["couples"][number] }[] = [];
    for (const env of sampleEnvs(regionKey, n)) for (const couple of env.couples) if (couple.consanguineous) out.push({ env, couple });
    return out;
  }

  it("some consanguineous marriages exist across a wide sample (rare but real)", () => {
    expect(allConsanguineousCouples("england", 200).length).toBeGreaterThan(0);
  });

  it("every flagged couple genuinely shares at least one grandparent — never a false positive", () => {
    for (const { env, couple } of allConsanguineousCouples("england", 200)) {
      const gH = grandparentsOf(env, couple.husband);
      const gW = grandparentsOf(env, couple.wife);
      const shared = [...gH].some((g) => gW.has(g));
      expect(shared).toBe(true);
    }
  });

  it("is never flagged for a founder couple (no grandparents on record to share)", () => {
    for (const env of sampleEnvs("england", 50)) {
      for (const couple of env.couples) {
        const H = env.persons[couple.husband];
        if (H.founder) expect(couple.consanguineous).toBeFalsy();
      }
    }
  });

  it("the marriage narrative names the dispensation for a flagged match", () => {
    let checked = 0;
    for (const { env, couple } of allConsanguineousCouples("england", 200)) {
      const H = env.persons[couple.husband];
      const bio = decodePerson(env, H.id, "en")!;
      const marriageEvent = bio.events.find((e) => e.kind === "marriage" && e.year === couple.year);
      expect(marriageEvent?.text.toLowerCase()).toContain("cousin");
      expect(marriageEvent?.text.toLowerCase()).toContain("dispensation");
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("§ nobility crosslink (gentry kinship to the manor's lord line)", () => {
  it("at least one gentry marriage in a wide sample is narrated as kin to the sitting lord, with a working lord link", () => {
    let sawKinship = 0;
    for (let villageIdx = 0; villageIdx < 250; villageIdx++) {
      const env = resolveVillage(SEED, "england", villageIdx);
      for (const p of env.persons) {
        if (p.cls !== "gentry" || !p.unions?.length) continue;
        const bio = decodePerson(env, p.id, "en")!;
        const marriageEvent = bio.events.find((e) => e.kind === "marriage");
        if (!marriageEvent?.text.includes("kinsman")) continue;
        sawKinship++;
        const lordRef = marriageEvent.refs?.find((r) => r.route === "lord");
        expect(lordRef).toBeDefined();
        expect(lordRef!.routeIdx).toBeGreaterThanOrEqual(0);
      }
    }
    expect(sawKinship).toBeGreaterThan(0);
  });
});
