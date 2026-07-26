// A total, well-founded order over village addresses, used to keep
// cross-village dependencies (migration, in particular) acyclic: a village
// may only ever depend on villages that rank strictly lower than itself, so
// resolving any single address can never recurse back into itself.
//
// Villages are also grouped into small, fixed-size local clusters (a stand-in
// for a "hundred" or geographic neighbourhood, since this engine has no real
// terrain/adjacency graph). Local migration only flows within a cluster, in
// ascending offset order — which bounds the maximum chain of village solves
// triggered by resolving any one village to the cluster size, regardless of
// how large its villageIdx is.
import { REGIONS } from "./data/regions.js";
import { addrHash, makeRng } from "./hash.js";

export const REGION_ORDER: string[] = Object.keys(REGIONS);

export function regionRank(regionKey: string): number {
  return REGION_ORDER.indexOf(regionKey);
}

const RANK_SCALE = 1e7;

export function globalRank(regionKey: string, villageIdx: number): number {
  return regionRank(regionKey) * RANK_SCALE + villageIdx;
}

export const LOCAL_CLUSTER = 6;

export function clusterBase(villageIdx: number): number {
  return villageIdx - (villageIdx % LOCAL_CLUSTER);
}

export function clusterOffset(villageIdx: number): number {
  return villageIdx % LOCAL_CLUSTER;
}

export function higherRankRegions(regionKey: string): string[] {
  const r = regionRank(regionKey);
  return REGION_ORDER.filter((rk) => regionRank(rk) > r);
}

// § the far end: the cross-region pairing for long-distance migration.
//
// Pure address arithmetic, and it lives HERE rather than in migration.ts
// for a structural reason: village.ts needs the forward direction while
// it solves, and migration.ts needs resolveVillage for the reverse
// lookup, so keeping both halves in one module would put village.ts and
// migration.ts in an import cycle. The rank order is already the thing
// that makes cross-village dependencies safe, and this is one more fact
// about it.

/** The region one rung UP the ladder — where this region's long-distance
 * emigrants go. Null for the top region.
 *
 * One rung rather than any higher region (which is what the old free roll
 * picked from): a single rung keeps the pairing a bijection between two
 * regions, and spreads the flow evenly instead of pointing seven regions'
 * worth of emigrants at whichever region happens to sort last. */
export function regionAbove(regionKey: string): string | null {
  return REGION_ORDER[regionRank(regionKey) + 1] ?? null;
}

/** The region one rung DOWN — the only one that can have sent long-distance
 * migrants here. Null for the bottom region. */
export function regionBelow(regionKey: string): string | null {
  const r = regionRank(regionKey);
  return r > 0 ? REGION_ORDER[r - 1] : null;
}

/** Masked so a paired index stays the same order of magnitude as the one
 * it came from — village 12 pairs with something under a thousand, not
 * with village 8,000,000. */
const PAIR_MASK = 0x3ff;

/** The XOR key for a pair of adjacent regions, derived from the LOWER one
 * in both directions so the two sides cannot disagree about it. */
function pairKey(worldSeed: number, lowerRegion: string): number {
  return makeRng(addrHash(worldSeed, [lowerRegion, "long-distance-pairing"])).int(0, PAIR_MASK);
}

/** Where a long-distance emigrant from this village goes. XOR, so it is a
 * bijection and its own inverse — which is the whole point: the far end
 * can compute exactly which village could have sent to it, instead of
 * searching every village of every region below. */
export function longDistanceDestination(worldSeed: number, fromRegion: string, villageIdx: number): { regionKey: string; villageIdx: number } | null {
  const to = regionAbove(fromRegion);
  return to ? { regionKey: to, villageIdx: villageIdx ^ pairKey(worldSeed, fromRegion) } : null;
}

/** The one village that could have sent long-distance migrants here — the
 * same arithmetic read the other way. */
export function longDistanceOrigin(worldSeed: number, toRegion: string, villageIdx: number): { regionKey: string; villageIdx: number } | null {
  const from = regionBelow(toRegion);
  return from ? { regionKey: from, villageIdx: villageIdx ^ pairKey(worldSeed, from) } : null;
}
