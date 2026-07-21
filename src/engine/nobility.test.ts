import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { REGIONS } from "./data/regions.js";
import { manorOf } from "./hierarchy.js";
import {
  ANCHOR_YEAR,
  honourFamilyOf,
  honourLineOf,
  LINE_FROM,
  LINE_TO,
  lordOfManorAt,
  manorLineOf,
  ROYAL_LINES,
  reignIndexAt,
  sovereignAt,
  tenureIndexAt,
} from "./nobility.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

// ---------------------------------------------------------------------
// Royal lines — fixed historical data, so these are checked as data: no
// gaps a register person could be born into, and known anchor years
// resolve to the sovereigns history actually had.
// ---------------------------------------------------------------------
describe("§ nobility: royal lines", () => {
  it("every region has a royal line whose reigns are ordered and contiguous", () => {
    for (const rk of REGION_KEYS) {
      const line = ROYAL_LINES[rk];
      expect(line, rk).toBeTruthy();
      for (let i = 1; i < line.reigns.length; i++) {
        const prev = line.reigns[i - 1];
        const next = line.reigns[i];
        expect(next.from, `${rk}: ${next.name.en}`).toBeGreaterThanOrEqual(prev.from);
        // At most a one-year gap (e.g. Rudolf I dies 1291, Adolf elected 1292).
        expect(next.from, `${rk}: ${prev.name.en} -> ${next.name.en}`).toBeLessThanOrEqual(prev.to + 1);
      }
    }
  });

  it("every year of the register era has a sovereign (or an explicit interregnum)", () => {
    for (const rk of REGION_KEYS) {
      for (let y = 1235; y <= 1500; y++) {
        expect(sovereignAt(rk, y), `${rk} ${y}`).toBeTruthy();
      }
    }
  });

  it("known anchor years resolve to the historically correct sovereign", () => {
    expect(sovereignAt("england", 1415)?.name.en).toBe("Henry V");
    expect(sovereignAt("england", 1381)?.name.en).toBe("Richard II");
    // On a transition year the incoming reign wins.
    expect(sovereignAt("england", 1399)?.name.en).toBe("Henry IV");
    expect(sovereignAt("england", 1483)?.name.en).toBe("Richard III");
    expect(sovereignAt("france", 1429)?.name.en).toBe("Charles VII");
    expect(sovereignAt("france", 1358)?.name.en).toBe("John II");
    expect(sovereignAt("catalonia", 1411)?.interregnum).toBe(true);
    expect(sovereignAt("catalonia", 1440)?.name.en).toBe("Alfonso V");
    expect(sovereignAt("catalonia", 1412)?.name.en).toBe("Ferdinand I");
    expect(sovereignAt("germany", 1356)?.name.en).toBe("Charles IV");
    expect(sovereignAt("italy", 1475)?.name.en).toContain("Lorenzo");
    expect(sovereignAt("italy", 1475)?.house?.en).toBe("Medici");
  });

  it("locale never changes the shape of a reign, only its text", () => {
    for (const rk of REGION_KEYS) {
      for (const reign of ROYAL_LINES[rk].reigns) {
        expect(reign.name.en).toBeTruthy();
        expect(reign.name.ca).toBeTruthy();
        expect(reign.style.en).toBeTruthy();
        expect(reign.style.ca).toBeTruthy();
        if (reign.accession) {
          expect(reign.accession.en).toBeTruthy();
          expect(reign.accession.ca).toBeTruthy();
        }
      }
    }
  });
});

// ---------------------------------------------------------------------
// Generated noble lines — deterministic, contiguous, demographically sane.
// ---------------------------------------------------------------------
describe("§ nobility: generated noble lines", () => {
  it("lines are deterministic: re-deriving an address yields the identical line", () => {
    for (const rk of REGION_KEYS) {
      for (const idx of [0, 3, 17]) {
        expect(manorLineOf(1444, rk, idx)).toEqual(manorLineOf(1444, rk, idx));
        expect(honourLineOf(1444, rk, idx)).toEqual(honourLineOf(1444, rk, idx));
      }
    }
  });

  it("successions are contiguous and cover the whole register era with sane lifespans", () => {
    for (const rk of REGION_KEYS) {
      for (let idx = 0; idx < 12; idx++) {
        for (const line of [manorLineOf(1444, rk, idx), honourLineOf(1444, rk, idx)]) {
          const heads = line.heads;
          expect(heads.length).toBeGreaterThanOrEqual(4);
          expect(heads[0].relation).toBe("founder");
          expect(heads[heads.length - 1].died).toBeGreaterThan(LINE_TO);
          expect(heads[0].acceded).toBeLessThanOrEqual(LINE_FROM + 10);
          for (let i = 0; i < heads.length; i++) {
            const h = heads[i];
            expect(h.name.endsWith(line.surname), `${rk}/${idx}: ${h.name} vs ${line.surname}`).toBe(true);
            expect(h.died).toBeGreaterThan(h.acceded);
            expect(h.acceded).toBeGreaterThan(h.born);
            expect(h.died - h.born).toBeGreaterThanOrEqual(20);
            expect(h.died - h.born).toBeLessThanOrEqual(100);
            if (i > 0) expect(h.acceded, `${rk}/${idx}: succession gap`).toBe(heads[i - 1].died);
          }
        }
      }
    }
  });

  it("the honour's baronial family is shared by the whole honour block, and the fief card agrees", () => {
    for (const rk of REGION_KEYS) {
      const fam = honourFamilyOf(1444, rk, 0);
      // Same block (villages 0..8 under HONOUR_CLUSTER=9) — same family.
      expect(honourFamilyOf(1444, rk, 8)).toEqual(fam);
      expect(honourLineOf(1444, rk, 5).surname).toBe(fam.surname);
      const fief = manorOf(1444, rk, 0, "en");
      expect(fief.honour).toContain(fam.surname);
      expect(fief.earldom).toContain(fam.earldom);
    }
  });

  it("anchoring contract: the fief card's static lord IS the manor line's head at ANCHOR_YEAR", () => {
    for (const rk of REGION_KEYS) {
      for (let idx = 0; idx < 20; idx++) {
        const fief = manorOf(1444, rk, idx, "en");
        expect(lordOfManorAt(1444, rk, idx, ANCHOR_YEAR).name).toBe(fief.lord);
      }
    }
  });

  it("lordOfManorAt resolves every register year to the head actually holding then", () => {
    for (const rk of REGION_KEYS) {
      const line = manorLineOf(1444, rk, 2);
      for (let y = 1235; y <= 1500; y += 7) {
        const h = lordOfManorAt(1444, rk, 2, y);
        expect(line.heads).toContainEqual(h);
        // He holds over [acceded, died) — except at the line's edges.
        if (h !== line.heads[0]) expect(h.acceded).toBeLessThanOrEqual(y);
        if (h !== line.heads[line.heads.length - 1]) expect(h.died).toBeGreaterThan(y);
      }
    }
  });
});

// ---------------------------------------------------------------------
// Biography integration — scan real envelopes, per testing conventions.
// ---------------------------------------------------------------------
describe("§ nobility: biography integration", () => {
  it("every bio names the sovereign reigning in its birth year", () => {
    for (const rk of REGION_KEYS) {
      const env = resolveVillage(1444, rk, 0);
      for (const p of env.persons.slice(0, 40)) {
        const bio = decodePerson(env, p.id, "en")!;
        expect(bio.sovereign).toBe(sovereignAt(rk, p.birth)?.style.en);
      }
    }
  });

  it("a merchet payment names the lord holding the manor in the MARRIAGE year", () => {
    let seen = 0;
    for (const rk of REGION_KEYS) {
      for (let idx = 0; idx < 8; idx++) {
        const env = resolveVillage(1444, rk, idx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en");
          const e = bio?.events.find((e) => e.text.includes("paid merchet to "));
          if (!bio || !e) continue;
          seen++;
          const heads = manorLineOf(1444, rk, idx).heads;
          const li = tenureIndexAt(heads, e.year);
          expect(e.text).toContain(heads[li].name);
          // § nobility links: the lord is a route ref to his OWN page
          expect(e.refs?.some((r) => r.route === "lord" && r.routeIdx === li && r.name === heads[li].name)).toBe(true);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("a change-of-lord event names the outgoing and incoming heads of this manor's own line", () => {
    let seen = 0;
    for (const rk of REGION_KEYS) {
      for (let idx = 0; idx < 6; idx++) {
        const env = resolveVillage(1444, rk, idx);
        const line = manorLineOf(1444, rk, idx);
        for (const p of env.persons) {
          const bio = decodePerson(env, p.id, "en");
          const e = bio?.events.find((e) => e.text.includes("entered the lordship"));
          if (!bio || !e) continue;
          seen++;
          const i = line.heads.findIndex((h) => h.acceded === e.year);
          expect(i).toBeGreaterThan(0);
          expect(e.text).toContain(line.heads[i].name);
          expect(e.text).toContain(line.heads[i - 1].name);
          // § nobility links: both lords are route refs to their own pages
          const lordRefs = e.refs?.filter((r) => r.route === "lord") ?? [];
          expect(lordRefs.length).toBeGreaterThanOrEqual(2);
          expect(lordRefs.map((r) => r.routeIdx)).toEqual(expect.arrayContaining([i - 1, i]));
          // The succession happened within the person's remembered life.
          expect(e.year).toBeGreaterThanOrEqual(p.birth + 10);
          expect(e.year).toBeLessThanOrEqual(p.death.year);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("royal accession news reaches villagers (Bosworth, 1485, England), with royal-line refs", () => {
    let seen = 0;
    for (let idx = 0; idx < 8 && !seen; idx++) {
      const env = resolveVillage(1444, "england", idx);
      for (const p of env.persons) {
        if (p.death.year < 1485 || p.birth > 1477) continue;
        const bio = decodePerson(env, p.id, "en");
        const e = bio?.events.find((e) => e.text.includes("Bosworth"));
        if (!e) continue;
        seen++;
        // § nobility links: the kings named in the news link to the royal line
        expect(e.refs?.some((r) => r.route === "royal")).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("every route ref names an exact text substring and targets a real, year-plausible person", () => {
    for (const rk of REGION_KEYS) {
      const reigns = ROYAL_LINES[rk].reigns;
      const env = resolveVillage(1444, rk, 0);
      for (const p of env.persons.slice(0, 60)) {
        const bio = decodePerson(env, p.id, "en");
        for (const e of bio?.events ?? []) {
          for (const r of e.refs ?? []) {
            if (!r.route) continue;
            expect(e.text, `${rk}: "${r.name}"`).toContain(r.name);
            expect(r.id).toBe(-1);
            expect(r.routeIdx).toBeGreaterThanOrEqual(0);
            if (r.route === "royal") {
              const reign = reigns[r.routeIdx!];
              expect(reign, `${rk}: "${r.name}" -> ${r.routeIdx}`).toBeDefined();
              // Year-aware resolution: if the sovereign in force at the
              // event's year answers to the matched alias, the ref must
              // point at THAT reign ("King Henry" in 1415 is Henry V).
              const inForce = reignIndexAt(rk, e.year);
              if (inForce >= 0) {
                const f = reigns[inForce];
                const answers = f.style.en.includes(r.name) || f.name.en.includes(r.name) || (f.aka ?? []).some((a) => a.en === r.name);
                if (answers) expect(r.routeIdx, `${rk} ${e.year}: "${r.name}"`).toBe(inForce);
              }
            } else {
              expect(manorLineOf(1444, r.addr.regionKey, r.addr.villageIdx).heads[r.routeIdx!]).toBeDefined();
            }
          }
        }
      }
    }
  });

  it("royal news never leaks across regions (no English king crowned in a Catalan chronicle)", () => {
    for (let idx = 0; idx < 4; idx++) {
      const env = resolveVillage(1444, "catalonia", idx);
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en");
        if (!bio) continue;
        for (const e of bio.events) {
          expect(e.text).not.toContain("Bosworth");
          expect(e.text).not.toContain("Lancaster crowned");
        }
      }
    }
  });
});
