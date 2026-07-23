// =====================================================================
// Occupation decoding (§ occupational mortality / § occupation marital
// gate), split out of decodePerson (biography.ts). decodeOccupation reads
// the SAME rng instance decodePerson passes in — it never creates its own
// — so calling it at the same point in decodePerson's flow leaves every
// draw before and after it in the exact same order as before this split.
// =====================================================================
import type { Locale } from "../i18n/locale.js";
import { CRAFTS } from "./data/classes.js";
import type { Couple, Person, RiskTrade, Rng, Sex, SocialClass } from "./types.js";

interface OccEntry {
  text: string;
  literate?: boolean;
  /** Occupational hazard category this entry's trade actually carries — must match the person's own riskTrade (village.ts) so narrative and mortality agree. Untagged entries are the safe default. */
  risk?: RiskTrade;
  /** Occupation is decided at a fixed early age (13), before anyone in this
   * model marries — an entry that presupposes a husband or widowhood is
   * only eligible if that's actually true SOMEWHERE in her recorded life. */
  maritalGate?: "married" | "widowed";
}
const OCCUPATIONS: Record<Locale, Record<SocialClass, Record<Sex, OccEntry[]>>> = {
  en: {
    serf: {
      M: [
        { text: "worked his father's servile holding, and inherited its bondage with its land" },
        { text: "laboured on the lord's demesne as a ploughman" },
        { text: "kept the lord's sheep as a shepherd" },
        { text: "was sent to break stone in the lord's quarry, a service owed like any other", risk: "hazardous" },
      ],
      F: [{ text: "worked the holding, the dairy, and the harvest alongside the family" }, { text: "went into service at the manor house" }],
    },
    freePeasant: {
      M: [
        { text: "farmed the family holding" },
        { text: "worked as the village {craft}" },
        { text: "leased extra strips and prospered as a yeoman" },
        { text: "fished the estuary for the household's table and the market", risk: "maritime" },
      ],
      F: [{ text: "ran the dairy, the poultry, the garden, and the brewing" }, { text: "went into service in a townhouse" }],
    },
    artisan: {
      M: [
        { text: "was apprenticed to the family trade of {craft} and in time kept the shop" },
        { text: "became a journeyman {craft}" },
        { text: "hewed and dressed stone in the quarry, a trade that crippled or killed men young", risk: "hazardous" },
      ],
      F: [
        { text: "worked in the family workshop, minding the shop and the accounts" },
        { text: "carried on the workshop in widowhood, with journeymen under her", maritalGate: "widowed" },
      ],
    },
    merchant: {
      M: [
        { text: "rode to the fairs with the family's cloth and kept the books", literate: true },
        { text: "took ship with the trading fleet along the coast, buying and selling in foreign ports", literate: true, risk: "maritime" },
      ],
      F: [
        { text: "helped keep the household accounts, alongside her mother", literate: true },
        { text: "kept the shop and the books when her husband travelled", literate: true, maritalGate: "married" },
      ],
    },
    clergyFamily: {
      M: [{ text: "was taught his letters and became a clerk", literate: true }],
      F: [{ text: "was taught to read her psalter, unusual for a girl", literate: true }],
    },
    gentry: {
      M: [
        { text: "was raised to arms and the management of the estate" },
        { text: "studied law and served at the sessions", literate: true },
        { text: "was raised chiefly to war, and rode in the retinue of a greater lord", risk: "military" },
      ],
      F: [
        { text: "was raised to needlework, estate accounts, and the marriage market" },
        { text: "ran the manor entirely during her husband's absences", maritalGate: "married" },
      ],
    },
  },
  ca: {
    serf: {
      M: [
        { text: "va treballar l'explotació servil del seu pare, i en va heretar la servitud amb la terra" },
        { text: "va llaurar el domini del senyor com a bover" },
        { text: "va guardar les ovelles del senyor com a pastor" },
        { text: "va ser enviat a tallar pedra a la pedrera del senyor, una prestació deguda com qualsevol altra", risk: "hazardous" },
      ],
      F: [{ text: "va treballar l'explotació, la lleteria i la collita al costat de la família" }, { text: "va entrar a servir a la casa senyorial" }],
    },
    freePeasant: {
      M: [
        { text: "va conrear l'explotació familiar" },
        { text: "va treballar com a {craft} del poble" },
        { text: "va arrendar terres addicionals i va prosperar com a pagès benestant" },
        { text: "va pescar a l'estuari per a la taula de la casa i el mercat", risk: "maritime" },
      ],
      F: [{ text: "va portar la lleteria, els corrals, l'hort i la cervesa" }, { text: "va entrar a servir en una casa de vila" }],
    },
    artisan: {
      M: [
        { text: "va aprendre l'ofici familiar de {craft} i amb el temps va portar el taller" },
        { text: "es va fer oficial {craft}" },
        { text: "va tallar i polir pedra a la pedrera, un ofici que esguerrava o matava els homes joves", risk: "hazardous" },
      ],
      F: [
        { text: "va treballar al taller familiar, cuidant la botiga i els comptes" },
        { text: "va portar el taller en la viduïtat, amb oficials al seu càrrec", maritalGate: "widowed" },
      ],
    },
    merchant: {
      M: [
        { text: "va anar a les fires amb els draps de la família i en va portar els comptes", literate: true },
        { text: "va anar a la mar amb la flota mercant al llarg de la costa, comprant i venent en ports estrangers", literate: true, risk: "maritime" },
      ],
      F: [
        { text: "ajudava a portar els comptes de la casa, al costat de la seva mare", literate: true },
        { text: "va portar la botiga i els comptes quan el seu marit viatjava", literate: true, maritalGate: "married" },
      ],
    },
    clergyFamily: {
      M: [{ text: "va aprendre les lletres i es va fer clergue", literate: true }],
      F: [{ text: "va aprendre a llegir el seu saltiri, cosa poc habitual en una noia", literate: true }],
    },
    gentry: {
      M: [
        { text: "va ser format en les armes i el govern de l'hisenda" },
        { text: "va estudiar dret i va servir a les sessions", literate: true },
        { text: "va ser format sobretot per a la guerra, i va cavalcar al seguici d'un senyor més poderós", risk: "military" },
      ],
      F: [
        { text: "va ser formada en la brodadora, els comptes de l'hisenda i el mercat matrimonial" },
        { text: "va portar tot el senyoriu durant les absències del marit", maritalGate: "married" },
      ],
    },
  },
};

export interface DecodedOccupation {
  text: string;
  year: number;
  literate: boolean;
}

// Occupation — text stays consistent with the mechanical riskTrade tag
// rolled at Tier 1 (village.ts): a hazardous/maritime/military person is
// preferentially narrated into a trade that actually carries that hazard,
// never the reverse (a "normal" person never draws a risk-flavoured entry).
// Returns null for anyone too young to have one narrated (<12) or already
// in holy orders — decodePerson skips the occupation event entirely then.
export function decodeOccupation(
  p: Person,
  locale: Locale,
  rng: Rng,
  everMarried: boolean,
  widowedUnions: readonly Couple[],
  own: Couple | null,
  spouseOf: (c: Couple) => Person,
): DecodedOccupation | null {
  if (!(p.death.age >= 12 && !p.inOrders)) return null;
  // § mobility timing: the age-13 "occupation decided" moment predates
  // the age-16 class-mobility transition (§ mobility below) — so someone
  // WITH a clsOrigin (mobility applies) is still living their ORIGIN
  // class at 13, not their eventual final class. Reading OCCUPATIONS by
  // p.cls here would narrate the final trade years early (e.g. a serf
  // already "prospered as a yeoman" at 13, then "Rose out of servitude"
  // at 16 — flatly contradicting itself); reading it by clsOrigin instead
  // keeps this event honest about which class is actually true yet, the
  // same fix already applied to the maritalGate entries above.
  const occCls = p.clsOrigin ?? p.cls;
  const eligible = OCCUPATIONS[locale][occCls][p.sex].filter((o) => !o.maritalGate || (o.maritalGate === "married" ? everMarried : widowedUnions.length > 0));
  const fullPool = eligible.length ? eligible : OCCUPATIONS[locale][occCls][p.sex];
  // riskTrade (village.ts) is rolled from the person's FINAL class — the
  // hazard belongs to the trade they end up in, not necessarily one they
  // were already practicing at 13. Only let it steer text selection when
  // occCls IS that final class (no mobility, or mobility hasn't happened
  // yet in the narrative sense); otherwise a mobility case could fall
  // through to the "no matching risk entry in the origin pool" fallback
  // and randomly draw an unrelated risk-flavoured line from the origin
  // class (e.g. a future sailor's age-13 text calling him a quarryman).
  const riskTrade = occCls === p.cls ? (p.riskTrade ?? "normal") : "normal";
  const matching = riskTrade === "normal" ? fullPool.filter((o) => !o.risk) : fullPool.filter((o) => o.risk === riskTrade);
  const pool = matching.length ? matching : fullPool;
  const occ = rng.pick(pool);
  const craft = rng.pick(CRAFTS[locale]);
  const occText = occ.text.replace("{craft}", craft);
  // A marital-gated entry narrates something only true once she's married
  // (or widowed) — dating it to the fixed age-13 "occupation decided"
  // moment would print "ran the manor during her husband's absences"
  // years before the chronicle's own marriage entry, for a girl who is
  // in fact still unmarried at 13. Anchor it to the year that actually
  // makes it true instead (never earlier than 13, and never invented:
  // `own`/`widowedUnions` are the same real union records the eligibility
  // filter above already checked).
  const occYear =
    occ.maritalGate === "married"
      ? Math.max(p.birth + 13, own!.year)
      : occ.maritalGate === "widowed"
        ? Math.max(p.birth + 13, Math.min(...widowedUnions.map((c) => spouseOf(c).death.year)))
        : p.birth + 13;
  return { text: occText, year: occYear, literate: !!occ.literate };
}
