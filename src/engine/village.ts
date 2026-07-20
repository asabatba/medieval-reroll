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
// =====================================================================

import { CLASS_INFO, CLASSES } from "./data/classes.js";
import { REGIONS } from "./data/regions.js";
import { addrHash, makeRng, mix } from "./hash.js";
import { famineAt, rollDeath, warAt } from "./mortality.js";
import { clusterBase, clusterOffset, higherRankRegions, LOCAL_CLUSTER } from "./rank.js";
import type { Address, Couple, Death, Envelope, Person, Sex } from "./types.js";

const _envelopeCache = new Map<string, Envelope>();

export function resolveVillage(worldSeed: number, regionKey: string, villageIdx: number): Envelope {
  const key = `${worldSeed}/${regionKey}/${villageIdx}`;
  const cached = _envelopeCache.get(key);
  if (cached) return cached;
  const env = solveVillage(worldSeed, regionKey, villageIdx);
  _envelopeCache.set(key, env);
  return env;
}

// Persons are constructed in two steps at every call site: addPerson()
// assigns the id (and, unless overridden, the origin), then the caller
// immediately rolls and assigns `.death` — rollDeath's own seed depends on
// the id, so id must exist first. The placeholder below is never read.
type NewPersonInput = Omit<Person, "id" | "death" | "origin"> & { origin?: Address | null };
const PLACEHOLDER_DEATH: Death = { year: 0, age: 0, cause: "infancy" };

function solveVillage(worldSeed: number, regionKey: string, villageIdx: number): Envelope {
  const region = REGIONS[regionKey];
  const vHash = addrHash(worldSeed, [regionKey, "village", villageIdx]);
  const rng = makeRng(vHash);
  const origin: Address = { regionKey, villageIdx };

  const place = region.places[villageIdx % region.places.length];
  const persons: Person[] = []; // id-indexed
  const couples: Couple[] = [];

  function addPerson(p: NewPersonInput): Person {
    const full: Person = { ...p, id: persons.length, origin: p.origin !== undefined ? p.origin : origin, death: PLACEHOLDER_DEATH };
    persons.push(full);
    return full;
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
    H.death = rollDeath(makeRng(mix(vHash, 7001 + H.id)), hb, "M", wealth, region);
    W.death = rollDeath(makeRng(mix(vHash, 7001 + W.id)), wb, "F", wealth, region);
    // founders are guaranteed to reach marriage (they existed to found the line)
    if (H.death.age < 24) H.death = { year: hb + 24 + rng.int(0, 30), age: 24 + rng.int(0, 30), cause: "disease" };
    if (W.death.age < 20) W.death = { year: wb + 20 + rng.int(0, 30), age: 20 + rng.int(0, 30), cause: "disease" };
    marry(H, W, Math.max(hb + rng.int(22, 26), wb + rng.int(17, 20)));
  }

  function marry(H: Person, W: Person, year: number): Couple | null {
    // marriage cannot outlive either spouse
    if (year >= H.death.year || year >= W.death.year) return null;
    const c: Couple = { husband: H.id, wife: W.id, year, children: [] };
    H.spouse = W.id;
    W.spouse = H.id;
    H.marriageYear = year;
    W.marriageYear = year;
    couples.push(c);
    return c;
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
    const H = persons[c.husband],
      W = persons[c.wife];
    const wealth = CLASS_INFO[H.cls].wealth;
    const endYear = Math.min(H.death.year, W.death.year, W.birth + 42);
    let y = c.year + rng.int(1, 2);
    while (y < endYear && y <= 1490 && c.children.length < 11) {
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
      child.death = rollDeath(makeRng(mix(vHash, 7001 + child.id)), y, sex, wealth, region);
      c.children.push(child.id);
      // maternal mortality: if the mother's independently-rolled death lands
      // on a birth year in her childbearing span, the register calls it childbed
      if (W.death.year === y && W.death.age <= 43) W.death.cause = "childbirth";
      y += rng.int(2, 4);
    }
    if (W.death.cause !== "childbirth" && rng.chance(0.012 * c.children.length) && W.death.year > c.year && W.death.year - W.birth <= 43) {
      // occasionally reassign a plausible near-birth death to childbed
      const nearest = c.children.map((id) => persons[id].birth).find((b) => Math.abs(b - W.death.year) <= 1);
      if (nearest != null) W.death.cause = "childbirth";
    }

    // ---- marriage matching for this couple's surviving children happens
    // after all persons of their cohort exist; queue is handled below ----
  }

  // Marriage matching (spec §4): resolved at the envelope tier, in rounds —
  // each round's marriages produce the next generation, which is then
  // matched in the following round, until the genealogy closes (no new
  // eligible persons). Deterministic: rounds process in birth order.
  const processed = new Set<number>();
  let guard = 0;
  while (guard++ < 20) {
    const eligible = persons.filter((p) => !p.founder && p.death.age >= 16 && p.spouse == null && !processed.has(p.id));
    if (!eligible.length) break;
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
        if (c) genChildrenLate(c);
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
          W.death = { ...cand.death }; // clone: her destination life must not retroactively rewrite the origin's cached record
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
          W.death = rollDeath(makeRng(mix(vHash, 7001 + W.id)), wb, "F", CLASS_INFO[M.cls].wealth, region);
          if (W.death.year <= wantYear) W.death = { year: wantYear + 1 + rng.int(0, 25), age: wantYear + 1 + rng.int(0, 25) - wb, cause: "disease" };
        }
        const c = marry(M, W, wantYear);
        if (c) genChildrenLate(c);
      }
    }
  } // end matching rounds

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
    if (!rng.chance(pressured ? 0.68 : 0.5)) continue;
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

  function genChildrenLate(c: Couple): void {
    const H = persons[c.husband],
      W = persons[c.wife];
    const wealth = CLASS_INFO[H.cls].wealth;
    const endYear = Math.min(H.death.year, W.death.year, W.birth + 42);
    let y = c.year + rng.int(1, 2);
    while (y < endYear && y <= 1495 && c.children.length < 11) {
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
      child.death = rollDeath(makeRng(mix(vHash, 7001 + child.id)), y, sex, wealth, region);
      c.children.push(child.id);
      if (W.death.year === y && W.death.age <= 43) W.death.cause = "childbirth";
      y += rng.int(2, 4);
    }
  }

  // index couples on persons for O(1) family lookup
  const coupleOf: Record<number, number> = {};
  couples.forEach((c, i) => {
    coupleOf[c.husband] = i;
    coupleOf[c.wife] = i;
  });

  return { worldSeed, regionKey, villageIdx, vHash, place, region, persons, couples, coupleOf };
}
