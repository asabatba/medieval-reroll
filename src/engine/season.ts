// =====================================================================
// § the season — the year inside the year.
//
// Every date in this engine was a bare year. That is a real loss, because
// the one thing parish registers are unambiguously good for is
// SEASONALITY, and the medieval seasonal signature is strong, well
// evidenced, and completely unlike a uniform scatter:
//
//  - Marriages cluster into a few weeks and vanish entirely from others,
//    because canon law forbade them outright for about a third of the
//    year. The Sarum use kept three closed seasons: Advent Sunday to the
//    octave of Epiphany; Septuagesima to the octave of Easter; and
//    Rogation Sunday to the octave of Pentecost. Two of the three MOVE
//    with Easter, which is why this file computes the Julian Easter
//    rather than hard-coding a Lent. Mask those out of the year and the
//    famous register pattern falls out on its own: a peak in late
//    January before Septuagesima, a short window after the Easter
//    octave, and the great October–November peak after harvest and
//    before Advent.
//  - Ordinary burials peak in late winter and early spring. PLAGUE
//    burials do not: bubonic plague is a high-summer disease, following
//    the fleas, and a wave's burials pile into July and August. Famine
//    deaths peak in the hungry gap before the harvest. Drownings and
//    cart deaths peak at harvest. So the season a person died in is a
//    consequence of WHAT killed them, and the engine already knows that.
//  - Births peak in late winter — a conception peak in the spring — with
//    a lesser autumn peak and a midsummer trough.
//
// § no text churn. Nothing here is written into any narrative string.
// Dates ride on BioEvent.date and Bio.birthDate/deathDate as structured
// data, and the UI formats them — which keeps the engine's "plain prose
// only" rule intact, keeps the two locales from needing new text, and
// means adding this changed no existing sentence anywhere.
//
// § no re-rolled lives. Every draw here comes off its own side stream
// (hash.ts's personStream), never off the Tier-1 solve's rng or the
// Tier-2 decode's. A marriage date is keyed to the COUPLE index rather
// than to either spouse, so both halves of a marriage necessarily agree
// on the day — the same symmetry-by-construction argument the envelope
// itself rests on.
// =====================================================================
import { personStream } from "./hash.js";
import type { DeathCause, Envelope, MedievalDate, Person } from "./types.js";

export type { MedievalDate } from "./types.js";

/** Side-stream namespaces (hash.ts). Kept here rather than at the call
 * sites so that the biography and the village's own seasonal summary
 * cannot drift apart about which day a given baptism fell on. */
export const BIRTH_STREAM = 42000;
export const DEATH_STREAM = 43000;
export const MARRIAGE_STREAM = 44000;

/** The Julian calendar's leap rule — every fourth year, with none of the
 * century exceptions Gregory would add in 1582. Inside the register era
 * this is simply the rule that was in force. */
export function isLeapYear(year: number): boolean {
  return year % 4 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** 1-based day of the year. */
export function dayOfYear(year: number, month: number, day: number): number {
  let doy = day;
  for (let m = 1; m < month; m++) doy += daysInMonth(year, m);
  return doy;
}

export function fromDayOfYear(year: number, doy: number): MedievalDate {
  let d = Math.max(1, Math.min(daysInYear(year), Math.round(doy)));
  for (let m = 1; m <= 12; m++) {
    const len = daysInMonth(year, m);
    if (d <= len) return { month: m, day: d };
    d -= len;
  }
  return { month: 12, day: 31 };
}

/** Julian Day Number of a JULIAN-calendar date — used only to find which
 * days are Sundays, which is what Advent Sunday and Rogation Sunday are
 * defined in terms of. */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

/** JDN 0 is a Monday, so a Sunday is JDN ≡ 6 (mod 7). */
function isSunday(year: number, doy: number): boolean {
  const { month, day } = fromDayOfYear(year, doy);
  return julianDayNumber(year, month, day) % 7 === 6;
}

/** Easter in the JULIAN calendar (Meeus's algorithm) — the anchor the two
 * movable closed seasons hang off. Returns the day of the year. */
export function julianEasterDoy(year: number): number {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return dayOfYear(year, month, day);
}

export function julianEaster(year: number): MedievalDate {
  return fromDayOfYear(year, julianEasterDoy(year));
}

/** Advent Sunday: the Sunday on or after 27 November — i.e. the Sunday
 * nearest St Andrew's day. */
export function adventSundayDoy(year: number): number {
  let doy = dayOfYear(year, 11, 27);
  while (!isSunday(year, doy)) doy++;
  return doy;
}

/** The three Sarum closed seasons, as a mask over the days of the year:
 * true where a marriage could NOT be solemnized.
 *
 * Advent's season runs across the new year, so it is masked at both ends
 * of the same calendar year — which is right: the January days before
 * the octave of Epiphany are closed because of the PREVIOUS Advent, and
 * every year in the register era has both halves. */
export function marriageClosedMask(year: number): boolean[] {
  const len = daysInYear(year);
  const closed = new Array<boolean>(len + 1).fill(false);
  const mask = (from: number, to: number) => {
    for (let d = Math.max(1, from); d <= Math.min(len, to); d++) closed[d] = true;
  };
  // 1. From Advent Sunday to the octave of Epiphany (13 January).
  mask(1, dayOfYear(year, 1, 13));
  mask(adventSundayDoy(year), len);
  const easter = julianEasterDoy(year);
  // 2. Septuagesima (Easter − 63) to the octave of Easter (Easter + 7).
  mask(easter - 63, easter + 7);
  // 3. Rogation Sunday (Easter + 35) to the octave of Pentecost (Easter + 56).
  mask(easter + 35, easter + 56);
  return closed;
}

// ---- seasonal profiles ----
//
// Twelve weights, January first. These are shapes, not measurements: the
// relative heights follow the published seasonal indices for English and
// continental parish registers, and the point is the SHAPE — a summer
// plague, a spring burial peak, a November wedding.

type MonthWeights = readonly [number, number, number, number, number, number, number, number, number, number, number, number];

/** Marriage: the underlying preference, before the closed seasons are cut
 * out of it. The autumn peak is the harvest — a couple married when there
 * was food and money in the house and the year's work was done. */
const MARRIAGE: MonthWeights = [13, 10, 5, 8, 6, 8, 8, 6, 9, 13, 20, 4];

/** Births, from the spring conception peak. */
const BIRTH: MonthWeights = [9.5, 10.5, 10.5, 9, 8, 7, 6.5, 7, 9, 8, 7.5, 7.5];

/** Burials, by what actually killed them. */
const DEATH_SEASON: Record<DeathCause, MonthWeights> = {
  // Bubonic plague is a high-summer disease — the single most distinctive
  // seasonal signature in the whole medieval record, and the one that most
  // clearly separates a plague year's burials from an ordinary year's.
  plague: [2, 2, 3, 5, 8, 14, 20, 20, 13, 7, 3, 2],
  // The hungry gap: the old harvest exhausted, the new one not yet in.
  famine: [6, 7, 9, 11, 13, 14, 13, 9, 6, 4, 4, 4],
  // The campaigning season, and the disease that travelled with it.
  war: [3, 3, 5, 8, 11, 13, 14, 14, 12, 8, 5, 4],
  // Newborns die of the cold: a winter excess on top of the birth curve.
  infancy: [11, 11, 10.5, 9, 7.5, 6.5, 6.5, 7, 7.5, 7.5, 8, 8],
  // Children take the summer fluxes and the winter chest sicknesses both.
  childhood: [10, 10, 10, 8, 7, 7, 8, 9.5, 9, 7.5, 7, 7],
  // Childbed follows the births, a few days behind.
  childbirth: [9.5, 10.5, 10.5, 9, 8, 7, 6.5, 7, 9, 8, 7.5, 7.5],
  // Harvest machinery, summer water, and the roads in winter.
  accident: [6, 6, 7, 8, 9, 11, 13, 13, 10, 7, 5, 5],
  // Ale, festivals and long light evenings.
  violence: [6, 6, 7, 9, 10, 11, 11, 11, 9, 7, 6.5, 6.5],
  // The winter–spring peak, with the late-summer flux as a second shoulder.
  disease: [11, 11.5, 12, 10.5, 8.5, 6.5, 6.5, 7.5, 7.5, 6.5, 6, 6],
  // The old die in the cold, more sharply than anyone.
  oldage: [13, 13, 12.5, 10, 7.5, 5.5, 5, 5.5, 6, 6.5, 7.5, 8],
};

function pickMonth(roll: number, weights: MonthWeights): number {
  let total = 0;
  for (const w of weights) total += w;
  let x = roll * total;
  for (let m = 0; m < 12; m++) {
    x -= weights[m];
    if (x <= 0) return m + 1;
  }
  return 12;
}

/** Two independent uniforms from one 32-bit hash — enough for a month and
 * a day, and cheaper than standing up a full Rng for two draws. */
function split(h: number): [number, number] {
  const a = (h >>> 16) / 65536;
  const b = (h & 0xffff) / 65536;
  return [a, b];
}

function dateFrom(hash: number, year: number, weights: MonthWeights): MedievalDate {
  const [a, b] = split(hash);
  const month = pickMonth(a, weights);
  return { month, day: 1 + Math.floor(b * daysInMonth(year, month)) };
}

export function birthDateOf(hash: number, year: number): MedievalDate {
  return dateFrom(hash, year, BIRTH);
}

export function deathDateOf(hash: number, year: number, cause: DeathCause): MedievalDate {
  return dateFrom(hash, year, DEATH_SEASON[cause] ?? DEATH_SEASON.disease);
}

// The closed-season mask costs a Sunday search and an Easter computation,
// and a village register asks for the same handful of years over and over,
// so the weighted open-day table is built once per year and kept. Bounded
// by the register era, so it cannot grow without limit.
const openDaysCache = new Map<number, { doys: number[]; cum: number[]; total: number }>();

function openMarriageDays(year: number): { doys: number[]; cum: number[]; total: number } {
  const cached = openDaysCache.get(year);
  if (cached) return cached;
  const closed = marriageClosedMask(year);
  const len = daysInYear(year);
  const doys: number[] = [];
  const cum: number[] = [];
  let total = 0;
  for (let d = 1; d <= len; d++) {
    if (closed[d]) continue;
    const { month } = fromDayOfYear(year, d);
    total += MARRIAGE[month - 1];
    doys.push(d);
    cum.push(total);
  }
  const entry = { doys, cum, total };
  openDaysCache.set(year, entry);
  return entry;
}

/** The day a marriage was solemnized: drawn from the days canon law
 * actually left open in THAT year, weighted by the season. Keyed on the
 * couple, never on a spouse, so husband and wife always agree. */
export function marriageDateOf(hash: number, year: number): MedievalDate {
  const { doys, cum, total } = openMarriageDays(year);
  // Defensive only: no year in the register era has every day closed.
  if (!doys.length) return { month: 11, day: 11 };
  const [a] = split(hash);
  const x = a * total;
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return fromDayOfYear(year, doys[lo]);
}

/** True where the year's canon law forbade a wedding — so the UI can say
 * why the register has three holes in it. */
export function isClosedSeason(year: number, date: MedievalDate): boolean {
  return marriageClosedMask(year)[dayOfYear(year, date.month, date.day)] === true;
}

// ---- the same dates, for a whole register ----
//
// One definition of "which day was this person baptised" serves both the
// biography and the village's seasonal summary. Two implementations would
// eventually disagree, and a register whose summary contradicts its own
// entries is worse than one with no summary.

/** A person's baptism day — null for a founder, whose birth predates the register. */
export function personBirthDate(vHash: number, person: Person): MedievalDate | null {
  return person.founder ? null : birthDateOf(personStream(vHash, BIRTH_STREAM, person.id), person.birth);
}

export function personDeathDate(vHash: number, person: Person): MedievalDate {
  return deathDateOf(personStream(vHash, DEATH_STREAM, person.id), person.death.year, person.death.cause);
}

/** Keyed on the couple, so both spouses' records name the same wedding day. */
export function coupleMarriageDate(vHash: number, coupleIdx: number, year: number): MedievalDate {
  return marriageDateOf(personStream(vHash, MARRIAGE_STREAM, coupleIdx), year);
}

export interface SeasonalCounts {
  /** Twelve entries, January first. */
  births: number[];
  burials: number[];
  marriages: number[];
  /** Mean share of each month's days closed to weddings across the register era. */
  closedShare: number[];
}

/** How a village's whole register falls across the twelve months — the
 * seasonal signature that a year-only register could not show at all. */
export function seasonalCounts(env: Envelope, from: number, to: number): SeasonalCounts {
  const births = new Array(12).fill(0);
  const burials = new Array(12).fill(0);
  const marriages = new Array(12).fill(0);
  for (const p of env.persons) {
    if (p.birth >= from && p.birth <= to) {
      const b = personBirthDate(env.vHash, p);
      if (b) births[b.month - 1]++;
    }
    if (p.death.year >= from && p.death.year <= to) burials[personDeathDate(env.vHash, p).month - 1]++;
  }
  env.couples.forEach((c, i) => {
    if (c.year < from || c.year > to) return;
    marriages[coupleMarriageDate(env.vHash, i, c.year).month - 1]++;
  });

  // Averaged across the era rather than taken from one year: two of the
  // three closed seasons move with Easter, so no single year's mask is the
  // right thing to draw behind a summary of two centuries.
  const closedDays = new Array(12).fill(0);
  const totalDays = new Array(12).fill(0);
  for (let year = from; year <= to; year++) {
    const closed = marriageClosedMask(year);
    for (let m = 1; m <= 12; m++) {
      const len = daysInMonth(year, m);
      totalDays[m - 1] += len;
      const start = dayOfYear(year, m, 1);
      for (let d = start; d < start + len; d++) if (closed[d]) closedDays[m - 1]++;
    }
  }
  return { births, burials, marriages, closedShare: closedDays.map((n, i) => n / Math.max(1, totalDays[i])) };
}
