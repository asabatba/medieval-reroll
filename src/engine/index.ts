/* Medieval Reroll v2 — deterministic history engine
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

export { decodePerson } from "./biography.js";
export { CLASS_INFO } from "./data/classes.js";
export { DEFAULT_DEMOGRAPHY, DEMOGRAPHY, demographyOf } from "./data/demography.js";
export { CAUSE_LABEL } from "./data/narrative.js";
export { PLAGUES, plagueAt } from "./data/plagues.js";
export { REGIONS } from "./data/regions.js";
export { citeDocument } from "./documents.js";
export { fatherOccupation } from "./fatherOccupation.js";
export { addrHash, makeRng } from "./hash.js";
// Overlapping hierarchies (§10): independent trees over the same village
// addresses, joined by a deterministic assignment table.
export { manorOf, parishOf } from "./hierarchy.js";
// Canonical cross-village identity (§ canonical identity): resolve either of
// a migrant's records (natal / residence) to the other.
export { canonicalRef, findResidenceRecord, residenceRef } from "./identity.js";
export type { AncestorNode, DescendantNode, ParentRecord } from "./lineage.js";
// Lineage traversal (§ family tree): multi-generation ancestors/descendants.
export { ancestorsOf, descendantsOf, parentsOf } from "./lineage.js";
export { famineAt, warAt } from "./mortality.js";
// Nobility (§ nobility): real royal lines (sovereignAt is a data lookup) and
// generated noble houses — the honour's baronial line and each manor's
// year-resolvable lord line, anchored to the fief card's static lord name.
export {
  ANCHOR_YEAR,
  accessionTextOf,
  honourFamilyOf,
  honourHeadAt,
  honourLineOf,
  lordOfManorAt,
  manorLineOf,
  ROYAL_LINES,
  reignIndexAt,
  royalLineOf,
  royalWorldEvents,
  sovereignAt,
  tenureIndexAt,
} from "./nobility.js";
export { randomCitizen, roster } from "./roster.js";
// § settlement: deterministic rural/urban axis over village addresses.
export { settlementTypeOf } from "./settlement.js";
export type { HouseholdState, MaritalStatus, PersonState, VillageState } from "./snapshot.js";
// Temporal resolver (§ year layer): the village population/households AS OF a year.
export { CHURCH_HOUSEHOLD, MANOR_HOUSEHOLD, residentAt, villageStateAt } from "./snapshot.js";
// Inheritance/household succession (§ family transitions), shared by Tier 2 and the snapshot layer.
export { childrenOf, heirOf, inheritedFromFather } from "./succession.js";
export type {
  Address,
  Bio,
  BioEvent,
  Couple,
  Death,
  DeathCause,
  Envelope,
  EventRef,
  Fief,
  Jurisdiction,
  LordTenure,
  NobleLine,
  Person,
  PersonAddress,
  Region,
  Reign,
  RelativeRef,
  Rng,
  RosterRow,
  RoyalLine,
  SettlementType,
  Sex,
  SocialClass,
  SolveDiagnostics,
  SpouseRef,
  UnionRef,
} from "./types.js";
export { clearEnvelopeCache, ENVELOPE_CACHE_LIMIT, envelopeCacheSize, MATCH_ROUND_LIMIT, resolveVillage } from "./village.js";
