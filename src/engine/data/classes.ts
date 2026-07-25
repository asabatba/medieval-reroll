import type { Locale } from "../../i18n/locale.js";
import type { ClassInfo, SettlementType, SocialClass } from "../types.js";

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

// § downward mobility, the estate ceiling. Rates alone cannot hold a class
// steady, for the same reason capacity.ts gives for marriage: a multiplier
// on a chance can always be outrun, and what a chance cannot express at all
// is that the number of gentry households in a village was set by the number
// of ESTATES, not by how many sons the lord's family raised. A village did
// not acquire four manorial households because one lord's children happened
// to survive well — and with wealth softening mortality (demography.ts) that
// is exactly what a pure-rate model produced: gentry drifting from 5% to 13%
// of one region's cohorts while another's fell to nothing, on nothing but
// which founder lineages got lucky.
//
// So each class above the land carries a ceiling — the share of a village's
// living souls it plausibly holds — and the downgrade pressure on its
// younger sons scales with how far past that share the village already is.
// Below the ceiling the class can still grow; well past it, the sons who
// inherit nothing keep nothing. The peasantry has no entry: it is the
// residual everyone else falls back into.
export const CLASS_CEILING: Record<SettlementType, Partial<Record<SocialClass, number>>> = {
  rural: { gentry: 0.05, merchant: 0.03, clergyFamily: 0.04, artisan: 0.2 },
  // A chartered market town existed to house exactly the trades the rural
  // ceilings hold down, so theirs sit far higher — but the gentry ceiling
  // barely moves: a town has burgesses, not more manors.
  urban: { gentry: 0.06, merchant: 0.22, clergyFamily: 0.07, artisan: 0.42 },
};

/** Whether a class is bounded at all. The peasantry is not — it is the
 * residual everyone else falls back into — and checking this FIRST lets
 * callers skip measuring a share they would only multiply by 1 anyway, which
 * matters because measuring one means walking the whole village. */
export function hasCeiling(cls: SocialClass, settlement: SettlementType): boolean {
  return CLASS_CEILING[settlement][cls] !== undefined;
}

/** How far past its ceiling a class already sits, as a multiplier on the
 * downgrade pressure its younger sons face. 1 at the ceiling, and bounded at
 * both ends — a class with room to grow is not forced down, and one badly
 * over is not driven to extinction in a single generation. */
export function ceilingPressure(cls: SocialClass, settlement: SettlementType, share: number): number {
  const ceiling = CLASS_CEILING[settlement][cls];
  if (ceiling === undefined) return 1;
  return Math.min(3, Math.max(0.35, share / ceiling));
}

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
