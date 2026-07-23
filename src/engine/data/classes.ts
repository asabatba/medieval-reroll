import type { Locale } from "../../i18n/locale.js";
import type { ClassInfo, SocialClass } from "../types.js";

export const CLASSES: [SocialClass, number][] = [
  ["serf", 40],
  ["freePeasant", 38],
  ["artisan", 12],
  ["clergyFamily", 3],
  ["gentry", 6],
  ["merchant", 1],
];

// § settlement: a market town's founding population skews away from
// unfree/tied agricultural labour and toward the trades a town actually
// existed to house — craftsmen, traders, the parish clergy a bigger
// church needed — mirroring the real urban/rural social-structure
// divergence CLASSES' rural-village weights don't capture.
export const URBAN_CLASSES: [SocialClass, number][] = [
  ["serf", 8],
  ["freePeasant", 24],
  ["artisan", 36],
  ["clergyFamily", 6],
  ["gentry", 6],
  ["merchant", 20],
];

export const CLASS_INFO: Record<SocialClass, ClassInfo> = {
  serf: { label: { en: "Unfree peasantry", ca: "Pagesia no lliure" }, wealth: 1 },
  freePeasant: { label: { en: "Free peasantry", ca: "Pagesia lliure" }, wealth: 2 },
  artisan: { label: { en: "Village artisanate", ca: "Artesanat del poble" }, wealth: 3 },
  merchant: { label: { en: "Trading household", ca: "Casa mercantil" }, wealth: 4 },
  clergyFamily: { label: { en: "Clerical household", ca: "Casa clerical" }, wealth: 3 },
  gentry: { label: { en: "Gentry / lesser nobility", ca: "Petita noblesa" }, wealth: 4 },
};

export const CRAFTS: Record<Locale, string[]> = {
  en: ["weaver", "shoemaker", "smith", "baker", "tanner", "carpenter", "cooper", "dyer", "fuller", "saddler", "butcher", "tailor", "mason", "wheelwright"],
  ca: [
    "teixidor",
    "sabater",
    "ferrer",
    "forner",
    "assaonador",
    "fuster",
    "boter",
    "tintorer",
    "paraire",
    "baster",
    "carnisser",
    "sastre",
    "paleta",
    "carreter",
  ],
};
