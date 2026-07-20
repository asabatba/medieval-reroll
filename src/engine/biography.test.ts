import { describe, expect, it } from "vitest";
import type { Locale } from "../i18n/locale.js";
import { decodePerson } from "./biography.js";
import { REGIONS } from "./data/regions.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);
const LOCALES: Locale[] = ["en", "ca"];

describe("decodePerson", () => {
  it("returns null for an id outside the envelope", () => {
    const env = resolveVillage(1444, "england", 0);
    expect(decodePerson(env, env.persons.length + 5, "en")).toBeNull();
  });

  it("agrees with the envelope on core relational facts, for every region", () => {
    for (const regionKey of REGION_KEYS) {
      const env = resolveVillage(1444, regionKey, 3);
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en")!;
        expect(bio.birth).toBe(p.birth);
        expect(bio.death).toEqual(p.death);
        expect(bio.sex).toBe(p.sex);
        if (p.spouse != null) {
          expect(bio.spouse).not.toBeNull();
          expect(bio.spouse!.id).toBe(p.spouse);
        } else {
          expect(bio.spouse).toBeNull();
        }
      }
    }
  });

  it("underlying facts (birth, death, cause, family ids) are identical across locales — only text changes", () => {
    const env = resolveVillage(1444, "catalonia", 10);
    for (const p of env.persons.slice(0, 40)) {
      const en = decodePerson(env, p.id, "en")!;
      const ca = decodePerson(env, p.id, "ca")!;
      expect(en.birth).toBe(ca.birth);
      expect(en.death).toEqual(ca.death);
      expect(en.father?.id).toBe(ca.father?.id);
      expect(en.mother?.id).toBe(ca.mother?.id);
      expect(en.spouse?.id).toBe(ca.spouse?.id);
      expect(en.children.map((c) => c.id)).toEqual(ca.children.map((c) => c.id));
      expect(en.events.map((e) => e.year)).toEqual(ca.events.map((e) => e.year));
      expect(en.events.length).toBe(ca.events.length);
    }
  });

  it("never emits an un-substituted {{masc/fem}} gender token", () => {
    for (const locale of LOCALES) {
      const env = resolveVillage(1444, "germany", 7);
      for (const p of env.persons.slice(0, 60)) {
        const bio = decodePerson(env, p.id, locale)!;
        for (const e of bio.events) {
          expect(e.text).not.toMatch(/\{\{[^}]*\}\}/);
        }
      }
    }
  });

  it("no event is dated after the person's own death", () => {
    for (const locale of LOCALES) {
      const env = resolveVillage(1444, "italy", 15);
      for (const p of env.persons.slice(0, 60)) {
        const bio = decodePerson(env, p.id, locale)!;
        for (const e of bio.events) {
          expect(e.year).toBeLessThanOrEqual(p.death.year);
          expect(e.age).toBe(e.year - p.birth);
        }
      }
    }
  });

  it("events are sorted chronologically, birth first and death last", () => {
    const env = resolveVillage(1444, "france", 2);
    for (const p of env.persons.slice(0, 60)) {
      const bio = decodePerson(env, p.id, "en")!;
      const years = bio.events.map((e) => e.year);
      const sorted = [...years].sort((a, b) => a - b);
      expect(years).toEqual(sorted);
      expect(bio.events[0].kind).toBe("birth");
      expect(bio.events[bio.events.length - 1].kind).toBe("death");
    }
  });

  it("an immigrant's parents, when resolvable, come from her origin village and match its record", () => {
    // Real cross-village pulls aren't guaranteed at any single address (pullImmigrantBride
    // is probabilistic) — scan a run of villages in the same region/cluster range until one turns up.
    let env: ReturnType<typeof resolveVillage> | null = null;
    let immigrants: ReturnType<typeof resolveVillage>["persons"] = [];
    for (let villageIdx = 0; villageIdx < 200 && !immigrants.length; villageIdx++) {
      const candidate = resolveVillage(1444, "england", villageIdx);
      const found = candidate.persons.filter((p) => p.incomer && !p.founder && p.origin && p.originId != null && p.origin.regionKey === "england");
      if (found.length) {
        env = candidate;
        immigrants = found;
      }
    }
    expect(immigrants.length).toBeGreaterThan(0);
    for (const p of immigrants) {
      const bio = decodePerson(env!, p.id, "en")!;
      const originEnv = resolveVillage(1444, p.origin!.regionKey, p.origin!.villageIdx);
      const originPerson = originEnv.persons[p.originId!];
      if (originPerson.father >= 0) {
        expect(bio.father).not.toBeNull();
        expect(bio.father!.id).toBe(originPerson.father);
      }
      if (originPerson.mother >= 0) {
        expect(bio.mother).not.toBeNull();
        expect(bio.mother!.id).toBe(originPerson.mother);
      }
    }
  });

  it("siblings never include the person themselves", () => {
    const env = resolveVillage(1444, "england", 5);
    for (const p of env.persons) {
      const bio = decodePerson(env, p.id, "en")!;
      expect(bio.siblings.map((s) => s.id)).not.toContain(p.id);
    }
  });
});
