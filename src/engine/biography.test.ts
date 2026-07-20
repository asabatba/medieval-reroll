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

// § occupation marital gate: occupation is decided at a fixed early age
// (13), before anyone in this model marries — an entry that presupposes a
// husband or widowhood must only ever be selectable for someone whose
// actual recorded life later bears that out, checked here against raw
// envelope facts (not the Bio's own derived `widowed` count, so this isn't
// just re-reading back what the implementation itself computed).
function everMarriedRaw(env: ReturnType<typeof resolveVillage>, id: number): boolean {
  return !!env.persons[id].unions?.length;
}
function everWidowedRaw(env: ReturnType<typeof resolveVillage>, id: number): boolean {
  const p = env.persons[id];
  return !!p.unions?.some((ci) => {
    const c = env.couples[ci];
    const spouseId = p.id === c.husband ? c.wife : c.husband;
    return env.persons[spouseId].death.year < p.death.year;
  });
}

describe("§ occupation marital gate", () => {
  function scan(marker: string, gate: (env: ReturnType<typeof resolveVillage>, id: number) => boolean) {
    let seen = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 15; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          if (!bio.events.some((e) => e.text.includes(marker))) continue;
          seen++;
          expect(gate(env, p.id)).toBe(true);
        }
      }
    }
    return seen;
  }

  it('"carried on the workshop in widowhood" never appears unless she really was widowed', () => {
    expect(scan("carried on the workshop in widowhood", everWidowedRaw)).toBeGreaterThan(0);
  });

  it('"kept the shop and the books when her husband travelled" never appears unless she actually married', () => {
    expect(scan("kept the shop and the books when her husband travelled", everMarriedRaw)).toBeGreaterThan(0);
  });

  it('"ran the manor entirely during her husband\'s absences" never appears unless she actually married', () => {
    expect(scan("ran the manor entirely during her husband's absences", everMarriedRaw)).toBeGreaterThan(0);
  });

  // A gated line must not just be TRUE somewhere in her recorded life — it
  // must not be printed at a chronicle year that predates the marriage (or
  // widowhood) it depends on. Regression for a bug where e.g. a 13-year-old,
  // years away from her own wedding entry, got "ran the manor entirely
  // during her husband's absences" because the occupation event was always
  // dated to the fixed age-13 "occupation decided" moment regardless of
  // when marriage actually happened in her life.
  const MARRIED_MARKERS = ["kept the shop and the books when her husband travelled", "ran the manor entirely during her husband's absences"];
  const WIDOWED_MARKERS = ["carried on the workshop in widowhood, with journeymen under her"];

  it("a married-gated occupation line never appears before her own marriage entry", () => {
    let seen = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 15; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          const occEvent = bio.events.find((e) => MARRIED_MARKERS.some((m) => e.text.includes(m)));
          if (!occEvent) continue;
          seen++;
          const firstMarriage = bio.events.find((e) => e.kind === "marriage");
          expect(firstMarriage).toBeDefined();
          expect(occEvent.year).toBeGreaterThanOrEqual(firstMarriage!.year);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("a widowed-gated occupation line never appears before she was actually widowed", () => {
    let seen = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 15; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en")!;
          const occEvent = bio.events.find((e) => WIDOWED_MARKERS.some((m) => e.text.includes(m)));
          if (!occEvent) continue;
          seen++;
          const earliestWidowing = Math.min(
            ...(env.persons[p.id].unions ?? [])
              .map((ci) => env.couples[ci])
              .map((c) => env.persons[p.id === c.husband ? c.wife : c.husband].death.year)
              .filter((y) => y < env.persons[p.id].death.year),
          );
          expect(Number.isFinite(earliestWidowing)).toBe(true);
          expect(occEvent.year).toBeGreaterThanOrEqual(earliestWidowing);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

// § name links: an event's `refs` are metadata for the UI to turn a name
// into a link — this checks the invariant the UI relies on (every ref's
// name is a literal, findable substring of its own event's text) and that
// refs actually resolve to a real, matching person.
describe("§ name links (BioEvent.refs)", () => {
  it("every ref's name is a literal substring of its own event's text, and resolves to a real matching person", () => {
    let sawRefs = 0;
    for (const regionKey of REGION_KEYS) {
      for (let villageIdx = 0; villageIdx < 6; villageIdx++) {
        const env = resolveVillage(1444, regionKey, villageIdx);
        for (const p of env.persons.slice(0, 80)) {
          const bio = decodePerson(env, p.id, "en")!;
          for (const e of bio.events) {
            if (!e.refs?.length) continue;
            for (const r of e.refs) {
              sawRefs++;
              expect(e.text).toContain(r.name);
              const refEnv = resolveVillage(1444, r.addr.regionKey, r.addr.villageIdx);
              const target = refEnv.persons[r.id];
              expect(target).toBeDefined();
              expect(r.name === target.name || r.name === `${target.name} ${target.surname}`).toBe(true);
            }
          }
        }
      }
    }
    expect(sawRefs).toBeGreaterThan(0);
  });

  it("godparent, marriage, and stepfamily events carry refs somewhere in a scan", () => {
    let sawGodparentRefs = 0;
    let sawMarriageRefs = 0;
    for (let villageIdx = 0; villageIdx < 10; villageIdx++) {
      const env = resolveVillage(1444, "england", villageIdx);
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en")!;
        for (const e of bio.events) {
          if (e.text.includes("stood godparents") && e.refs?.length === 2) sawGodparentRefs++;
          if (e.kind === "marriage" && e.refs?.length) sawMarriageRefs++;
        }
      }
    }
    expect(sawGodparentRefs).toBeGreaterThan(0);
    expect(sawMarriageRefs).toBeGreaterThan(0);
  });
});

// § age text removed: an event's own displayed age (already shown on the
// timeline as "aet. N") must never ALSO be restated in the prose — some of
// those restatements could go stale/mismatch the actual randomized year
// (e.g. a texture event drawn anywhere in a multi-year window), so they
// were removed outright rather than trusted to stay in sync.
describe("§ age text removed from event prose", () => {
  const BANNED = ["at seven,", "at twelve,", "at twelve, as", "at fourteen", "als set anys", "als dotze anys", "als catorze anys"];

  it("none of the previously-hardcoded age phrases appear anywhere in a broad scan", () => {
    let checked = 0;
    for (const regionKey of REGION_KEYS) {
      for (const locale of LOCALES) {
        for (let villageIdx = 0; villageIdx < 6; villageIdx++) {
          const env = resolveVillage(1444, regionKey, villageIdx);
          for (const p of env.persons) {
            const bio = decodePerson(env, p.id, locale)!;
            checked++;
            for (const e of bio.events) {
              for (const phrase of BANNED) expect(e.text).not.toContain(phrase);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  }, 20000);

  it("the wardship event no longer states the orphaned age (still fires, still dated correctly)", () => {
    let seen = 0;
    for (let villageIdx = 0; villageIdx < 15; villageIdx++) {
      const env = resolveVillage(1444, "england", villageIdx);
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en")!;
        const e = bio.events.find((e) => e.text.includes("Orphaned of both parents"));
        if (!e) continue;
        seen++;
        expect(e.text).not.toMatch(/Orphaned of both parents at \d/);
        expect(e.age).toBe(e.year - bio.birth);
      }
    }
    expect(seen).toBeGreaterThan(0);
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
