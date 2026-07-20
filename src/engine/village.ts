// =====================================================================
// TIER 1 — the envelope. One constraint solve per village address.
//
// Migration (§11): a person's origin address is fixed for life at
// creation — it never changes, and it's what genealogy/parentage decode
// from. Whether they end their days resident in that same village or
// somewhere else is a separate fact (`emigrated`/`emigrateTo`), decided
// once, unilaterally, by their OWN village's own solve — never by the
// destination reaching back to mutate them. That one-directional design is
// what keeps this acyclic: a village's solve may read another village's
// already-resolved envelope (to find real immigrants who named it as their
// destination), but a village never needs its own future destination to
// resolve itself, so there is nothing for the dependency graph to cycle on.
//
// To keep that dependency bounded no matter how large a villageIdx is,
// local migration only flows within a small, fixed-size cluster of
// neighbouring villages (rank.ts) — so resolving any one village never
// triggers more than a handful of neighbour solves, not a chain back to
// village zero. Long-distance migration (§11) is deliberately looser: it
// still produces a real, resolvable destination address, but — since the
// address space is unbounded — the destination doesn't scan the world
// looking for who might have arrived, so it's narrated on the origin side
// only, the same way a medieval parish register usually knows a daughter
// "married out" without knowing much more.
//
// Cross-village identity (§ canonical identity): when a real emigrant is
// pulled into a destination village, the destination adds a RESIDENCE
// record for her, carrying `origin`+`originId` — an address-based pointer
// to her one canonical natal record. The two records never disagree on
// birth, name, or death (death is copied verbatim from the origin's own
// roll), and identity.ts resolves either record to the other, so marriage
// and residence are cross-village facts rather than forked lives.
// =====================================================================

import { CLASS_INFO, CLASSES } from "./data/classes.js";
import { demographyOf } from "./data/demography.js";
import { placeOf } from "./data/placeNames.js";
import { REGIONS } from "./data/regions.js";
import { addrHash, makeRng, mix } from "./hash.js";
import { famineAt, rollDeath, warAt } from "./mortality.js";
import { clusterBase, clusterOffset, higherRankRegions, LOCAL_CLUSTER } from "./rank.js";
import type { Address, Couple, Death, Envelope, Person, RiskTrade, Sex, SocialClass } from "./types.js";

// § hardening: the envelope cache is a bounded LRU, not an unbounded map —
// a long-running session that browses thousands of addresses stays flat in
// memory. Eviction is safe because solves are pure: a re-solve reproduces
// the identical envelope (village.test.ts proves it).
export const ENVELOPE_CACHE_LIMIT = 96;
const _envelopeCache = new Map<string, Envelope>();

export function resolveVillage(worldSeed: number, regionKey: string, villageIdx: number): Envelope {
  const key = `${worldSeed}/${regionKey}/${villageIdx}`;
  const cached = _envelopeCache.get(key);
  if (cached) {
    // refresh recency (Map iteration order is insertion order)
    _envelopeCache.delete(key);
    _envelopeCache.set(key, cached);
    return cached;
  }
  const env = solveVillage(worldSeed, regionKey, villageIdx);
  _envelopeCache.set(key, env);
  while (_envelopeCache.size > ENVELOPE_CACHE_LIMIT) {
    const oldest = _envelopeCache.keys().next().value;
    if (oldest === undefined) break;
    _envelopeCache.delete(oldest);
  }
  return env;
}

export function clearEnvelopeCache(): void {
  _envelopeCache.clear();
}

export function envelopeCacheSize(): number {
  return _envelopeCache.size;
}

// How many marriage-matching rounds a solve may run. Generations to 1490
// bound the real need to ~8; hitting this limit means truncation, which is
// recorded in Envelope.diagnostics instead of silently dropping a lineage.
export const MATCH_ROUND_LIMIT = 24;

// Persons are constructed in two steps at every call site: addPerson()
// assigns the id (and, unless overridden, the origin), then the caller
// immediately rolls and assigns `.death` — rollDeath's own seed depends on
// the id, so id must exist first. The placeholder below is never read.
type NewPersonInput = Omit<Person, "id" | "death" | "origin"> & { origin?: Address | null };
const PLACEHOLDER_DEATH: Death = { year: 0, age: 0, cause: "infancy" };

// A person's trade-hazard category (§ occupational mortality): rolled once,
// deterministically, from a stream independent of the shared village `rng`
// (own namespace 8001, mirroring the per-person death stream at 7001) so
// adding this never perturbs the marriage/migration draw sequence. Women
// keep "normal" for now — their mortality model is already dominated by
// childbirth risk, tracked separately. Tier 2 (biography.ts) reads this same
// tag to keep occupation narrative consistent with the mechanic.
function riskTradeOf(vHash: number, id: number, cls: Person["cls"], sex: Sex): RiskTrade {
  if (sex !== "M") return "normal";
  const r = makeRng(mix(vHash, 8001 + id));
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

function solveVillage(worldSeed: number, regionKey: string, villageIdx: number): Envelope {
  const region = REGIONS[regionKey];
  const demo = demographyOf(regionKey);
  const vHash = addrHash(worldSeed, [regionKey, "village", villageIdx]);
  const rng = makeRng(vHash);
  const origin: Address = { regionKey, villageIdx };

  const place = placeOf(worldSeed, regionKey, villageIdx);
  const persons: Person[] = []; // id-indexed
  const couples: Couple[] = [];

  function addPerson(p: NewPersonInput): Person {
    const full: Person = { ...p, id: persons.length, origin: p.origin !== undefined ? p.origin : origin, death: PLACEHOLDER_DEATH };
    persons.push(full);
    return full;
  }

  // § mobility: a native child occasionally leaves their natal class on
  // coming of age — serfs buying or defying their way to free tenancies
  // (far likelier in the emptied countryside after 1349), free peasants'
  // sons apprenticed into crafts, artisans' sons into trade. Rolled from a
  // per-person stream so it never perturbs the shared village rng.
  function rollMobility(p: Person): void {
    const r = makeRng(mix(vHash, 950000 + p.id));
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

  // § service: low-wealth children commonly spent adolescence in service or
  // apprenticeship in another household (the NW-European life-cycle-service
  // pattern; rarer in the Mediterranean — rates come from demography.ts).
  function rollService(p: Person): void {
    if (CLASS_INFO[p.cls].wealth > 2) return;
    const r = makeRng(mix(vHash, 900000 + p.id));
    if (!r.chance(demo.service[p.sex])) return;
    const from = p.birth + 12;
    p.service = { from, to: from + r.int(4, 8) };
  }

  // Founders: G0 couples born 1235–1275, already married. Their pre-history
  // is outside the register ("the register begins in 1290").
  const founderCouples = rng.int(9, 13);
  const surnamePool = region.surnames.slice();
  for (let i = 0; i < founderCouples; i++) {
    const cls = rng.weighted(CLASSES);
    const wealth = CLASS_INFO[cls].wealth;
    const surname = surnamePool.length ? surnamePool.splice(rng.int(0, surnamePool.length - 1), 1)[0] : rng.pick(region.surnames);
    const hb = rng.int(1235, 1272);
    const wb = hb + rng.int(1, 6);
    const H = addPerson({ name: rng.pick(region.maleNames), surname, sex: "M", birth: hb, cls, father: -1, mother: -1, founder: true });
    const W = addPerson({
      name: rng.pick(region.femaleNames),
      surname: rng.pick(region.surnames),
      sex: "F",
      birth: wb,
      cls,
      father: -1,
      mother: -1,
      founder: true,
      incomer: true,
      origin: null,
    });
    H.riskTrade = riskTradeOf(vHash, H.id, H.cls, H.sex);
    W.riskTrade = riskTradeOf(vHash, W.id, W.cls, W.sex);
    H.death = rollDeath(makeRng(mix(vHash, 7001 + H.id)), hb, "M", wealth, region, H.riskTrade, regionKey);
    W.death = rollDeath(makeRng(mix(vHash, 7001 + W.id)), wb, "F", wealth, region, W.riskTrade, regionKey);
    // founders are guaranteed to reach marriage (they existed to found the line)
    if (H.death.age < 24) {
      const extra = rng.int(0, 30);
      H.death = { year: hb + 24 + extra, age: 24 + extra, cause: "disease" };
    }
    if (W.death.age < 20) {
      const extra = rng.int(0, 30);
      W.death = { year: wb + 20 + extra, age: 20 + extra, cause: "disease" };
    }
    marry(H, W, Math.max(hb + rng.int(22, 26), wb + rng.int(17, 20)));
  }

  function marry(H: Person, W: Person, year: number): Couple | null {
    // marriage cannot outlive either spouse
    if (year >= H.death.year || year >= W.death.year) return null;
    const c: Couple = { husband: H.id, wife: W.id, year, children: [] };
    const ci = couples.length;
    couples.push(c);
    if (!H.unions) H.unions = [];
    H.unions.push(ci);
    if (!W.unions) W.unions = [];
    W.unions.push(ci);
    // `spouse`/`marriageYear` keep first-marriage semantics; the full
    // history (remarriage included) lives on `unions`.
    if (H.spouse == null) {
      H.spouse = W.id;
      H.marriageYear = year;
    }
    if (W.spouse == null) {
      W.spouse = H.id;
      W.marriageYear = year;
    }
    return c;
  }

  function makeChild(c: Couple, H: Person, W: Person, y: number): void {
    const sex: Sex = rng.chance(0.5) ? "M" : "F";
    const child = addPerson({
      name: sex === "M" ? rng.pick(region.maleNames) : rng.pick(region.femaleNames),
      surname: H.surname,
      sex,
      birth: y,
      cls: H.cls,
      father: H.id,
      mother: W.id,
    });
    rollMobility(child);
    child.riskTrade = riskTradeOf(vHash, child.id, child.cls, child.sex);
    child.death = rollDeath(makeRng(mix(vHash, 7001 + child.id)), y, sex, CLASS_INFO[child.cls].wealth, region, child.riskTrade, regionKey);
    rollService(child);
    c.children.push(child.id);
    // maternal mortality: if the mother's independently-rolled death lands
    // on a birth year in her childbearing span, the register calls it childbed
    if (W.death.year === y && W.death.age <= 43) W.death.cause = "childbirth";
  }

  function genChildren(c: Couple, capYear: number): void {
    const H = persons[c.husband],
      W = persons[c.wife];
    const endYear = Math.min(H.death.year, W.death.year, W.birth + 42);
    let y = c.year + rng.int(1, 2);
    while (y < endYear && y <= capYear && c.children.length < 11) {
      makeChild(c, H, W, y);
      y += rng.int(demo.birthSpacing[0], demo.birthSpacing[1]);
    }
  }

  // Real immigrant lookup for exogamous marriages: reads (never mutates)
  // already-resolved lower-rank cluster-mates' envelopes for a native woman
  // who named THIS village as her emigration destination. Bounded to the
  // local cluster, so this can only ever trigger up to LOCAL_CLUSTER-1
  // neighbour solves, never an unbounded chain.
  const immigrantTaken = new Set<string>();
  function pullImmigrantBride(wantYear: number, ageLo: number, ageHi: number): { srcIdx: number; cand: Person } | null {
    const base = clusterBase(villageIdx);
    for (let srcIdx = base; srcIdx < villageIdx; srcIdx++) {
      if (srcIdx < 0) continue;
      const srcEnv = resolveVillage(worldSeed, regionKey, srcIdx); // strictly lower rank: safe, terminates
      for (const cand of srcEnv.persons) {
        if (cand.sex !== "F" || !cand.emigrated || !cand.emigrateTo) continue;
        if (cand.emigrateTo.regionKey !== regionKey || cand.emigrateTo.villageIdx !== villageIdx) continue;
        const key = `${srcIdx}:${cand.id}`;
        if (immigrantTaken.has(key)) continue;
        const ageAt = wantYear - cand.birth;
        if (ageAt < ageLo || ageAt > ageHi) continue;
        if (cand.death.year <= wantYear) continue;
        immigrantTaken.add(key);
        return { srcIdx, cand };
      }
    }
    return null;
  }

  // Generate children for every couple (in couple-creation order — this is a
  // work queue, so children of later marriages get processed too).
  for (let ci = 0; ci < couples.length; ci++) {
    const c = couples[ci];
    const W = persons[c.wife];
    genChildren(c, 1490);
    if (W.death.cause !== "childbirth" && rng.chance(0.012 * c.children.length) && W.death.year > c.year && W.death.year - W.birth <= 43) {
      // occasionally reassign a plausible near-birth death to childbed
      const nearest = c.children.map((id) => persons[id].birth).find((b) => Math.abs(b - W.death.year) <= 1);
      if (nearest != null) W.death.cause = "childbirth";
    }
  }

  // Marriage matching (spec §4): resolved at the envelope tier, in rounds —
  // each round's marriages produce the next generation, which is then
  // matched in the following round, until the genealogy closes (no new
  // eligible persons). Deterministic: rounds process in birth order.
  const processed = new Set<number>();
  let matchingRounds = 0;
  function runMatchingRounds(): void {
    while (matchingRounds < MATCH_ROUND_LIMIT) {
      const eligible = persons.filter((p) => !p.founder && p.death.age >= 16 && p.spouse == null && !processed.has(p.id));
      if (!eligible.length) break;
      matchingRounds++;
      eligible.forEach((p) => {
        processed.add(p.id);
      });
      eligible.sort((a, b) => a.birth - b.birth || a.id - b.id);
      const men = eligible.filter((p) => p.sex === "M");
      const women = persons
        .filter((p) => p.sex === "F" && !p.founder && p.death.age >= 16 && p.spouse == null && !p.marriedOut)
        .sort((a, b) => a.birth - b.birth || a.id - b.id);
      const takenW = new Set<number>();

      for (const M of men) {
        if (rng.chance(0.14)) continue; // never marries
        if (M.cls === "clergyFamily" && rng.chance(0.35)) {
          M.inOrders = true;
          continue;
        }
        const targetGap = rng.int(1, region.marriageM[0] - region.marriageF[0] + 3);
        const mAge = rng.int(region.marriageM[0], region.marriageM[1]);
        const wantYear = M.birth + mAge;
        // best local candidate: right age window, different household, alive at wantYear
        let best: Person | null = null,
          bestScore = 1e9;
        for (const W of women) {
          if (takenW.has(W.id)) continue;
          if (W.father === M.father && M.father !== -1) continue; // no siblings
          const wAgeAt = wantYear - W.birth;
          if (wAgeAt < region.marriageF[0] - 1 || wAgeAt > region.marriageF[1] + 6) continue;
          if (W.death.year <= wantYear || M.death.year <= wantYear) continue;
          const score = Math.abs(wAgeAt - (mAge - targetGap));
          if (score < bestScore) {
            bestScore = score;
            best = W;
          }
        }
        if (best && rng.chance(0.8)) {
          takenW.add(best.id);
          const c = marry(M, best, wantYear);
          if (c) genChildren(c, 1495);
        } else {
          // exogamy: prefer a REAL emigrant already recorded in a lower-rank
          // cluster-mate's own envelope (a genuine cross-village pointer, never
          // a new decode) — only fabricate an unaddressable incomer if the
          // local cluster has nobody to offer.
          if (M.death.year <= wantYear || rng.chance(0.25)) continue;
          const pulled = pullImmigrantBride(wantYear, region.marriageF[0] - 1, region.marriageF[1] + 6);
          let W: Person;
          if (pulled) {
            const { srcIdx, cand } = pulled;
            W = addPerson({
              name: cand.name,
              surname: cand.surname,
              sex: "F",
              birth: cand.birth,
              cls: M.cls,
              father: -1,
              mother: -1,
              incomer: true,
              origin: { regionKey, villageIdx: srcIdx },
              originId: cand.id,
            });
            W.death = { ...cand.death }; // copy of the ORIGIN's canonical roll: the two records never disagree on when she died
          } else {
            const wb = wantYear - rng.int(region.marriageF[0], region.marriageF[1]);
            W = addPerson({
              name: rng.pick(region.femaleNames),
              surname: rng.pick(region.surnames),
              sex: "F",
              birth: wb,
              cls: M.cls,
              father: -1,
              mother: -1,
              incomer: true,
              origin: null,
            });
            W.death = rollDeath(makeRng(mix(vHash, 7001 + W.id)), wb, "F", CLASS_INFO[M.cls].wealth, region, "normal", regionKey);
            if (W.death.year <= wantYear) {
              const deathYear = wantYear + 1 + rng.int(0, 25);
              W.death = { year: deathYear, age: deathYear - wb, cause: "disease" };
            }
          }
          const c = marry(M, W, wantYear);
          if (c) genChildren(c, 1495);
        }
      }
    }
  }
  runMatchingRounds();

  // § remarriage: widowhood in mid-life was routinely followed by
  // remarriage, at region-specific rates (demography.ts) — high for men
  // everywhere, high for women in NW Europe, low in the dowry-regime
  // Mediterranean. One extra union per person keeps the solve bounded.
  function widowedAt(p: Person): number | null {
    if (p.unions?.length !== 1) return null;
    const c = couples[p.unions[0]];
    const other = persons[p.id === c.husband ? c.wife : c.husband];
    if (other.death.year >= p.death.year) return null;
    return other.death.year;
  }

  function remarriagePhase(): void {
    const takenSpouse = new Set<number>();
    const widowers = persons
      .map((m) => ({ m, lost: m.sex === "M" && !m.inOrders ? widowedAt(m) : null }))
      .filter((x): x is { m: Person; lost: number } => x.lost != null && x.lost - x.m.birth <= 58)
      .sort((a, b) => a.lost - b.lost || a.m.id - b.m.id);
    for (const { m, lost } of widowers) {
      if (!rng.chance(demo.remarry.M)) continue;
      const year = lost + 1 + rng.int(0, 2);
      if (year >= m.death.year) continue;
      let best: Person | null = null,
        bestScore = 1e9;
      for (const W of persons) {
        if (W.sex !== "F" || W.founder || W.inOrders || W.marriedOut || W.emigrated) continue;
        if (takenSpouse.has(W.id) || (W.unions?.length ?? 0) > 1) continue;
        if (W.father === m.id || W.mother === m.id) continue; // never a daughter
        if (W.father === m.father && m.father !== -1) continue; // never a sister
        if (W.death.year <= year) continue;
        const age = year - W.birth;
        if (age < 18 || age > 45) continue;
        const wLost = widowedAt(W);
        const isWidow = wLost != null && wLost < year;
        if (!isWidow && W.spouse != null) continue; // married, husband living
        // a widow follows her own region's remarriage propensity
        const score = Math.abs(year - m.birth - 8 - age) + (isWidow ? 0 : 2);
        if (score < bestScore) {
          bestScore = score;
          best = W;
        }
      }
      if (!best) continue;
      if (widowedAt(best) != null && !rng.chance(Math.min(1, demo.remarry.F / Math.max(demo.remarry.M, 0.01)))) continue;
      takenSpouse.add(best.id);
      takenSpouse.add(m.id);
      const c = marry(m, best, year);
      if (c) genChildren(c, 1495);
    }
    // widows left un-courted above may still remarry a never-married man
    const widows = persons
      .map((w) => ({ w, lost: w.sex === "F" && !w.marriedOut && !w.emigrated ? widowedAt(w) : null }))
      .filter((x): x is { w: Person; lost: number } => x.lost != null && x.lost - x.w.birth <= 45 && !takenSpouse.has(x.w.id))
      .sort((a, b) => a.lost - b.lost || a.w.id - b.w.id);
    for (const { w, lost } of widows) {
      if (!rng.chance(demo.remarry.F)) continue;
      const year = lost + 1 + rng.int(0, 3);
      if (year >= w.death.year) continue;
      let best: Person | null = null,
        bestScore = 1e9;
      for (const M of persons) {
        if (M.sex !== "M" || M.founder || M.inOrders || M.spouse != null) continue;
        if (takenSpouse.has(M.id)) continue;
        if (M.father === w.id || M.mother === w.id) continue; // never a son
        if (M.father === w.father && w.father !== -1) continue; // never a brother
        if (M.death.year <= year) continue;
        const age = year - M.birth;
        if (age < 22 || age > 60) continue;
        const score = Math.abs(age - (year - w.birth));
        if (score < bestScore) {
          bestScore = score;
          best = M;
        }
      }
      if (!best) continue;
      takenSpouse.add(best.id);
      takenSpouse.add(w.id);
      const c = marry(best, w, year);
      if (c) genChildren(c, 1495);
    }
  }
  remarriagePhase();
  // children born of remarriages come of age after the first matching pass
  // ended — run the rounds again so they get matched too.
  runMatchingRounds();

  const leftover = persons.filter((p) => !p.founder && p.death.age >= 16 && p.spouse == null && !processed.has(p.id));
  const diagnostics = { matchingRounds, truncated: leftover.length > 0, unmatched: leftover.length };

  // Women unmatched after all rounds: emigration (§11), decided entirely by
  // this village's own solve — never by a destination reaching back in.
  // Mostly a short hop to a higher-offset cluster-mate (a real, later
  // pull-able destination); occasionally a long jump to another region
  // (still a real address, just not one anybody will scan back for).
  // A famine or war year raises the chance, so a bad harvest here and a
  // swollen neighbour there stay consistent with each other for free.
  for (const W of persons) {
    if (W.sex !== "F" || W.founder || W.spouse != null || W.emigrated || W.death.age < region.marriageF[1]) continue;
    const atYear = W.birth + region.marriageF[1];
    const pressured = famineAt(atYear, region) || !!warAt(atYear, region);
    if (!rng.chance(pressured ? demo.emigration.pressured : demo.emigration.base)) continue;
    W.emigrated = true;
    W.marriedOut = true;
    const offset = clusterOffset(villageIdx);
    if (offset < LOCAL_CLUSTER - 1 && rng.chance(0.8)) {
      W.emigrateTo = { regionKey, villageIdx: clusterBase(villageIdx) + rng.int(offset + 1, LOCAL_CLUSTER - 1) };
    } else {
      const higher = higherRankRegions(regionKey);
      if (higher.length && rng.chance(0.6)) {
        W.emigrateTo = { regionKey: rng.pick(higher), villageIdx: rng.int(0, 200) };
        W.longDistance = true;
      } else {
        W.emigrateTo = { regionKey, villageIdx: clusterBase(villageIdx) + LOCAL_CLUSTER + rng.int(0, LOCAL_CLUSTER - 1) };
        W.longDistance = true; // outside this cluster's own scan range: narrated, not pulled
      }
    }
  }

  // index couples on persons for O(1) FIRST-marriage lookup (full history
  // is on Person.unions)
  const coupleOf: Record<number, number> = {};
  couples.forEach((c, i) => {
    if (coupleOf[c.husband] === undefined) coupleOf[c.husband] = i;
    if (coupleOf[c.wife] === undefined) coupleOf[c.wife] = i;
  });

  return { worldSeed, regionKey, villageIdx, vHash, place, region, persons, couples, coupleOf, diagnostics };
}
