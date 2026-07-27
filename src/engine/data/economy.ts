// =====================================================================
// § the price of bread — the economic grounding, as data.
//
// The engine already had the year that varied (harvest.ts) and the land
// that bounded it (capacity.ts, tenement.ts), and no way at all to say
// what either was WORTH. `wealth` was an integer from 1 to 5 attached to a
// social class at birth and never moved again, which meant the model could
// not express the single largest thing that happened to ordinary people in
// its own period: the collapse of the land market and the doubling of the
// real wage after 1349. A villager born in 1300 and one born in 1400 stood
// in completely different relations to the price of bread, and to this
// engine they were both "freePeasant, wealth 2".
//
// Two series and a tariff, all of them documented rather than rolled:
//
//  - WHEAT_TREND: the price level, in pence per quarter, before the
//    year's own harvest is applied to it. Anchors follow the English
//    price series (Farmer/Rogers): about 5s–6s a quarter through the long
//    thirteenth century, a hard spike in the Great Famine that the
//    harvest response produces on its own rather than being written in
//    here, dear grain through the third quarter of the fourteenth
//    century, and a long soft market after 1375 as the population fell
//    away from the land.
//  - DAY_WAGE: what a day of a labourer's work fetched, without board.
//    This is the series that matters. Roughly 1½d before the plague, 3d
//    within a decade of it, 4d by 1400, and there it stayed — the
//    Statute of Labourers (1351) made it a crime and did not make it stop.
//  - DUES: the manorial tariff. These are the payments a court roll
//    actually consists of, and every one of them is triggered by an event
//    this engine already models — a holding taken up, a tenant dead, a
//    daughter married, a child born out of wedlock.
//
// Everything is in pence. Not because every region used pennies, but
// because comparing across them requires one silver unit, which is what
// the price historians do; Region.currency supplies the name the place
// itself would have used.
// =====================================================================
import type { TenementSize } from "../tenement.js";

/** [year, pence per quarter of wheat] — the trend, interpolated between
 * anchors. The year's actual price comes of applying the harvest to this
 * (economy.ts's `wheatPriceAt`), so a famine's fourfold spike is produced
 * by the failure rather than written in as a number. */
export const WHEAT_TREND: ReadonlyArray<readonly [number, number]> = [
  [1235, 50],
  [1290, 60],
  [1310, 66],
  [1340, 64],
  [1350, 76], // dear grain, and a third of the ploughmen dead
  [1375, 70],
  [1400, 62],
  [1440, 58],
  [1470, 60],
  [1500, 66],
];

/** [year, pence for a day's work] — an agricultural labourer, without
 * board. The step across 1349 is the whole point of the series. */
export const DAY_WAGE: ReadonlyArray<readonly [number, number]> = [
  [1235, 1.1],
  [1300, 1.4],
  [1340, 1.5],
  [1350, 2.4],
  [1360, 3.0],
  [1380, 3.4],
  [1400, 4.0],
  [1440, 4.6],
  [1470, 5.0],
  [1500, 5.0],
];

/** The four payments a manor court actually recorded against a tenant. */
export type DueKind = "entryfine" | "heriot" | "merchet" | "leyrwite";

/** Entry fine (gersuma): paid on taking up a holding. The most
 * land-hunger-sensitive figure in the whole manorial record — a virgate
 * could fetch several pounds when men were queuing for land and a few
 * shillings when the lord was begging anyone to take it — so the tariff
 * here is only the base, and economy.ts scales it by the occupancy the
 * capacity model is already tracking. */
export const ENTRY_FINE: Record<TenementSize, number> = {
  virgate: 480,
  halfVirgate: 240,
  cottage: 96,
  toft: 40,
};

/** Heriot: due to the lord on the tenant's death — the best beast off the
 * holding, or its value in money. A virgater's was an ox; a cottar's was
 * whatever he had. */
export const HERIOT: Record<TenementSize, number> = {
  virgate: 132,
  halfVirgate: 72,
  cottage: 30,
  toft: 14,
};

/** The beast the heriot actually took, by what the holding could carry —
 * because "heriot: 132d" is an accountant's rendering of a court roll
 * entry that named the animal. */
export const HERIOT_BEAST: Record<TenementSize, { en: string; ca: string }> = {
  virgate: { en: "the best ox", ca: "el bou millor" },
  halfVirgate: { en: "a cow", ca: "una vaca" },
  cottage: { en: "a sheep", ca: "una ovella" },
  toft: { en: "a brass pot, for want of a beast", ca: "una olla de llautó, a falta de bèstia" },
};

/** Merchet: a fine for licence to marry a daughter off, owed by unfree
 * tenants only. Small beside an entry fine, and universally resented out
 * of all proportion to the money, because paying it was the plainest
 * admission of servile status a man ever made in public. */
export const MERCHET_RANGE: readonly [number, number] = [18, 66];

/** Leyrwite: a fine for fornication, levied on the woman, and one of the
 * more startling things a manor court thought was its business. */
export const LEYRWITE_RANGE: readonly [number, number] = [6, 18];

/** Linear interpolation across an anchor series, flat outside its ends. */
export function trendAt(series: ReadonlyArray<readonly [number, number]>, year: number): number {
  if (year <= series[0][0]) return series[0][1];
  const last = series[series.length - 1];
  if (year >= last[0]) return last[1];
  for (let i = 1; i < series.length; i++) {
    const [y1, v1] = series[i];
    const [y0, v0] = series[i - 1];
    if (year <= y1) return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
  }
  return last[1];
}
