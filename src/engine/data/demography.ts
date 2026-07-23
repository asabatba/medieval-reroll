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
  /** Chance an unmatched adult woman emigrates (normal year / famine-or-war year). */
  emigration: { base: number; pressured: number };
  /** Chance a low-wealth child spends adolescent years in service/apprenticeship. */
  service: { M: number; F: number };
  /** Upward class mobility chances for a person coming of age (base / after 1349). */
  mobility: {
    serfToFree: { base: number; postPlague: number };
    freeToArtisan: { base: number; postPlague: number };
    artisanToMerchant: { base: number; postPlague: number };
    /** § downward mobility: the mirror of the upward rates above, for a
     * non-heir son of an artisan/merchant house under IMPARTIBLE custom —
     * no shop or trade capital of his own to inherit, so no rung to defend
     * either. Unlike the upward rates, these are HIGHER before 1349 (land
     * hunger gave a non-heir fewer real alternatives) and lower after (the
     * post-plague glut gave him somewhere else to go instead of sliding
     * down). Never exercised in a "partible" region — see Region.inheritance. */
    nonHeirDowngrade: {
      merchantToArtisan: { base: number; postPlague: number };
      artisanToFree: { base: number; postPlague: number };
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
    /** Chance, per matching round, that a local woman without a local match marries a real immigrant groom instead of waiting. */
    groomPullChance: number;
  };
  /** § illegitimacy: chance an adult woman who ends her days never formally
   * married (village.ts's own final outcome, not a mid-solve guess) bore one
   * child out of wedlock at some point regardless — the commonest documented
   * form (a service woman's child by a named or unnamed man), not an attempt
   * at a precise historical rate, which varied enormously by parish and is
   * poorly attested for most of these regions. */
  illegitimacyRate: number;
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
  emigration: { base: 0.5, pressured: 0.68 },
  service: { M: 0.38, F: 0.42 },
  mobility: {
    serfToFree: { base: 0.03, postPlague: 0.12 },
    freeToArtisan: { base: 0.04, postPlague: 0.07 },
    artisanToMerchant: { base: 0.02, postPlague: 0.04 },
    nonHeirDowngrade: {
      merchantToArtisan: { base: 0.16, postPlague: 0.06 },
      artisanToFree: { base: 0.14, postPlague: 0.05 },
    },
  },
  maternalMortalityPerBirth: 0.012,
  maleOutMigration: { nonHeirBase: 0.42, heirBase: 0.06, pressured: 0.6, groomPullChance: 0.3 },
  illegitimacyRate: 0.03,
};

export const DEMOGRAPHY: Record<string, RegionDemography> = {
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
    illegitimacyRate: 0.035, // war-displaced households, garrison towns
  },
  catalonia: {
    ...NW_DEFAULT,
    hazardMult: 1.02,
    birthSpacing: [2, 3], // earlier weaning, tighter spacing in the Mediterranean pattern
    remarry: { M: 0.5, F: 0.18 }, // dowry-return regime discouraged widow remarriage
    emigration: { base: 0.45, pressured: 0.62 },
    service: { M: 0.2, F: 0.24 },
    mobility: {
      serfToFree: { base: 0.02, postPlague: 0.08 }, // remença servitude was sticky until 1486
      freeToArtisan: { base: 0.04, postPlague: 0.07 },
      artisanToMerchant: { base: 0.03, postPlague: 0.05 },
      // the hereu system's flip side: a non-heir who stayed rather than
      // emigrating had markedly less to fall back on than in NW Europe
      nonHeirDowngrade: {
        merchantToArtisan: { base: 0.22, postPlague: 0.1 },
        artisanToFree: { base: 0.2, postPlague: 0.09 },
      },
    },
    maternalMortalityPerBirth: 0.0052,
    maleOutMigration: { nonHeirBase: 0.32, heirBase: 0.05, pressured: 0.5, groomPullChance: 0.22 }, // stronger land ties, less rural out-migration
    illegitimacyRate: 0.02, // tighter dowry-regime household surveillance
  },
  italy: {
    ...NW_DEFAULT,
    hazardMult: 1.06, // malarial lowlands
    infantMult: 1.1, // wet-nursing raised recorded infant deaths
    childMult: 1.05,
    birthSpacing: [2, 3],
    remarry: { M: 0.52, F: 0.16 },
    emigration: { base: 0.5, pressured: 0.66 },
    service: { M: 0.15, F: 0.18 },
    mobility: {
      serfToFree: { base: 0.04, postPlague: 0.1 },
      freeToArtisan: { base: 0.05, postPlague: 0.08 },
      artisanToMerchant: { base: 0.03, postPlague: 0.05 },
      // inert here: Tuscany is a "partible" region (regions.ts), so
      // village.ts's isHeir() never treats a son as a non-heir to begin
      // with — these values exist only so every region's shape agrees.
      nonHeirDowngrade: {
        merchantToArtisan: { base: 0.16, postPlague: 0.06 },
        artisanToFree: { base: 0.14, postPlague: 0.05 },
      },
    },
    maternalMortalityPerBirth: 0.0068,
    maleOutMigration: { nonHeirBase: 0.3, heirBase: 0.05, pressured: 0.48, groomPullChance: 0.2 }, // urban guild apprenticeship more local than rural flight
    illegitimacyRate: 0.035, // urban Tuscany's documented foundling/illegitimacy registers (Florence's Innocenti, founded 1445) ran higher than the rural NW-European norm
  },
  castile: {
    ...NW_DEFAULT,
    hazardMult: 1.02,
    birthSpacing: [2, 3],
    remarry: { M: 0.5, F: 0.22 },
    emigration: { base: 0.45, pressured: 0.65 }, // the Reconquista frontier pulled settlers south
    service: { M: 0.22, F: 0.26 },
    maternalMortalityPerBirth: 0.0065,
    maleOutMigration: { nonHeirBase: 0.36, heirBase: 0.06, pressured: 0.58, groomPullChance: 0.26 }, // frontier repoblación an outlet for younger sons, alongside the standing war
    illegitimacyRate: 0.028,
  },
  scotland: {
    ...NW_DEFAULT,
    hazardMult: 1.05, // harsher climate, more marginal arable on the whole
    infantMult: 1.06,
    emigration: { base: 0.48, pressured: 0.68 }, // Low Countries/Baltic trade towns and, above all, the Auld Alliance's soldiery in France
    service: { M: 0.36, F: 0.4 },
    maternalMortalityPerBirth: 0.013,
    maleOutMigration: { nonHeirBase: 0.44, heirBase: 0.07, pressured: 0.64, groomPullChance: 0.3 }, // border unrest and the Auld Alliance's standing demand for soldiers abroad
    illegitimacyRate: 0.035, // Lowland kirk-session evidence runs above the NW-European norm
  },
  portugal: {
    ...NW_DEFAULT,
    hazardMult: 1.03,
    birthSpacing: [2, 3],
    remarry: { M: 0.5, F: 0.2 }, // dowry-return regime, as in Castile/Catalonia
    emigration: { base: 0.46, pressured: 0.64 }, // Ceuta, Madeira, and the Atlantic voyages opened new outlets as the fifteenth century wore on
    service: { M: 0.22, F: 0.26 },
    maternalMortalityPerBirth: 0.0065,
    maleOutMigration: { nonHeirBase: 0.38, heirBase: 0.06, pressured: 0.6, groomPullChance: 0.26 }, // North African garrisons and the African voyages drew off younger sons who once would simply have left for the towns
    illegitimacyRate: 0.03,
  },
};

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
