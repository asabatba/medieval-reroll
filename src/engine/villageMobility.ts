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
export function rollMobility(vHash: number, demo: RegionDemography, p: Person): void {
  const r = makeRng(personStream(vHash, 950000, p.id));
  const post = p.birth + 16 >= 1350;
  const m = demo.mobility;
  let next: SocialClass | null = null;
  if (p.cls === "serf" && r.chance(post ? m.serfToFree.postPlague : m.serfToFree.base)) next = "freePeasant";
  else if (p.cls === "freePeasant" && r.chance(post ? m.freeToArtisan.postPlague : m.freeToArtisan.base)) next = "artisan";
  else if (p.cls === "artisan" && r.chance(post ? m.artisanToMerchant.postPlague : m.artisanToMerchant.base)) next = "merchant";
  if (next) {
    p.clsOrigin = p.cls;
    p.cls = next;
  }
}

// § downward mobility: the mirror of rollMobility, for a non-heir son of
// an artisan/merchant house who has no shop or trade capital of his own
// to inherit — no rung to defend either. Never fires under partible
// custom (isHeir already reads every son as a stakeholder there, so
// nonHeirSon is always false) or if rollMobility already moved this
// person up — one class transition at birth, not two.
export function rollDownwardMobility(vHash: number, demo: RegionDemography, p: Person, nonHeirSon: boolean): void {
  if (!nonHeirSon || p.clsOrigin) return;
  const r = makeRng(personStream(vHash, 960000, p.id));
  const post = p.birth + 16 >= 1350;
  const d = demo.mobility.nonHeirDowngrade;
  let next: SocialClass | null = null;
  if (p.cls === "merchant" && r.chance(post ? d.merchantToArtisan.postPlague : d.merchantToArtisan.base)) next = "artisan";
  else if (p.cls === "artisan" && r.chance(post ? d.artisanToFree.postPlague : d.artisanToFree.base)) next = "freePeasant";
  if (next) {
    p.clsOrigin = p.cls;
    p.cls = next;
  }
}

// § service: low-wealth children commonly spent adolescence in service or
// apprenticeship in another household (the NW-European life-cycle-service
// pattern; rarer in the Mediterranean — rates come from demography.ts).
export function rollService(vHash: number, demo: RegionDemography, p: Person, heirBoost = false): void {
  if (CLASS_INFO[p.cls].wealth > 2 && !heirBoost) return;
  const r = makeRng(personStream(vHash, 900000, p.id));
  // § male out-migration: a non-heir son of a wealthier household (who
  // won't inherit the land either) is also more likely to be sent into
  // service or apprenticeship than the base low-wealth rate alone implies.
  const chance = heirBoost ? Math.min(0.9, demo.service[p.sex] * 1.4) : demo.service[p.sex];
  if (!r.chance(chance)) return;
  const from = p.birth + 12;
  p.service = { from, to: from + r.int(4, 8) };
}
