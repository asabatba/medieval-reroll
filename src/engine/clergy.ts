// =====================================================================
// § the church's own line — an incumbent for every parish.
//
// Every manor in this world has a dynasty: lordOfManorAt (nobility.ts)
// answers "who held this place in 1372" with a name, a father, a cause of
// death and a page of his own. The church, which a villager stood inside
// every week of their life and which baptised, married and buried every
// person on the register, had a pseudo-household in the year layer and an
// anonymous "the priest" in the prose. This is the same construction as
// manorLineOf, applied to the one institution that was actually there.
//
// Built on the PARISH, not the village — which is the whole reason it
// can't just borrow the manor's address. Roughly a third of blocks put
// several villages under one mother church (hierarchy.ts), and those
// villages shared a priest as surely as they shared a font, so the line
// is keyed to the parish SEAT and every chapelry in the block reads the
// same succession.
//
// Two things in it are not decoration:
//
//  - § the appropriated living. By the mid-fourteenth century something
//    like a third of English parishes had had their revenues granted away
//    to a monastery, which pocketed the great tithes and paid a salaried
//    VICAR to do the work. Whether this parish is one of them changes the
//    title of the man, who presented him, and where the corn went — and
//    it is a fact about the parish, so it is drawn once for the seat and
//    holds for every village under it.
//
//  - § the mortality of 1349. The bishops' institution registers are the
//    best serial evidence for the Black Death that survives anywhere,
//    precisely because a dead rector had to be replaced and the
//    replacement had to be written down. They show something like 40–45%
//    of English beneficed clergy dead in a single year, and parishes that
//    got through three or four incumbents inside twelve months. That is
//    what makes this line worth generating rather than naming: run the
//    turnover honestly off the plague chronology, and the register of
//    incumbents shows the year without anyone having to say so.
//
// Pure function of (worldSeed, address), cached like the noble lines —
// never touches the Tier-1 solve's rng, never needs another village's
// envelope, so it can be called from anywhere.
// =====================================================================
import { SAINTS } from "./data/jurisdictions.js";
import { PLAGUES, plagueAt } from "./data/plagues.js";
import { REGIONS } from "./data/regions.js";
import { addrHash, makeRng } from "./hash.js";
import { bareParishOf, parishMotherVillageIdx } from "./hierarchy.js";
import { nobleLineCacheGet, nobleLineCacheSet } from "./nobilityCache.js";
import type { Rng } from "./types.js";

/** Wide enough that every year any biography can name has an incumbent. */
export const CLERGY_FROM = 1230;
export const CLERGY_TO = 1500;

/** Runaway guards. A parish gets through a lot of priests in 270 years —
 * and a plague year can install three in twelve months — so the head cap
 * is generous; SAME_YEAR_LIMIT is what actually stops a chain of
 * zero-length tenures from running away inside one year. */
const HEAD_LIMIT = 90;
const SAME_YEAR_LIMIT = 4;

export type IncumbencyEnd = "died" | "plague" | "resigned" | "exchanged";

export interface Incumbent {
  name: string;
  born: number;
  /** Year he was instituted to the living. */
  instituted: number;
  /** Year the living fell vacant again — he holds [instituted, vacated). */
  vacated: number;
  end: IncumbencyEnd;
}

export interface ClergyLine {
  /** The village whose parish this is — the seat every chapelry reads from. */
  seatVillageIdx: number;
  /** § the appropriated living: the great tithes belong to a religious house. */
  appropriated: boolean;
  /** A salaried vicar where the living is appropriated, a rector where it is not. */
  title: "rector" | "vicar";
  /** Index into SAINTS — the house that holds an appropriated living. Localized by the caller. */
  patronSaintIdx: number;
  heads: Incumbent[];
}

/** The village address whose parish line serves this village — itself, or
 * the mother church of its block. */
export function parishSeatOf(worldSeed: number, regionKey: string, villageIdx: number): number {
  return bareParishOf(worldSeed, regionKey, villageIdx).shared ? parishMotherVillageIdx(villageIdx) : villageIdx;
}

/** How likely this incumbent is to die in a given year of a given wave.
 * Scaled off the plague's own severity multiplier (data/plagues.ts), so
 * the Great Mortality's 14 lands near the ~45% the institution registers
 * actually show and the lesser fifteenth-century waves stay minor. */
function plagueRisk(severity: number): number {
  return Math.min(0.5, severity / 31);
}

function growClergy(rng: Rng, regionKey: string): Incumbent[] {
  const names = REGIONS[regionKey].maleNames;
  const surnames = REGIONS[regionKey].surnames;
  const heads: Incumbent[] = [];
  let instituted = CLERGY_FROM - rng.int(0, 14);
  let born = instituted - rng.int(26, 40);
  let sameYear = 0;

  for (let guard = 0; guard < HEAD_LIMIT && instituted <= CLERGY_TO; guard++) {
    // Incumbencies were not lives. A benefice was property: men resigned
    // them, and above all EXCHANGED them — there was a working market in
    // swapping one living for another nearer home or worth more — so a
    // large share of these end with the man walking away rather than dying
    // in post, and short tenures are common for that reason alone.
    const span = rng.weighted([
      [rng.int(1, 5), 2],
      [rng.int(6, 14), 4],
      [rng.int(15, 28), 3],
      [rng.int(29, 44), 1],
    ]);
    let vacated = instituted + span;
    let end: IncumbencyEnd = rng.chance(0.42) ? (rng.chance(0.55) ? "exchanged" : "resigned") : "died";

    // § the mortality of 1349: any wave his tenure runs through can take
    // him, and the earliest one that does is the one that did.
    if (sameYear < SAME_YEAR_LIMIT) {
      for (const pl of PLAGUES) {
        const from = Math.max(instituted, pl[0]);
        const to = Math.min(vacated, pl[1]);
        if (from > to) continue;
        if (!rng.chance(plagueRisk(pl[2]))) continue;
        vacated = rng.int(from, to);
        end = "plague";
        break;
      }
    }

    // Nobody serves past a plausible age; a very old man dies in post.
    if (vacated - born > 82) {
      vacated = born + 82;
      end = "died";
    }
    if (vacated < instituted) vacated = instituted;

    heads.push({ name: `${rng.pick(names)} ${rng.pick(surnames)}`, born, instituted, vacated, end });

    sameYear = vacated === instituted ? sameYear + 1 : 0;
    // The successor is instituted the moment the living falls vacant —
    // which in a plague year really did mean the same year, and sometimes
    // twice over.
    born = vacated - rng.int(26, 45);
    instituted = vacated;
  }
  return heads;
}

/** The succession of parish priests serving this village's church. */
export function parishClergyOf(worldSeed: number, regionKey: string, villageIdx: number): ClergyLine {
  const seat = parishSeatOf(worldSeed, regionKey, villageIdx);
  const key = `clergy|${worldSeed}|${regionKey}|${seat}`;
  const cached = nobleLineCacheGet<ClergyLine>(key);
  if (cached) return cached;
  const rng = makeRng(addrHash(worldSeed, [regionKey, "parish-clergy", seat]));
  // § the appropriated living, drawn first so adding anything below it can
  // never move it: it is the fact the rest of the parish page hangs on.
  const appropriated = rng.chance(0.33);
  const patronSaintIdx = rng.int(0, SAINTS.en.length - 1);
  const line: ClergyLine = {
    seatVillageIdx: seat,
    appropriated,
    title: appropriated ? "vicar" : "rector",
    patronSaintIdx,
    heads: growClergy(rng, regionKey),
  };
  nobleLineCacheSet(key, line);
  return line;
}

/** Index of the incumbent serving in `year` — the address segment of his
 * own page. Clamped to the line's edges, mirroring tenureIndexAt. Skips
 * the zero-length tenures a plague year produces, so the man the year
 * actually ended with is the one it names. */
export function incumbencyIndexAt(heads: Incumbent[], year: number): number {
  const i = heads.findIndex((h) => year < h.vacated);
  return i < 0 ? heads.length - 1 : i;
}

/** The priest serving this village's church AS OF a year. */
export function rectorAt(worldSeed: number, regionKey: string, villageIdx: number, year: number): Incumbent {
  const line = parishClergyOf(worldSeed, regionKey, villageIdx);
  return line.heads[incumbencyIndexAt(line.heads, year)];
}

/** Every institution to this living inside [from, to] — the register of
 * incumbents a bishop's clerk would have kept, which is exactly what makes
 * a plague year legible: count the entries. */
export function institutionsBetween(line: ClergyLine, from: number, to: number): { incumbent: Incumbent; idx: number }[] {
  const out: { incumbent: Incumbent; idx: number }[] = [];
  line.heads.forEach((incumbent, idx) => {
    if (idx > 0 && incumbent.instituted >= from && incumbent.instituted <= to) out.push({ incumbent, idx });
  });
  return out;
}

/** Whether a year saw the living fall vacant by pestilence — the fact the
 * institution registers are famous for. */
export function plagueVacancyAt(line: ClergyLine, year: number): Incumbent | null {
  for (const h of line.heads) if (h.end === "plague" && h.vacated === year && plagueAt(year)) return h;
  return null;
}
