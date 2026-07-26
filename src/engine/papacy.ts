// =====================================================================
// § the Schism — the papal line a region actually obeyed.
//
// Built exactly the way nobility.ts builds the royal lines, and for the
// same reason: these are real men with known dates, so every function
// here is a lookup and none of them touches an rng. What is new is that
// the answer is REGION-SPECIFIC even though the data is shared — a fact
// no other lookup in the engine has. `sovereignAt("england", 1400)` and
// `sovereignAt("castile", 1400)` read different lines; `popeAt` reads the
// SAME three lines and returns different men, because between 1378 and
// 1417 the two realms were obeying different popes out of one Church.
//
// papalSeriesOf() flattens that into one contiguous list per region: the
// popes of England, the popes of Castile — which are two different lists
// with the same beginning and the same end and forty years of daylight in
// the middle. That list is the region's papal route (ui/render.ts), and
// the index into it is the address segment of one pontiff's own page,
// mirroring reignIndexAt/royalLineOf.
//
// Vacancies are computed, not written: a gap between two pontificates is
// a sede vacante, and a gap in the obedience table is something else
// entirely — a realm that recognised nobody — so the two are separate
// kinds here and read differently on the page.
// =====================================================================
import type { Locale } from "../i18n/locale.js";
import { JUBILEES, OBEDIENCE, PAPAL_LINES, type PapalLine, type Pontificate } from "./data/papacy.js";
import { REGIONS } from "./data/regions.js";
import type { WorldEvent } from "./types.js";

export type { PapalLine, PapalSeat, Pontificate } from "./data/papacy.js";
export { JUBILEES, OBEDIENCE, PAPAL_LINES } from "./data/papacy.js";

/** The register era, with the founders' generation ahead of it — the same
 * margin the noble lines cover, so every year a biography can name has a
 * pope to name. */
export const PAPACY_FROM = 1235;
export const PAPACY_TO = 1500;

/** One unbroken stretch of one region's papal history: a pontificate it
 * obeyed, a vacant see, or a refusal to obey anyone. */
export interface PapalTerm {
  from: number;
  to: number;
  /** "pope" carries `pope`; the other two carry null and mean what they say. */
  kind: "pope" | "vacant" | "noObedience";
  pope: Pontificate | null;
}

/** The line this region recognised in `year` — null where it recognised
 * none. Everything outside the Schism years is the undivided roman line,
 * which is why the obedience table only has to hold 1378–1417. */
export function obedienceAt(regionKey: string, year: number): PapalLine | null {
  const spans = OBEDIENCE[regionKey];
  if (spans) for (const [from, to, line] of spans) if (year >= from && year <= to) return line;
  return "roman";
}

/** The pontificate in force on `line` in `year` — on a transition year the
 * INCOMING pope wins, as with reigns. Null in a vacancy. */
function pontificateAt(line: PapalLine, year: number): Pontificate | null {
  let found: Pontificate | null = null;
  for (const p of PAPAL_LINES[line]) if (p.from <= year && year <= p.to) found = p;
  return found;
}

const seriesCache = new Map<string, PapalTerm[]>();

/** The popes of one region, as one contiguous list over [PAPACY_FROM,
 * PAPACY_TO] — the obedience table applied to the three lines and the
 * result run together, so vacancies and refusals of obedience appear as
 * terms of their own rather than as holes. */
export function papalSeriesOf(regionKey: string): PapalTerm[] {
  const cached = seriesCache.get(regionKey);
  if (cached) return cached;
  const terms: PapalTerm[] = [];
  for (let year = PAPACY_FROM; year <= PAPACY_TO; year++) {
    const line = obedienceAt(regionKey, year);
    const pope = line ? pontificateAt(line, year) : null;
    const kind: PapalTerm["kind"] = pope ? "pope" : line ? "vacant" : "noObedience";
    const last = terms[terms.length - 1];
    // Same man (or the same kind of gap) as last year: extend the run.
    if (last && last.kind === kind && last.pope === pope) {
      last.to = year;
      continue;
    }
    terms.push({ from: year, to: year, kind, pope });
  }
  seriesCache.set(regionKey, terms);
  return terms;
}

/** Index of the term covering `year` within papalSeriesOf(regionKey) — the
 * address segment of that pontiff's own page. -1 outside the coverage. */
export function popeIndexAt(regionKey: string, year: number): number {
  const series = papalSeriesOf(regionKey);
  for (let i = 0; i < series.length; i++) if (series[i].from <= year && year <= series[i].to) return i;
  return -1;
}

/** The term in force for this region in `year`. */
export function popeTermAt(regionKey: string, year: number): PapalTerm | null {
  const i = popeIndexAt(regionKey, year);
  return i < 0 ? null : papalSeriesOf(regionKey)[i];
}

/** The pope this region obeyed in `year`, or null in a vacancy or a
 * withdrawal of obedience. */
export function popeAt(regionKey: string, year: number): Pontificate | null {
  return popeTermAt(regionKey, year)?.pope ?? null;
}

/** A year of jubilee — plenary indulgence for those who kept the stations at Rome. */
export function jubileeAt(year: number): boolean {
  return JUBILEES.includes(year);
}

// ---- papal news, derived from the obedience data ----

// The same window royalWorldEvents uses: only transitions a living
// register person could have reacted to.
const EVENT_FROM = 1292;
const EVENT_TO = 1495;

function seatName(pope: Pontificate, locale: Locale): string {
  const names = { rome: { en: "Rome", ca: "Roma" }, avignon: { en: "Avignon", ca: "Avinyó" }, pisa: { en: "Pisa", ca: "Pisa" } };
  return names[pope.seat][locale];
}

/** The news of one transition in a region's own papal series. Returns null
 * where there is nothing a parish would have heard — a sede vacante of a
 * few months is not news, the election that ends it is.
 *
 * A term with NO pope in it is three different historical situations
 * depending on when it falls, and they read nothing alike: a realm that
 * has not yet decided which claimant to back (1378–86), a realm that has
 * renounced both of them on purpose (France, 1398), and the interval
 * after a council has put every claimant down and not yet elected anyone
 * (1415–17). The year is enough to tell them apart. */
function noObedienceText(from: number, locale: Locale): { text: string; weight: number } {
  const ca = locale === "ca";
  if (from <= 1386)
    return {
      text: ca
        ? "Hi hagué dos papes, un a Roma i un a Avinyó, i el rei no volgué dir a quin s'havia d'obeir fins que se sabés quin era el veritable. El rector deia les misses igualment i no anomenava cap dels dos."
        : "There were two popes, one at Rome and one at Avignon, and the king would not say which was to be obeyed until it should be known which was the true one. The priest said his masses regardless and named neither.",
      weight: 0.45,
    };
  if (from >= 1415)
    return {
      text: ca
        ? "El concili havia deposat o fet renunciar tots els papes que hi havia, i encara no n'havia elegit cap. Durant un temps la cristiandat no en tingué cap ni un, cosa que a molts els semblà que no canviava gran cosa."
        : "The council had deposed or made to resign every pope there was, and had not yet chosen another. For a time Christendom had none at all, which many thought made little difference.",
      weight: 0.4,
    };
  return {
    text: ca
      ? "Vingué l'ordre que ningú d'aquest reialme no obeís cap dels papes que es disputaven la seu, ni li pagués res. El rector la llegí des de l'altar i no sabé dir a qui s'havia d'encomanar la gent."
      : "Word came that none in this realm was to obey either of the popes who claimed the see, nor pay anything to them. The priest read it out from the altar and could not say whom folk were to pray under.",
    weight: 0.5,
  };
}

function transitionText(prev: PapalTerm, next: PapalTerm, locale: Locale): { text: string; weight: number } | null {
  const ca = locale === "ca";
  if (next.kind === "noObedience") return noObedienceText(next.from, locale);
  if (next.kind === "vacant") return null;
  const pope = next.pope!;
  // A change of OBEDIENCE — the realm changing sides, or coming back into
  // one Church — travelled far further than an ordinary election did.
  const changedSide = prev.kind === "noObedience" || (prev.kind === "pope" && prev.pope!.line !== pope.line);
  // Hand-written where the pontificate itself was the story — but only for
  // a region that picked him up AT HIS ACCESSION. A realm that came to an
  // existing pope years later (Castile declaring for Clement VII in 1381,
  // Aragon in 1387) did not experience his election as news; it experienced
  // its own crown changing sides, which is what the generic text below
  // actually describes. Using the note there had a Catalan villager hearing
  // about the conclave of 1378 as though it were happening in 1387.
  if (pope.note && next.from === pope.from) return { text: pope.note[locale], weight: changedSide ? 0.5 : 0.45 };
  if (changedSide)
    return {
      text: ca
        ? `Es proclamà que aquest reialme obeiria d'ara endavant ${pope.style[locale]}, a ${seatName(pope, locale)}, i que els juraments fets a l'altre no valien res. Als vells els costà de seguir el compte.`
        : `It was proclaimed that this realm would henceforth obey ${pope.style[locale]}, at ${seatName(pope, locale)}, and that oaths sworn to the other were worth nothing. The old men had trouble keeping count.`,
      weight: 0.5,
    };
  return {
    text: ca
      ? `Arribà la nova que el papa era mort i que ${pope.style[locale]} havia estat elegit al seu lloc. Es digué una missa, i les coses seguiren igual.`
      : `News came that the pope was dead and that ${pope.style[locale]} had been chosen in his place. A mass was said, and things went on as before.`,
    weight: 0.12,
  };
}

const papalEventsCache: Partial<Record<Locale, WorldEvent[]>> = {};

/** Papal news as WORLD_EVENTS-shaped entries, generated from the obedience
 * data — one per transition inside the register era, per region, gated by
 * the same per-person chance roll biography.ts uses for world events.
 * Jubilees are appended for every region, since Rome kept those for the
 * whole Church whoever was sitting in it. */
export function papalWorldEvents(locale: Locale): WorldEvent[] {
  const cached = papalEventsCache[locale];
  if (cached) return cached;
  const ca = locale === "ca";
  const events: WorldEvent[] = [];
  // Every region, not just the ones in the obedience table: a region with
  // no entry there simply held to the undivided line throughout, and it
  // should still hear about the elections and the Schism itself.
  for (const regionKey of Object.keys(REGIONS)) {
    const series = papalSeriesOf(regionKey);
    for (let i = 1; i < series.length; i++) {
      const next = series[i];
      if (next.from < EVENT_FROM || next.from > EVENT_TO) continue;
      const news = transitionText(series[i - 1], next, locale);
      if (!news) continue;
      events.push([next.from, next.from, [regionKey], 10, news.weight, "life", "chron", () => news.text]);
    }
  }
  for (const year of JUBILEES) {
    if (year < EVENT_FROM || year > EVENT_TO) continue;
    const text = ca
      ? `Fou any de jubileu, i el perdó plenari es guanyava a Roma per als qui hi anaven i complien les estacions. Del poble en marxaren uns quants; no tots tornaren.`
      : `It was a year of jubilee, and full pardon was to be had at Rome for those who went and kept the stations. A few went from the village; not all of them came back.`;
    events.push([year, year, null, 22, 0.14, "life", "chron", () => text]);
  }
  papalEventsCache[locale] = events;
  return events;
}
