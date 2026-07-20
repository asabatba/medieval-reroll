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
        } else if (bio.spouse) {
          // the only unmarried-at-home record with a spouse is an emigrant
          // whose destination register was really found (§ canonical identity)
          expect(p.emigrated).toBe(true);
          expect(bio.destRecord).not.toBeNull();
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

// Occupational-hazard riskTrade (village.ts) is a Tier-1 mechanical fact;
// this checks Tier 2's occupation/death narrative never contradicts it —
// a "normal" man never reads as a quarryman or sailor, and a hazardous one
// is never narrated as an ordinary ploughman drawing an ordinary death.
const HAZARD_OCC_MARKERS = ["quarry", "pedrera"];
const MARITIME_OCC_MARKERS = ["fished the estuary", "trading fleet", "va pescar a l'estuari", "flota mercant"];
const MILITARY_OCC_MARKERS = ["raised chiefly to war", "format sobretot per a la guerra"];
const HAZARD_DEATH_MARKERS = ["fall of stone in the quarry", "gallery of the mine", "despreniment de pedra", "galeria de la mina"];
const MARITIME_DEATH_MARKERS = ["lost overboard", "boat went down", "foreign port", "borda", "vaixell", "port estranger"];

function includesAny(text: string, markers: string[]): boolean {
  return markers.some((m) => text.includes(m));
}

describe("occupational-risk narrative consistency", () => {
  it("occupation text matches the person's own riskTrade, never someone else's", () => {
    let sawHazardous = 0;
    let sawMaritime = 0;
    let sawMilitary = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 8; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          if (p.death.age < 12 || p.inOrders) continue;
          const bio = decodePerson(env, p.id, "en")!;
          const occText = bio.events.find((e) => e.kind === "life" && e.year === p.birth + 13)?.text ?? "";
          const isHazard = includesAny(occText, HAZARD_OCC_MARKERS);
          const isMaritime = includesAny(occText, MARITIME_OCC_MARKERS);
          const isMilitary = includesAny(occText, MILITARY_OCC_MARKERS);
          if (isHazard) {
            expect(p.riskTrade).toBe("hazardous");
            sawHazardous++;
          }
          if (isMaritime) {
            expect(p.riskTrade).toBe("maritime");
            sawMaritime++;
          }
          if (isMilitary) {
            expect(p.riskTrade).toBe("military");
            sawMilitary++;
          }
          if (p.riskTrade === "normal" || p.riskTrade == null) {
            expect(isHazard || isMaritime || isMilitary).toBe(false);
          }
        }
      }
    }
    // sanity: the scan actually turned up examples of each, so the assertions above were exercised
    expect(sawHazardous).toBeGreaterThan(0);
    expect(sawMaritime).toBeGreaterThan(0);
    expect(sawMilitary).toBeGreaterThan(0);
  });

  it("occupational-accident death detail only ever appears for a matching riskTrade", () => {
    let sawHazardDeath = 0;
    let sawMaritimeDeath = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 8; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          const deathText = bio.events.find((e) => e.kind === "death")?.text ?? "";
          if (includesAny(deathText, HAZARD_DEATH_MARKERS)) {
            expect(p.riskTrade).toBe("hazardous");
            sawHazardDeath++;
          }
          if (includesAny(deathText, MARITIME_DEATH_MARKERS)) {
            expect(p.riskTrade).toBe("maritime");
            sawMaritimeDeath++;
          }
        }
      }
    }
    expect(sawHazardDeath).toBeGreaterThan(0);
    expect(sawMaritimeDeath).toBeGreaterThan(0);
  });
});
