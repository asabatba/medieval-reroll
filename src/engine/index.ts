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
// § the village route: the land itself, which the UI now has a page for.
export { holdingsAt, holdingsOf } from "./capacity.js";
// § the church's own line: the succession of parish priests, built like the
// noble lines but keyed to the PARISH seat, so a shared mother church has
// one incumbent and not one per village.
export type { ClergyLine, IncumbencyEnd, Incumbent } from "./clergy.js";
export { CLERGY_FROM, CLERGY_TO, incumbencyIndexAt, institutionsBetween, parishClergyOf, parishSeatOf, plagueVacancyAt, rectorAt } from "./clergy.js";
export { CLASS_INFO } from "./data/classes.js";
export { DEFAULT_DEMOGRAPHY, DEMOGRAPHY, demographyOf } from "./data/demography.js";
// § the price of bread: the price and wage series, the manorial tariff,
// and the two things they finally let the model say — what a year cost,
// and whether a holding fed the household standing on it.
export type { DueKind } from "./data/economy.js";
export { DAY_WAGE, ENTRY_FINE, HERIOT, HERIOT_BEAST, LEYRWITE_RANGE, MERCHET_RANGE, trendAt, WHEAT_TREND } from "./data/economy.js";
// § named epidemics: the dated outbreaks and the endemic background that
// name a `disease` death instead of leaving it in the grey bucket.
export type { Epidemic, EpidemicAgeShape } from "./data/epidemics.js";
export { EPIDEMICS, epidemicAt, epidemicNews } from "./data/epidemics.js";
// § the appropriated living: the clergy line stores a saint INDEX, not a
// name, so the priory holding the tithes can be named in either locale.
// § the season: the feast a date fell on — how the day was actually named.
export { feastOf } from "./data/feasts.js";
export { SAINTS } from "./data/jurisdictions.js";
export { CAUSE_LABEL } from "./data/narrative.js";
export { placeOf, placeShortOf } from "./data/placeNames.js";
export { PLAGUES, plagueAt } from "./data/plagues.js";
export { REGIONS } from "./data/regions.js";
export { citeDocument } from "./documents.js";
export type { CourtEntry, Subsistence } from "./economy.js";
export { courtRollOf, dayWageAt, lsd, occupancyAt, priceSeries, realWageDays, subsistenceOf, wheatPriceAt } from "./economy.js";
// § the epidemic year: the dated outbreaks as actual mortality, not as a
// relabelling of deaths the model was going to produce anyway.
export { outbreakAt, outbreakHazard } from "./epidemics.js";
export { fatherOccupation } from "./fatherOccupation.js";
// § the harvest: the subsistence year — documented failures as data, the
// ordinary variance hashed per world, and the three things a bad harvest
// did (killed, postponed weddings, thinned the next year's baptisms).
export type { Dearth, HarvestGrade } from "./harvest.js";
export {
  CRISIS_FEVER_SHARE,
  crisisFeverHazard,
  DEARTH,
  DEARTHS,
  dearthAt,
  dearthHazard,
  FAMINE,
  fertilityMult,
  GOOD_HARVEST,
  gradeOf,
  harvestAt,
  harvestSeries,
  marriageDeferral,
  namedDearthAt,
  POOR_HARVEST,
} from "./harvest.js";
export { addrHash, makeRng } from "./hash.js";
// Overlapping hierarchies (§10): independent trees over the same village
// addresses, joined by a deterministic assignment table.
// § the parish route: PARISH_CLUSTER and parishMotherVillageIdx let the UI
// name the other villages under a shared mother church without duplicating
// the block arithmetic.
export { bareParishOf, deaneriesOf, dioceseOfDeanery, manorOf, PARISH_CLUSTER, parishMotherVillageIdx, parishOf } from "./hierarchy.js";
// Canonical cross-village identity (§ canonical identity): resolve either of
// a migrant's records (natal / residence) to the other.
export { canonicalRef, findResidenceRecord, residenceRef } from "./identity.js";
export type { AncestorNode, DescendantNode, ParentRecord } from "./lineage.js";
// Lineage traversal (§ family tree): multi-generation ancestors/descendants.
export { ancestorsOf, descendantsOf, parentsOf } from "./lineage.js";
// § the far end: long-distance migration, with both ends able to name each
// other. The pairing is invertible, so the destination can compute its one
// possible origin instead of searching; the lookup is READ-ONLY and never
// called from the solve (see migration.ts on why that distinction is the
// whole feature).
export type { InboundMigrant } from "./migration.js";
export { inboundLongDistance, longDistanceDestination, longDistanceOrigin, outboundLongDistance, regionAbove, regionBelow } from "./migration.js";
export { famineAt, warAt } from "./mortality.js";
// Nobility (§ nobility): real royal lines (sovereignAt is a data lookup) and
// generated noble houses — the honour's baronial line and each manor's
// year-resolvable lord line, anchored to the fief card's static lord name.
export {
  ANCHOR_YEAR,
  accessionTextOf,
  clearNobleLineCache,
  honourFamilyOf,
  honourHeadAt,
  honourLineOf,
  lordOfManorAt,
  manorLineOf,
  NOBLE_LINE_CACHE_LIMIT,
  nobleLineCacheSize,
  ROYAL_LINES,
  reignIndexAt,
  royalLineOf,
  royalWorldEvents,
  sovereignAt,
  tenureIndexAt,
} from "./nobility.js";
// § the Schism: the papacy as data, read through each region's own
// obedience — the one lookup in the engine whose ANSWER depends on the
// region while its data is shared.
export type { PapalLine, PapalSeat, PapalTerm, Pontificate } from "./papacy.js";
export {
  JUBILEES,
  jubileeAt,
  obedienceAt,
  PAPACY_FROM,
  PAPACY_TO,
  papalSeriesOf,
  papalWorldEvents,
  popeAt,
  popeIndexAt,
  popeTermAt,
} from "./papacy.js";
export { randomCitizen, roster } from "./roster.js";
// § the season: the year inside the year — the Julian Easter, the three
// Sarum closed seasons it moves, and the seasonal profile of a birth, a
// marriage and a burial by cause.
export type { SeasonalCounts } from "./season.js";
export {
  adventSundayDoy,
  birthDateOf,
  coupleMarriageDate,
  dayOfYear,
  daysInMonth,
  daysInYear,
  deathDateOf,
  fromDayOfYear,
  isClosedSeason,
  isLeapYear,
  julianEaster,
  julianEasterDoy,
  marriageClosedMask,
  marriageDateOf,
  personBirthDate,
  personDeathDate,
  seasonalCounts,
} from "./season.js";
// § settlement: deterministic rural/urban axis over village addresses.
export { settlementTypeOf } from "./settlement.js";
export type { HouseholdState, MaritalStatus, PersonState, VillageState } from "./snapshot.js";
// Temporal resolver (§ year layer): the village population/households AS OF a year.
export { CHURCH_HOUSEHOLD, MANOR_HOUSEHOLD, populationSeries, residentAt, villageStateAt } from "./snapshot.js";
// Inheritance/household succession (§ family transitions), shared by Tier 2 and the snapshot layer.
export { childrenOf, heirOf, inheritedFromFather } from "./succession.js";
// § the tenement: the village's holdings as named ground with a size, and
// the succession of families across each one.
export type { Tenement, TenementSize, Tenure } from "./tenement.js";
export { sizeRank, tenementHistory, tenementName, tenementOfCouple, tenementsOf } from "./tenement.js";
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
  MedievalDate,
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
export {
  clearEnvelopeCache,
  ENVELOPE_CACHE_LIMIT,
  envelopeCacheSize,
  GENERATION_LAST_YEAR,
  MATCH_ROUND_LIMIT,
  PARTIBLE_SUBDIVISION,
  resolveVillage,
} from "./village.js";
