// § the church's own line. Two things here are worth testing rather than
// eyeballing: that the succession is genuinely contiguous (a parish is
// never without a priest, and never has two at once), and that the
// generated turnover of 1349 lands where the bishops' institution
// registers actually put it — because that number is the whole reason to
// generate this line instead of naming one man.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { CLERGY_FROM, CLERGY_TO, incumbencyIndexAt, institutionsBetween, parishClergyOf, parishSeatOf, rectorAt } from "./clergy.js";
import { REGIONS } from "./data/regions.js";
import { bareParishOf, parishMotherVillageIdx } from "./hierarchy.js";
import { nobleLineCacheClear } from "./nobilityCache.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("§ the church's own line", () => {
  it("runs an unbroken succession across the whole register era, in every region", () => {
    for (const rk of REGION_KEYS) {
      for (let v = 0; v < 6; v++) {
        const line = parishClergyOf(1444, rk, v);
        expect(line.heads.length, `${rk}:${v}`).toBeGreaterThan(5);
        expect(line.heads[0].instituted, `${rk}:${v}`).toBeLessThanOrEqual(CLERGY_FROM);
        expect(line.heads[line.heads.length - 1].vacated, `${rk}:${v}`).toBeGreaterThanOrEqual(CLERGY_TO);
        for (let i = 0; i < line.heads.length; i++) {
          const h = line.heads[i];
          expect(h.vacated, `${rk}:${v} head ${i}`).toBeGreaterThanOrEqual(h.instituted);
          expect(h.born, `${rk}:${v} head ${i}`).toBeLessThan(h.instituted);
          // The successor enters the moment the living falls vacant — which
          // in a plague year really did mean the same year.
          if (i > 0) expect(h.instituted, `${rk}:${v} head ${i}`).toBe(line.heads[i - 1].vacated);
        }
      }
    }
  });

  it("is keyed to the parish, so a shared mother church has one priest and not five", () => {
    let sharedSeen = 0;
    let ownSeen = 0;
    for (let v = 0; v < 60; v++) {
      const bare = bareParishOf(1444, "england", v);
      const seat = parishSeatOf(1444, "england", v);
      if (bare.shared) {
        sharedSeen++;
        expect(seat).toBe(parishMotherVillageIdx(v));
        // Every village of the block reads the mother church's own line.
        expect(parishClergyOf(1444, "england", v)).toBe(parishClergyOf(1444, "england", seat));
      } else {
        ownSeen++;
        expect(seat).toBe(v);
      }
    }
    expect(sharedSeen).toBeGreaterThan(0);
    expect(ownSeen).toBeGreaterThan(0);
  });

  it("names a priest for every year any biography could ask about", () => {
    for (let y = 1235; y <= 1500; y += 5) {
      const h = rectorAt(1444, "england", 4, y);
      expect(h, `${y}`).toBeDefined();
      expect(h.name.length).toBeGreaterThan(2);
    }
    const line = parishClergyOf(1444, "england", 4);
    // The index is clamped at both edges, like tenureIndexAt.
    expect(incumbencyIndexAt(line.heads, 1000)).toBe(0);
    expect(incumbencyIndexAt(line.heads, 3000)).toBe(line.heads.length - 1);
  });

  it("is a pure function of the address — a re-solve reproduces it exactly", () => {
    nobleLineCacheClear();
    const a = JSON.stringify(parishClergyOf(1444, "france", 11));
    nobleLineCacheClear();
    expect(JSON.stringify(parishClergyOf(1444, "france", 11))).toBe(a);
    // A different world seed is a different line.
    expect(JSON.stringify(parishClergyOf(1445, "france", 11))).not.toBe(a);
  });

  it("kills the clergy of 1349 at something like the rate the institution registers show", () => {
    // The English diocesan registers put beneficed mortality in the Great
    // Mortality at roughly 40-45%. A generated line will not hit a point
    // value, but it has to land in the band — if it drifts to 5% or 80%
    // the single most legible fact this line exists to carry is wrong.
    let serving = 0;
    let dead = 0;
    for (let v = 0; v < 500; v++) {
      const line = parishClergyOf(1444, "england", v);
      if (parishSeatOf(1444, "england", v) !== v) continue;
      const h = line.heads.find((x) => x.instituted <= 1348 && x.vacated >= 1348);
      if (!h) continue;
      serving++;
      if (h.end === "plague" && h.vacated >= 1348 && h.vacated <= 1351) dead++;
    }
    expect(serving).toBeGreaterThan(100);
    const rate = dead / serving;
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.55);
  });

  it("gets some parishes through more than one priest inside a single plague year", () => {
    let multi = 0;
    let parishes = 0;
    for (let v = 0; v < 500; v++) {
      if (parishSeatOf(1444, "england", v) !== v) continue;
      parishes++;
      const counts = new Map<number, number>();
      for (const h of parishClergyOf(1444, "england", v).heads) {
        if (h.instituted < 1348 || h.instituted > 1351) continue;
        counts.set(h.instituted, (counts.get(h.instituted) ?? 0) + 1);
      }
      if ([...counts.values()].some((n) => n >= 2)) multi++;
    }
    expect(multi).toBeGreaterThan(0);
    // …but not so freely that it stops meaning anything.
    expect(multi / parishes).toBeLessThan(0.5);
  });

  it("splits the livings into rectories and appropriated vicarages", () => {
    let vicarages = 0;
    let rectories = 0;
    for (let v = 0; v < 200; v++) {
      if (parishSeatOf(1444, "england", v) !== v) continue;
      const line = parishClergyOf(1444, "england", v);
      expect(line.title).toBe(line.appropriated ? "vicar" : "rector");
      if (line.appropriated) vicarages++;
      else rectories++;
    }
    expect(vicarages).toBeGreaterThan(0);
    expect(rectories).toBeGreaterThan(vicarages);
  });

  it("only lists institutions that are really in the line, and never the first head", () => {
    const line = parishClergyOf(1444, "england", 3);
    const inst = institutionsBetween(line, 1300, 1450);
    expect(inst.length).toBeGreaterThan(0);
    for (const { incumbent, idx } of inst) {
      expect(idx).toBeGreaterThan(0);
      expect(line.heads[idx]).toBe(incumbent);
      expect(incumbent.instituted).toBeGreaterThanOrEqual(1300);
      expect(incumbent.instituted).toBeLessThanOrEqual(1450);
    }
  });
});

describe("§ the church's own line: biography integration", () => {
  it("narrates institutions that the parish's own line really holds, and links them", () => {
    let seen = 0;
    for (let v = 0; v < 8; v++) {
      const env = resolveVillage(1444, "england", v);
      const line = parishClergyOf(1444, "england", v);
      const names = new Set(line.heads.map((h) => h.name));
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en");
        for (const e of bio?.events ?? []) {
          for (const r of e.refs ?? []) {
            if (r.route !== "rector") continue;
            seen++;
            expect(names, `${r.name}`).toContain(r.name);
            expect(line.heads[r.routeIdx!].name).toBe(r.name);
            expect(e.text).toContain(r.name);
            // A priest is parish news: the year has to fall inside the life.
            expect(e.year).toBeGreaterThanOrEqual(bio!.birth);
            expect(e.year).toBeLessThanOrEqual(bio!.death.year);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("puts a priest on every record, and calls him what the living makes him", () => {
    for (const rk of REGION_KEYS) {
      const env = resolveVillage(1444, rk, 2);
      const line = parishClergyOf(1444, rk, 2);
      const bio = decodePerson(env, env.persons[0].id, "en")!;
      expect(bio.rector).toBe(line.heads[bio.rectorIdx].name);
      expect(bio.rectorTitle, rk).toBe(line.appropriated ? "vicar" : "rector");
      // The man serving in the year of the birth, not some fixed anchor.
      expect(bio.rectorIdx).toBe(incumbencyIndexAt(line.heads, bio.birth));
    }
  });
});
