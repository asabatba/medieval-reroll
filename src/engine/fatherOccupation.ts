// =====================================================================
// Father's occupation, decoded from the FATHER's own envelope address so all
// siblings agree on it (upward dependency only) — and, for an immigrant,
// from her ORIGIN envelope, since that's the manor her father actually held
// land of, not the destination's. Uses its OWN independent stream
// (personStream(..., 60000, ...), distinct from decodePerson's own 40000),
// so it carries no shared-rng ordering dependency with biography.ts at all
// — a clean, self-contained move.
// =====================================================================
import type { Locale } from "../i18n/locale.js";
import { CLASS_INFO, CRAFTS } from "./data/classes.js";
import { FATHER_OCC } from "./data/narrative.js";
import { makeRng, personStream } from "./hash.js";
import { lordOfManorAt } from "./nobility.js";
import type { Envelope } from "./types.js";

export function fatherOccupation(env: Envelope, fatherId: number, locale: Locale): string | null {
  if (fatherId < 0) return null;
  const f = env.persons[fatherId];
  const rng = makeRng(personStream(env.vHash, 60000, fatherId));
  // § nobility: the lord he held of is the head of the manor's line in his
  // own working prime, not the fief card's mid-register anchor.
  const lord = lordOfManorAt(env.worldSeed, env.regionKey, env.villageIdx, Math.min(f.death.year, f.birth + 30)).name;
  return rng
    .pick(FATHER_OCC[locale][f.cls])
    .replace("{land}", rng.int(CLASS_INFO[f.cls].wealth >= 2 ? 12 : 5, CLASS_INFO[f.cls].wealth >= 2 ? 40 : 15) + " " + env.region.landUnit[locale])
    .replace("{craft}", rng.pick(CRAFTS[locale]))
    .replace(/\{lord\}/g, lord);
}
