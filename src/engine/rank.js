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

export const REGION_ORDER = Object.keys(REGIONS);

export function regionRank(regionKey) {
  return REGION_ORDER.indexOf(regionKey);
}

const RANK_SCALE = 1e7;

export function globalRank(regionKey, villageIdx) {
  return regionRank(regionKey) * RANK_SCALE + villageIdx;
}

export const LOCAL_CLUSTER = 6;

export function clusterBase(villageIdx) {
  return villageIdx - (villageIdx % LOCAL_CLUSTER);
}

export function clusterOffset(villageIdx) {
  return villageIdx % LOCAL_CLUSTER;
}

export function higherRankRegions(regionKey) {
  const r = regionRank(regionKey);
  return REGION_ORDER.filter(rk => regionRank(rk) > r);
}
