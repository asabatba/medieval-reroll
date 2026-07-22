// =====================================================================
// Place names beyond the curated flagship villages. `REGIONS[key].places`
// holds a handful of hand-written, richly specific villages (the ones most
// likely to be the first thing anyone reads); every villageIdx at or past
// that curated list is instead named by this deterministic combinatorial
// generator, keyed off (worldSeed, regionKey, villageIdx) — cheap,
// non-recursive, no memo needed, same contract as hierarchy.ts's
// parishOf/manorOf. This is what keeps "browse forever" from surfacing the
// same five place names over and over past village #5.
// =====================================================================
import { addrHash, makeRng } from "../hash.js";
import type { LocalText, Rng } from "../types.js";
import { REGIONS } from "./regions.js";

interface RegionNameKit {
  prefixes: string[];
  suffixes: string[];
  /** Fully phrased trailing clause, identical proper-noun content in both locales. */
  qualifiers: [en: string, ca: string][];
  /** [village-word en, village-word ca], e.g. ["the village of", "el poble de"]. */
  words: [en: string, ca: string][];
  /** Saint-name compound villages (Saint-Ouen, Sant Pere...) — a real medieval naming pattern in France and Catalonia. */
  saintPrefixes?: string[];
  saintTails?: string[];
  saintChance?: number;
}

const KITS: Record<string, RegionNameKit> = {
  england: {
    prefixes: [
      "Ash",
      "Elm",
      "Thorn",
      "Stan",
      "Brad",
      "Milden",
      "Colne",
      "Hart",
      "Wray",
      "Fen",
      "Combe",
      "Whit",
      "Dun",
      "Ock",
      "Bramp",
      "Long",
      "Cold",
      "Nether",
    ],
    suffixes: ["leigh", "ton", "stoke", "ham", "worth", "by", "wick", "don", "field", "bury", "cote", "hurst", "mere", "ley", "combe", "stead"],
    qualifiers: [
      ["Kent", "Kent"],
      ["Huntingdonshire", "Huntingdonshire"],
      ["Yorkshire", "Yorkshire"],
      ["Worcestershire", "Worcestershire"],
      ["Suffolk", "Suffolk"],
      ["Norfolk", "Norfolk"],
      ["Devon", "Devon"],
      ["Somerset", "Somerset"],
      ["Essex", "Essex"],
      ["Sussex", "Sussex"],
      ["Lincolnshire", "Lincolnshire"],
      ["Shropshire", "Shropshire"],
      ["Wiltshire", "Wiltshire"],
      ["Cheshire", "Cheshire"],
      ["Derbyshire", "Derbyshire"],
      ["Cumberland", "Cumberland"],
      ["Rutland", "Rutland"],
      ["Hampshire", "Hampshire"],
      ["Northamptonshire", "Northamptonshire"],
      ["Gloucestershire", "Gloucestershire"],
    ],
    words: [
      ["the village of", "el poble de"],
      ["the manor of", "el senyoriu de"],
      ["the vill of", "la vila de"],
      ["the parish of", "la parròquia de"],
    ],
  },
  france: {
    prefixes: ["Fresn", "Montcl", "Beauv", "Ver", "Cour", "Font", "Rou", "Mor", "Ess", "Char", "Bois", "Val", "Chât", "Vill", "Pont"],
    suffixes: ["ay", "court", "mont", "ville", "val", "champ", "bois", "sec", "sart", "ières", "onville", "erie"],
    qualifiers: [
      ["Normandy", "Normandia"],
      ["Burgundy", "Borgonya"],
      ["Languedoc", "Llenguadoc"],
      ["Picardy", "Picardia"],
      ["Champagne", "Xampanya"],
      ["Anjou", "Anjou"],
      ["Poitou", "Peitau"],
      ["Berry", "Berry"],
      ["Auvergne", "Alvèrnia"],
      ["Brittany", "Bretanya"],
      ["Gascony", "Gascunya"],
      ["Touraine", "Turena"],
    ],
    words: [
      ["the village of", "el poble de"],
      ["the vill of", "la vila de"],
      ["the parish of", "la parròquia de"],
      ["the bourg of", "el burg de"],
    ],
    saintPrefixes: [
      "Saint-Ouen",
      "Saint-Martin",
      "Sainte-Foy",
      "Saint-Denis",
      "Saint-Léger",
      "Sainte-Colombe",
      "Saint-Aubin",
      "Saint-Rémy",
      "Saint-Just",
      "Sainte-Radegonde",
    ],
    saintTails: ["le-Petit", "le-Grand", "des-Bois", "sur-Eure", "en-Beauce", "la-Rivière", "sous-Bois"],
    saintChance: 0.3,
  },
  catalonia: {
    prefixes: ["Vila", "Puig", "Riu", "Font", "Coll", "Torre", "Bell", "Cases", "Mont", "Serra", "Camp", "Bosc"],
    suffixes: ["marí", "dellots", "fred", "bona", "seca", "clar", "roig", "nou", "vell", "dellà", "rodona", "alta"],
    qualifiers: [
      ["in the Vallès", "al Vallès"],
      ["in Osona", "a Osona"],
      ["in the Empordà", "a l'Empordà"],
      ["in the Bages", "al Bages"],
      ["in the Garrotxa", "a la Garrotxa"],
      ["in the Selva", "a la Selva"],
      ["in the Priorat", "al Priorat"],
      ["in the Segarra", "a la Segarra"],
      ["in the Urgell", "a l'Urgell"],
      ["in the Solsonès", "al Solsonès"],
      ["in the Berguedà", "al Berguedà"],
      ["near Girona", "prop de Girona"],
    ],
    words: [
      ["the village of", "el poble de"],
      ["the vill of", "la vila de"],
      ["the parish of", "la parròquia de"],
      ["the mas-hamlet of", "el veïnat de masos de"],
    ],
    saintPrefixes: [
      "Sant Pere",
      "Sant Feliu",
      "Santa Coloma",
      "Sant Martí",
      "Santa Eulàlia",
      "Sant Julià",
      "Sant Esteve",
      "Santa Maria",
      "Sant Andreu",
      "Santa Margarida",
    ],
    saintTails: ["del Vallès", "de la Garriga", "del Bosc", "de la Muntanya", "del Pla", "de la Riera", "del Puig", "de Baix", "de Dalt"],
    saintChance: 0.3,
  },
  italy: {
    prefixes: ["Cast", "Montr", "Pogg", "Vall", "Ross", "Cerr", "Fior", "Sant", "Colle", "Torr", "Cast", "Bagn"],
    suffixes: ["o", "ano", "ino", "etto", "ello", "ale", "ese", "olo"],
    qualifiers: [
      ["in the Mugello", "al Mugello"],
      ["near Prato", "prop de Prato"],
      ["in the Valdarno", "a la Valdarno"],
      ["in the Sienese", "al territori de Siena"],
      ["in the Casentino", "al Casentino"],
      ["in the Chianti", "al Chianti"],
      ["in the contado of Pisa", "al comtat de Pisa"],
      ["in the contado of Lucca", "al comtat de Lucca"],
      ["in the Pistoiese", "al territori de Pistoia"],
      ["near Arezzo", "prop d'Arezzo"],
    ],
    words: [
      ["the village of", "el poble de"],
      ["the vill of", "la vila de"],
      ["the parish of", "la parròquia de"],
      ["the borgo of", "el burg de"],
    ],
  },
  germany: {
    prefixes: ["Ober", "Nieder", "Alt", "Neu", "Grund", "Lind", "Eschen", "Rot", "Weiss", "Stein", "Wald", "Bach", "Hoh", "Kalt"],
    suffixes: ["heim", "dorf", "bach", "berg", "hausen", "stein", "feld", "hofen"],
    qualifiers: [
      ["in Franconia", "a Francònia"],
      ["in the Rhineland", "a Renània"],
      ["in the Wetterau", "a la Wetterau"],
      ["in Swabia", "a Suàbia"],
      ["in Thuringia", "a Turíngia"],
      ["in Hesse", "a Hessen"],
      ["in the Palatinate", "al Palatinat"],
      ["in Westphalia", "a Westfàlia"],
      ["near Cologne", "prop de Colònia"],
      ["in Saxony", "a Saxònia"],
    ],
    words: [
      ["the village of", "el poble de"],
      ["the vill of", "la vila de"],
      ["the parish of", "la parròquia de"],
      ["the hamlet of", "el llogaret de"],
    ],
  },
  castile: {
    prefixes: ["Villa", "Fuente", "Torre", "Val", "Fres", "Alma", "Espin", "Robledo", "Pozo", "Navas", "Olmedo", "Cast"],
    suffixes: ["nueva", "viejo", "frío", "seco", "dueñas", "alba", "rubio", "hermoso", "blanco", "mocho"],
    qualifiers: [
      ["in Old Castile", "a la Vella Castella"],
      ["in New Castile", "a la Nova Castella"],
      ["in the Tierra de Campos", "a la Tierra de Campos"],
      ["near Valladolid", "prop de Valladolid"],
      ["in the Bureba", "a la Bureba"],
      ["in Extremadura", "a Extremadura"],
      ["near Burgos", "prop de Burgos"],
      ["in the Campos Góticos", "als Campos Góticos"],
      ["near Ávila", "prop d'Àvila"],
      ["in the Sanabria", "a la Sanabria"],
    ],
    words: [
      ["the village of", "el poble de"],
      ["the vill of", "la vila de"],
      ["the parish of", "la parròquia de"],
      ["the hamlet of", "el llogaret de"],
    ],
  },
};

// Short proper name for each curated (hand-written) flagship place, in the
// same order as REGIONS[key].places — used so hierarchy.ts's manor/honour
// labels never need to regex-scrape a full sentence for the bare name.
const CURATED_SHORT: Record<string, string[]> = {
  england: ["Elmleigh", "Elton", "Netherstoke", "Halesowen", "Merewick"],
  france: ["Saint-Ouen-le-Petit", "Caen", "Montcler", "Fresnay"],
  catalonia: ["Santa Coloma del Vallès", "Osona", "Vilamarí", "Riudellots"],
  italy: ["Colle Alberti", "Mugello", "San Donnino", "Montefollonico"],
  germany: ["Obergrund", "Cologne", "Lindheim", "Eschenbach"],
  castile: ["Fresno el Viejo", "Tierra de Campos", "Torrelobatón", "Almazán"],
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generatedName(kit: RegionNameKit, rng: Rng): string {
  if (kit.saintPrefixes && kit.saintTails && rng.chance(kit.saintChance ?? 0)) {
    const prefix = rng.pick(kit.saintPrefixes);
    if (!rng.chance(0.5)) return prefix;
    const sep = prefix.includes("-") ? "-" : " ";
    return `${prefix}${sep}${rng.pick(kit.saintTails)}`;
  }
  return capitalize(rng.pick(kit.prefixes) + rng.pick(kit.suffixes));
}

/** Full narrative place phrase, e.g. "the village of Ashleigh, Kent" / "el poble d'Ashleigh, Kent". */
export function placeOf(worldSeed: number, regionKey: string, villageIdx: number): LocalText {
  const region = REGIONS[regionKey];
  if (villageIdx < region.places.length) return region.places[villageIdx];

  const kit = KITS[regionKey];
  const rng = makeRng(addrHash(worldSeed, [regionKey, "placename", villageIdx]));
  const name = generatedName(kit, rng);
  const [wordEn, wordCa] = rng.pick(kit.words);
  const [qEn, qCa] = rng.pick(kit.qualifiers);
  return {
    en: `${wordEn} ${name}, ${qEn}`,
    ca: `${wordCa} ${name}, ${qCa}`,
  };
}

/** Bare proper name only (no "the village of..." wrapper) — for manor/honour labels. */
export function placeShortOf(worldSeed: number, regionKey: string, villageIdx: number): string {
  const region = REGIONS[regionKey];
  if (villageIdx < region.places.length) return CURATED_SHORT[regionKey][villageIdx];

  const kit = KITS[regionKey];
  const rng = makeRng(addrHash(worldSeed, [regionKey, "placename", villageIdx]));
  return generatedName(kit, rng);
}
