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
