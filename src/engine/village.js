// =====================================================================
// TIER 1 — the envelope. One constraint solve per village address.
// =====================================================================
import { mix, addrHash, makeRng } from "./hash.js";
import { REGIONS } from "./data/regions.js";
import { CLASSES, CLASS_INFO } from "./data/classes.js";
import { rollDeath } from "./mortality.js";

const _envelopeCache = new Map();

export function resolveVillage(worldSeed, regionKey, villageIdx) {
  const key = worldSeed + "/" + regionKey + "/" + villageIdx;
  if (_envelopeCache.has(key)) return _envelopeCache.get(key);
  const env = solveVillage(worldSeed, regionKey, villageIdx);
  _envelopeCache.set(key, env);
  return env;
}

function solveVillage(worldSeed, regionKey, villageIdx) {
  const region = REGIONS[regionKey];
  const vHash = addrHash(worldSeed, [regionKey, "village", villageIdx]);
  const rng = makeRng(vHash);

  const place = region.places[villageIdx % region.places.length];
  const persons = [];   // id-indexed
  const couples = [];   // {husband, wife, year, children:[]}

  function addPerson(p) { p.id = persons.length; persons.push(p); return p; }

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
    const W = addPerson({ name: rng.pick(region.femaleNames), surname: rng.pick(region.surnames), sex: "F", birth: wb, cls, father: -1, mother: -1, founder: true, incomer: true });
    H.death = rollDeath(makeRng(mix(vHash, 7001 + H.id)), hb, "M", wealth, region);
    W.death = rollDeath(makeRng(mix(vHash, 7001 + W.id)), wb, "F", wealth, region);
    // founders are guaranteed to reach marriage (they existed to found the line)
    if (H.death.age < 24) H.death = { year: hb + 24 + rng.int(0, 30), age: 24 + rng.int(0, 30), cause: "disease" };
    if (W.death.age < 20) W.death = { year: wb + 20 + rng.int(0, 30), age: 20 + rng.int(0, 30), cause: "disease" };
    marry(H, W, Math.max(hb + rng.int(22, 26), wb + rng.int(17, 20)));
  }

  function marry(H, W, year) {
    // marriage cannot outlive either spouse
    if (year >= H.death.year || year >= W.death.year) return null;
    const c = { husband: H.id, wife: W.id, year, children: [] };
    H.spouse = W.id; W.spouse = H.id;
    H.marriageYear = year; W.marriageYear = year;
    couples.push(c);
    return c;
  }

  // Generate children for every couple (in couple-creation order — this is a
  // work queue, so children of later marriages get processed too).
  for (let ci = 0; ci < couples.length; ci++) {
    const c = couples[ci];
    const H = persons[c.husband], W = persons[c.wife];
    const wealth = CLASS_INFO[H.cls].wealth;
    const endYear = Math.min(H.death.year, W.death.year, W.birth + 42);
    let y = c.year + rng.int(1, 2);
    while (y < endYear && y <= 1490 && c.children.length < 11) {
      const sex = rng.chance(0.5) ? "M" : "F";
      const child = addPerson({
        name: sex === "M" ? rng.pick(region.maleNames) : rng.pick(region.femaleNames),
        surname: H.surname, sex, birth: y, cls: H.cls,
        father: H.id, mother: W.id
      });
      child.death = rollDeath(makeRng(mix(vHash, 7001 + child.id)), y, sex, wealth, region);
      c.children.push(child.id);
      // maternal mortality: if the mother's independently-rolled death lands
      // on a birth year in her childbearing span, the register calls it childbed
      if (W.death.year === y && W.death.age <= 43) W.death.cause = "childbirth";
      y += rng.int(2, 4);
    }
    if (W.death.cause !== "childbirth" && rng.chance(0.012 * c.children.length) && W.death.year > c.year && (W.death.year - W.birth) <= 43) {
      // occasionally reassign a plausible near-birth death to childbed
      const nearest = c.children.map(id => persons[id].birth).find(b => Math.abs(b - W.death.year) <= 1);
      if (nearest != null) W.death.cause = "childbirth";
    }

    // ---- marriage matching for this couple's surviving children happens
    // after all persons of their cohort exist; queue is handled below ----
  }

  // Marriage matching (spec §4): resolved at the envelope tier, in rounds —
  // each round's marriages produce the next generation, which is then
  // matched in the following round, until the genealogy closes (no new
  // eligible persons). Deterministic: rounds process in birth order.
  const processed = new Set();
  let guard = 0;
  while (guard++ < 20) {
  const eligible = persons.filter(p => !p.founder && p.death.age >= 16 && p.spouse == null && !processed.has(p.id));
  if (!eligible.length) break;
  eligible.forEach(p => processed.add(p.id));
  eligible.sort((a, b) => a.birth - b.birth || a.id - b.id);
  const men = eligible.filter(p => p.sex === "M");
  const women = persons.filter(p => p.sex === "F" && !p.founder && p.death.age >= 16 && p.spouse == null && !p.marriedOut)
    .sort((a, b) => a.birth - b.birth || a.id - b.id);
  const takenW = new Set();

  for (const M of men) {
    if (rng.chance(0.14)) continue;                    // never marries
    if (M.cls === "clergyFamily" && rng.chance(0.35)) { M.inOrders = true; continue; }
    const targetGap = rng.int(1, region.marriageM[0] - region.marriageF[0] + 3);
    const mAge = rng.int(region.marriageM[0], region.marriageM[1]);
    const wantYear = M.birth + mAge;
    // best local candidate: right age window, different household, alive at wantYear
    let best = null, bestScore = 1e9;
    for (const W of women) {
      if (takenW.has(W.id)) continue;
      if (W.father === M.father && M.father !== -1) continue;      // no siblings
      const wAgeAt = wantYear - W.birth;
      if (wAgeAt < region.marriageF[0] - 1 || wAgeAt > region.marriageF[1] + 6) continue;
      if (W.death.year <= wantYear || M.death.year <= wantYear) continue;
      const score = Math.abs(wAgeAt - (mAge - targetGap));
      if (score < bestScore) { bestScore = score; best = W; }
    }
    if (best && rng.chance(0.8)) {
      takenW.add(best.id);
      const c = marry(M, best, wantYear);
      if (c) genChildrenLate(c);
    } else {
      // exogamy: an incomer spouse from the next parish (addressable here,
      // her natal kin recorded as "of another register")
      if (M.death.year <= wantYear || rng.chance(0.25)) continue;
      const wb = wantYear - rng.int(region.marriageF[0], region.marriageF[1]);
      const W = addPerson({ name: rng.pick(region.femaleNames), surname: rng.pick(region.surnames), sex: "F", birth: wb, cls: M.cls, father: -1, mother: -1, incomer: true });
      W.death = rollDeath(makeRng(mix(vHash, 7001 + W.id)), wb, "F", CLASS_INFO[M.cls].wealth, region);
      if (W.death.year <= wantYear) W.death = { year: wantYear + 1 + rng.int(0, 25), age: wantYear + 1 + rng.int(0, 25) - wb, cause: "disease" };
      const c = marry(M, W, wantYear);
      if (c) genChildrenLate(c);
    }
  }
  } // end matching rounds

  // women unmatched after all rounds: some marry out of the village
  for (const W of persons) {
    if (W.sex !== "F" || W.founder || W.spouse != null || W.marriedOut || W.death.age < region.marriageF[1]) continue;
    if (rng.chance(0.5)) W.marriedOut = true;
  }

  function genChildrenLate(c) {
    const H = persons[c.husband], W = persons[c.wife];
    const wealth = CLASS_INFO[H.cls].wealth;
    const endYear = Math.min(H.death.year, W.death.year, W.birth + 42);
    let y = c.year + rng.int(1, 2);
    while (y < endYear && y <= 1495 && c.children.length < 11) {
      const sex = rng.chance(0.5) ? "M" : "F";
      const child = addPerson({
        name: sex === "M" ? rng.pick(region.maleNames) : rng.pick(region.femaleNames),
        surname: H.surname, sex, birth: y, cls: H.cls, father: H.id, mother: W.id
      });
      child.death = rollDeath(makeRng(mix(vHash, 7001 + child.id)), y, sex, wealth, region);
      c.children.push(child.id);
      if (W.death.year === y && (W.death.age <= 43)) W.death.cause = "childbirth";
      y += rng.int(2, 4);
    }
  }

  // index couples on persons for O(1) family lookup
  const coupleOf = {};
  couples.forEach((c, i) => { coupleOf[c.husband] = i; coupleOf[c.wife] = i; });

  const env = { worldSeed, regionKey, villageIdx, vHash, place, region, persons, couples, coupleOf };
  return env;
}
