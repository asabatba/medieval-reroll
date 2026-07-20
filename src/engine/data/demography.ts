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
  };
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
  },
};

export const DEMOGRAPHY: Record<string, RegionDemography> = {
  england: { ...NW_DEFAULT },
  germany: {
    ...NW_DEFAULT,
    hazardMult: 0.98,
    emigration: { base: 0.55, pressured: 0.7 }, // eastward colonization pull
    service: { M: 0.35, F: 0.4 },
  },
  france: {
    ...NW_DEFAULT,
    hazardMult: 1.05, // chronic war disruption on top of explicit warYears
    infantMult: 1.05,
    emigration: { base: 0.5, pressured: 0.7 },
    service: { M: 0.3, F: 0.34 },
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
    },
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
    },
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
