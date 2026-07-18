// =====================================================================
// Overlapping hierarchies — the Church and the fief do not nest inside the
// civil region/village tree, and they do not nest inside EACH OTHER either.
// Each is its own independent tree over the same village addresses, joined
// to the civil tree by a deterministic assignment table:
//
//   parishOf(village_addr) -> { parish, deanery, diocese, province }
//   manorOf(village_addr)  -> { manor, honour, earldom, lord }
//
// Both are Tier-1-style envelope outputs (pure functions of world_seed +
// address, no memo required for correctness), but deliberately cheap and
// non-recursive: unlike resolveVillage, they never depend on another
// village's envelope, so they can be called freely from anywhere —
// including across the rank boundary that migration (migration.js) has to
// respect — without any risk of a resolution cycle.
// =====================================================================
import { addrHash, makeRng } from "./hash.js";
import { REGIONS } from "./data/regions.js";
import { JURISDICTIONS, SAINTS } from "./data/jurisdictions.js";

// ---- ecclesiastical tree: province > diocese > deanery > parish ----
// Villages are grouped into small blocks; most blocks are one parish per
// village, but occasionally several small villages in a block share a
// single mother parish (a "several villages share a parish" constraint,
// resolved once per block, deterministically).
const PARISH_CLUSTER = 5;

export function parishOf(worldSeed, regionKey, villageIdx) {
  const j = JURISDICTIONS[regionKey];
  const block = Math.floor(villageIdx / PARISH_CLUSTER);
  const blockRng = makeRng(addrHash(worldSeed, [regionKey, "parish-block", block]));
  const shared = blockRng.chance(0.3);
  const parishSlot = shared ? 0 : villageIdx % PARISH_CLUSTER;
  const pRng = makeRng(addrHash(worldSeed, [regionKey, "parish", block, parishSlot]));
  const saint = pRng.pick(SAINTS);
  const deanery = pRng.pick(j.deaneries);
  const dRng = makeRng(addrHash(worldSeed, [regionKey, "deanery-diocese", deanery]));
  const diocese = dRng.pick(j.dioceses);
  return {
    parish: `the parish of ${saint}`,
    shared,
    deanery: `the deanery of ${deanery}`,
    diocese: `the diocese of ${diocese}`,
    province: j.province
  };
}

// ---- feudal tree: earldom > honour > manor ----
// Manors are one-per-village (the usual case); honours cluster a
// neighbourhood of manors under one baronial family, independently of
// where parish boundaries fall — the whole point of the exercise.
const HONOUR_CLUSTER = 9;

function placeShortName(region, villageIdx) {
  const raw = region.places[villageIdx % region.places.length];
  const ofMatch = raw.match(/\bof\s+([^,]+)/);
  if (ofMatch) return ofMatch[1].trim();
  return raw.replace(/^(the|a)\s+/i, "").split(",")[0].trim();
}

export function manorOf(worldSeed, regionKey, villageIdx) {
  const region = REGIONS[regionKey];
  const j = JURISDICTIONS[regionKey];
  const block = Math.floor(villageIdx / HONOUR_CLUSTER);
  const hRng = makeRng(addrHash(worldSeed, [regionKey, "honour-block", block]));
  const earldom = hRng.pick(j.earldoms);
  const honourLord = hRng.pick(region.surnames);
  const mRng = makeRng(addrHash(worldSeed, [regionKey, "manor", villageIdx]));
  const lordFirst = mRng.pick(region.maleNames);
  const lordSurname = mRng.chance(0.5) ? honourLord : mRng.pick(region.surnames);
  return {
    manor: `the manor of ${placeShortName(region, villageIdx)}`,
    honour: `the honour of ${honourLord}`,
    earldom: `the earldom of ${earldom}`,
    lord: `${lordFirst} ${lordSurname}`
  };
}
