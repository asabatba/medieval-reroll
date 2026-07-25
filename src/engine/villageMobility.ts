// =====================================================================
// Class-mobility, occupational-risk, and life-cycle-service rolls (§
// mobility, § occupational mortality, § service). Each opens its OWN
// personStream namespace (8001 / 950000 / 960000 / 900000), independent of
// village.ts's shared `rng` — so moving them here never perturbs the
// marriage/migration draw sequence the shared stream depends on. Only
// their call ORDER relative to each other at a shared call site (e.g.
// class-transition rolls before riskTradeOf, in village.ts's makeChild)
// matters, not which file their code lives in.
// =====================================================================
import { CLASS_INFO } from "./data/classes.js";
import type { RegionDemography } from "./data/demography.js";
import { makeRng, personStream } from "./hash.js";
import type { Person, RiskTrade, Sex, SocialClass } from "./types.js";

// A person's trade-hazard category (§ occupational mortality): rolled once,
// deterministically, from a stream independent of the shared village `rng`
// (own namespace 8001, mirroring the per-person death stream at 7001) so
// adding this never perturbs the marriage/migration draw sequence. Women
// keep "normal" for now — their mortality model is already dominated by
// childbirth risk, tracked separately. Tier 2 (biography.ts) reads this same
// tag to keep occupation narrative consistent with the mechanic.
export function riskTradeOf(vHash: number, id: number, cls: Person["cls"], sex: Sex): RiskTrade {
  if (sex !== "M") return "normal";
  const r = makeRng(personStream(vHash, 8001, id));
  switch (cls) {
    case "gentry":
      return r.chance(0.35) ? "military" : "normal";
    case "merchant":
      return r.chance(0.25) ? "maritime" : "normal";
    case "artisan":
      return r.chance(0.18) ? "hazardous" : "normal";
    case "freePeasant":
      return r.chance(0.08) ? "maritime" : "normal";
    case "serf":
      return r.chance(0.05) ? "hazardous" : "normal";
    default:
      return "normal";
  }
}

// § mobility: a native child occasionally leaves their natal class on
// coming of age — serfs buying or defying their way to free tenancies
// (far likelier in the emptied countryside after 1349), free peasants'
// sons apprenticed into crafts, artisans' sons into trade. Rolled from a
// per-person stream so it never perturbs the shared village rng.
/**
 * @param room Multiplier on the chance of moving INTO a given class — how
 *   much space the village still has for another household of that kind
 *   (§ the estate ceiling, data/classes.ts). A class already at its ceiling
 *   takes in far fewer; one that has thinned out takes in more. This is the
 *   same ceiling the downgrade side reads, applied from the other end, and
 *   it is what makes the class structure settle rather than merely balance:
 *   a village that loses its last gentry household to a failure of male
 *   heirs can produce another, and one that already has three does not.
 */
export function rollMobility(vHash: number, demo: RegionDemography, p: Person, room: (cls: SocialClass) => number): void {
  const r = makeRng(personStream(vHash, 950000, p.id));
  const post = p.birth + 16 >= 1350;
  const m = demo.mobility;
  const rate = (pair: { base: number; postPlague: number }, into: SocialClass) => (post ? pair.postPlague : pair.base) * room(into);
  let next: SocialClass | null = null;
  if (p.cls === "serf" && r.chance(rate(m.serfToFree, "freePeasant"))) next = "freePeasant";
  else if (p.cls === "freePeasant" && r.chance(rate(m.freeToArtisan, "artisan"))) next = "artisan";
  else if (p.cls === "artisan" && r.chance(rate(m.artisanToMerchant, "merchant"))) next = "merchant";
  // The top of the ladder, and the reason it has to exist: without it gentry
  // is a class with an exit and no entrance, so a village that loses its one
  // gentry line to a failure of male heirs never has another, and the estate
  // simply drains out of the register. Real gentry status was replenished
  // exactly here — a prosperous trading household bought the manor, married
  // into arms, and was styled gentle within a generation — and markedly more
  // often after 1349, which is the whole late-medieval rise of the gentry.
  else if (p.cls === "merchant" && r.chance(rate(m.merchantToGentry, "gentry"))) next = "gentry";
  if (next) {
    p.clsOrigin = p.cls;
    p.cls = next;
  }
}

// § downward mobility: the mirror of rollMobility, and the thing that keeps
// the village's social structure from being a ratchet.
//
// Without a rung out of EVERY class above the land, the estates above the
// peasantry only ever grew. Two forces pushed them up and nothing pushed
// back: mortality is softened by wealth grade (demography.ts's
// wealthHazardMult/infantWealthMult), so the richer a household the more of
// its children reached adulthood to have children of their own; and
// rollMobility above promotes into artisan and merchant with no matching
// outflow. Measured over the register era that compounded into villages
// that were a quarter gentry and a fifth merchants by the 1450s — England's
// gentry share went 9%→18% across the cohorts, Tuscany's 12%→26%, and
// Catalonia's merchants 10%→23%. A village is not that, in any century.
//
// What really absorbed the surplus is not in dispute: a younger son
// inherited neither the estate nor the shop nor the credit that went with
// it, and in the ordinary case did not keep his father's standing. Gentry
// younger sons became yeomen (or soldiers, or clerks); a merchant's went
// back to working with his hands. So every class above the free peasantry
// now has a way down, and the rates are the rates that actually balance the
// inflow rather than the token ones they replace.
//
// Never fires if rollMobility already moved this person up — one class
// transition at birth, not two.
export function rollDownwardMobility(vHash: number, demo: RegionDemography, p: Person, weight: number): void {
  if (weight <= 0 || p.clsOrigin) return;
  const r = makeRng(personStream(vHash, 960000, p.id));
  const post = p.birth + 16 >= 1350;
  const d = demo.mobility.nonHeirDowngrade;
  const rate = (pair: { base: number; postPlague: number }) => (post ? pair.postPlague : pair.base) * weight;
  let next: SocialClass | null = null;
  if (p.cls === "merchant" && r.chance(rate(d.merchantToArtisan))) next = "artisan";
  else if (p.cls === "artisan" && r.chance(rate(d.artisanToFree))) next = "freePeasant";
  else if (p.cls === "gentry" && r.chance(rate(d.gentryToFree))) next = "freePeasant";
  else if (p.cls === "clergyFamily" && r.chance(rate(d.clergyToFree))) next = "freePeasant";
  if (next) {
    p.clsOrigin = p.cls;
    p.cls = next;
  }
}

// § the celibate estate: entry into religion, rolled at birth from a stream
// of its own (namespace 930000) like every other life-course allocation here.
//
// Rolled AT BIRTH, not inside the marriage matching where it used to live,
// and that placement is the point. A child was marked out for the Church
// young — oblation, or simply the Latin from the parish priest — and the
// decision then shaped everything downstream: he is not in the marriage
// market at all, rather than a man who failed to find a wife and was swept
// into orders as the consolation prize. It also means the flag exists before
// the matcher runs, so village.ts can filter on it instead of consuming a
// draw mid-loop for one class of one sex.
//
// Only for children who live to see it: a vocation is not a fact about a
// child who died at four, and recording one would put a chantry priest in
// the register with a fourteen-year gap between his tonsure and his birth.
export function rollVocation(vHash: number, demo: RegionDemography, p: Person, nonHeirSon: boolean): void {
  if (p.death.age < 14) return;
  const v = demo.vocation;
  let chance = p.sex === "M" ? v.M : v.F;
  if (p.cls === "clergyFamily") chance *= v.clergyMult;
  if (nonHeirSon) chance *= v.nonHeirMult;
  // A daughter of a house that would have had to find her a marriage dowry:
  // the cloister's own gift was a fraction of it, and that arithmetic is why
  // the dowry-regime regions' convents filled and NW Europe's did not.
  else if (p.sex === "F" && CLASS_INFO[p.cls].wealth >= 3) chance *= v.dowriedMult;
  if (makeRng(personStream(vHash, 930000, p.id)).chance(chance)) p.inOrders = true;
}

// § service: low-wealth children commonly spent adolescence in service or
// apprenticeship in another household (the NW-European life-cycle-service
// pattern; rarer in the Mediterranean — rates come from demography.ts).
export function rollService(vHash: number, demo: RegionDemography, p: Person, heirBoost = false): void {
  // Service and APPRENTICESHIP are the same institution seen from two ends —
  // a spell of years in someone else's household, ending when the servant
  // had a household of their own — and the craft end of it is if anything
  // the better documented, through the indentures. Excluding the artisan and
  // clerical grades (wealth 3) therefore cut out exactly the placements
  // biographyOccupation.ts already narrates ("was apprenticed to the family
  // trade"), and left the modelled servant population at roughly half the
  // share the listings show. Only the merchant and gentry grades stay out by
  // default: their sons went out as non-heirs (heirBoost) or not at all.
  if (CLASS_INFO[p.cls].wealth > 3 && !heirBoost) return;
  const r = makeRng(personStream(vHash, 900000, p.id));
  // § male out-migration: a non-heir son of a wealthier household (who
  // won't inherit the land either) is also more likely to be sent into
  // service or apprenticeship than the base low-wealth rate alone implies.
  const chance = heirBoost ? Math.min(0.9, demo.service[p.sex] * 1.4) : demo.service[p.sex];
  if (!r.chance(chance)) return;
  const from = p.birth + 12;
  p.service = { from, to: from + r.int(4, 8) };
}
