/* MEDIEVAL REROLL v2 — deterministic history engine
   Architecture (per spec):
   - Hierarchical addresses: world_seed → region → village:idx → person:id
   - Tier 1: resolveVillage() — the envelope. One pure, memoizable constraint
     solve per village address that fixes the entire genealogy: households,
     births, deaths (with causes), and the marriage matching. All RELATIONAL
     facts live here, so spouse/sibling/parent references are symmetric by
     construction.
   - Tier 2: biography() — O(1) per-person decode. Reads facts from the
     envelope, decorates them with narrative decoded from the person's own
     address hash (occupation, texture events, world events). Never invents
     a relational fact.
   - Invariants: decode is a pure function of (world_seed, address); person
     decode depends only on the envelope + ancestors, never on siblings'
     decodes; re-resolving an envelope yields identical results (cache is an
     optimization, not a correctness requirement).
   Historical grounding unchanged: Russell's life tables, plague chronology
   1347–1500, Great Famine, EMP marriage ages, ~1.3% maternal mortality/birth.
*/
export { addrHash, makeRng } from "./hash.js";
export { REGIONS } from "./data/regions.js";
export { PLAGUES } from "./data/plagues.js";
export { CLASS_INFO } from "./data/classes.js";
export { CAUSE_LABEL } from "./data/narrative.js";
export { resolveVillage } from "./village.js";
export { decodePerson, fatherOccupation } from "./biography.js";
export { roster, randomCitizen } from "./roster.js";
// Overlapping hierarchies (§10): independent trees over the same village
// addresses, joined by a deterministic assignment table.
export { parishOf, manorOf } from "./hierarchy.js";
export { citeDocument } from "./documents.js";
