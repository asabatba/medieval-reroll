// =====================================================================
// § settlement: a deterministic rural/urban axis over village addresses,
// the same non-recursive, cheap pattern as hierarchy.ts's parishOf/
// manorOf — a plain function of (worldSeed, regionKey, villageIdx), never
// dependent on another village's envelope, so it can be called from
// anywhere (village.ts's own solve, hierarchy.ts's naming, a future UI
// label) without any risk of a resolution cycle.
//
// Most medieval settlements in this model are ordinary rural villages; a
// minority are market towns with a denser, more artisan/merchant-heavy
// population (see URBAN_CLASSES in data/classes.ts) and their own
// vocabulary for what the feudal tree calls them (hierarchy.ts's
// manorOf). Kept a flat per-village roll rather than a fixed one-per-
// cluster slot: real settlement geography wasn't perfectly regular either,
// and a flat rate is simpler to reason about and to test.
// =====================================================================
import { addrHash, makeRng } from "./hash.js";
import type { SettlementType } from "./types.js";

// Roughly one settlement in seven or eight is a chartered market town
// rather than an ordinary village — a minority, as real medieval
// settlement patterns were.
const URBAN_RATE = 0.15;

export function settlementTypeOf(worldSeed: number, regionKey: string, villageIdx: number): SettlementType {
  const rng = makeRng(addrHash(worldSeed, [regionKey, "settlement", villageIdx]));
  return rng.chance(URBAN_RATE) ? "urban" : "rural";
}
