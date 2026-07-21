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
// including across the rank boundary that migration (village.ts) has to
// respect — without any risk of a resolution cycle.
// =====================================================================

import type { Locale } from "../i18n/locale.js";
import { JURISDICTIONS, SAINTS } from "./data/jurisdictions.js";
import { placeShortOf } from "./data/placeNames.js";
import { addrHash, makeRng } from "./hash.js";
import { ANCHOR_YEAR, honourFamilyOf, lordOfManorAt } from "./nobility.js";
import type { Fief, Jurisdiction } from "./types.js";

// ---- ecclesiastical tree: province > diocese > deanery > parish ----
// Villages are grouped into small blocks; most blocks are one parish per
// village, but occasionally several small villages in a block share a
// single mother parish (a "several villages share a parish" constraint,
// resolved once per block, deterministically).
const PARISH_CLUSTER = 5;

export function parishOf(worldSeed: number, regionKey: string, villageIdx: number, locale: Locale): Jurisdiction {
  const j = JURISDICTIONS[regionKey];
  const block = Math.floor(villageIdx / PARISH_CLUSTER);
  const blockRng = makeRng(addrHash(worldSeed, [regionKey, "parish-block", block]));
  const shared = blockRng.chance(0.3);
  const parishSlot = shared ? 0 : villageIdx % PARISH_CLUSTER;
  const pRng = makeRng(addrHash(worldSeed, [regionKey, "parish", block, parishSlot]));
  const saint = pRng.pick(SAINTS[locale]);
  const deanery = pRng.pick(j.deaneries);
  const dRng = makeRng(addrHash(worldSeed, [regionKey, "deanery-diocese", deanery]));
  const diocese = dRng.pick(j.dioceses);
  return locale === "ca"
    ? {
        parish: `la parròquia de ${saint}`,
        shared,
        deanery: `el deganat de ${deanery}`,
        diocese: `el bisbat de ${diocese}`,
        province: `la província de ${j.province}`,
      }
    : {
        parish: `the parish of ${saint}`,
        shared,
        deanery: `the deanery of ${deanery}`,
        diocese: `the diocese of ${diocese}`,
        province: `the province of ${j.province}`,
      };
}

// ---- feudal tree: earldom > honour > manor ----
// Manors are one-per-village (the usual case); honours cluster a
// neighbourhood of manors under one baronial family, independently of
// where parish boundaries fall — the whole point of the exercise. The
// family draws themselves live in nobility.ts (§ nobility) now, which
// grows them into full dynastic lines; the fief card's `lord` is the
// mid-register (ANCHOR_YEAR) head of the manor's line, which by the
// anchoring contract is the exact name this function always produced.
export function manorOf(worldSeed: number, regionKey: string, villageIdx: number, locale: Locale): Fief {
  const { earldom, surname: honourLord } = honourFamilyOf(worldSeed, regionKey, villageIdx);
  const lord = lordOfManorAt(worldSeed, regionKey, villageIdx, ANCHOR_YEAR).name;
  const place = placeShortOf(worldSeed, regionKey, villageIdx);
  return locale === "ca"
    ? { manor: `la senyoria de ${place}`, honour: `l'honor de ${honourLord}`, earldom: `el comtat de ${earldom}`, lord }
    : { manor: `the manor of ${place}`, honour: `the honour of ${honourLord}`, earldom: `the earldom of ${earldom}`, lord };
}
