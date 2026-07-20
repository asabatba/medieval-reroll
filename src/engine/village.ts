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
import { addrHash, makeRng, personStream } from "./hash.js";
import { famineAt, rollDeath, warAt } from "./mortality.js";
import { clusterBase, clusterOffset, higherRankRegions, LOCAL_CLUSTER } from "./rank.js";
import type { Address, Couple, Death, Envelope, Person, Region, RiskTrade, Sex, SocialClass } from "./types.js";

// § hardening: the envelope cache is a bounded LRU, not an unbounded map —
// a long-running session that browses thousands of addresses stays flat in
// memory. Eviction is safe because solves are pure: a re-solve reproduces
// the identical envelope (village.test.ts proves it).
export const ENVELOPE_CACHE_LIMIT = 1024;
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

// How many marriage-matching rounds a solve may run, SHARED across every
// call to runMatchingRounds() in a solve — including the several extra
// calls interleaved with remarriage passes (§ remarriage depth), which
// consume more of the budget than the original single-pass design did.
// Generations to 1490 bound the real per-call need to ~8; hitting this
// limit means truncation, which is recorded in Envelope.diagnostics instead
// of silently dropping a lineage.
export const MATCH_ROUND_LIMIT = 40;

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

// § male out-migration: only the eldest surviving son inherits (male
// primogeniture, mirrored by succession.ts's heirOf/isFirstBornSon for
// decode-time use). Evaluated against the local, still-growing `persons`
// array — safe because persons are always created in non-decreasing birth
// order (a person's elder siblings, if any, already exist by the time they
// themselves are created or matched).
//
// This can still disagree with heirOf's actual answer at the father's
// death: an elder brother who emigrates or takes holy orders isn't
// knowable here, since both are decided at HIS OWN later marriage-matching
// round, long after this presumed-heir reckoning already had to happen for
// every son as each one is born. Predecease is the one cause of that same
// mismatch that IS fully knowable this early — every child of one marriage
// is created synchronously in birth order with their death year rolled
// immediately (mortality.ts), and the father's own death year was fixed
// long before he had children — so an elder "brother" who's already known
// to have died before the father never actually stood between a younger
// son and the holding, and is excluded here rather than wrongly blocking
// him from being treated as the presumed heir.
function eldestSonOf(persons: readonly Person[], p: Person): boolean {
  if (p.sex !== "M" || p.father < 0) return true;
  const father = persons[p.father];
  for (const q of persons) {
    if (q.id === p.id || q.father !== p.father || q.sex !== "M") continue;
    if (q.death.year <= father.death.year) continue; // predeceased the father: never actually in the running
    if (q.birth < p.birth || (q.birth === p.birth && q.id < p.id)) return false;
  }
  return true;
}

// § regional inheritance customs: under partible custom (France, Tuscany —
// see regions.ts) land was divided among the sons instead of passing whole
// to one, so every son had a real stake worth staying for. The various
// "non-heir" mechanical penalties below (heavier service, out-migration,
// downward mobility) read THIS, not eldestSonOf directly, so they simply
// never apply in a partible region rather than needing a separate flag at
// every call site.
export function isHeir(persons: readonly Person[], region: Region, p: Person): boolean {
  return region.inheritance === "partible" || eldestSonOf(persons, p);
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
  function rollDownwardMobility(p: Person, nonHeirSon: boolean): void {
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

  // § dual surnames (Catalonia): the Iberian convention of a compound
  // surname — the father's own FIRST surname plus the mother's own FIRST
  // surname — fixed at birth and never replaced at marriage. `surnameLine`
  // strips a compound surname back down to the one component that is
  // actually transmissible; `drawSurname`/`childSurname` are single-name
  // elsewhere, compound only here.
  function surnameLine(s: string): string {
    const i = s.indexOf(" i ");
    return i < 0 ? s : s.slice(0, i);
  }
  function drawSurname(pool?: string[]): string {
    const one = () => (pool?.length ? pool.splice(rng.int(0, pool.length - 1), 1)[0] : rng.pick(region.surnames));
    return regionKey === "catalonia" ? `${one()} i ${one()}` : one();
  }
  function childSurname(H: Person, W: Person): string {
    return regionKey === "catalonia" ? `${surnameLine(H.surname)} i ${surnameLine(W.surname)}` : H.surname;
  }

  // § service: low-wealth children commonly spent adolescence in service or
  // apprenticeship in another household (the NW-European life-cycle-service
  // pattern; rarer in the Mediterranean — rates come from demography.ts).
  function rollService(p: Person, heirBoost = false): void {
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

  // Founders: G0 couples born 1235–1275, already married. Their pre-history
  // is outside the register ("the register begins in 1290").
  const founderCouples = rng.int(9, 13);
  const surnamePool = region.surnames.slice();
  for (let i = 0; i < founderCouples; i++) {
    const cls = rng.weighted(CLASSES);
    const wealth = CLASS_INFO[cls].wealth;
    const surname = drawSurname(surnamePool);
    const hb = rng.int(1235, 1272);
    const wb = hb + rng.int(1, 6);
    const H = addPerson({ name: rng.pick(region.maleNames), surname, sex: "M", birth: hb, cls, father: -1, mother: -1, founder: true });
    const W = addPerson({
      name: rng.pick(region.femaleNames),
      surname: drawSurname(),
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
    H.death = rollDeath(makeRng(personStream(vHash, 7001, H.id)), hb, "M", wealth, region, H.riskTrade, regionKey);
    W.death = rollDeath(makeRng(personStream(vHash, 7001, W.id)), wb, "F", wealth, region, W.riskTrade, regionKey);
    // founders are guaranteed to reach marriage (they existed to found the
    // line) — extend a death that would otherwise fall on or before the
    // marriage year itself, not just one that's short of a fixed age floor.
    // (A fixed floor here previously undershot the marriage-year formula's
    // own range, e.g. a natural death age of 24-25 for H still failed to
    // outlive a marriage age that can itself roll as high as 26.)
    const marriageYear = Math.max(hb + rng.int(22, 26), wb + rng.int(17, 20));
    if (H.death.year <= marriageYear) {
      const age = marriageYear - hb + 1 + rng.int(0, 30);
      H.death = { year: hb + age, age, cause: "disease" };
    }
    if (W.death.year <= marriageYear) {
      const age = marriageYear - wb + 1 + rng.int(0, 30);
      W.death = { year: wb + age, age, cause: "disease" };
    }
    marry(H, W, marriageYear);
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
    // § sibling name collision: the per-region name pools are small (a
    // dozen or so per sex — see region.maleNames/femaleNames), so drawing
    // independently for every child of a large family made it common for
    // two or three of them to be alive AT THE SAME TIME sharing a name.
    // Reusing a dead sibling's name for a later child was real medieval
    // practice; two LIVING siblings sharing one was not (bar rare royal
    // exceptions this model doesn't represent) — so exclude only the names
    // still held by a full sibling (this couple's own children so far)
    // who's still alive at this child's own birth year. Falls back to the
    // full pool only if every name is already spoken for (a large family
    // in a small-pool region), rather than ever picking from an empty list.
    const namePool = sex === "M" ? region.maleNames : region.femaleNames;
    const takenByLivingSibling = new Set(
      c.children
        .map((cid) => persons[cid])
        .filter((sib) => sib.sex === sex && sib.death.year > y)
        .map((sib) => sib.name),
    );
    const availableNames = namePool.filter((n) => !takenByLivingSibling.has(n));
    const child = addPerson({
      name: rng.pick(availableNames.length ? availableNames : namePool),
      surname: childSurname(H, W),
      sex,
      birth: y,
      cls: H.cls,
      father: H.id,
      mother: W.id,
    });
    rollMobility(child);
    // § male out-migration / § downward mobility: both class-transition
    // rolls happen BEFORE riskTradeOf, so the trade-hazard tag it derives
    // always reflects the child's FINAL class, never a stale pre-transition
    // one (occupation narrative in biography.ts reads p.cls fresh anyway,
    // but riskTrade is rolled once here and must agree with it).
    const nonHeirSon = child.sex === "M" && !isHeir(persons, region, child);
    rollDownwardMobility(child, nonHeirSon);
    child.riskTrade = riskTradeOf(vHash, child.id, child.cls, child.sex);
    child.death = rollDeath(makeRng(personStream(vHash, 7001, child.id)), y, sex, CLASS_INFO[child.cls].wealth, region, child.riskTrade, regionKey);
    // § male out-migration: a non-heir son — of ANY wealth grade, not just
    // the low-wealth default rollService already covers — is likelier to be
    // sent into service or apprenticeship elsewhere, since he won't inherit.
    rollService(child, nonHeirSon);
    c.children.push(child.id);
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
  function pullImmigrant(sex: Sex, wantYear: number, ageLo: number, ageHi: number): { srcIdx: number; cand: Person } | null {
    const base = clusterBase(villageIdx);
    for (let srcIdx = base; srcIdx < villageIdx; srcIdx++) {
      if (srcIdx < 0) continue;
      const srcEnv = resolveVillage(worldSeed, regionKey, srcIdx); // strictly lower rank: safe, terminates
      for (const cand of srcEnv.persons) {
        if (cand.sex !== sex || !cand.emigrated || !cand.emigrateTo) continue;
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
  const pullImmigrantBride = (wantYear: number, ageLo: number, ageHi: number) => pullImmigrant("F", wantYear, ageLo, ageHi);
  // § male out-migration: symmetric to pullImmigrantBride, but for a local
  // woman who found no local husband — she marries a REAL non-heir man who
  // left his own (lower-rank cluster-mate) village, rather than either
  // village fabricating anyone. Reuses the same `immigrantTaken` set: keys
  // are `srcIdx:id` scoped to one sex's search since only opposite-sex
  // candidates are ever matched, so bride and groom keys never collide.
  const pullImmigrantGroom = (wantYear: number, ageLo: number, ageHi: number) => pullImmigrant("M", wantYear, ageLo, ageHi);

  // Generate children for every couple (in couple-creation order — this is a
  // work queue, so children of later marriages get processed too).
  for (let ci = 0; ci < couples.length; ci++) {
    genChildren(couples[ci], 1490);
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
        // § calibrated mechanics: never-marry share ~10% on average (was
        // higher, which — compounded with emigration and plague — sank most
        // villages below replacement and emptied them by 1450, far past the
        // ~10% of real villages deserted by 1500).
        // § male out-migration: an heir had a tenement to offer a bride and
        // marries reliably; a non-heir is a somewhat less attractive match.
        const heir = isHeir(persons, region, M);
        if (rng.chance(heir ? 0.07 : 0.12)) continue; // never marries
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
          if (W.father === M.father && M.father !== -1) continue; // no siblings (paternal)
          if (W.mother === M.mother && M.mother !== -1) continue; // no siblings (maternal — a widow's children by an earlier husband)
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
          // most men without a local match DO find a bride outside (skip only ~12%)
          if (M.death.year <= wantYear || rng.chance(0.12)) continue;
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
              surname: drawSurname(),
              sex: "F",
              birth: wb,
              cls: M.cls,
              father: -1,
              mother: -1,
              incomer: true,
              origin: null,
            });
            W.death = rollDeath(makeRng(personStream(vHash, 7001, W.id)), wb, "F", CLASS_INFO[M.cls].wealth, region, "normal", regionKey);
            if (W.death.year <= wantYear) {
              const deathYear = wantYear + 1 + rng.int(0, 25);
              W.death = { year: deathYear, age: deathYear - wb, cause: "disease" };
            }
          }
          const c = marry(M, W, wantYear);
          if (c) genChildren(c, 1495);
        }
      }

      // § male out-migration: local women this round's men loop left
      // unmatched get a shot at a REAL immigrant groom — a non-heir man who
      // left a lower-rank cluster-mate village — before falling through to
      // their own eventual emigration pass below. Symmetric to
      // pullImmigrantBride, so a woman's alternative to waiting or leaving
      // herself is marrying someone who actually left another village's own
      // register, not a fabrication on either side.
      for (const W of women) {
        if (takenW.has(W.id) || W.spouse != null || W.marriedOut) continue;
        const wantYear = W.birth + rng.int(region.marriageF[0], region.marriageF[1]);
        if (W.death.year <= wantYear) continue;
        if (!rng.chance(demo.maleOutMigration.groomPullChance)) continue;
        const pulled = pullImmigrantGroom(wantYear, region.marriageM[0] - 3, region.marriageM[1] + 8);
        if (!pulled) continue;
        const { srcIdx, cand } = pulled;
        const M = addPerson({
          name: cand.name,
          surname: cand.surname,
          sex: "M",
          birth: cand.birth,
          cls: cand.cls,
          father: -1,
          mother: -1,
          incomer: true,
          origin: { regionKey, villageIdx: srcIdx },
          originId: cand.id,
        });
        M.death = { ...cand.death }; // copy of the ORIGIN's canonical roll: the two records never disagree on when he died
        M.riskTrade = cand.riskTrade ?? "normal";
        takenW.add(W.id);
        const c = marry(M, W, wantYear);
        if (c) genChildren(c, 1495);
      }
    }
  }
  runMatchingRounds();

  // Shared by both emigration passes below: a real, resolvable destination
  // address — mostly a short hop to a higher-offset cluster-mate (later
  // pull-able by that village's own solve), occasionally a long jump to
  // another region (still real, just outside anyone's scan range).
  function assignDestination(p: Person): void {
    const offset = clusterOffset(villageIdx);
    if (offset < LOCAL_CLUSTER - 1 && rng.chance(0.8)) {
      p.emigrateTo = { regionKey, villageIdx: clusterBase(villageIdx) + rng.int(offset + 1, LOCAL_CLUSTER - 1) };
    } else {
      const higher = higherRankRegions(regionKey);
      if (higher.length && rng.chance(0.6)) {
        p.emigrateTo = { regionKey: rng.pick(higher), villageIdx: rng.int(0, 200) };
        p.longDistance = true;
      } else {
        p.emigrateTo = { regionKey, villageIdx: clusterBase(villageIdx) + LOCAL_CLUSTER + rng.int(0, LOCAL_CLUSTER - 1) };
        p.longDistance = true; // outside this cluster's own scan range: narrated, not pulled
      }
    }
  }

  // Native adults unmatched after the PRIMARY rounds: emigration (§11),
  // decided entirely by this village's own solve — never by a destination
  // reaching back in. A famine or war year raises the chance, so a bad
  // harvest here and a swollen neighbour there stay consistent with each
  // other for free. Deliberately placed BEFORE remarriage (not after): a
  // large surplus of unmatched native women after primary matching is
  // expected by design (men often import a bride instead of marrying
  // locally) — emigration is its normal outlet, at a normal age. Running
  // remarriage first would instead sweep that whole backlog into
  // increasingly old widower-marriages before it ever got the chance to
  // leave, skewing the marriage-age statistics badly.
  for (const W of persons) {
    if (W.sex !== "F" || W.founder || W.spouse != null || W.emigrated || W.death.age < region.marriageF[1]) continue;
    const atYear = W.birth + region.marriageF[1];
    const pressured = famineAt(atYear, region) || !!warAt(atYear, region);
    if (!rng.chance(pressured ? demo.emigration.pressured : demo.emigration.base)) continue;
    W.emigrated = true;
    W.marriedOut = true;
    assignDestination(W);
  }

  // § male out-migration: the landless-younger-son safety valve, same
  // ordering rationale as the female pass above. Non-heirs who found no
  // local match leave far more often than heirs, who had a tenement to
  // hold and stayed even unmarried. `marriedOut` is deliberately left
  // false: he isn't narrated as having married out, just left, though he
  // may yet be pulled as a real immigrant groom by a village further down
  // the cluster (the groom-pull step inside the matching rounds above).
  for (const M of persons) {
    if (M.sex !== "M" || M.founder || M.spouse != null || M.emigrated || M.inOrders) continue;
    if (M.death.age < region.marriageM[1]) continue;
    const heir = isHeir(persons, region, M);
    const atYear = M.birth + region.marriageM[1];
    const pressured = famineAt(atYear, region) || !!warAt(atYear, region);
    const chance = pressured ? demo.maleOutMigration.pressured : heir ? demo.maleOutMigration.heirBase : demo.maleOutMigration.nonHeirBase;
    if (!rng.chance(chance)) continue;
    M.emigrated = true;
    assignDestination(M);
  }

  // § remarriage: widowhood in mid-life was routinely followed by
  // remarriage, at region-specific rates (demography.ts) — high for men
  // everywhere, high for women in NW Europe, low in the dowry-regime
  // Mediterranean. Depth is NOT capped at one remarriage: `latestWidowedAt`
  // reads the person's MOST RECENT union rather than requiring exactly one,
  // so someone widowed a second (or third) time gets the same chance again.
  function latestWidowedAt(p: Person): number | null {
    if (!p.unions?.length) return null;
    const c = couples[p.unions[p.unions.length - 1]];
    const other = persons[p.id === c.husband ? c.wife : c.husband];
    if (other.death.year >= p.death.year) return null;
    return other.death.year;
  }
  // "currently unmarried" = never married, or widowed with no union since.
  function isCurrentlyUnmarried(p: Person): boolean {
    if (!p.unions?.length) return p.spouse == null;
    return latestWidowedAt(p) != null;
  }

  function matchWidowers(takenSpouse: Set<number>): boolean {
    let any = false;
    const widowers = persons
      .map((m) => ({ m, lost: m.sex === "M" && !m.inOrders && !m.emigrated && !takenSpouse.has(m.id) ? latestWidowedAt(m) : null }))
      .filter((x): x is { m: Person; lost: number } => x.lost != null && x.lost - x.m.birth <= 58)
      .sort((a, b) => a.lost - b.lost || a.m.id - b.m.id);
    for (const { m, lost } of widowers) {
      if (takenSpouse.has(m.id)) continue; // matched earlier in this same pass
      if (!rng.chance(demo.remarry.M)) continue;
      const year = lost + 1 + rng.int(0, 2);
      if (year >= m.death.year) continue;
      let best: Person | null = null,
        bestScore = 1e9;
      for (const W of persons) {
        if (W.sex !== "F" || W.founder || W.inOrders || W.marriedOut || W.emigrated) continue;
        if (takenSpouse.has(W.id) || !isCurrentlyUnmarried(W)) continue;
        // `year` is drawn from M's OWN bereavement timeline — a widowed W is
        // only actually free to take it if SHE was already free strictly
        // before it too (isCurrentlyUnmarried alone only says she EVENTUALLY
        // outlives her current spouse, not that she already has by `year`).
        const wLost = latestWidowedAt(W);
        if (wLost != null && wLost >= year) continue;
        if (W.father === m.id || W.mother === m.id) continue; // never a daughter
        if (W.father === m.father && m.father !== -1) continue; // never a sister (paternal)
        if (W.mother === m.mother && m.mother !== -1) continue; // never a sister (maternal)
        if (W.death.year <= year) continue;
        const age = year - W.birth;
        if (age < 18 || age > 45) continue;
        const isWidow = wLost != null;
        // § remarriage vs. the emigration backlog: emigration (above) already
        // ran first and drained most of the surplus never-married women at a
        // normal age, so what's left here is mostly genuine widows plus
        // whoever stayed by choice — a widower still prefers a widow (score
        // bonus) or a never-married woman already past the normal local
        // marriage window (an "old maid" he took on) over a young single
        // woman who simply didn't happen to emigrate.
        const stillYoung = !isWidow && age <= region.marriageF[1] + 4;
        const score = Math.abs(year - m.birth - 8 - age) + (isWidow ? 0 : 2) + (stillYoung ? 6 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = W;
        }
      }
      if (!best) continue;
      if (latestWidowedAt(best) != null && !rng.chance(Math.min(1, demo.remarry.F / Math.max(demo.remarry.M, 0.01)))) continue;
      takenSpouse.add(best.id);
      takenSpouse.add(m.id);
      const c = marry(m, best, year);
      if (c) genChildren(c, 1495);
      any = true;
    }
    return any;
  }

  function matchWidows(takenSpouse: Set<number>): boolean {
    let any = false;
    // widows left un-courted above may still remarry a never-married man
    const widows = persons
      .map((w) => ({ w, lost: w.sex === "F" && !w.marriedOut && !w.emigrated && !takenSpouse.has(w.id) ? latestWidowedAt(w) : null }))
      .filter((x): x is { w: Person; lost: number } => x.lost != null && x.lost - x.w.birth <= 45)
      .sort((a, b) => a.lost - b.lost || a.w.id - b.w.id);
    for (const { w, lost } of widows) {
      if (takenSpouse.has(w.id)) continue;
      if (!rng.chance(demo.remarry.F)) continue;
      const year = lost + 1 + rng.int(0, 3);
      if (year >= w.death.year) continue;
      let best: Person | null = null,
        bestScore = 1e9;
      for (const M of persons) {
        if (M.sex !== "M" || M.founder || M.inOrders || M.emigrated || !isCurrentlyUnmarried(M)) continue;
        if (takenSpouse.has(M.id)) continue;
        // symmetric to matchWidowers: `year` comes from W's own bereavement
        // timeline, so a widowed M must already be free strictly before it.
        const mLost = latestWidowedAt(M);
        if (mLost != null && mLost >= year) continue;
        if (M.father === w.id || M.mother === w.id) continue; // never a son
        if (M.father === w.father && w.father !== -1) continue; // never a brother (paternal)
        if (M.mother === w.mother && w.mother !== -1) continue; // never a brother (maternal)
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
      any = true;
    }
    return any;
  }

  // § remarriage depth: run widower- then widow-matching passes to a small
  // fixed depth, re-scanning each time so someone widowed a SECOND or third
  // time (by their new spouse's independently-rolled death, or by a spouse
  // gained in a later pass) gets the same remarriage chance as the first
  // time — not just the initial widowhood.
  function remarriagePhase(): boolean {
    const takenSpouse = new Set<number>();
    let anyEver = false;
    for (let pass = 0; pass < 3; pass++) {
      const a = matchWidowers(takenSpouse);
      const b = matchWidows(takenSpouse);
      if (a || b) anyEver = true;
      else break;
    }
    return anyEver;
  }
  // Interleaved with matching rounds (not a single one-shot phase): a
  // remarriage can produce children who come of age and need matching, and
  // THAT matching can itself create new couples who are later widowed and
  // eligible to remarry in turn. Bounded and self-terminating (each
  // iteration that changes nothing stops the loop).
  for (let i = 0; i < 4; i++) {
    const any = remarriagePhase();
    runMatchingRounds();
    if (!any) break;
  }

  const leftover = persons.filter((p) => !p.founder && p.death.age >= 16 && p.spouse == null && !processed.has(p.id));
  const diagnostics = { matchingRounds, truncated: leftover.length > 0, unmatched: leftover.length };

  // index couples on persons for O(1) FIRST-marriage lookup (full history
  // is on Person.unions)
  const coupleOf: Record<number, number> = {};
  couples.forEach((c, i) => {
    if (coupleOf[c.husband] === undefined) coupleOf[c.husband] = i;
    if (coupleOf[c.wife] === undefined) coupleOf[c.wife] = i;
  });

  return { worldSeed, regionKey, villageIdx, vHash, place, region, persons, couples, coupleOf, diagnostics };
}
