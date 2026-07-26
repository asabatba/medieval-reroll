// =====================================================================
// § the far end — closing the loop on long-distance migration.
//
// A long-distance emigrant used to be a dead end. The register said she
// went to another region, named a place, and stopped: her destination was
// `rng.int(0, 200)`, an address nobody could work backwards from. The
// destination village had no way to discover her, because discovering her
// would have meant scanning every village of every lower-ranked region on
// the chance one of them had pointed at it.
//
// Two things fix that, and the second matters more than the first.
//
// 1. THE PAIRING IS INVERTIBLE. The destination is no longer a free roll
//    but `villageIdx XOR key(pair of regions)` — a bijection, and its own
//    inverse, so a village can compute exactly which village in the region
//    below could have sent to it. One address, not a search.
//
// 2. THE SOLVE DOES NOT DO THE PULLING. This is the part that was really
//    blocking it. Making resolveVillage() pull its own long-distance
//    incomers looks natural and is catastrophic: every village would drag
//    in a village from the region below, which drags in its own local
//    cluster (six), each of which drags in another region below — six
//    regions deep it is 6^8 solves for one address. So nothing here is
//    called from the solve. The ORIGIN records where she went (one
//    address, computed, no extra solve), and the DESTINATION side is a
//    read-only lookup the UI calls when someone actually opens that
//    village's page — at which point seven cheap solves are affordable
//    and, being memoized, usually already done.
//
// The result is that both ends agree without either depending on the
// other: her own register says where she went, and the place she went to
// can list her among its incomers and link back. She still has only one
// record — the natal one, which is canonical and complete (her death is
// rolled there) — because inventing a second one at the far end is what
// the rank rule exists to prevent.
// =====================================================================
import { longDistanceOrigin } from "./rank.js";
import type { Address, Envelope, Person } from "./types.js";
import { resolveVillage } from "./village.js";

/** One person who left another region for this village, and the register
 * that still holds her. */
export interface InboundMigrant {
  person: Person;
  /** Her natal register — the canonical record, and the only one there is. */
  origin: Address;
  /** The year she left, as her own register dates it. */
  year: number;
}

// The pairing itself lives in rank.ts (pure address arithmetic, and
// village.ts needs the forward direction while it solves); re-exported
// here so callers have one place to look for all of this.
export { longDistanceDestination, longDistanceOrigin, regionAbove, regionBelow } from "./rank.js";

/** Everyone whose own register says they came here from the region below.
 *
 * READ-ONLY, and deliberately not called from resolveVillage — see the
 * header. Resolving the paired origin is one memoized solve of a strictly
 * lower-ranked address, so this can neither cycle nor cascade. */
export function inboundLongDistance(worldSeed: number, toRegion: string, villageIdx: number): InboundMigrant[] {
  const origin = longDistanceOrigin(worldSeed, toRegion, villageIdx);
  if (!origin) return [];
  const src = resolveVillage(worldSeed, origin.regionKey, origin.villageIdx);
  const out: InboundMigrant[] = [];
  for (const p of src.persons) {
    if (!p.emigrated || !p.longDistance || !p.emigrateTo) continue;
    if (p.emigrateTo.regionKey !== toRegion || p.emigrateTo.villageIdx !== villageIdx) continue;
    // Her own register dates the departure by the marriage-out year where
    // it recorded one, and otherwise by the age she would have left at.
    out.push({ person: p, origin, year: p.marriageYear ?? p.birth + 20 });
  }
  out.sort((a, b) => a.year - b.year || a.person.id - b.person.id);
  return out;
}

/** The mirror: everyone this village sent up the ladder, with the address
 * their own record points at. Pure envelope reading, no solve at all. */
export function outboundLongDistance(env: Envelope): InboundMigrant[] {
  const here: Address = { regionKey: env.regionKey, villageIdx: env.villageIdx };
  const out: InboundMigrant[] = [];
  for (const p of env.persons) {
    if (!p.emigrated || !p.longDistance || !p.emigrateTo) continue;
    out.push({ person: p, origin: here, year: p.marriageYear ?? p.birth + 20 });
  }
  out.sort((a, b) => a.year - b.year || a.person.id - b.person.id);
  return out;
}
