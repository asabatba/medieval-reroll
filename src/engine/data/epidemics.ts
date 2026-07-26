// =====================================================================
// § named epidemics — breaking the grey bucket, once more.
//
// types.ts already records why `accident` and `violence` were carved out
// of `disease`: it was taking ~40% of all deaths and swallowing things
// that were not diseases at all. What was left is still a bucket. Every
// death in it draws from one undifferentiated pool of fevers, in every
// region, in every year of the register — so a Tuscan dying in 1400 and a
// Yorkshireman dying in 1400 die of the same anonymous illness, and the
// one epidemic the period is famous for is the only one that is ever
// named.
//
// The medieval record is better than that. The chroniclers name their
// epidemics, and some of them are sharply dated and sharply local: the
// sweating sickness that arrived with Henry Tudor's army in 1485 and was
// never seen outside England; the rye-country ergotism that burned the
// limbs off villagers in France and the Rhineland and was unknown in the
// olive south; the tertian ague that made the Italian lowlands
// notoriously unhealthy all year round and every year.
//
// Two shapes, one table. A dated entry is an outbreak (`news` gives the
// chronicle its line about it); an undated one runs the whole register and
// is endemic — a fact about where you live rather than about when. First
// match wins, so the dated outbreaks are listed first and claim the year
// from the endemic background.
//
// § naming, not hazard. This changes what a death is CALLED, never how
// likely it was: the causes themselves are rolled at Tier 1 (mortality.ts)
// and touching them would re-roll every envelope in every world. Wiring
// these into the hazard belongs with the harvest series, where the
// re-roll is paid for once and deliberately.
// =====================================================================
import type { Locale } from "../../i18n/locale.js";
import type { LocalText, Rng } from "../types.js";

export interface Epidemic {
  from: number;
  to: number;
  /** Regions this one reached; null for everywhere. */
  regions: string[] | null;
  name: LocalText;
  /** How often it claims a `disease` death inside its window — 1 would mean every one. */
  chance: number;
  ageMin?: number;
  ageMax?: number;
  /** Burial-entry detail, in place of the generic disease pool. */
  detail: Record<Locale, string[]>;
  /** Chronicle news, for an outbreak the parish would have talked about. */
  news?: LocalText;
}

export const EPIDEMICS: Epidemic[] = [
  // ---- dated outbreaks ----
  {
    // Arrived with the army that won Bosworth, killed within hours rather
    // than days, took grown men in their strength rather than the poor and
    // the weak, and was never once recorded outside England.
    from: 1485,
    to: 1487,
    regions: ["england"],
    name: { en: "the sweating sickness", ca: "la malaltia de la suor" },
    chance: 0.75,
    ageMin: 12,
    detail: {
      en: [
        "took the sweating sickness that came in with the new king's soldiers: well at dinner, and dead before the same hour the next day",
        "died of the sweat, which killed in a night and spared the old and the poor as it did not spare the strong",
        "was taken by the sweating sickness, the shivering coming on first and then the drenching heat, and was gone within a day",
      ],
      ca: [
        "va agafar la malaltia de la suor que entrà amb els soldats del nou rei: sa al dinar, i mort abans de la mateixa hora de l'endemà",
        "va morir de la suor, que matava en una nit i planyia els vells i els pobres com no planyia els forts",
        "fou pres per la malaltia de la suor, primer els calfreds i després la calor amarada, i se n'anà en un dia",
      ],
    },
    news: {
      en: "A new sickness came into the country with the soldiers — men called it the sweat, for it took a man shivering and then drenched him, and killed him between one dinner and the next. It struck the hale and the well-fed hardest, which the old pestilence never did.",
      ca: "Una malaltia nova entrà al país amb els soldats — en deien la suor, perquè agafava l'home amb calfreds i després l'amarava, i el matava entre un dinar i el següent. Colpia sobretot els sans i els ben alimentats, cosa que la vella pestilència no feia mai.",
    },
  },
  {
    // The dearth years at the end of the 1430s: two failed harvests and a
    // fever that ran with them, worst in the north.
    from: 1438,
    to: 1440,
    regions: ["england", "scotland"],
    name: { en: "the sickness of the dear years", ca: "la malaltia dels anys cars" },
    chance: 0.55,
    detail: {
      en: [
        "died of the fever that ran through the dear years, when bread was at famine price and folk ate what they could get",
        "sickened in the second of the dear years and died of a flux, as many did who had eaten badly through two winters",
      ],
      ca: [
        "va morir de la febre que corregué pels anys cars, quan el pa era a preu de fam i la gent menjava el que podia trobar",
        "emmalaltí el segon dels anys cars i morí d'un flux, com tants que havien menjat malament durant dos hiverns",
      ],
    },
    news: {
      en: "Two harvests failed one after the other and the price of corn went past all reason. A sickness came behind the hunger, as it always does, and the burials that year were mostly of the poorest sort.",
      ca: "Dues collites fallaren l'una rere l'altra i el preu del blat passà tota raó. Darrere la fam vingué una malaltia, com sempre, i els enterraments d'aquell any foren sobretot dels més pobres.",
    },
  },
  {
    // A general catarrhal epidemic — the chroniclers describe something
    // that ran through whole towns at once and killed the old.
    from: 1427,
    to: 1428,
    regions: null,
    name: { en: "the great rheum", ca: "el gran refredament" },
    chance: 0.5,
    detail: {
      en: [
        "died of the coughing sickness that went through the whole country that winter, taking the old and the short-winded",
        "took the great rheum, which laid up every house in the parish at once and carried off those who could not throw it off",
      ],
      ca: [
        "va morir de la malaltia de la tos que recorregué tot el país aquell hivern, i s'endugué els vells i els de poc alè",
        "va agafar el gran refredament, que ajagué totes les cases de la parròquia alhora i s'endugué els qui no el pogueren treure",
      ],
    },
    news: {
      en: "A coughing sickness went through the country that winter and left no house untouched, though it killed chiefly the old. For a fortnight there were not men enough on their feet to get the work done.",
      ca: "Una malaltia de tos recorregué el país aquell hivern i no deixà cap casa sense tocar, encara que matava sobretot els vells. Durant una quinzena no hi hagué prou homes drets per fer la feina.",
    },
  },

  // ---- endemic: a fact about where you live, not about when ----
  //
  // Nothing here targets children, deliberately. `disease` is an ADULT
  // residual: deaths under ten already reach their own causes (`infancy`,
  // `childhood`) with their own pools, and those pools already name the
  // smallpox, the measles and the summer flux. An age-gated child entry
  // here would have been unreachable code duplicating text that exists.
  {
    // The Maremma, the Campagna, the drained-and-undrained lowlands: the
    // tertian and quartan agues were the standing reason Italians did not
    // live where the land was flattest and richest.
    from: 1235,
    to: 1500,
    regions: ["italy"],
    name: { en: "the ague", ca: "les febres" },
    chance: 0.34,
    ageMin: 5,
    detail: {
      en: [
        "died of the tertian ague, the fever returning every third day through a whole summer until there was nothing left of {{him/her}}",
        "took the quartan fever off the low ground, as those who worked the flat land did, and never fully rose from it",
        "died of the marsh fever, which everyone in the plain has and which kills slowly, over years, by wearing out",
      ],
      ca: [
        "va morir de les febres terçanes, que tornaven cada tercer dia durant tot un estiu fins que no en quedà res",
        "va agafar la febre quartana de la terra baixa, com feien els qui treballaven el pla, i no se n'aixecà mai del tot",
        "va morir de la febre dels aiguamolls, que tothom de la plana té i que mata a poc a poc, al llarg dels anys, de desgast",
      ],
    },
  },
  {
    // St Anthony's fire: ergot in the rye, which is why it belongs to the
    // rye country and not to the wheat and olive south. The burning, the
    // blackened limbs and the visions are all in the chronicles.
    from: 1235,
    to: 1500,
    regions: ["france", "germany"],
    name: { en: "St Anthony's fire", ca: "el foc de sant Antoni" },
    chance: 0.16,
    ageMin: 5,
    detail: {
      en: [
        "died of St Anthony's fire, the burning coming into the hands and feet after a winter of bad rye, and the flesh blackening before the end",
        "was taken with the fire-sickness that comes of spoiled rye — the cramps first, then the burning, then the visions — and died raving",
      ],
      ca: [
        "va morir del foc de sant Antoni, amb la cremor entrant a les mans i als peus després d'un hivern de sègol dolent, i la carn ennegrint-se abans de la fi",
        "fou pres pel mal del foc que ve del sègol malmès — primer les rampes, després la cremor, després les visions — i morí delirant",
      ],
    },
  },
  {
    // Dysentery. Ubiquitous, seasonal, and the thing a medieval community
    // most reliably died of when it was not dying of something famous.
    from: 1235,
    to: 1500,
    regions: null,
    name: { en: "the bloody flux", ca: "el flux de sang" },
    chance: 0.3,
    ageMin: 10,
    detail: {
      en: [
        "died of the bloody flux in the wet end of the summer, when the wells were low and foul",
        "took the flux and wasted with it for a month before dying, which the parish thought a hard way to go",
      ],
      ca: [
        "va morir del flux de sang al final humit de l'estiu, quan els pous eren baixos i pudents",
        "va agafar el flux i s'hi consumí un mes abans de morir, cosa que la parròquia trobà una mala manera d'anar-se'n",
      ],
    },
  },
  {
    // Consumption: slow, unmistakable, and named in every language.
    from: 1235,
    to: 1500,
    regions: null,
    name: { en: "consumption", ca: "la tisi" },
    chance: 0.24,
    ageMin: 14,
    detail: {
      en: [
        "died of a consumption, having coughed and thinned for two years while everyone waited for it",
        "wasted away of the consumption that had already taken others of the same house, coughing blood at the last",
      ],
      ca: [
        "va morir d'una tisi, després de tossir i aprimar-se dos anys mentre tothom ho esperava",
        "es consumí de la tisi que ja s'havia endut altres de la mateixa casa, tossint sang al final",
      ],
    },
  },
];

/** The epidemic that claims a `disease` death of this age, in this region
 * and year. Candidates are tried in table order — so a dated outbreak gets
 * first refusal — and a candidate that does not claim the death FALLS
 * THROUGH to the next rather than ending the search: an Italian who did
 * not die of the ague could still die of a consumption, and an Englishman
 * who saw out the sweating sickness of 1485 could still die of the flux
 * in it. Each candidate draws its own roll, so they stay independent.
 *
 * The rng is the caller's (§ pure decode) — biography.ts hands it a side
 * stream so nothing here can disturb the decode's own draw order. */
export function epidemicAt(year: number, regionKey: string, age: number, rng: Rng): Epidemic | null {
  for (const e of EPIDEMICS) {
    if (year < e.from || year > e.to) continue;
    if (e.regions && !e.regions.includes(regionKey)) continue;
    if (e.ageMin != null && age < e.ageMin) continue;
    if (e.ageMax != null && age > e.ageMax) continue;
    if (rng.chance(e.chance)) return e;
  }
  return null;
}

/** The dated outbreaks a chronicle would have carried, as (year, region,
 * text) triples for biography.ts to gate per person. */
export function epidemicNews(locale: Locale): { from: number; to: number; regions: string[] | null; text: string }[] {
  return EPIDEMICS.filter((e) => e.news && e.to - e.from < 20).map((e) => ({ from: e.from, to: e.to, regions: e.regions, text: e.news![locale] }));
}
