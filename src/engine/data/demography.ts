// =====================================================================
// Demographic calibration data (§ calibrated mechanics).
//
// One parameter set per region, layered over the shared Russell-table
// baseline hazard in mortality.ts, instead of one broad rule for every
// region and period. Values are deliberately mild multipliers grounded in
// the comparative literature rather than dramatic ones:
//  - NW Europe (England, Germany): life-cycle service common, widow
//    remarriage frequent, EMP marriage pattern (already in regions.ts).
//  - France: chronic Hundred Years' War disruption, routiers (regions.ts),
//    slightly elevated background mortality.
//  - Mediterranean (Catalonia, Italy): earlier female marriage (regions.ts),
//    malaria in parts of Italy, lower widow remarriage (dowry regime),
//    less life-cycle service.
//  - Periods: pre-1348 population pressure (land hunger, Great Famine era),
//    post-plague 1349–1450 higher real wages and living standards, late
//    15th-century recovery in between.
// Class enters through the wealth grade (CLASS_INFO) as separate infant and
// adult multiplier tables, so "wealth softens mortality" is data, not an
// ad-hoc constant buried in the roll.
// =====================================================================
import type { RegionKey } from "./regions.js";

export interface PeriodMult {
  from: number;
  to: number;
  mult: number;
}

export interface RegionDemography {
  /** All-age background multiplier on the baseline hazard. */
  hazardMult: number;
  /** Multiplier on first-year (age 0) mortality. */
  infantMult: number;
  /** Multiplier on child (age 1–9) mortality. */
  childMult: number;
  /** Era adjustments layered multiplicatively on top (first match wins). */
  periods: PeriodMult[];
  /** Adult hazard multiplier by wealth grade 1–4 (index wealth-1). */
  wealthHazardMult: [number, number, number, number];
  /** Infant/child mortality multiplier by wealth grade 1–4. */
  infantWealthMult: [number, number, number, number];
  /** Inclusive year range drawn between births (fertility spacing). */
  birthSpacing: [number, number];
  /** Chance a widower / widow eligible for remarriage actually remarries. */
  remarry: { M: number; F: number };
  /** § the marriage squeeze: who a remarrying widower actually looked for.
   *
   * The other half of the inverted-celibacy problem, and the more surprising
   * one: the model created the Mediterranean marriage squeeze (a wide spousal
   * age gap means each cohort of brides is drawn from a much larger, younger
   * pool than its grooms) and then blocked the very thing that historically
   * relieved it. A widower here preferred a widow, or a never-married woman
   * already past the ordinary local marriage window — which is a fair enough
   * description of NW Europe, and precisely backwards for the dowry regime.
   *
   * In Tuscany the two facts belong together: widows seldom remarried (the
   * dowry went back with them — `remarry.F` above is already 0.16 there), and
   * the widower took a girl of fifteen or sixteen. That asymmetry is what
   * absorbed the surplus of young unmarried women the age gap itself created,
   * and it is why the catasto finds near-universal female marriage alongside
   * a great many permanently unmarried MEN. Both numbers below are read
   * straight into matchWidowers' scorer in village.ts. */
  widowerBride: {
    /** The age gap he aims at — his own age less hers. */
    gap: number;
    /** The OLDEST bride he actually aims at, whatever `gap` would suggest.
     *
     * This is what makes the dowry regime a different market rather than the
     * same one shifted a few years: a gap alone is relative to his own age, so
     * a widower of fifty-five aims at forty-two and takes a widow — which is
     * the NW-European answer and, run in the Mediterranean, is why raising
     * `remarry.M` there bought almost nothing. He was not looking for a woman
     * a fixed distance below himself; he was looking for a girl, at fifty-five
     * as at thirty-five, and the age gap is the CONSEQUENCE of that rather
     * than the rule behind it. Effectively unbounded in NW Europe (the gap
     * governs there, as it did). */
    cap: number;
    /** Score adjustment for a never-married woman still inside the ordinary
     * local marriage window: a PENALTY in NW Europe (he passes over the young
     * single woman for a widow), a BONUS under the dowry regime (she is
     * exactly who he wants). */
    maiden: number;
  };
  /** Chance an unmatched adult woman emigrates (normal year / famine-or-war year). */
  emigration: { base: number; pressured: number };
  /** § the marriage squeeze: chance an unmatched adult woman who does NOT
   * marry out instead leaves for service in a town.
   *
   * The second half of the European Marriage Pattern's female outlet, and the
   * one this model had no representation of. Every departure used to be a
   * marriage — so the only thing a surplus daughter could do was marry
   * elsewhere or stay a lay spinster forever, and the Mediterranean regions
   * (low emigration, strong land ties, a very wide spousal age gap) came out
   * with HIGHER never-married shares than England and Scotland: the EMP's
   * signature read backwards.
   *
   * The rate is HIGHEST in the Mediterranean, which is the opposite of
   * `emigration.base` above and deliberately so. `emigration.base` encodes a
   * HOUSEHOLD's attachment to its land, which really was stronger there; this
   * encodes a DAUGHTER's route out of that household, which was the reverse.
   * A girl of the Tuscan or Catalan contado sent to a city house to earn her
   * dowry over eight or ten years is one of the best-documented movements in
   * Mediterranean social history — the Florentine and Barcelona notarial
   * service contracts are full of them — and it has no NW-European
   * counterpart of the same kind, because there life-cycle service was
   * already happening inside the village (see `service` above, which runs at
   * roughly double the Mediterranean rate for exactly that reason). */
  cityService: number;
  /** Chance a low-wealth child spends adolescent years in service/apprenticeship. */
  service: { M: number; F: number };
  /** Upward class mobility chances for a person coming of age (base / after 1349). */
  mobility: {
    serfToFree: { base: number; postPlague: number };
    freeToArtisan: { base: number; postPlague: number };
    artisanToMerchant: { base: number; postPlague: number };
    /** The top of the ladder: a trading household that bought the manor and
     * was styled gentle within a generation. Low, and markedly higher after
     * 1349 — the late-medieval rise of the gentry — but it has to exist, or
     * gentry is a class with an exit and no entrance. */
    merchantToGentry: { base: number; postPlague: number };
    /** § downward mobility: the mirror of the upward rates above, for a son
     * who inherits neither the estate nor the shop nor the credit that went
     * with it, and so has no rung to defend. Unlike the upward rates these
     * are HIGHER before 1349 (land hunger gave a non-heir fewer real
     * alternatives) and lower after (the post-plague glut gave him somewhere
     * else to go instead of sliding down).
     *
     * The rates are set to BALANCE, not to be token: each one is roughly the
     * outflow that holds its class at a village-plausible share against the
     * inflow it receives — from rollMobility's promotions, and from the plain
     * fact that wealth softens mortality, so a richer house leaves more
     * children behind it. Undershoot them and the estates above the land
     * compound without limit (see villageMobility.ts's own note).
     *
     * Under PARTIBLE custom (France, Tuscany) they still apply, at reduced
     * weight, to every son after the first: land divided among all the sons
     * is land divided, generation on generation, toward plots that no longer
     * carry the standing they came with. */
    nonHeirDowngrade: {
      merchantToArtisan: { base: number; postPlague: number };
      artisanToFree: { base: number; postPlague: number };
      /** A gentry younger son with no estate: the yeomanry, in one step. */
      gentryToFree: { base: number; postPlague: number };
      /** A clerical household was never heritable in the first place. */
      clergyToFree: { base: number; postPlague: number };
    };
  };
  /** § maternal mortality: calibrated so the RESULTING per-registered-birth death rate lands
   * near the historical ~1–1.5%, not the raw target itself — rollDeath applies the derived
   * per-year hazard across a woman's WHOLE fertile-age ramp (it can't know her actual
   * marital status; marriage isn't resolved until after death is rolled), so a region with
   * low widow-remarriage (Mediterranean: dowry-return regime) spends more of that ramp
   * "at risk" without an actual pregnancy behind it, and needs a lower input to land on the
   * same real-world output rate as a high-remarriage NW region. */
  maternalMortalityPerBirth: number;
  /** § male out-migration: the landless-younger-son safety valve. Only the eldest surviving
   * son inherits (succession.ts); everyone else was historically far more mobile. */
  maleOutMigration: {
    /** Chance a non-heir man who fails to marry locally leaves the village. */
    nonHeirBase: number;
    /** Chance an heir leaves despite failing to marry locally — rare; he has a tenement to hold. */
    heirBase: number;
    /** Elevated chance in a famine/war year. */
    pressured: number;
    /** Chance, per matching round, that a local woman without a local match
     * marries a real immigrant groom instead of waiting.
     *
     * § the marriage squeeze: this is the single biggest determinant of
     * female celibacy in the model, and it used to be set as if it were an
     * afterthought of the OUT-migration rates above it. It is not. A village
     * imports brides at a region-neutral rate (the men's loop leaks a fixed
     * fifth of its matches outward, under a shared exogamy cap), so this
     * number alone decides whether the parish is a net importer or a net
     * exporter of marriage partners — and every net-exported one is a local
     * daughter left over. Set below the NW figure, as the Mediterranean's
     * were, it made those regions net EXPORTERS (Catalonia took in one
     * husband for every 1.5 wives) while England took in more husbands than
     * wives, and that one asymmetry was worth almost the whole of the
     * inverted celibacy gap.
     *
     * The dowry regime's own logic runs the other way: a dowry is a marriage-
     * market instrument for placing a daughter, and a region whose non-heirs
     * stayed near home (`nonHeirBase` below is lowest in exactly these
     * regions) had more unattached local men within reach, not fewer. */
    groomPullChance: number;
  };
  /** § the celibate estate: entry into religion — the third thing a life
   * could be for, beside a holding and a trade, and the one this model had no
   * room for at all. Orders used to be reachable only by a son of the
   * `clergyFamily` class, at a flat 0.35, which produced between zero and
   * seven religious across twelve villages of a region and NONE whatever in
   * Germany or Portugal, whose founder draws happened to give them no such
   * households. No parish priest, no monk, no friar, and — since the roll
   * lived inside the men's marriage loop — no nun anywhere in Europe.
   *
   * That absence is not a rounding error. Roughly one to two per cent of the
   * population was in religion, and more to the point the cloister was the
   * standard alternative to marriage for a daughter of a dowried house: a
   * convent's entry gift cost a fraction of a marriage dowry, which is
   * exactly why the Mediterranean patriciate filled its convents while
   * NW-European daughters stayed lay and simply married late or not at all.
   * Without it, every surplus daughter in the model had nowhere to go but
   * permanent lay spinsterhood, and the Mediterranean regions came out with
   * HIGHER never-married shares than England and Scotland — the European
   * Marriage Pattern's signature reading backwards. */
  vocation: {
    /** Base chance a son who reaches 14 takes orders. */
    M: number;
    /** Base chance a daughter who reaches 14 enters religion. */
    F: number;
    /** Multiplier for a non-heir son — the classic disposal of a younger son. */
    nonHeirMult: number;
    /** Multiplier for a daughter of a house that would owe a marriage dowry
     * (wealth grade 3+). The dowry regime's own arithmetic, and the whole
     * reason the Mediterranean figure is the one that moves. */
    dowriedMult: number;
    /** Multiplier for a child of a clerical household, who had the Latin. */
    clergyMult: number;
  };
  /** § illegitimacy: chance PER YEAR that a woman spends unmarried and of an
   * age to bear bears a child out of wedlock.
   *
   * Per exposed year, not once per never-married woman, which is what this
   * used to be — and the difference is not bookkeeping. The old shape asked
   * one question of one narrow group (women who reached the end of the solve
   * still unmarried) and so produced illegitimate births at 0.06–0.37% of all
   * births against a configured intent of 2–3.5% and a literature range of
   * 1–4%: an order of magnitude short. It also put the risk in the wrong
   * place. Bastardy was a hazard of the YEARS a woman spent unmarried and
   * adult, which is why the late-marrying NW-European regions record more of
   * it, and why plenty of illegitimate children were borne by women who went
   * on to marry someone else entirely — a group the old roll could not
   * represent at all. */
  illegitimacyPerYear: number;
  /** § bridal pregnancy: the share of first marriages whose first child
   * arrives inside the wedding year — conceived before the wedding, born
   * after it.
   *
   * Far commoner than illegitimacy proper (10–30% of first marriages against
   * 1–4% of births) and, in a society where betrothal was itself binding and
   * a promise of marriage licensed a good deal, not the same transgression.
   * It is what most of the "bastardy-prone" cases in the record actually
   * were: a couple who married, slightly late. Lower under the Mediterranean
   * dowry regime, where a daughter's marriage was a negotiated property
   * settlement conducted under considerably closer watch. */
  bridalPregnancy: number;
}

const SHARED_PERIODS: PeriodMult[] = [
  { from: 0, to: 1348, mult: 1.08 }, // pre-plague land hunger, Great Famine era
  { from: 1349, to: 1450, mult: 0.92 }, // post-plague real-wage rise
  { from: 1451, to: 1600, mult: 0.97 }, // late-century recovery
];

const NW_DEFAULT: RegionDemography = {
  hazardMult: 1.0,
  infantMult: 1.0,
  childMult: 1.0,
  periods: SHARED_PERIODS,
  wealthHazardMult: [1.06, 1.0, 0.95, 0.88],
  infantWealthMult: [1.08, 1.0, 0.92, 0.82],
  birthSpacing: [2, 4],
  remarry: { M: 0.55, F: 0.3 },
  widowerBride: { gap: 8, cap: 99, maiden: 6 },
  emigration: { base: 0.5, pressured: 0.68 },
  // Near zero in NW Europe on purpose: this is a Mediterranean institution.
  // The NW-European outlet for the same surplus was life-cycle service INSIDE
  // the village (`service` below, at roughly double the Mediterranean rate),
  // which ended in a local marriage rather than in a departure — and what it
  // did not absorb stayed in the parish as the permanent spinsterhood the
  // European Marriage Pattern is named for.
  cityService: 0.02,
  service: { M: 0.38, F: 0.42 },
  mobility: {
    serfToFree: { base: 0.03, postPlague: 0.12 },
    freeToArtisan: { base: 0.04, postPlague: 0.07 },
    artisanToMerchant: { base: 0.02, postPlague: 0.04 },
    merchantToGentry: { base: 0.03, postPlague: 0.07 },
    nonHeirDowngrade: {
      merchantToArtisan: { base: 0.66, postPlague: 0.54 },
      artisanToFree: { base: 0.58, postPlague: 0.46 },
      gentryToFree: { base: 0.74, postPlague: 0.62 },
      clergyToFree: { base: 0.34, postPlague: 0.24 },
    },
  },
  maternalMortalityPerBirth: 0.012,
  maleOutMigration: { nonHeirBase: 0.42, heirBase: 0.06, pressured: 0.6, groomPullChance: 0.3 },
  vocation: { M: 0.016, F: 0.007, nonHeirMult: 2.3, dowriedMult: 1.7, clergyMult: 3 },
  illegitimacyPerYear: 0.007,
  bridalPregnancy: 0.2,
};

/** § the celibate estate, the dowry regime. Where a daughter's marriage
 * carried a dowry the family had to find, the cloister was the cheap way out,
 * and the convents filled accordingly — most sharply in Tuscany, whose
 * patrician houses put a very large share of their daughters behind the grille
 * rather than dower them all. The male figure moves far less: a younger son
 * went to the Church everywhere in Europe. */
const DOWRY_REGIME_VOCATION = { M: 0.014, F: 0.015, nonHeirMult: 2.3, dowriedMult: 2.8, clergyMult: 3 };

/** § the marriage squeeze, the dowry regime's own answer to it. A widower
 * remarried a girl, not a widow — see the `widowerBride` doc above. The gap is
 * markedly wider than the region's own FIRST-marriage gap, because he is
 * remarrying at forty into the same pool of eighteen-year-olds he first
 * married out of at twenty-five. */
const DOWRY_REGIME_WIDOWER_BRIDE = { gap: 13, cap: 22, maiden: -4 };

const DEMOGRAPHY_DATA = {
  england: { ...NW_DEFAULT },
  germany: {
    ...NW_DEFAULT,
    hazardMult: 0.98,
    emigration: { base: 0.55, pressured: 0.7 }, // eastward colonization pull
    service: { M: 0.35, F: 0.4 },
    maternalMortalityPerBirth: 0.007,
    maleOutMigration: { nonHeirBase: 0.46, heirBase: 0.06, pressured: 0.62, groomPullChance: 0.32 }, // Ostsiedlung pulled younger sons east too
  },
  france: {
    ...NW_DEFAULT,
    hazardMult: 1.05, // chronic war disruption on top of explicit warYears
    infantMult: 1.05,
    emigration: { base: 0.5, pressured: 0.7 },
    service: { M: 0.3, F: 0.34 },
    maternalMortalityPerBirth: 0.0075,
    maleOutMigration: { nonHeirBase: 0.4, heirBase: 0.08, pressured: 0.65, groomPullChance: 0.28 }, // war retinues an ever-present outlet, but disrupt heirs too
    illegitimacyPerYear: 0.008, // war-displaced households, garrison towns
  },
  catalonia: {
    ...NW_DEFAULT,
    hazardMult: 1.02,
    birthSpacing: [2, 3], // earlier weaning, tighter spacing in the Mediterranean pattern
    remarry: { M: 0.66, F: 0.18 }, // dowry-return regime: it discouraged the WIDOW and freed the WIDOWER — see DOWRY_REGIME_WIDOWER_BRIDE
    widowerBride: DOWRY_REGIME_WIDOWER_BRIDE,
    emigration: { base: 0.45, pressured: 0.62 },
    cityService: 0.52, // Barcelona's notarial service contracts: a contado girl placed in a city house for the years it took to earn her dowry
    service: { M: 0.2, F: 0.24 },
    mobility: {
      serfToFree: { base: 0.02, postPlague: 0.08 }, // remença servitude was sticky until 1486
      freeToArtisan: { base: 0.04, postPlague: 0.07 },
      artisanToMerchant: { base: 0.03, postPlague: 0.05 },
      merchantToGentry: { base: 0.025, postPlague: 0.06 }, // the ciutadans honrats bought their way up, but into a city patriciate more than a village manor
      // the hereu system's flip side: a non-heir who stayed rather than
      // emigrating had markedly less to fall back on than in NW Europe
      nonHeirDowngrade: {
        merchantToArtisan: { base: 0.74, postPlague: 0.62 },
        artisanToFree: { base: 0.66, postPlague: 0.54 },
        gentryToFree: { base: 0.8, postPlague: 0.7 },
        clergyToFree: { base: 0.4, postPlague: 0.3 },
      },
    },
    maternalMortalityPerBirth: 0.0052,
    maleOutMigration: { nonHeirBase: 0.32, heirBase: 0.05, pressured: 0.5, groomPullChance: 0.36 }, // stronger land ties, less rural out-migration
    vocation: DOWRY_REGIME_VOCATION,
    illegitimacyPerYear: 0.0045, // tighter dowry-regime household surveillance
    bridalPregnancy: 0.1,
  },
  italy: {
    ...NW_DEFAULT,
    hazardMult: 1.06, // malarial lowlands
    infantMult: 1.1, // wet-nursing raised recorded infant deaths
    childMult: 1.05,
    birthSpacing: [2, 3],
    remarry: { M: 0.7, F: 0.16 },
    // The sharpest case in the model, and the one the whole mechanism was
    // written for: a first-marriage gap of eleven years (regions.ts) against a
    // widow-remarriage rate of 0.16. Herlihy and Klapisch-Zuber's catasto
    // Tuscany is a marriage market of old widowers and very young girls.
    widowerBride: { gap: 18, cap: 20, maiden: -6 },
    emigration: { base: 0.5, pressured: 0.66 },
    cityService: 0.58, // Florentine domestic service: the standard destination for a contado daughter, and the standard way her dowry was found
    service: { M: 0.15, F: 0.18 },
    mobility: {
      serfToFree: { base: 0.04, postPlague: 0.1 },
      freeToArtisan: { base: 0.05, postPlague: 0.08 },
      artisanToMerchant: { base: 0.03, postPlague: 0.05 },
      merchantToGentry: { base: 0.04, postPlague: 0.08 }, // Tuscan merchant families bought contado estates and the standing that came with them
      // Tuscany is a "partible" region (regions.ts), so these apply at the
      // reduced subdivision weight rather than the full non-heir one — to
      // every son after the first, since a plot split among brothers each
      // generation is what actually pulled a Tuscan house down a rung.
      nonHeirDowngrade: {
        merchantToArtisan: { base: 0.66, postPlague: 0.54 },
        artisanToFree: { base: 0.58, postPlague: 0.46 },
        gentryToFree: { base: 0.74, postPlague: 0.62 },
        clergyToFree: { base: 0.34, postPlague: 0.24 },
      },
    },
    maternalMortalityPerBirth: 0.0068,
    maleOutMigration: { nonHeirBase: 0.3, heirBase: 0.05, pressured: 0.48, groomPullChance: 0.38 }, // urban guild apprenticeship more local than rural flight
    // Tuscany is the sharpest case of the whole pattern: a marriage dowry
    // that ran ahead of what even patrician houses could find for every
    // daughter, against a convent gift a fraction of the size.
    // The Tuscan convent figures everyone quotes are FLORENCE's — a patrician
    // city solving a patrician dowry problem — not the contado's. So the
    // dowried skew stays the sharpest in the model while the baseline every
    // peasant daughter faces sits at the ordinary dowry-regime level: raising
    // that baseline instead drained fertile women out of villages that, with
    // Tuscany's very wide spousal age gap, had none to spare, and turned the
    // fifteenth century there from a plateau into a slow emptying.
    vocation: { ...DOWRY_REGIME_VOCATION, dowriedMult: 3.3 },
    illegitimacyPerYear: 0.008, // urban Tuscany's documented foundling/illegitimacy registers (Florence's Innocenti, founded 1445) ran higher than the rural NW-European norm
    bridalPregnancy: 0.1,
  },
  castile: {
    ...NW_DEFAULT,
    hazardMult: 1.02,
    birthSpacing: [2, 3],
    remarry: { M: 0.68, F: 0.22 },
    widowerBride: DOWRY_REGIME_WIDOWER_BRIDE,
    emigration: { base: 0.45, pressured: 0.65 }, // the Reconquista frontier pulled settlers south
    cityService: 0.56,
    service: { M: 0.22, F: 0.26 },
    maternalMortalityPerBirth: 0.0065,
    maleOutMigration: { nonHeirBase: 0.36, heirBase: 0.06, pressured: 0.58, groomPullChance: 0.36 }, // frontier repoblación an outlet for younger sons, alongside the standing war
    vocation: DOWRY_REGIME_VOCATION,
    illegitimacyPerYear: 0.0065,
    bridalPregnancy: 0.1,
  },
  scotland: {
    ...NW_DEFAULT,
    hazardMult: 1.05, // harsher climate, more marginal arable on the whole
    infantMult: 1.06,
    emigration: { base: 0.48, pressured: 0.68 }, // Low Countries/Baltic trade towns and, above all, the Auld Alliance's soldiery in France
    service: { M: 0.36, F: 0.4 },
    maternalMortalityPerBirth: 0.013,
    maleOutMigration: { nonHeirBase: 0.44, heirBase: 0.07, pressured: 0.64, groomPullChance: 0.3 }, // border unrest and the Auld Alliance's standing demand for soldiers abroad
    illegitimacyPerYear: 0.008, // Lowland kirk-session evidence runs above the NW-European norm
  },
  portugal: {
    ...NW_DEFAULT,
    hazardMult: 1.03,
    birthSpacing: [2, 3],
    remarry: { M: 0.68, F: 0.2 }, // dowry-return regime, as in Castile/Catalonia
    widowerBride: DOWRY_REGIME_WIDOWER_BRIDE,
    emigration: { base: 0.46, pressured: 0.64 }, // Ceuta, Madeira, and the Atlantic voyages opened new outlets as the fifteenth century wore on
    cityService: 0.56, // Lisbon and Porto drew servant girls from the Minho and the Beira exactly as the Italian and Catalan cities did
    service: { M: 0.22, F: 0.26 },
    maternalMortalityPerBirth: 0.0065,
    maleOutMigration: { nonHeirBase: 0.38, heirBase: 0.06, pressured: 0.6, groomPullChance: 0.36 }, // North African garrisons and the African voyages drew off younger sons who once would simply have left for the towns
    vocation: DOWRY_REGIME_VOCATION,
    illegitimacyPerYear: 0.007,
    bridalPregnancy: 0.1,
  },
} satisfies Record<RegionKey, RegionDemography>;

export const DEMOGRAPHY: Record<string, RegionDemography> = DEMOGRAPHY_DATA;

export const DEFAULT_DEMOGRAPHY: RegionDemography = NW_DEFAULT;

export function demographyOf(regionKey: string | undefined): RegionDemography {
  return (regionKey && DEMOGRAPHY[regionKey]) || DEFAULT_DEMOGRAPHY;
}

export function periodMult(demo: RegionDemography, year: number): number {
  for (const p of demo.periods) if (year >= p.from && year <= p.to) return p.mult;
  return 1;
}

/** Clamp a wealth grade (1–4) into the multiplier tables' index range. */
export function wealthIdx(wealth: number): 0 | 1 | 2 | 3 {
  return Math.min(3, Math.max(0, wealth - 1)) as 0 | 1 | 2 | 3;
}
