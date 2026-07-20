import { describe, expect, it } from "vitest";
import type { Locale } from "../i18n/locale.js";
import { decodePerson } from "./biography.js";
import { CLASS_INFO } from "./data/classes.js";
import { REGIONS } from "./data/regions.js";
import { isFirstBornSon } from "./succession.js";
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

describe("§ godparents", () => {
  it("some native births are attended by two named godparents, at the birth year, with parents on record", () => {
    // NB: names are drawn from small per-region pools (village.ts), so a
    // godparent can share a name with someone else entirely by chance —
    // exclusion from the parents is by id in the engine (which this can't
    // see through Bio's text-only event), not by string comparison here.
    let seen = 0;
    for (const regionKey of REGION_KEYS) {
      const env = resolveVillage(1444, regionKey, 4);
      for (const p of env.persons) {
        if (p.founder) continue;
        const bio = decodePerson(env, p.id, "en")!;
        const gp = bio.events.find((e) => e.year === p.birth && e.text.includes("stood godparents"));
        if (!gp) continue;
        seen++;
        expect(bio.father).not.toBeNull();
        expect(bio.mother).not.toBeNull();
        expect(gp.text).toMatch(/^At the font, .+ and .+ stood godparents/);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("never fires for a founder (baptism predates the register)", () => {
    for (const regionKey of REGION_KEYS) {
      const env = resolveVillage(1444, regionKey, 4);
      for (const p of env.persons.filter((p) => p.founder)) {
        const bio = decodePerson(env, p.id, "en")!;
        expect(bio.events.some((e) => e.text.includes("stood godparents"))).toBe(false);
      }
    }
  });
});

describe("§ manorial accounts (rent/tax narrative)", () => {
  it("only ever appears for serfs and free peasants, never the other classes", () => {
    let seen = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 4; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          const acct = bio.events.find((e) => e.text.includes("reeve's roll"));
          if (!acct) continue;
          seen++;
          expect(p.cls === "serf" || p.cls === "freePeasant").toBe(true);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("an arrears entry only lands in a famine or war year", () => {
    let sawArrears = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 8; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          const arrears = bio.events.find((e) => e.text.includes("in arrears that year"));
          if (!arrears) continue;
          sawArrears++;
          const region = REGIONS[regionKey];
          const inFamine = arrears.year >= region.famine[0] && arrears.year <= region.famine[1];
          const inWar = region.warYears.some(([a, b]) => arrears.year >= a && arrears.year <= b);
          expect(inFamine || inWar).toBe(true);
        }
      }
    }
    expect(sawArrears).toBeGreaterThan(0);
  });
});

describe("§ downward mobility narrative", () => {
  it("a downward class move (village.ts) is narrated distinctly from an upward one, and dated to age 16", () => {
    let sawDown = 0;
    for (const regionKey of ["england", "germany", "catalonia"]) {
      for (let villageIdx = 0; villageIdx < 12; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          if (!p.clsOrigin || p.death.age < 16 || CLASS_INFO[p.cls].wealth >= CLASS_INFO[p.clsOrigin].wealth) continue;
          sawDown++;
          const bio = decodePerson(env, p.id, "en")!;
          // same year as the class-move guard (p.birth + 16); other
          // same-year events (e.g. a plague passage) can also land there,
          // so match by the marker text, not by year alone.
          const e = bio.events.find((e) => e.text.includes("not a merchant") || e.text.includes("not an artisan"));
          expect(e).toBeDefined();
          expect(e!.year).toBe(p.birth + 16);
          expect(e!.kind).toBe("hardship");
        }
      }
    }
    expect(sawDown).toBeGreaterThan(0);
  });

  it("an upward class move is still narrated as a fortune, never a hardship", () => {
    let sawUp = 0;
    const env = resolveVillage(1444, "england", 20);
    for (const p of env.persons) {
      if (!p.clsOrigin || p.death.age < 16 || CLASS_INFO[p.cls].wealth <= CLASS_INFO[p.clsOrigin].wealth) continue;
      sawUp++;
      const bio = decodePerson(env, p.id, "en")!;
      const e = bio.events.find(
        (e) => e.text.includes("secured a free tenancy") || e.text.includes("place among the village artisans") || e.text.includes("live by dealing"),
      );
      expect(e).toBeDefined();
      expect(e!.year).toBe(p.birth + 16);
      expect(e!.kind).toBe("fortune");
    }
    expect(sawUp).toBeGreaterThan(0);
  });
});

describe("§ regional inheritance customs narrative", () => {
  it("a partible-region non-eldest son who stayed receives a divided-share event, distinct from sole-heir text", () => {
    let seen = 0;
    for (const regionKey of ["france", "italy"]) {
      for (let villageIdx = 0; villageIdx < 15 && seen < 3; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          if (p.sex !== "M" || p.founder || p.father < 0 || p.emigrated || p.inOrders) continue;
          if (isFirstBornSon(env, p.id)) continue; // the sole-heir case is covered elsewhere
          const father = env.persons[p.father];
          if (!(father.death.year > p.birth + 12 && father.death.year <= p.death.year)) continue;
          const bio = decodePerson(env, p.id, "en")!;
          const e = bio.events.find((e) => e.year === father.death.year && e.text.includes("divided among the sons"));
          if (!e) continue;
          seen++;
          expect(e.text).not.toContain("entered the holding as heir");
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("never fires in an impartible region", () => {
    for (const regionKey of ["england", "germany", "catalonia"]) {
      for (let villageIdx = 0; villageIdx < 6; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          expect(bio.events.some((e) => e.text.includes("divided among the sons"))).toBe(false);
        }
      }
    }
  });
});
