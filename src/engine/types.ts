// Shared domain types for the history engine. Kept in one place because the
// Tier-1 envelope (village.js) and Tier-2 decoder (biography.js) share the
// same underlying Person/Envelope shapes by construction — that symmetry is
// the whole point of the architecture (see engine/index.ts).
import type { Locale } from "../i18n/locale.js";

/** A string with an entry for every supported locale — narrative text is generated once per locale, never translated after the fact. */
export type LocalText = Record<Locale, string>;

export type Sex = "M" | "F";

export type SocialClass = "serf" | "freePeasant" | "artisan" | "merchant" | "clergyFamily" | "gentry";

export type DeathCause = "plague" | "famine" | "war" | "infancy" | "childhood" | "childbirth" | "disease" | "oldage";

/** Occupational hazard category, rolled at Tier 1 alongside death and read back by
 * Tier 2 so the occupation narrative it decodes stays consistent with the mechanic. */
export type RiskTrade = "normal" | "hazardous" | "maritime" | "military";

export interface Death {
  year: number;
  age: number;
  cause: DeathCause;
}

// A village address, independent of which person within it is meant.
export interface Address {
  regionKey: string;
  villageIdx: number;
}

// A specific person within a specific village.
export interface PersonAddress extends Address {
  personId: number;
}

export interface Rng {
  (): number;
  int(lo: number, hi: number): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
  weighted<T>(pairs: ReadonlyArray<[T, number]>): T;
}

// A person record inside one village's envelope. Many fields are set
// progressively during the Tier-1 solve (death, spouse, emigration) — see
// village.ts for exactly when each is populated. Tier-2 decode never writes
// back into this record: derived narrative facts (occupation, literacy) live
// only on the returned Bio.
export interface Person {
  id: number;
  name: string;
  surname: string;
  sex: Sex;
  birth: number;
  cls: SocialClass;
  /** Set when class mobility moved this person off their natal class (§ mobility): the class they were born into. */
  clsOrigin?: SocialClass;
  father: number;
  mother: number;
  death: Death;
  /** Immutable, assigned at birth. Null only for founders'/fabricated incomers' unaddressable origin. */
  origin: Address | null;
  /** Set only for a real (non-fabricated) immigrant: her id within her origin village's own persons array. */
  originId?: number;
  founder?: boolean;
  incomer?: boolean;
  /** FIRST spouse (back-compat with single-marriage records); the full marital history is `unions`. */
  spouse?: number;
  /** Year of the FIRST marriage; later unions carry their own year on the Couple. */
  marriageYear?: number;
  /** Couple indices into Envelope.couples, in marriage order. Length > 1 means remarriage after widowhood. */
  unions?: number[];
  /** Years spent in service/apprenticeship in another household (§ service), rolled at Tier 1. */
  service?: { from: number; to: number };
  inOrders?: boolean;
  marriedOut?: boolean;
  emigrated?: boolean;
  emigrateTo?: Address;
  longDistance?: boolean;
  /** Assigned at Tier 1, alongside death; "normal" for women (see RiskTrade). */
  riskTrade?: RiskTrade;
}

export interface Couple {
  husband: number;
  wife: number;
  year: number;
  children: number[];
}

export interface Region {
  name: LocalText;
  places: LocalText[];
  maleNames: string[];
  femaleNames: string[];
  surnames: string[];
  marriageF: [number, number];
  marriageM: [number, number];
  famine: [number, number];
  famineName: LocalText;
  warYears: [number, number][];
  warNames: Record<number, LocalText>;
  revolt: { year: number; name: LocalText; desc: LocalText } | null;
  pilgrim: LocalText[];
  currency: string;
  landUnit: LocalText;
  routiers?: boolean;
  /** § regional inheritance customs: "impartible" (male primogeniture — the
   * eldest surviving son takes the whole holding, succession.ts's heirOf)
   * or "partible" (the holding divided among the sons). Read by village.ts
   * to decide whether the various "non-heir" mechanical penalties (heavier
   * service, out-migration, downward mobility) apply at all — under
   * partible custom every son had a real stake, so none of them do. */
  inheritance: "impartible" | "partible";
}

/** Diagnostics recorded by the Tier-1 solve (§ hardening): how the marriage
 * matching actually terminated, so a silently truncated lineage is visible. */
export interface SolveDiagnostics {
  /** How many matching rounds ran before the genealogy closed. */
  matchingRounds: number;
  /** True if the round guard was exhausted while eligible persons remained — the lineage was cut short. */
  truncated: boolean;
  /** Eligible-but-unprocessed persons left when matching stopped (0 unless truncated). */
  unmatched: number;
}

export interface Envelope {
  worldSeed: number;
  regionKey: string;
  villageIdx: number;
  vHash: number;
  place: LocalText;
  region: Region;
  persons: Person[];
  couples: Couple[];
  /** Person id → index of their FIRST couple (see Person.unions for the full history). */
  coupleOf: Record<number, number>;
  diagnostics: SolveDiagnostics;
}

// [startYear, endYear, severityMultiplier, name, childMultiplier]
export type Plague = [number, number, number, LocalText, number];

export interface ClassInfo {
  label: LocalText;
  wealth: number;
}

// [startYear, endYear, regionFilter (null = all), ageOffset, chance, kind, srcKind, textFn]
// textFn receives the decoded literacy as a third argument because literacy is a
// Tier-2 derived fact that no longer lives on the Person record (§ pure decode).
export type WorldEvent = [number, number, string[] | null, number, number, string, DocumentKind, (p: Person, locale: Locale, literate?: boolean) => string];

// [template, weight, flag]
export type TextureEvent = [string, number, string | null];

export interface JurisdictionData {
  province: string;
  dioceses: string[];
  deaneries: string[];
  earldoms: string[];
}

// ---- overlapping hierarchies (§10) ----
export interface Jurisdiction {
  parish: string;
  shared: boolean;
  deanery: string;
  diocese: string;
  province: string;
}

export interface Fief {
  manor: string;
  honour: string;
  earldom: string;
  lord: string;
}

export type DocumentKind = "reg" | "court" | "account" | "will" | "chron" | "coroner";

export interface DocumentContext {
  jurisdiction?: Jurisdiction;
  fief?: Fief;
  place?: string;
}

// ---- Tier-2 decode shapes ----
export interface BioEvent {
  year: number;
  age: number;
  text: string;
  kind: string;
  src: string;
}

export interface RelativeRef {
  id: number;
  name: string;
  sex?: Sex;
  birth: number;
  death: Death;
  addr: Address;
}

export interface ParentRef extends RelativeRef {
  dead: Death;
  foreign: boolean;
}

export interface SpouseRef extends RelativeRef {
  incomer: boolean;
  originPlace: string | null;
}

/** One marriage in a person's marital history, decoded from the envelope. */
export interface UnionRef {
  spouse: SpouseRef;
  year: number;
  children: RelativeRef[];
}

export interface Bio {
  id: number;
  env: Envelope;
  name: string;
  surname: string;
  sex: Sex;
  birth: number;
  death: Death;
  causeLabel: string;
  cls: SocialClass;
  clsLabel: string;
  wealth: number;
  place: string;
  region: string;
  literate: boolean;
  inOrders: boolean;
  incomer: boolean;
  founder: boolean;
  marriedOut: boolean;
  originPlace: string | null;
  jurisdiction: Jurisdiction;
  fief: Fief;
  father: ParentRef | null;
  mother: ParentRef | null;
  fatherOccupation: string | null;
  /** Derived at Tier 2 (never written back to the Person record — § pure decode). */
  occupation: string | null;
  siblings: RelativeRef[];
  /** First spouse (or, for an emigrant decoded at her origin, her destination spouse). Full history in `unions`. */
  spouse: SpouseRef | null;
  marriageYear: number | null;
  unions: UnionRef[];
  /** All children across every union. */
  children: RelativeRef[];
  /** For an emigrant decoded at her ORIGIN village: her resident record in the destination register, when it exists. */
  destRecord: PersonAddress | null;
  events: BioEvent[];
  widowed: number;
  plaguesLived: number;
}

export interface RosterRow {
  id: number;
  name: string;
  surname: string;
  sex: Sex;
  birth: number;
  death: Death;
  cls: SocialClass;
  incomer: boolean;
  founder: boolean;
  emigrated: boolean;
  longDistance: boolean;
}
