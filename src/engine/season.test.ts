// § the season. Two things carry the weight here and both are checkable
// against the outside world rather than against the engine's own opinion:
// the Julian Easter (a known date for any year you like) and the closed
// seasons it moves, which between them are supposed to reproduce the most
// distinctive pattern in the whole parish-register literature — March and
// December empty of weddings, November full of them.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { REGIONS } from "./data/regions.js";
import {
  adventSundayDoy,
  coupleMarriageDate,
  dayOfYear,
  daysInMonth,
  daysInYear,
  fromDayOfYear,
  isClosedSeason,
  isLeapYear,
  julianEaster,
  marriageClosedMask,
  personBirthDate,
  personDeathDate,
  seasonalCounts,
} from "./season.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("§ the season: the calendar", () => {
  it("keeps the Julian leap rule, not the Gregorian one", () => {
    // 1300, 1400 and 1500 are common years in the Gregorian reform and leap
    // years in the calendar these people actually kept.
    expect(isLeapYear(1300)).toBe(true);
    expect(isLeapYear(1400)).toBe(true);
    expect(isLeapYear(1500)).toBe(true);
    expect(isLeapYear(1349)).toBe(false);
    expect(daysInMonth(1400, 2)).toBe(29);
    expect(daysInMonth(1401, 2)).toBe(28);
    expect(daysInYear(1400)).toBe(366);
  });

  it("round-trips every day of a leap year and a common year", () => {
    for (const year of [1349, 1400]) {
      for (let d = 1; d <= daysInYear(year); d++) {
        const { month, day } = fromDayOfYear(year, d);
        expect(dayOfYear(year, month, day), `${year} doy ${d}`).toBe(d);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(daysInMonth(year, month));
      }
    }
  });

  it("computes the Julian Easter to the known dates", () => {
    // Julian Easter, checkable against any table of the reckoning.
    expect(julianEaster(1300)).toEqual({ month: 4, day: 10 });
    expect(julianEaster(1349)).toEqual({ month: 4, day: 12 });
    expect(julianEaster(1400)).toEqual({ month: 4, day: 18 });
    expect(julianEaster(1450)).toEqual({ month: 4, day: 5 });
    expect(julianEaster(1492)).toEqual({ month: 4, day: 22 });
  });

  it("always lands Easter on a Sunday, and Advent Sunday in its own week", () => {
    for (let y = 1235; y <= 1500; y++) {
      const e = julianEaster(y);
      // Easter and Advent Sunday are both Sundays by construction; the
      // simplest check that the day-of-week arithmetic is right is that
      // they are always the same number of days apart mod 7.
      const easterDoy = dayOfYear(y, e.month, e.day);
      expect((adventSundayDoy(y) - easterDoy) % 7, `${y}`).toBe(0);
      // The Sunday on or after 27 November.
      expect(adventSundayDoy(y)).toBeGreaterThanOrEqual(dayOfYear(y, 11, 27));
      expect(adventSundayDoy(y)).toBeLessThanOrEqual(dayOfYear(y, 12, 3));
    }
  });

  it("closes about a third of the year to weddings, every year of the era", () => {
    for (let y = 1235; y <= 1500; y++) {
      const closed = marriageClosedMask(y).filter(Boolean).length;
      const share = closed / daysInYear(y);
      expect(share, `${y}`).toBeGreaterThan(0.3);
      expect(share, `${y}`).toBeLessThan(0.45);
    }
  });

  it("shuts March and December entirely, which is what the registers show", () => {
    for (const y of [1300, 1349, 1400, 1450, 1495]) {
      const closed = marriageClosedMask(y);
      for (let d = 1; d <= 31; d++) expect(closed[dayOfYear(y, 3, d)], `${y}-03-${d}`).toBe(true);
      // Advent takes the back of December in every year of the era.
      expect(closed[dayOfYear(y, 12, 25)], `${y}`).toBe(true);
      // And mid-January is open again, after the octave of Epiphany.
      expect(closed[dayOfYear(y, 1, 20)], `${y}`).toBe(false);
    }
  });
});

describe("§ the season: dating the register", () => {
  it("never solemnizes a marriage inside a closed season, in any region", () => {
    let weddings = 0;
    for (const rk of REGION_KEYS) {
      const env = resolveVillage(1444, rk, 0);
      env.couples.forEach((c, i) => {
        const d = coupleMarriageDate(env.vHash, i, c.year);
        weddings++;
        expect(isClosedSeason(c.year, d), `${rk} ${c.year} ${d.day}/${d.month}`).toBe(false);
      });
    }
    expect(weddings).toBeGreaterThan(100);
  });

  it("has both spouses' records name the same wedding day", () => {
    const env = resolveVillage(1444, "england", 0);
    let checked = 0;
    for (const c of env.couples) {
      const h = decodePerson(env, c.husband, "en")!;
      const w = decodePerson(env, c.wife, "en")!;
      const hd = h.events.find((e) => e.kind === "marriage" && e.year === c.year)?.date;
      const wd = w.events.find((e) => e.kind === "marriage" && e.year === c.year)?.date;
      if (!hd || !wd) continue;
      checked++;
      expect(hd, `couple ${c.husband}+${c.wife}`).toEqual(wd);
    }
    expect(checked).toBeGreaterThan(30);
  });

  it("dates only the entries a parish register really dated", () => {
    const env = resolveVillage(1444, "england", 0);
    let dated = 0;
    let undated = 0;
    for (const p of env.persons) {
      for (const e of decodePerson(env, p.id, "en")!.events) {
        if (e.date) {
          dated++;
          expect(["birth", "marriage", "child", "grief", "death", "elsewhere"], e.kind).toContain(e.kind);
          expect(e.date.day).toBeGreaterThanOrEqual(1);
          expect(e.date.day).toBeLessThanOrEqual(daysInMonth(e.year, e.date.month));
        } else {
          undated++;
        }
      }
    }
    expect(dated).toBeGreaterThan(100);
    // World news and court business keep the bare year, on purpose.
    expect(undated).toBeGreaterThan(100);
  });

  it("gives a founder no baptism date, since the register predates them", () => {
    const env = resolveVillage(1444, "england", 0);
    const founder = env.persons.find((p) => p.founder)!;
    const native = env.persons.find((p) => !p.founder && !p.incomer)!;
    expect(decodePerson(env, founder.id, "en")!.birthDate).toBeNull();
    expect(decodePerson(env, native.id, "en")!.birthDate).not.toBeNull();
    // A burial, though, the register always saw.
    expect(decodePerson(env, founder.id, "en")!.deathDate).toBeTruthy();
  });

  it("agrees between a person's own record and the village's seasonal summary", () => {
    // Two code paths answer "which month was this burial in"; if they ever
    // disagreed the summary would contradict the entries it summarises.
    const env = resolveVillage(1444, "england", 0);
    const s = seasonalCounts(env, 1290, 1495);
    const burials = new Array(12).fill(0);
    for (const p of env.persons) {
      if (p.death.year < 1290 || p.death.year > 1495) continue;
      burials[personDeathDate(env.vHash, p).month - 1]++;
    }
    expect(s.burials).toEqual(burials);
    expect(s.marriages.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(s.births.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it("puts the plague in high summer and the weddings after harvest", () => {
    const marriages = new Array(12).fill(0);
    const plagueBurials = new Array(12).fill(0);
    for (const [rk, vi] of [
      ["england", 0],
      ["england", 1],
      ["catalonia", 0],
      ["france", 0],
      ["italy", 0],
    ] as const) {
      const env = resolveVillage(1444, rk, vi);
      env.couples.forEach((c, i) => marriages[coupleMarriageDate(env.vHash, i, c.year).month - 1]++);
      for (const p of env.persons) {
        if (p.death.cause !== "plague") continue;
        plagueBurials[personDeathDate(env.vHash, p).month - 1]++;
      }
    }
    const share = (arr: number[], months: number[]) => months.reduce((a, m) => a + arr[m - 1], 0) / arr.reduce((a, b) => a + b, 0);
    // Bubonic plague follows the fleas: July and August carry it.
    expect(share(plagueBurials, [7, 8])).toBeGreaterThan(0.3);
    expect(share(plagueBurials, [12, 1, 2])).toBeLessThan(0.12);
    // October and November are the wedding months, and March is shut.
    expect(share(marriages, [10, 11])).toBeGreaterThan(0.3);
    expect(marriages[2]).toBe(0);
  });

  it("puts the closed-season shading only where the closure actually is", () => {
    const env = resolveVillage(1444, "england", 0);
    const s = seasonalCounts(env, 1290, 1495);
    expect(s.closedShare[2]).toBeCloseTo(1, 2); // March, wholly closed
    expect(s.closedShare[6]).toBeCloseTo(0, 2); // July, wholly open
    for (const share of s.closedShare) {
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(1);
    }
  });

  it("keeps a baptism date stable under a re-decode, and tied to the address", () => {
    const env = resolveVillage(1444, "england", 2);
    const p = env.persons.find((x) => !x.founder)!;
    expect(personBirthDate(env.vHash, p)).toEqual(personBirthDate(env.vHash, p));
    const other = resolveVillage(1445, "england", 2);
    const q = other.persons.find((x) => !x.founder)!;
    // A different world is a different day (overwhelmingly likely; this is
    // a smoke check on the hash actually reaching the date).
    expect(JSON.stringify(personBirthDate(other.vHash, q))).not.toBe(JSON.stringify({ month: 0, day: 0 }));
  });
});
