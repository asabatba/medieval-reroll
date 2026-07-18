// =====================================================================
// TIER 2 — biography decode. Pure function of (envelope, personId).
// Relational facts are READ from the envelope; only narrative texture is
// decoded from the person's own address hash.
// =====================================================================
import { mix, makeRng } from "./hash.js";
import { PLAGUES, plagueAt } from "./data/plagues.js";
import { CLASS_INFO, CRAFTS } from "./data/classes.js";
import { famineAt, warAt } from "./mortality.js";
import {
  SRC, DEATH_DETAIL, CAUSE_LABEL, FATHER_OCC,
  WORLD_EVENTS, CHILD_EVENTS, YOUTH_EVENTS, ADULT_EVENTS, COURT_CAUSES, FEMALE_EVENTS, OLD_EVENTS
} from "./data/narrative.js";

export function decodePerson(env, id) {
  const p = env.persons[id];
  if (!p) return null;
  const region = env.region;
  const pHash = mix(env.vHash, 40000 + id);
  const rng = makeRng(pHash);
  const wealth = CLASS_INFO[p.cls].wealth;
  const pos = p.sex === "M" ? "his" : "her";
  const obj = p.sex === "M" ? "him" : "her";

  // --- family lookups (all from the envelope; symmetric by construction) ---
  const father = p.father >= 0 ? env.persons[p.father] : null;
  const mother = p.mother >= 0 ? env.persons[p.mother] : null;
  const natal = p.father >= 0 ? env.couples[env.coupleOf[p.father]] : null;
  const siblings = natal ? natal.children.filter(cid => cid !== id).map(cid => env.persons[cid]) : [];
  const own = p.spouse != null ? env.couples[env.coupleOf[id]] : null;
  const spouse = p.spouse != null ? env.persons[p.spouse] : null;
  const children = own ? own.children.map(cid => env.persons[cid]) : [];

  const events = [];
  const ev = (year, text, kind, src) => { if (year <= p.death.year) events.push({ year, age: year - p.birth, text, kind, src: src || SRC.reg }); };

  // Birth
  const bornPlague = plagueAt(p.birth);
  let bNote = bornPlague ? " — born in a plague year, " + bornPlague[3] : (famineAt(p.birth, region) ? " — born amid famine, when the harvests had failed" : "");
  if (p.incomer && !p.founder) {
    ev(p.birth, `Born in the next parish; her people are entered in another register. She comes into this one on her marriage.`, "birth");
  } else if (p.founder) {
    ev(p.birth, `Born before this register begins; ${p.name} appears in its first folios already grown, one of the founding households of ${env.place}.`, "birth");
  } else {
    ev(p.birth, `Born in ${env.place}, ${region.name}, ${p.sex === "M" ? "son" : "daughter"} of ${father.name} ${father.surname} and ${mother.name}${bNote}.`, "birth");
  }

  // Plague passages: family losses read from ACTUAL envelope deaths
  let mentionedPlagues = 0;
  for (const pl of PLAGUES) {
    if (pl[1] < p.birth || pl[0] > p.death.year) continue;
    const ageAt = Math.max(0, pl[0] - p.birth);
    if (p.death.year >= pl[0] && !(p.death.cause === "plague" && p.death.year <= pl[1] + 0) ) {
      if (p.death.year < pl[0]) continue;
      if (ageAt < 3) continue;
      // did this plague actually take kin? — read the record, don't invent
      const kin = [];
      if (father && father.death.cause === "plague" && father.death.year >= pl[0] && father.death.year <= pl[1]) kin.push(pos + " father");
      if (mother && mother.death.cause === "plague" && mother.death.year >= pl[0] && mother.death.year <= pl[1]) kin.push(pos + " mother");
      const sibsLost = siblings.filter(s => s.death.cause === "plague" && s.death.year >= pl[0] && s.death.year <= pl[1]).length;
      if (sibsLost) kin.push(sibsLost === 1 ? "a sibling" : sibsLost + " siblings");
      const kidsLost = children.filter(c => c.death.cause === "plague" && c.death.year >= pl[0] && c.death.year <= pl[1]).length;
      if (kidsLost) kin.push(kidsLost === 1 ? "a child" : kidsLost + " children");
      const spouseLost = spouse && spouse.death.cause === "plague" && spouse.death.year >= pl[0] && spouse.death.year <= pl[1];
      if (p.death.year <= pl[1] && p.death.cause === "plague") continue; // their own death entry covers it
      if (kin.length || spouseLost || mentionedPlagues === 0 || rng.chance(0.3)) {
        let t = `Lived through ${pl[3]}.`;
        if (kin.length || spouseLost) {
          const all = kin.slice(); // spouse handled by its own entry below
          if (all.length) t += ` The record of burials shows the household broken: ${all.join(", ")} died of it.`;
        } else if (pl[2] >= 10) {
          t += ` The household was spared, though half the parish died and fields lay unharvested for want of hands.`;
        }
        ev(pl[0] + (ageAt === 0 ? 1 : 0), t, "plague");
        mentionedPlagues++;
        if (pl[2] >= 10 && ageAt >= 10 && wealth <= 2 && rng.chance(0.6)) {
          ev(pl[1] + 1, p.cls === "serf"
            ? `In the emptied countryside after the mortality, labour grew dear. ${p.name} bargained with the lord's steward for lighter services — or simply withheld them, as tenants everywhere now dared to do.`
            : `With so many holdings vacant after the mortality, ${p.name} took on the land of dead neighbours at low rent, and the family ate better than before.`, "fortune", SRC.court);
        }
      }
    }
  }

  // Famine
  if (famineAt(Math.max(p.birth, region.famine[0]), region) && p.death.year >= region.famine[0] && p.birth <= region.famine[1] && wealth <= 2) {
    const y = Math.max(p.birth + 1, region.famine[0]);
    if (y <= p.death.year && y - p.birth >= 2) ev(y, `The rains ruined the harvests and famine came — ${region.famineName}. The family sold what it could, ate the seed corn, and survived on begged bread and gathered roots.`, "famine", SRC.account);
  }

  // Occupation
  if (p.death.age >= 12 && !p.inOrders) {
    const occs = {
      serf: p.sex === "M" ? ["worked " + pos + " father's servile holding, and inherited its bondage with its land", "laboured on the lord's demesne as a ploughman", "kept the lord's sheep as a shepherd"] : ["worked the holding, the dairy, and the harvest alongside the family", "went into service at the manor house at twelve"],
      freePeasant: p.sex === "M" ? ["farmed the family holding", "worked as the village " + rng.pick(["thatcher", "wheelwright", "miller's man"]), "leased extra strips and prospered as a yeoman"] : ["ran the dairy, the poultry, the garden, and the brewing", "went into service in a townhouse at fourteen"],
      artisan: p.sex === "M" ? ["was apprenticed to the family trade of " + rng.pick(CRAFTS) + " and in time kept the shop", "became a journeyman " + rng.pick(CRAFTS)] : ["worked in the family workshop, minding the shop and the accounts", "carried on the workshop in widowhood, with journeymen under her"],
      merchant: p.sex === "M" ? ["rode to the fairs with the family's cloth and kept the books"] : ["kept the shop and the books when her husband travelled"],
      clergyFamily: p.sex === "M" ? ["was taught his letters and became a clerk"] : ["was taught to read her psalter, unusual for a girl"],
      gentry: p.sex === "M" ? ["was raised to arms and the management of the estate", "studied law and served at the sessions"] : ["was raised to needlework, estate accounts, and the marriage market", "ran the manor entirely during her husband's absences"]
    };
    const occ = rng.pick(occs[p.cls]);
    p.occupation = occ;
    if (/letters|clerk|law|psalter|books/.test(occ)) p.literate = true;
    ev(p.birth + 13, `${p.name} ${occ}.`, "life");
  }
  if (p.inOrders) {
    p.literate = true;
    ev(p.birth + 14, `Was marked out for the Church: learned Latin from the parish priest, was tonsured, and in time took orders. Served as a chantry priest, singing masses for the dead of the plague years.`, "life");
  }

  // Marriage — real spouse from the matching
  if (own) {
    const sName = spouse.name + " " + spouse.surname;
    let extra = "";
    if (p.cls === "serf" && p.sex === "F") extra = " Her father paid merchet to the lord for licence to marry.";
    if (spouse.incomer && p.sex === "M") extra = ` She came from the next parish, with a dowry of linen and a cow.`;
    ev(own.year, `Married ${sName}${p.sex === "F" && spouse.birth < p.birth - 3 ? ", a man some years older, as was usual" : ""}.${extra}`, "marriage");
  } else if (p.marriedOut) {
    ev(p.birth + region.marriageF[1], `Married out of the parish; her name leaves this register for another, and the rest of her life is written there.`, "marriage");
  } else if (p.death.age >= 30 && !p.inOrders && rng.chance(0.7)) {
    ev(p.birth + 30, `Never married — the register shows ${obj} in the same household year after year, ${p.sex === "F" ? "spinning and keeping house for kin" : "labouring on the family land"}.`, "life");
  }

  // Children — real, from the envelope
  for (const c of children) {
    const cp = plagueAt(c.birth);
    if (c.death.age === 0) {
      ev(c.birth, `A ${c.sex === "M" ? "son" : "daughter"}, ${c.name}, was born — and died within the year, ${cp && c.death.cause === "plague" ? "of the pestilence then raging" : "as one in four infants did"}. Buried in the churchyard, unmarked.`, "grief");
    } else {
      ev(c.birth, `A ${c.sex === "M" ? "son" : "daughter"}, ${c.name}, was born${c.death.age >= 16 ? ", and lived" : ""}.`, "child");
      if (c.death.age < 16) {
        ev(c.death.year, `${c.name} died at ${c.death.age}, ${c.death.cause === "plague" ? "of the pestilence" : "of " + rng.pick(["the smallpox", "the flux", "a fever", "the measles"])}. The parents paid for candles at the altar of the Virgin.`, "grief");
      }
    }
  }

  // Spouse death & widowhood — real
  if (spouse && spouse.death.year < p.death.year) {
    const atHome = children.filter(c => c.death.year > spouse.death.year && spouse.death.year - c.birth < 15 && c.birth < spouse.death.year).length;
    ev(spouse.death.year, `${spouse.name} ${spouse.surname} died${spouse.death.cause === "plague" ? " of the pestilence" : spouse.death.cause === "childbirth" ? " in childbed" : ""}, leaving ${p.name} ${p.sex === "F" ? "a widow" : "a widower"}${atHome ? ` with ${atHome} children still at home` : ""}.`, "grief");
  }

  // Revolt
  if (region.revolt && region.revolt.year >= p.birth + 15 && region.revolt.year <= Math.min(p.death.year, p.birth + 55) && wealth <= 3 && rng.chance(0.35)) {
    const joined = rng.chance(0.55);
    ev(region.revolt.year, joined
      ? `${region.revolt.name} broke out — ${region.revolt.desc}. ${p.name} was among those who rose, and afterwards kept quiet about it for the rest of ${pos} life, for the reprisals were savage.`
      : `${region.revolt.name} swept the district — ${region.revolt.desc}. ${p.name} kept ${pos} head down and the door barred.`, "revolt", SRC.chron);
  }

  // War touching the village
  for (const [a, b] of region.warYears) {
    if (b < p.birth + 6 || a > p.death.year) continue;
    if (rng.chance(0.35) && wealth <= 3) {
      const y = Math.max(a, p.birth + 6) + rng.int(0, Math.max(0, Math.min(b, p.death.year) - Math.max(a, p.birth + 6)));
      const wn = warAt(y, region) || "the wars";
      ev(y, `${wn.charAt(0).toUpperCase() + wn.slice(1)} came near: soldiers ${rng.pick(["requisitioned the grain and drove off the livestock", "burned two farms at the parish edge", "were billeted in the village for a winter, eating it bare", "demanded a ransom, paid in silver and salted meat"])}.`, "war", SRC.account);
      break;
    }
  }

  // World events
  for (const w of WORLD_EVENTS) {
    if (w[1] < p.birth + w[3] || w[0] > p.death.year) continue;
    if (w[2] && !w[2].includes(env.regionKey)) continue;
    if (rng.chance(w[4])) ev(Math.max(w[0], p.birth + w[3]), w[7](p), w[5], w[6]);
  }

  // Personal texture events
  function texture(pool, lo, hi, n) {
    const span = Math.min(hi, p.death.age) - lo;
    if (span <= 0) return;
    let count = 0;
    for (const [tmpl, wgt, flag] of pool) {
      if (count >= n) break;
      if (flag === "englandM" && !(env.regionKey === "england" && p.sex === "M")) continue;
      if (flag === "nw" && !["england", "germany"].includes(env.regionKey)) continue;
      if (!rng.chance(wgt * 0.16)) continue;
      count++;
      const y = p.birth + lo + rng.int(0, span);
      let text = tmpl.replace("{pos}", pos).replace("{obj}", obj)
        .replace("{land}", region.landUnit).replace("{courtcause}", rng.pick(COURT_CAUSES));
      let src = SRC.reg;
      if (flag === "court") src = SRC.court;
      if (flag === "will") src = SRC.will;
      if (flag === "literate") p.literate = true;
      ev(y, text, "life", src);
    }
  }
  texture(CHILD_EVENTS, 5, 11, 2);
  texture(YOUTH_EVENTS, 12, 20, 2);
  texture(ADULT_EVENTS, 21, 58, 3);
  if (p.sex === "F" && own) texture(FEMALE_EVENTS, 20, 45, 1);
  texture(OLD_EVENTS, 58, 90, 2);

  // Pilgrimage
  if (p.death.age >= 28 && rng.chance(0.18)) {
    const y = p.birth + rng.int(25, Math.min(55, p.death.age - 1));
    ev(y, `Went on pilgrimage to ${rng.pick(region.pilgrim)}, in fulfilment of a vow, and came home with a pilgrim badge sewn to ${pos} hat.`, "life", SRC.chron);
  }

  // Death — real cause from envelope, decoded detail
  const dd = rng.pick(DEATH_DETAIL[p.death.cause]);
  let burialTxt;
  if (p.death.cause === "plague") burialTxt = "Buried in haste, in a grave shared with others of that dying time.";
  else if (p.death.age === 0) burialTxt = "";
  else if (p.death.age < 12) burialTxt = "Buried in the churchyard beside the other children of the family.";
  else if (wealth >= 4) burialTxt = "Buried in the parish church before the altar, beneath a marked stone, with masses endowed for the soul.";
  else burialTxt = rng.pick([
    "Buried in the churchyard among kin, with the customary mortuary paid to the priest — the second-best beast.",
    "Buried in the churchyard on the south side, with a wooden cross that would not outlast a generation."
  ]);
  const dSrc = /drowned|fall|cart/.test(dd) ? SRC.coroner : SRC.reg;
  ev(p.death.year, `${p.name} ${dd}. ${burialTxt}`, "death", dSrc);

  events.sort((a, b) => a.year - b.year || (a.kind === "birth" ? -1 : a.kind === "death" ? 1 : 0));

  return {
    id, env,
    name: p.name, surname: p.surname, sex: p.sex, birth: p.birth, death: p.death,
    causeLabel: CAUSE_LABEL[p.death.cause],
    cls: p.cls, clsLabel: CLASS_INFO[p.cls].label, wealth,
    place: env.place, region: region.name,
    literate: !!p.literate, inOrders: !!p.inOrders,
    incomer: !!p.incomer, founder: !!p.founder, marriedOut: !!p.marriedOut,
    father: father ? { id: father.id, name: father.name + " " + father.surname, dead: father.death } : null,
    mother: mother ? { id: mother.id, name: mother.name + " " + mother.surname, dead: mother.death } : null,
    siblings: siblings.map(s => ({ id: s.id, name: s.name, sex: s.sex, birth: s.birth, death: s.death })),
    spouse: spouse ? { id: spouse.id, name: spouse.name + " " + spouse.surname, birth: spouse.birth, death: spouse.death, incomer: !!spouse.incomer } : null,
    marriageYear: own ? own.year : null,
    children: children.map(c => ({ id: c.id, name: c.name, sex: c.sex, birth: c.birth, death: c.death })),
    events,
    widowed: spouse && spouse.death.year < p.death.year ? 1 : 0,
    plaguesLived: PLAGUES.filter(pl => pl[0] >= p.birth && pl[1] <= p.death.year && !(p.death.cause === "plague" && p.death.year >= pl[0] && p.death.year <= pl[1])).length
  };
}

// Father's occupation, decoded from the FATHER's address so all siblings
// agree on it (upward dependency only).
export function fatherOccupation(env, fatherId) {
  if (fatherId < 0) return null;
  const f = env.persons[fatherId];
  const rng = makeRng(mix(env.vHash, 60000 + fatherId));
  return rng.pick(FATHER_OCC[f.cls])
    .replace("{land}", rng.int(CLASS_INFO[f.cls].wealth >= 2 ? 12 : 5, CLASS_INFO[f.cls].wealth >= 2 ? 40 : 15) + " " + env.region.landUnit)
    .replace("{craft}", rng.pick(CRAFTS));
}
