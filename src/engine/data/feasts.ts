// =====================================================================
// § the season: the calendar people actually used.
//
// Medieval documents do not date by number. A court roll says "on the
// morrow of St Martin", a lease runs "from Michaelmas to Michaelmas", a
// man is born "on the feast of the Annunciation". The numbered day is
// ours; the feast was theirs, and it is how the year was navigated by
// people who could not read a number and had no calendar on the wall.
//
// So a date this engine derives (season.ts) gets its feast named when it
// lands on one — not instead of the number, which would make the register
// unreadable to a modern eye, but beside it. Two kinds:
//
//  - FIXED feasts, which sit on the same calendar day every year.
//  - MOVABLE ones, which hang off Easter and therefore move with it —
//    the same computation the closed marriage seasons rest on.
// =====================================================================

import { dayOfYear, julianEasterDoy } from "../season.js";
import type { LocalText } from "../types.js";

/** [month, day, name] — the feasts a villager would have named the day by. */
const FIXED: [number, number, LocalText][] = [
  [1, 1, { en: "New Year's Day", ca: "el Cap d'Any" }],
  [1, 6, { en: "Epiphany", ca: "l'Epifania" }],
  [1, 25, { en: "the Conversion of St Paul", ca: "la Conversió de sant Pau" }],
  [2, 2, { en: "Candlemas", ca: "la Candelera" }],
  [2, 24, { en: "St Matthias", ca: "sant Maties" }],
  [3, 12, { en: "St Gregory", ca: "sant Gregori" }],
  [3, 25, { en: "Lady Day", ca: "l'Anunciació" }],
  [4, 23, { en: "St George", ca: "sant Jordi" }],
  [4, 25, { en: "St Mark", ca: "sant Marc" }],
  [5, 1, { en: "May Day", ca: "el Primer de Maig" }],
  [5, 3, { en: "the Invention of the Cross", ca: "la Invenció de la Creu" }],
  [6, 11, { en: "St Barnabas", ca: "sant Bernabé" }],
  [6, 24, { en: "Midsummer", ca: "sant Joan" }],
  [6, 29, { en: "SS Peter and Paul", ca: "sant Pere i sant Pau" }],
  [7, 22, { en: "St Mary Magdalene", ca: "santa Maria Magdalena" }],
  [7, 25, { en: "St James", ca: "sant Jaume" }],
  [8, 1, { en: "Lammas", ca: "sant Pere ad Vincula" }],
  [8, 10, { en: "St Lawrence", ca: "sant Llorenç" }],
  [8, 15, { en: "the Assumption", ca: "l'Assumpció" }],
  [8, 24, { en: "St Bartholomew", ca: "sant Bartomeu" }],
  [9, 8, { en: "the Nativity of the Virgin", ca: "la Nativitat de la Mare de Déu" }],
  [9, 14, { en: "Holy Cross Day", ca: "l'Exaltació de la Creu" }],
  [9, 21, { en: "St Matthew", ca: "sant Mateu" }],
  [9, 29, { en: "Michaelmas", ca: "sant Miquel" }],
  [10, 18, { en: "St Luke", ca: "sant Lluc" }],
  [10, 28, { en: "SS Simon and Jude", ca: "sant Simó i sant Judes" }],
  [11, 1, { en: "All Saints", ca: "Tots Sants" }],
  [11, 2, { en: "All Souls", ca: "el dia dels Difunts" }],
  [11, 11, { en: "Martinmas", ca: "sant Martí" }],
  [11, 25, { en: "St Katherine", ca: "santa Caterina" }],
  [11, 30, { en: "St Andrew", ca: "sant Andreu" }],
  [12, 6, { en: "St Nicholas", ca: "sant Nicolau" }],
  [12, 13, { en: "St Lucy", ca: "santa Llúcia" }],
  [12, 21, { en: "St Thomas", ca: "sant Tomàs" }],
  [12, 25, { en: "Christmas", ca: "Nadal" }],
  [12, 26, { en: "St Stephen", ca: "sant Esteve" }],
  [12, 28, { en: "Holy Innocents", ca: "els sants Innocents" }],
];

/** [days from Easter, name]. Ash Wednesday and Septuagesima are here
 * because a date falling in them explains itself — the register is empty
 * of weddings around them for a reason (season.ts). */
const MOVABLE: [number, LocalText][] = [
  [-63, { en: "Septuagesima", ca: "la Septuagèsima" }],
  [-46, { en: "Ash Wednesday", ca: "el Dimecres de Cendra" }],
  [-7, { en: "Palm Sunday", ca: "el Diumenge de Rams" }],
  [-2, { en: "Good Friday", ca: "el Divendres Sant" }],
  [0, { en: "Easter Day", ca: "Pasqua" }],
  [35, { en: "Rogation Sunday", ca: "el diumenge de Rogacions" }],
  [39, { en: "Ascension Day", ca: "l'Ascensió" }],
  [49, { en: "Whitsun", ca: "Pentecosta" }],
  [56, { en: "Trinity Sunday", ca: "la Trinitat" }],
  [60, { en: "Corpus Christi", ca: "Corpus" }],
];

const fixedIndex = new Map<number, LocalText>();
for (const [m, d, name] of FIXED) fixedIndex.set(m * 100 + d, name);

/** The feast this date fell on, if any — movable first, since a movable
 * feast landing on a fixed one is the day people would have named. */
export function feastOf(year: number, month: number, day: number): LocalText | null {
  const easter = julianEasterDoy(year);
  const doy = dayOfYear(year, month, day);
  for (const [offset, name] of MOVABLE) if (easter + offset === doy) return name;
  return fixedIndex.get(month * 100 + day) ?? null;
}
