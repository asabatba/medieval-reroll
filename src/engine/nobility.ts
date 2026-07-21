// =====================================================================
// § nobility — kings, noble houses, royal lines.
//
// Two layers, matching the engine's grounding rules:
//  - ROYAL_LINES (data/nobility.ts): the REAL sovereigns of each region.
//    Fixed historical data, no RNG — sovereignAt() is a plain lookup, the
//    same way the plague chronology and war years are data, not dice.
//  - Generated noble lines: the honour's baronial house (honourLineOf) and
//    each manor's lord line (manorLineOf). These are hierarchy.ts-style
//    pure functions of (worldSeed, address) — cheap, non-recursive, never
//    dependent on another village's envelope, so they can be called from
//    anywhere without risking a resolution cycle.
//
// The manor line is ANCHORED: it consumes the exact same rng stream (and
// leading draws) that manorOf() has always used for its static fief.lord,
// and the head holding the manor in ANCHOR_YEAR is forced to carry that
// name. So the lord printed on every existing fief card is now simply the
// mid-register head of a full dynasty that lordOfManorAt() extends back to
// the founders' era and forward to the end of the register.
// =====================================================================

import type { Locale } from "../i18n/locale.js";
import { JURISDICTIONS } from "./data/jurisdictions.js";
import { ROYAL_LINES } from "./data/nobility.js";
import { plagueAt } from "./data/plagues.js";
import { REGIONS } from "./data/regions.js";
import { addrHash, makeRng } from "./hash.js";
import type { LordTenure, NobleLine, Region, Reign, Rng, RoyalLine, WorldEvent } from "./types.js";

export { ROYAL_LINES } from "./data/nobility.js";

// ---- royal lines ----

export function royalLineOf(regionKey: string): RoyalLine | null {
  return ROYAL_LINES[regionKey] ?? null;
}

/** The reign in force in `year` — on a transition year the INCOMING reign
 * wins (1399 is Henry IV's year). Null outside the line's coverage. */
export function sovereignAt(regionKey: string, year: number): Reign | null {
  const line = ROYAL_LINES[regionKey];
  if (!line) return null;
  let found: Reign | null = null;
  for (const reign of line.reigns) if (reign.from <= year && year <= reign.to) found = reign;
  return found;
}

// ---- generated noble lines ----

// The register runs 1290–1490 with founders born from 1235; lines cover a
// comfortable margin on both sides so every year a biography can name has
// a lord to name.
export const LINE_FROM = 1230;
export const LINE_TO = 1500;

/** The year whose manor-line head reproduces manorOf()'s historical static
 * lord name — the plague generation, the middle of the register. */
export const ANCHOR_YEAR = 1360;

// Honours cluster a neighbourhood of manors under one baronial family (the
// draw hierarchy.ts's manorOf historically made itself; the constant and the
// draws live here now so the house and the fief card can never disagree).
export const HONOUR_CLUSTER = 9;

export function honourFamilyOf(worldSeed: number, regionKey: string, villageIdx: number): { earldom: string; surname: string; block: number } {
  const block = Math.floor(villageIdx / HONOUR_CLUSTER);
  const rng = makeRng(addrHash(worldSeed, [regionKey, "honour-block", block]));
  const earldom = rng.pick(JURISDICTIONS[regionKey].earldoms);
  const surname = rng.pick(REGIONS[regionKey].surnames);
  return { earldom, surname, block };
}

/** Grow a contiguous line of heads covering [LINE_FROM, LINE_TO]. The head
 * whose tenure contains ANCHOR_YEAR gets `anchorFirst` as his given name —
 * see the header comment. All draws come from the caller's rng, so the line
 * is as deterministic as any other envelope output. */
function growLine(rng: Rng, surname: string, anchorFirst: string, region: Region): LordTenure[] {
  // Real houses recycled a couple of dynastic names generation after
  // generation; keep a small pool seeded with the anchor's own name.
  const dynastic = [anchorFirst, rng.pick(region.maleNames), rng.pick(region.maleNames)];
  const heads: LordTenure[] = [];
  let born = rng.int(1188, 1206);
  let acceded = born + rng.int(24, 34);
  let relation: LordTenure["relation"] = "founder";
  for (let guard = 0; guard < 40 && acceded <= LINE_TO; guard++) {
    // Adult lifespans: most heads die in their late fifties or sixties, a
    // band dies young (war, sickness) — childhood mortality is invisible
    // here because a line's heads by definition survived to hold.
    const span = rng.weighted([
      [rng.int(24, 33), 1],
      [rng.int(34, 46), 2],
      [rng.int(47, 58), 3],
      [rng.int(59, 74), 4],
    ]);
    const prevDied = heads.length ? heads[heads.length - 1].died : Number.NEGATIVE_INFINITY;
    const died = Math.max(born + span, prevDied + 1, acceded + 1);
    const inWar = region.warYears.some(([a, b]) => died >= a && died <= b);
    const cause: LordTenure["cause"] = plagueAt(died) && rng.chance(0.5) ? "plague" : inWar && rng.chance(0.35) ? "war" : "oldage";
    const first = rng.chance(0.65) ? rng.pick(dynastic) : rng.pick(region.maleNames);
    heads.push({ name: `${first} ${surname}`, born, acceded, died, relation, cause });
    // Successor: usually a son (sometimes a minor, or posthumous — history
    // had wardships for exactly that); occasionally a brother or nephew,
    // which is what keeps a young head's death from ending the surname.
    const roll = rng();
    relation = roll < 0.82 ? "son" : roll < 0.92 ? "brother" : "nephew";
    const nextBorn = relation === "brother" ? born + rng.int(2, 9) : born + rng.int(22, 36);
    born = Math.min(nextBorn, died - 1);
    acceded = died;
  }
  // Force the anchor head to carry the legacy fief.lord given name.
  const anchor = headAt(heads, ANCHOR_YEAR);
  anchor.name = `${anchorFirst} ${surname}`;
  return heads;
}

function headAt(heads: LordTenure[], year: number): LordTenure {
  return heads.find((h) => year < h.died) ?? heads[heads.length - 1];
}

/** The baronial house holding the honour this village's manor belongs to. */
export function honourLineOf(worldSeed: number, regionKey: string, villageIdx: number): NobleLine {
  const region = REGIONS[regionKey];
  const { surname, block } = honourFamilyOf(worldSeed, regionKey, villageIdx);
  const rng = makeRng(addrHash(worldSeed, [regionKey, "honour-line", block]));
  const first = rng.pick(region.maleNames);
  return { surname, heads: growLine(rng, surname, first, region) };
}

/** The lord line of this village's own manor. Half the manors are held by a
 * cadet of the honour's baronial house (same surname), half by a lesser
 * knightly family of their own — the same split manorOf always drew. */
export function manorLineOf(worldSeed: number, regionKey: string, villageIdx: number): NobleLine {
  const region = REGIONS[regionKey];
  const { surname: honourSurname } = honourFamilyOf(worldSeed, regionKey, villageIdx);
  const rng = makeRng(addrHash(worldSeed, [regionKey, "manor", villageIdx]));
  // Legacy draw order (manorOf since v2) — do not reorder: the anchor name
  // these two draws produce is the fief.lord printed on every record.
  const anchorFirst = rng.pick(region.maleNames);
  const surname = rng.chance(0.5) ? honourSurname : rng.pick(region.surnames);
  return { surname, heads: growLine(rng, surname, anchorFirst, region) };
}

export function honourHeadAt(worldSeed: number, regionKey: string, villageIdx: number, year: number): LordTenure {
  return headAt(honourLineOf(worldSeed, regionKey, villageIdx).heads, year);
}

/** The lord of this village's manor AS OF a year — the name a court roll
 * dated that year would actually carry. */
export function lordOfManorAt(worldSeed: number, regionKey: string, villageIdx: number, year: number): LordTenure {
  return headAt(manorLineOf(worldSeed, regionKey, villageIdx).heads, year);
}

// ---- royal accession news, derived from the reign data ----

// Only transitions a living register person could plausibly react to.
const EVENT_FROM = 1292;
const EVENT_TO = 1495;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Generic accession-news text for royal transitions with no hand-written
 * `accession`; null where a king-shaped template would be nonsense
 * (interregna and Florence's republican regimes are all hand-written). */
function genericAccession(prev: Reign, next: Reign, locale: Locale): string | null {
  if (prev.interregnum || next.interregnum || prev.republic || next.republic) return null;
  const o = prev.style[locale];
  const n = next.style[locale];
  const end = prev.end ?? "died";
  if (locale === "ca") {
    if (end === "deposed")
      return `Van arribar noves que ${o} havia estat deposat del tron, i que ${n} regnava al seu lloc. A la taverna es discutia quins juraments seguien valent.`;
    if (end === "killed") return `Va córrer la nova que ${o} havia estat mort, i que la corona havia passat a ${n}.`;
    return `Amb els traginers va arribar la nova que ${o} era mort. ${cap(n)} fou coronat al seu lloc, i el rector digué una missa per l'ànima del rei difunt.`;
  }
  if (end === "deposed")
    return `Word came that ${o} had been put down from his throne, and that ${n} now reigned in his place. Men argued at the alehouse over what oaths were still owed.`;
  if (end === "killed") return `Word ran that ${o} had been slain, and that the crown had passed to ${n}.`;
  return `News came with the carriers that ${o} was dead. ${cap(n)} was crowned in his place, and the priest said a mass for the old king's soul.`;
}

const royalEventsCache: Partial<Record<Locale, WorldEvent[]>> = {};

/** Accession/deposition news as WORLD_EVENTS-shaped entries, generated from
 * ROYAL_LINES — one per reign transition inside the register era, gated per
 * person by the usual world-event chance roll in biography.ts. */
export function royalWorldEvents(locale: Locale): WorldEvent[] {
  const cached = royalEventsCache[locale];
  if (cached) return cached;
  const events: WorldEvent[] = [];
  for (const [regionKey, line] of Object.entries(ROYAL_LINES)) {
    for (let i = 1; i < line.reigns.length; i++) {
      const prev = line.reigns[i - 1];
      const next = line.reigns[i];
      if (next.from < EVENT_FROM || next.from > EVENT_TO) continue;
      const text = next.accession ? next.accession[locale] : genericAccession(prev, next, locale);
      if (!text) continue;
      // Notable (hand-written) transitions travelled further and faster.
      events.push([next.from, next.from, [regionKey], 8, next.accession ? 0.5 : 0.35, "life", "chron", () => text]);
    }
  }
  royalEventsCache[locale] = events;
  return events;
}
