// =====================================================================
// TIER 2 — biography decode. Pure function of (envelope, personId, locale).
// Relational facts are READ from the envelope; only narrative texture is
// decoded from the person's own address hash. Locale only ever selects
// which pre-written template text gets picked — it never changes which
// template index/rng draw is picked, so the same seed narrates the same
// underlying life in either language.
//
// Migration (§11) means a person's relational facts can now legitimately
// live in TWO envelopes: her own origin village (birth, natal family) and,
// if she emigrated, the destination village that actually recorded her
// marriage. decodePerson always receives the envelope that owns the
// person's adult life (their residence), and reaches DOWN into a lower-rank
// origin envelope only to read — never resolve or invent — her parents.
// That one-directional read is safe by the same rank argument as
// pullImmigrantBride in village.ts: an origin village is never asked to
// know about a destination it hasn't been told about.
// =====================================================================
import type { Locale } from "../i18n/locale.js";
import { CLASS_INFO, CRAFTS } from "./data/classes.js";
import {
  ADULT_EVENTS,
  CAUSE_LABEL,
  CHILD_EVENTS,
  CORONER_DEATHS,
  COURT_CAUSES,
  DEATH_DETAIL,
  FATHER_OCC,
  FEMALE_EVENTS,
  OLD_EVENTS,
  RISK_DEATH_DETAIL,
  SRC,
  WORLD_EVENTS,
  YOUTH_EVENTS,
} from "./data/narrative.js";
import { placeOf } from "./data/placeNames.js";
import { PLAGUES, plagueAt } from "./data/plagues.js";
import { REGIONS } from "./data/regions.js";
import { citeDocument } from "./documents.js";
import { makeRng, personStream } from "./hash.js";
import { manorOf, parishOf } from "./hierarchy.js";
import { findResidenceRecord } from "./identity.js";
import { parentsOf } from "./lineage.js";
import { famineAt, warAt } from "./mortality.js";
import { lordOfManorAt, manorLineOf, royalLineOf, royalWorldEvents, sovereignAt } from "./nobility.js";
import { inheritedFromFather, isFirstBornSon } from "./succession.js";
import type {
  Address,
  Bio,
  BioEvent,
  BioEventKind,
  Couple,
  DocumentKind,
  Envelope,
  EventRef,
  Person,
  PersonAddress,
  RiskTrade,
  Sex,
  SocialClass,
  SpouseRef,
  UnionRef,
} from "./types.js";
import { resolveVillage } from "./village.js";

// Resolves a `{{masc/fem}}` token to whichever half matches `sex` — the one
// piece of grammar Catalan narrative text needs that English text doesn't
// (gendered past-participle/adjective agreement with the subject).
function gender(text: string, sex: Sex): string {
  return text.replace(/\{\{([^/{}]*)\/([^/{}]*)\}\}/g, (_, m: string, f: string) => (sex === "M" ? m : f));
}

interface OccEntry {
  text: string;
  literate?: boolean;
  /** Occupational hazard category this entry's trade actually carries — must match the person's own riskTrade (village.ts) so narrative and mortality agree. Untagged entries are the safe default. */
  risk?: RiskTrade;
  /** Occupation is decided at a fixed early age (13), before anyone in this
   * model marries — an entry that presupposes a husband or widowhood is
   * only eligible if that's actually true SOMEWHERE in her recorded life. */
  maritalGate?: "married" | "widowed";
}
const OCCUPATIONS: Record<Locale, Record<SocialClass, Record<Sex, OccEntry[]>>> = {
  en: {
    serf: {
      M: [
        { text: "worked his father's servile holding, and inherited its bondage with its land" },
        { text: "laboured on the lord's demesne as a ploughman" },
        { text: "kept the lord's sheep as a shepherd" },
        { text: "was sent to break stone in the lord's quarry, a service owed like any other", risk: "hazardous" },
      ],
      F: [{ text: "worked the holding, the dairy, and the harvest alongside the family" }, { text: "went into service at the manor house" }],
    },
    freePeasant: {
      M: [
        { text: "farmed the family holding" },
        { text: "worked as the village {craft}" },
        { text: "leased extra strips and prospered as a yeoman" },
        { text: "fished the estuary for the household's table and the market", risk: "maritime" },
      ],
      F: [{ text: "ran the dairy, the poultry, the garden, and the brewing" }, { text: "went into service in a townhouse" }],
    },
    artisan: {
      M: [
        { text: "was apprenticed to the family trade of {craft} and in time kept the shop" },
        { text: "became a journeyman {craft}" },
        { text: "hewed and dressed stone in the quarry, a trade that crippled or killed men young", risk: "hazardous" },
      ],
      F: [
        { text: "worked in the family workshop, minding the shop and the accounts" },
        { text: "carried on the workshop in widowhood, with journeymen under her", maritalGate: "widowed" },
      ],
    },
    merchant: {
      M: [
        { text: "rode to the fairs with the family's cloth and kept the books", literate: true },
        { text: "took ship with the trading fleet along the coast, buying and selling in foreign ports", literate: true, risk: "maritime" },
      ],
      F: [
        { text: "helped keep the household accounts, alongside her mother", literate: true },
        { text: "kept the shop and the books when her husband travelled", literate: true, maritalGate: "married" },
      ],
    },
    clergyFamily: {
      M: [{ text: "was taught his letters and became a clerk", literate: true }],
      F: [{ text: "was taught to read her psalter, unusual for a girl", literate: true }],
    },
    gentry: {
      M: [
        { text: "was raised to arms and the management of the estate" },
        { text: "studied law and served at the sessions", literate: true },
        { text: "was raised chiefly to war, and rode in the retinue of a greater lord", risk: "military" },
      ],
      F: [
        { text: "was raised to needlework, estate accounts, and the marriage market" },
        { text: "ran the manor entirely during her husband's absences", maritalGate: "married" },
      ],
    },
  },
  ca: {
    serf: {
      M: [
        { text: "va treballar l'explotació servil del seu pare, i en va heretar la servitud amb la terra" },
        { text: "va llaurar el domini del senyor com a bover" },
        { text: "va guardar les ovelles del senyor com a pastor" },
        { text: "va ser enviat a tallar pedra a la pedrera del senyor, una prestació deguda com qualsevol altra", risk: "hazardous" },
      ],
      F: [{ text: "va treballar l'explotació, la lleteria i la collita al costat de la família" }, { text: "va entrar a servir a la casa senyorial" }],
    },
    freePeasant: {
      M: [
        { text: "va conrear l'explotació familiar" },
        { text: "va treballar com a {craft} del poble" },
        { text: "va arrendar terres addicionals i va prosperar com a pagès benestant" },
        { text: "va pescar a l'estuari per a la taula de la casa i el mercat", risk: "maritime" },
      ],
      F: [{ text: "va portar la lleteria, els corrals, l'hort i la cervesa" }, { text: "va entrar a servir en una casa de vila" }],
    },
    artisan: {
      M: [
        { text: "va aprendre l'ofici familiar de {craft} i amb el temps va portar el taller" },
        { text: "es va fer oficial {craft}" },
        { text: "va tallar i polir pedra a la pedrera, un ofici que esguerrava o matava els homes joves", risk: "hazardous" },
      ],
      F: [
        { text: "va treballar al taller familiar, cuidant la botiga i els comptes" },
        { text: "va portar el taller en la viduïtat, amb oficials al seu càrrec", maritalGate: "widowed" },
      ],
    },
    merchant: {
      M: [
        { text: "va anar a les fires amb els draps de la família i en va portar els comptes", literate: true },
        { text: "va anar a la mar amb la flota mercant al llarg de la costa, comprant i venent en ports estrangers", literate: true, risk: "maritime" },
      ],
      F: [
        { text: "ajudava a portar els comptes de la casa, al costat de la seva mare", literate: true },
        { text: "va portar la botiga i els comptes quan el seu marit viatjava", literate: true, maritalGate: "married" },
      ],
    },
    clergyFamily: {
      M: [{ text: "va aprendre les lletres i es va fer clergue", literate: true }],
      F: [{ text: "va aprendre a llegir el seu saltiri, cosa poc habitual en una noia", literate: true }],
    },
    gentry: {
      M: [
        { text: "va ser format en les armes i el govern de l'hisenda" },
        { text: "va estudiar dret i va servir a les sessions", literate: true },
        { text: "va ser format sobretot per a la guerra, i va cavalcar al seguici d'un senyor més poderós", risk: "military" },
      ],
      F: [
        { text: "va ser formada en la brodadora, els comptes de l'hisenda i el mercat matrimonial" },
        { text: "va portar tot el senyoriu durant les absències del marit", maritalGate: "married" },
      ],
    },
  },
};

const CHILD_DEATH_CAUSE: Record<Locale, string[]> = {
  en: ["the smallpox", "the flux", "a fever", "the measles"],
  ca: ["la verola", "el flux", "una febre", "el xarampió"],
};
const WAR_ACTION: Record<Locale, string[]> = {
  en: [
    "requisitioned the grain and drove off the livestock",
    "burned two farms at the parish edge",
    "were billeted in the village for a winter, eating it bare",
    "demanded a ransom, paid in silver and salted meat",
  ],
  ca: [
    "van requisar el gra i es van endur el bestiar",
    "van cremar dues masies al límit de la parròquia",
    "es van allotjar al poble tot un hivern, deixant-lo escurat",
    "van exigir un rescat, pagat en plata i carn salada",
  ],
};
const BURIAL_PLAIN: Record<Locale, string[]> = {
  en: [
    "Buried in the churchyard among kin, with the customary mortuary paid to the priest — the second-best beast.",
    "Buried in the churchyard on the south side, with a wooden cross that would not outlast a generation.",
  ],
  ca: [
    "Enterrat{{/da}} al cementiri entre parents, amb la mortuòria acostumada pagada al capellà — la segona millor bèstia.",
    "Enterrat{{/da}} al cementiri, al costat sud, amb una creu de fusta que no duraria una generació.",
  ],
};

// Cheap, non-recursive: just the deterministic place-name formula, never a
// full village solve. Safe to call for a destination address regardless of
// rank, which is what lets the origin side name where someone went without
// depending on that village ever being resolved.
function placeNameOf(worldSeed: number, addr: Address | null | undefined, locale: Locale): string | null {
  if (!addr) return null;
  return placeOf(worldSeed, addr.regionKey, addr.villageIdx)[locale];
}

function addrOnly(a: Address): Address {
  return { regionKey: a.regionKey, villageIdx: a.villageIdx };
}

// § name links: a reference for the UI layer to turn a person's name — as
// it literally appears in an event's own text — into a link to their
// record. `full` uses "Name Surname" (most mentions); pass full=false for
// the handful of spots (children, a birth event's mother) that name someone
// by first name only.
function nameRef(person: Person, addr: Address, full = true): EventRef {
  return { id: person.id, name: full ? `${person.name} ${person.surname}` : person.name, addr: addrOnly(addr) };
}

function spouseRefOf(s: Person, addr: Address, worldSeed: number, locale: Locale): SpouseRef {
  return {
    id: s.id,
    name: s.name + " " + s.surname,
    birth: s.birth,
    death: s.death,
    incomer: !!s.incomer,
    addr: addrOnly(addr),
    originPlace: s.incomer && s.origin ? placeNameOf(worldSeed, s.origin, locale) : null,
  };
}

function unionRefOf(c: Couple, s: Person, kids: Person[], addr: Address, worldSeed: number, locale: Locale): UnionRef {
  return {
    spouse: spouseRefOf(s, addr, worldSeed, locale),
    year: c.year,
    children: kids.map((k) => ({ id: k.id, name: k.name, sex: k.sex, birth: k.birth, death: k.death, addr: addrOnly(addr) })),
  };
}

export function decodePerson(env: Envelope, id: number, locale: Locale): Bio | null {
  const p = env.persons[id];
  if (!p) return null;
  const region = env.region;
  const pHash = personStream(env.vHash, 40000, id);
  const rng = makeRng(pHash);
  const wealth = CLASS_INFO[p.cls].wealth;
  const pos = p.sex === "M" ? "his" : "her";
  const obj = p.sex === "M" ? "him" : "her";
  const selfAddr: Address = { regionKey: env.regionKey, villageIdx: env.villageIdx };
  const ca = locale === "ca";

  // § pure decode: derived narrative facts accumulate in locals and are
  // returned on the Bio — the envelope's Person records are never written.
  let literate = false;
  let occupation: string | null = null;

  // Overlapping hierarchies (§10): independent of the civil village tree,
  // resolved fresh here — cheap, non-recursive, no memo needed.
  const jurisdiction = parishOf(env.worldSeed, env.regionKey, env.villageIdx, locale);
  const fief = manorOf(env.worldSeed, env.regionKey, env.villageIdx, locale);
  const cite = (kind: DocumentKind) => citeDocument(kind, { jurisdiction, fief, place: env.place[locale] }, locale);

  // --- family lookups (all from the envelope; symmetric by construction) ---
  // An immigrant's local record has no local parents (father/mother = -1),
  // but a real origin pointer resolves to the lower-rank village that DOES —
  // read it, don't invent it. parentsOf (lineage.ts) does this same
  // resolution for the multi-generation ancestorsOf/descendantsOf traversal,
  // so it lives there rather than being duplicated here.
  const { father: fatherRec, mother: motherRec } = parentsOf(env, id);
  const father: Person | null = fatherRec?.person ?? null;
  const mother: Person | null = motherRec?.person ?? null;
  const fatherAddr = fatherRec && fatherRec.env !== env ? addrOnly(fatherRec.env) : selfAddr;
  const motherAddr = motherRec && motherRec.env !== env ? addrOnly(motherRec.env) : selfAddr;
  const fatherEnvForOcc: Envelope | null = fatherRec ? fatherRec.env : null;
  const fatherIdForOcc: number | null = fatherRec ? fatherRec.person.id : null;
  const fatherOccText = fatherEnvForOcc && fatherIdForOcc != null ? fatherOccupation(fatherEnvForOcc, fatherIdForOcc, locale) : null;

  // Natal couple: with remarriage a father can head several couples, so
  // find the one whose wife is this person's own mother.
  const natalIdx = p.father >= 0 ? (env.persons[p.father].unions ?? []).find((ci) => env.couples[ci].wife === p.mother) : undefined;
  const natal = natalIdx != null ? env.couples[natalIdx] : null;
  const siblings = natal ? natal.children.filter((cid) => cid !== id).map((cid) => env.persons[cid]) : [];

  // Marital history: every union, in order. `own`/`spouse` keep pointing at
  // the FIRST marriage for the sections that predate remarriage support.
  const unionCouples: Couple[] = (p.unions ?? []).map((ci) => env.couples[ci]);
  const spouseOf = (c: Couple): Person => env.persons[p.id === c.husband ? c.wife : c.husband];
  const own = unionCouples[0] ?? null;
  const spouse = own ? spouseOf(own) : null;
  const children = unionCouples.flatMap((c) => c.children.map((cid) => env.persons[cid]));
  // § occupation marital gate: an occupation entry that presupposes she's
  // married (or widowed) must only be eligible if that's actually true of
  // her own recorded life — occupation is decided at a fixed early age
  // (13), before marriage in every region, so it can only look at whether
  // these things EVER happen across her whole recorded history, not "yet".
  const everMarried = unionCouples.length > 0;
  const widowedUnions = unionCouples.filter((c) => spouseOf(c).death.year < p.death.year);

  // § canonical identity: an emigrant decoded at her ORIGIN village may have
  // a real residence record in the destination register — resolve it (bounded:
  // local cluster only) so her origin record links to her married life there.
  let destRecord: PersonAddress | null = null;
  let destEnv: Envelope | null = null;
  if (p.emigrated && p.emigrateTo && !p.longDistance && unionCouples.length === 0) {
    destRecord = findResidenceRecord(env.worldSeed, { regionKey: env.regionKey, villageIdx: env.villageIdx, personId: id }, p.emigrateTo);
    if (destRecord) destEnv = resolveVillage(env.worldSeed, destRecord.regionKey, destRecord.villageIdx);
  }
  const destPerson = destRecord && destEnv ? destEnv.persons[destRecord.personId] : null;
  const destUnion = destPerson?.unions?.length && destEnv ? destEnv.couples[destPerson.unions[0]] : null;
  const destSpouse = destUnion && destEnv ? destEnv.persons[destUnion.husband === destPerson?.id ? destUnion.wife : destUnion.husband] : null;
  const destChildren = destUnion && destEnv ? destUnion.children.map((cid) => destEnv.persons[cid]) : [];

  const events: BioEvent[] = [];
  const ev = (year: number, text: string, kind: BioEventKind, src?: string, refs?: EventRef[]) => {
    if (year <= p.death.year)
      events.push({ year, age: year - p.birth, text: gender(text, p.sex), kind, src: src || cite("reg"), refs: refs?.length ? refs : undefined });
  };

  // Birth
  const bornPlague = plagueAt(p.birth);
  const bNote = ca
    ? bornPlague
      ? ` — {{nascut/nascuda}} en any de pesta, ${bornPlague[3].ca}`
      : famineAt(p.birth, region)
        ? " — {{nascut/nascuda}} enmig de la fam, quan les collites havien fallat"
        : ""
    : bornPlague
      ? " — born in a plague year, " + bornPlague[3].en
      : famineAt(p.birth, region)
        ? " — born amid famine, when the harvests had failed"
        : "";
  if (p.incomer && !p.founder && p.origin) {
    ev(
      p.birth,
      ca
        ? `Va néixer a ${placeNameOf(env.worldSeed, p.origin, locale)}; la seva família consta al registre d'aquell poble. Entra en aquest amb el seu casament.`
        : `Born in ${placeNameOf(env.worldSeed, p.origin, locale)}; her people are entered in that village's own register. She comes into this one on her marriage.`,
      "birth",
      cite("reg"),
    );
  } else if (p.incomer && !p.founder) {
    ev(
      p.birth,
      ca
        ? `Va néixer a la parròquia veïna; la seva família consta en un altre registre. Entra en aquest amb el seu casament.`
        : `Born in the next parish; her people are entered in another register. She comes into this one on her marriage.`,
      "birth",
      cite("reg"),
    );
  } else if (p.founder) {
    ev(
      p.birth,
      ca
        ? `Va néixer abans que comencés aquest registre; ${p.name} hi apareix als primers folis ja {{crescut/crescuda}}, com {{un/una}} de les cases fundadores de ${env.place[locale]}.`
        : `Born before this register begins; ${p.name} appears in its first folios already grown, one of the founding households of ${env.place[locale]}.`,
      "birth",
      cite("reg"),
    );
  } else {
    // Native-born, non-founder: both parents are guaranteed present by
    // construction (only founders/fabricated incomers have father/mother -1).
    ev(
      p.birth,
      ca
        ? `Va néixer a ${env.place[locale]}, ${region.name.ca}, ${p.sex === "M" ? "fill" : "filla"} de ${father!.name} ${father!.surname} i ${mother!.name}${bNote}.`
        : `Born in ${env.place[locale]}, ${region.name.en}, ${p.sex === "M" ? "son" : "daughter"} of ${father!.name} ${father!.surname} and ${mother!.name}${bNote}.`,
      "birth",
      cite("reg"),
      [nameRef(father!, selfAddr), nameRef(mother!, selfAddr, false)],
    );
  }

  // § godparents: baptismal sponsors, drawn from other adults already on
  // record in the SAME register the birth itself belongs to — the person's
  // own envelope for a native, or the real origin envelope for an immigrant
  // (the same one parentsOf resolved father/mother from above) — never
  // invented out of thin air, and skipped for a founder (whose baptism
  // predates the register) or a fabricated incomer with no addressable origin.
  if (fatherEnvForOcc) {
    const baptSelfId = fatherEnvForOcc !== env && p.originId != null ? p.originId : id;
    const pool = fatherEnvForOcc.persons.filter(
      (q) => q.id !== baptSelfId && q.id !== father?.id && q.id !== mother?.id && q.birth + 16 <= p.birth && q.death.year > p.birth,
    );
    const godfathers = pool.filter((q) => q.sex === "M");
    const godmothers = pool.filter((q) => q.sex === "F");
    if (godfathers.length && godmothers.length) {
      const gf = rng.pick(godfathers);
      const gm = rng.pick(godmothers);
      ev(
        p.birth,
        ca
          ? `Als peus de la pica, ${gf.name} ${gf.surname} i ${gm.name} ${gm.surname} en van ser els padrins, i van respondre per {{ell/ella}} davant el capellà.`
          : `At the font, ${gf.name} ${gf.surname} and ${gm.name} ${gm.surname} stood godparents, and answered for ${obj} before the priest.`,
        "life",
        undefined,
        [nameRef(gf, fatherEnvForOcc), nameRef(gm, fatherEnvForOcc)],
      );
    }
  }

  // Plague passages: family losses read from ACTUAL envelope deaths
  let mentionedPlagues = 0;
  for (const pl of PLAGUES) {
    if (pl[1] < p.birth || pl[0] > p.death.year) continue;
    const ageAt = Math.max(0, pl[0] - p.birth);
    if (p.death.year >= pl[0] && !(p.death.cause === "plague" && p.death.year <= pl[1] + 0)) {
      if (p.death.year < pl[0]) continue;
      if (ageAt < 3) continue;
      // did this plague actually take kin? — read the record, don't invent
      const kin: string[] = [];
      if (father && father.death.cause === "plague" && father.death.year >= pl[0] && father.death.year <= pl[1]) kin.push(ca ? "el seu pare" : pos + " father");
      if (mother && mother.death.cause === "plague" && mother.death.year >= pl[0] && mother.death.year <= pl[1])
        kin.push(ca ? "la seva mare" : pos + " mother");
      const sibsLost = siblings.filter((s) => s.death.cause === "plague" && s.death.year >= pl[0] && s.death.year <= pl[1]).length;
      if (sibsLost) kin.push(ca ? (sibsLost === 1 ? "un germà" : sibsLost + " germans") : sibsLost === 1 ? "a sibling" : sibsLost + " siblings");
      const kidsLost = children.filter((c) => c.death.cause === "plague" && c.death.year >= pl[0] && c.death.year <= pl[1]).length;
      if (kidsLost) kin.push(ca ? (kidsLost === 1 ? "un fill" : kidsLost + " fills") : kidsLost === 1 ? "a child" : kidsLost + " children");
      const spouseLost = !!(spouse && spouse.death.cause === "plague" && spouse.death.year >= pl[0] && spouse.death.year <= pl[1]);
      if (p.death.year <= pl[1] && p.death.cause === "plague") continue; // their own death entry covers it
      if (kin.length || spouseLost || mentionedPlagues === 0 || rng.chance(0.3)) {
        let t = ca ? `Va viure ${pl[3].ca}.` : `Lived through ${pl[3].en}.`;
        if (kin.length || spouseLost) {
          const all = kin.slice(); // spouse handled by its own entry below
          if (all.length)
            t += ca
              ? ` El registre d'enterraments mostra la casa desfeta: en van morir ${all.join(", ")}.`
              : ` The record of burials shows the household broken: ${all.join(", ")} died of it.`;
        } else if (pl[2] >= 10) {
          t += ca
            ? ` La casa se'n va lliurar, tot i que va morir mig poble i els camps van quedar sense collir per manca de mans.`
            : ` The household was spared, though half the parish died and fields lay unharvested for want of hands.`;
        }
        ev(pl[0] + (ageAt === 0 ? 1 : 0), t, "plague");
        mentionedPlagues++;
        if (pl[2] >= 10 && ageAt >= 10 && wealth <= 2 && rng.chance(0.6)) {
          ev(
            pl[1] + 1,
            p.cls === "serf"
              ? ca
                ? `En el camp buidat després de la mortaldat, la mà d'obra es va tornar cara. ${p.name} va negociar amb el batlle de ${fief.manor} unes prestacions més lleugeres — o simplement les va deixar de fer, com gosaven ja arreu els pagesos.`
                : `In the emptied countryside after the mortality, labour grew dear. ${p.name} bargained with the steward of ${fief.manor} for lighter services — or simply withheld them, as tenants everywhere now dared to do.`
              : ca
                ? `Amb tantes terres buides després de la mortaldat, ${p.name} va prendre les terres de veïns morts a preu baix, i la família va menjar millor que abans.`
                : `With so many holdings vacant after the mortality, ${p.name} took on the land of dead neighbours at low rent, and the family ate better than before.`,
            "fortune",
            cite("court"),
          );
        }
      }
    }
  }

  // Famine
  if (famineAt(Math.max(p.birth, region.famine[0]), region) && p.death.year >= region.famine[0] && p.birth <= region.famine[1] && wealth <= 2) {
    const y = Math.max(p.birth + 1, region.famine[0]);
    if (y <= p.death.year && y - p.birth >= 2)
      ev(
        y,
        ca
          ? `Les pluges van arruïnar les collites i va arribar la fam — ${region.famineName.ca}. La família va vendre el que va poder, es va menjar el blat de sement, i va sobreviure a base de pa captat i arrels collides.`
          : `The rains ruined the harvests and famine came — ${region.famineName.en}. The family sold what it could, ate the seed corn, and survived on begged bread and gathered roots.`,
        "famine",
        cite("account"),
      );
  }

  // § wardship: a full orphan below working age needed a guardian — for the
  // landed classes the lord/manor court typically took the wardship (and
  // its profits) until majority; for humbler families, kin took the child
  // in, a duty the court roll sometimes records alongside who now answered
  // for the household's dues.
  if (father && mother) {
    const orphanedAt = Math.max(father.death.year, mother.death.year);
    const orphanedAge = orphanedAt - p.birth;
    if (orphanedAge >= 0 && orphanedAge < 14 && orphanedAt < p.death.year) {
      // § canonical identity: an immigrant orphaned as a child was orphaned
      // in HER OWN origin village — years before her marriage ever brought
      // her onto THIS (destination) register — so the wardship's lord and
      // court citation must come from the origin village's own hierarchy
      // (fatherEnvForOcc, already resolved above), never this envelope's,
      // or a bride pulled in from elsewhere would be narrated as a ward of
      // a lord she in fact never lived under as a child.
      const wardEnv = fatherEnvForOcc ?? env;
      const wardFief = manorOf(wardEnv.worldSeed, wardEnv.regionKey, wardEnv.villageIdx, locale);
      // § nobility: the granting lord is the head of that manor's line in
      // the orphaning year, not the fief card's mid-register anchor.
      const wardLord = lordOfManorAt(wardEnv.worldSeed, wardEnv.regionKey, wardEnv.villageIdx, orphanedAt).name;
      const wardCite = citeDocument(
        "court",
        { jurisdiction: parishOf(wardEnv.worldSeed, wardEnv.regionKey, wardEnv.villageIdx, locale), fief: wardFief, place: wardEnv.place[locale] },
        locale,
      );
      ev(
        orphanedAt,
        wealth >= 4
          ? ca
            ? `Orfe de pare i mare, la tutela de la seva persona i de la seva terra va ser atorgada per ${wardLord} a un parent, que en cobraria els fruits fins que arribés a la majoria d'edat.`
            : `Orphaned of both parents, wardship of ${pos} person and land was granted by ${wardLord} to a kinsman, who would take the profits of the holding until ${obj} came of age.`
          : ca
            ? `Orfe de pare i mare, el van acollir uns parents, com va quedar constatat quan la cort del senyoriu va confirmar qui responia ara pels drets de la casa.`
            : `Orphaned of both parents, ${p.name} was taken in by kin, as the manor court noted when it confirmed who now answered for the household's dues.`,
        "grief",
        wardCite,
        // The granting lord links to HIS manor's house — the origin
        // village's for an immigrant ward, same as the citation.
        wealth >= 4 ? [{ id: -1, name: wardLord, addr: addrOnly(wardEnv), route: "house" }] : undefined,
      );
    }
  }

  // § stepfamily: a parent's later remarriage brought a stepparent into a
  // still-young child's household — read from the same union history that
  // drives remarriage (village.ts), so it only ever fires when it really
  // happened. Native-born only (siblings/natalIdx aren't resolved for an
  // immigrant's cross-village family — see the natalIdx computation above).
  function firstLaterUnion(parent: Person | null): { spouse: Person; year: number } | null {
    if (!parent?.unions || natalIdx == null) return null;
    const natalYear = env.couples[natalIdx].year;
    const later = parent.unions
      .map((ci) => env.couples[ci])
      .filter((c) => c.year > natalYear)
      .sort((a, b) => a.year - b.year)[0];
    if (!later) return null;
    return { spouse: env.persons[parent.id === later.husband ? later.wife : later.husband], year: later.year };
  }
  const stepMotherUnion = firstLaterUnion(father); // father remarried -> new wife is a stepmother
  const stepFatherUnion = firstLaterUnion(mother); // mother remarried -> new husband is a stepfather
  if (stepFatherUnion) {
    const ageAt = stepFatherUnion.year - p.birth;
    if (ageAt >= 0 && ageAt <= 16 && stepFatherUnion.year < p.death.year) {
      const s = stepFatherUnion.spouse;
      ev(
        stepFatherUnion.year,
        ca
          ? `La seva mare es va tornar a casar, amb ${s.name} ${s.surname}, que va entrar a la casa com a padrastre.`
          : `${pos.charAt(0).toUpperCase() + pos.slice(1)} mother married again, to ${s.name} ${s.surname}, who came into the house as ${pos} stepfather.`,
        "life",
        undefined,
        [nameRef(s, selfAddr)],
      );
    }
  }
  if (stepMotherUnion) {
    const ageAt = stepMotherUnion.year - p.birth;
    if (ageAt >= 0 && ageAt <= 16 && stepMotherUnion.year < p.death.year) {
      const s = stepMotherUnion.spouse;
      ev(
        stepMotherUnion.year,
        ca
          ? `El seu pare es va tornar a casar, amb ${s.name} ${s.surname}, que va entrar a la casa com a madrastra.`
          : `${pos.charAt(0).toUpperCase() + pos.slice(1)} father married again, to ${s.name} ${s.surname}, who came into the house as ${pos} stepmother.`,
        "life",
        undefined,
        [nameRef(s, selfAddr)],
      );
    }
  }

  // Occupation — text stays consistent with the mechanical riskTrade tag
  // rolled at Tier 1 (village.ts): a hazardous/maritime/military person is
  // preferentially narrated into a trade that actually carries that hazard,
  // never the reverse (a "normal" person never draws a risk-flavoured entry).
  if (p.death.age >= 12 && !p.inOrders) {
    // § mobility timing: the age-13 "occupation decided" moment predates
    // the age-16 class-mobility transition (§ mobility below) — so someone
    // WITH a clsOrigin (mobility applies) is still living their ORIGIN
    // class at 13, not their eventual final class. Reading OCCUPATIONS by
    // p.cls here would narrate the final trade years early (e.g. a serf
    // already "prospered as a yeoman" at 13, then "Rose out of servitude"
    // at 16 — flatly contradicting itself); reading it by clsOrigin instead
    // keeps this event honest about which class is actually true yet, the
    // same fix already applied to the maritalGate entries above.
    const occCls = p.clsOrigin ?? p.cls;
    const eligible = OCCUPATIONS[locale][occCls][p.sex].filter((o) => !o.maritalGate || (o.maritalGate === "married" ? everMarried : widowedUnions.length > 0));
    const fullPool = eligible.length ? eligible : OCCUPATIONS[locale][occCls][p.sex];
    // riskTrade (village.ts) is rolled from the person's FINAL class — the
    // hazard belongs to the trade they end up in, not necessarily one they
    // were already practicing at 13. Only let it steer text selection when
    // occCls IS that final class (no mobility, or mobility hasn't happened
    // yet in the narrative sense); otherwise a mobility case could fall
    // through to the "no matching risk entry in the origin pool" fallback
    // and randomly draw an unrelated risk-flavoured line from the origin
    // class (e.g. a future sailor's age-13 text calling him a quarryman).
    const riskTrade = occCls === p.cls ? (p.riskTrade ?? "normal") : "normal";
    const matching = riskTrade === "normal" ? fullPool.filter((o) => !o.risk) : fullPool.filter((o) => o.risk === riskTrade);
    const pool = matching.length ? matching : fullPool;
    const occ = rng.pick(pool);
    const craft = rng.pick(CRAFTS[locale]);
    const occText = occ.text.replace("{craft}", craft);
    occupation = occText;
    if (occ.literate) literate = true;
    // A marital-gated entry narrates something only true once she's married
    // (or widowed) — dating it to the fixed age-13 "occupation decided"
    // moment would print "ran the manor during her husband's absences"
    // years before the chronicle's own marriage entry, for a girl who is
    // in fact still unmarried at 13. Anchor it to the year that actually
    // makes it true instead (never earlier than 13, and never invented:
    // `own`/`widowedUnions` are the same real union records the eligibility
    // filter above already checked).
    const occYear =
      occ.maritalGate === "married"
        ? Math.max(p.birth + 13, own!.year)
        : occ.maritalGate === "widowed"
          ? Math.max(p.birth + 13, Math.min(...widowedUnions.map((c) => spouseOf(c).death.year)))
          : p.birth + 13;
    ev(occYear, `${p.name} ${occText}.`, "life");
  }
  if (p.inOrders) {
    literate = true;
    ev(
      p.birth + 14,
      ca
        ? `Va ser destinat a l'Església: va aprendre llatí del capellà de la parròquia, va rebre la tonsura, i amb el temps va prendre els ordes. Va servir com a capellà de capellania, cantant misses pels morts dels anys de pesta.`
        : `Was marked out for the Church: learned Latin from the parish priest, was tonsured, and in time took orders. Served as a chantry priest, singing masses for the dead of the plague years.`,
      "life",
    );
  }

  // § service: adolescent years in another household, rolled at Tier 1
  if (p.service && p.death.year > p.service.from) {
    const years = Math.min(p.service.to, p.death.year) - p.service.from;
    ev(
      p.service.from,
      ca
        ? `Va entrar a servir en una altra casa, com era costum per als fills de cases humils, i hi va passar ${years > 1 ? `${years} anys` : "un any"} guanyant-se el llit, la taula i la soldada.`
        : `Went into service in another household, as was the custom for children of humble houses, and spent ${years > 1 ? `${years} years` : "a year"} there earning bed, board, and a small wage.`,
      "life",
      cite("account"),
    );
  }

  // § mobility: the person left their natal class on coming of age — either
  // up (serfToFree/freeToArtisan/artisanToMerchant, village.ts rollMobility)
  // or, for a non-heir son under impartible custom, down (§ downward
  // mobility, rollDownwardMobility). Direction is read off the wealth
  // grades themselves, not stored separately on the Person.
  if (p.clsOrigin && p.death.age >= 16) {
    const y = p.birth + 16;
    const rose = CLASS_INFO[p.cls].wealth > CLASS_INFO[p.clsOrigin].wealth;
    let t: string;
    if (rose) {
      if (p.clsOrigin === "serf")
        t = ca
          ? `Va sortir de la servitud: en el camp despoblat va aconseguir una tinença lliure, i el registre {{el/la}} comença a anomenar pagès{{/a}} lliure.`
          : `Rose out of servitude: in the emptied countryside ${p.sex === "M" ? "he" : "she"} secured a free tenancy, and the rolls begin to style ${obj} a free tenant.`;
      else if (p.clsOrigin === "freePeasant")
        t = ca
          ? `Va deixar la terra per un ofici: aprenentatge a un taller, i amb els anys un lloc propi entre l'artesanat del poble.`
          : `Left the land for a trade: an apprenticeship in a workshop, and in time a place among the village artisans.`;
      else
        t = ca
          ? `Va arriscar els estalvis del taller en el comerç, i li va anar bé: la casa va passar a viure dels tractes i no de les mans.`
          : `Ventured the workshop's savings in trade, and prospered: the household came to live by dealing rather than by its hands.`;
    } else if (p.clsOrigin === "merchant")
      t = ca
        ? `Sense taller ni crèdit que heretar, només li va quedar l'ofici de les mans: el registre {{el/la}} comença a anomenar simplement artesà{{/na}}, no mercader.`
        : `With no shop or its credit to inherit, ${p.sex === "M" ? "he" : "she"} kept only the trade of the hands: the rolls begin to style ${obj} a plain artisan, not a merchant.`;
    else
      t = ca
        ? `Sense taller propi que heretar, va tornar a treballar la terra: el registre {{el/la}} comença a anomenar pagès{{/a}}, no artesà{{/na}}.`
        : `With no workshop of his own to inherit, ${p.sex === "M" ? "he" : "she"} went back to working the land: the rolls begin to style ${obj} a peasant, not an artisan.`;
    ev(y, t, rose ? "fortune" : "hardship", cite("court"));
  }

  // § manorial accounts: a periodic entry in the reeve's roll — the rent
  // and boon-works owed for the holding, sometimes in arrears after a bad
  // harvest — for the tenant classes who actually rendered such dues in
  // this model (artisans/merchants/gentry/clergy held by other tenures).
  if ((p.cls === "serf" || p.cls === "freePeasant") && p.death.age >= 20 && rng.chance(0.3)) {
    const y = p.birth + rng.int(20, Math.min(50, p.death.age));
    const badYear = famineAt(y, region) || !!warAt(y, region);
    ev(
      y,
      badYear
        ? ca
          ? `El rotlle del batlle {{el/la}} anota en deute aquell any — la renda i les prestacions no pagades, ajornades contra la collita següent.`
          : `The reeve's roll notes ${obj} in arrears that year — rent and boon-works owed and not yet paid, carried forward against next year's harvest.`
        : ca
          ? `El rotlle del batlle registra ${p.name} rendint la renda i les prestacions acostumades de la tinença, en diners i en espècie, com cada any.`
          : `The reeve's roll records ${p.name} rendering the customary rent and boon-works for the holding, in coin and kind, as every year.`,
      badYear ? "hardship" : "life",
      cite("account"),
    );
  }

  // § inheritance: succession to the father's holding, from succession.ts —
  // the same rule the temporal resolver uses for household headship.
  if (p.father >= 0 && inheritedFromFather(env, id)) {
    const father = env.persons[p.father];
    if (father.death.year > p.birth + 12 && father.death.year <= p.death.year) {
      ev(
        father.death.year,
        ca
          ? `A la mort del seu pare va entrar a la tinença com a hereu{{/va}}, pagant al senyor el lluïsme acostumat — la millor bèstia de la casa.`
          : `At ${pos} father's death entered the holding as heir, paying the lord the customary relief — the best beast of the house.`,
        "fortune",
        cite("court"),
      );
    }
  } else if (p.father >= 0 && region.inheritance === "partible" && p.sex === "M" && !p.emigrated && !p.inOrders) {
    // § regional inheritance customs: under partible custom (France,
    // Tuscany — regions.ts) land was divided among the sons instead of
    // passing whole to one — a surviving, non-departing son who wasn't the
    // customary household heir still took a real share, narrated distinctly
    // from both the sole-heir text above and plain silence.
    const father = env.persons[p.father];
    if (father.death.year > p.birth + 12 && father.death.year <= p.death.year) {
      ev(
        father.death.year,
        ca
          ? `A la mort del seu pare va rebre la seva part de la terra, partida entre els fills com era costum aquí, no passada sencera a un de sol.`
          : `At ${pos} father's death received ${pos} share of the land, divided among the sons as was the custom here, not passed whole to one.`,
        "fortune",
        cite("court"),
      );
    }
  }

  // Marriage — real spouses from the matching, first union and any remarriage
  unionCouples.forEach((c, i) => {
    const s = spouseOf(c);
    const sName = s.name + " " + s.surname;
    if (i === 0) {
      let extra = "";
      // Merchet was HER FATHER'S payment for licence to marry her off — so
      // it only ever happened if he was actually alive to make it, not just
      // recorded somewhere earlier in her life (same-shape fix as the
      // maritalGate occupation entries above: a fact tied to a real event
      // must be checked against that event's own year, not "ever true").
      // § nobility: the lord named is the one actually holding the manor in
      // the marriage year — a court roll dated that year names that head of
      // the line, not the fief card's mid-register anchor.
      const merchetLord = lordOfManorAt(env.worldSeed, env.regionKey, env.villageIdx, c.year).name;
      let merchetPaid = false;
      if (p.cls === "serf" && p.sex === "F" && father && father.death.year > c.year) {
        extra = ca ? ` El seu pare va pagar a ${merchetLord} el dret per casar-la.` : ` Her father paid merchet to ${merchetLord} for licence to marry.`;
        merchetPaid = true;
      }
      if (s.incomer && p.sex === "M") {
        extra = s.origin
          ? ca
            ? ` Ella venia de ${placeNameOf(env.worldSeed, s.origin, locale)}, amb un dot de roba de lli i una vaca.`
            : ` She came from ${placeNameOf(env.worldSeed, s.origin, locale)}, with a dowry of linen and a cow.`
          : ca
            ? ` Ella venia de la parròquia veïna, amb un dot de roba de lli i una vaca.`
            : ` She came from the next parish, with a dowry of linen and a cow.`;
      }
      const older = p.sex === "F" && s.birth < p.birth - 3;
      // § nobility links: the merchet lord is clickable — to his house, not
      // to any register record (a lord has none).
      const mRefs = [nameRef(s, selfAddr)];
      if (merchetPaid) mRefs.push({ id: -1, name: merchetLord, addr: selfAddr, route: "house" });
      ev(
        c.year,
        ca
          ? `Es va casar amb ${sName}${older ? ", un home uns quants anys més gran, com era habitual" : ""}.${extra}`
          : `Married ${sName}${older ? ", a man some years older, as was usual" : ""}.${extra}`,
        "marriage",
        undefined,
        mRefs,
      );
    } else {
      // § remarriage
      ev(
        c.year,
        ca
          ? `Es va tornar a casar, amb ${sName}: una casa no es podia portar sola, i el dol durava el que durava.`
          : `Married again, to ${sName}: a household could not be run alone, and mourning lasted only as long as it could afford to.`,
        "marriage",
        undefined,
        [nameRef(s, selfAddr)],
      );
    }
  });
  if (!own && p.marriedOut) {
    const dest = p.emigrateTo;
    const destPlace = placeNameOf(env.worldSeed, dest, locale);
    const destText =
      destPlace && dest
        ? ca
          ? p.longDistance
            ? ` a ${destPlace}, a ${REGIONS[dest.regionKey].name.ca}`
            : ` a ${destPlace}`
          : p.longDistance
            ? ` to ${destPlace}, in ${REGIONS[dest.regionKey].name.en}`
            : ` to ${destPlace}`
        : "";
    if (destPerson && destUnion && destSpouse && destRecord) {
      // § canonical identity: the destination register really recorded her —
      // name the husband and the year, and let the Bio point at that record.
      ev(
        destUnion.year,
        ca
          ? `Es va casar fora de la parròquia${destText}, amb ${destSpouse.name} ${destSpouse.surname}; el registre d'aquell poble la recull des d'aleshores, i la resta de la seva vida hi queda escrita.`
          : `Married out of the parish${destText}, to ${destSpouse.name} ${destSpouse.surname}; that village's register carries her from then on, and the rest of her life is written there.`,
        "marriage",
        undefined,
        [nameRef(destSpouse, destRecord)],
      );
    } else {
      ev(
        p.birth + region.marriageF[1],
        ca
          ? `Es va casar fora de la parròquia${destText}; el seu nom surt d'aquest registre cap a un altre, i la resta de la seva vida hi queda escrita.`
          : `Married out of the parish${destText}; her name leaves this register for another, and the rest of her life is written there.`,
        "marriage",
      );
    }
  } else if (!own && p.sex === "M" && p.emigrated) {
    // § male out-migration: a non-heir who left, narrated distinctly from a
    // woman's "married out" — he may or may not have gone to marry.
    const dest = p.emigrateTo;
    const destPlace = placeNameOf(env.worldSeed, dest, locale);
    const destText =
      destPlace && dest
        ? ca
          ? p.longDistance
            ? ` cap a ${destPlace}, a ${REGIONS[dest.regionKey].name.ca}`
            : ` cap a ${destPlace}`
          : p.longDistance
            ? ` for ${destPlace}, in ${REGIONS[dest.regionKey].name.en}`
            : ` for ${destPlace}`
        : "";
    if (destPerson && destUnion && destSpouse && destRecord) {
      // § canonical identity: the destination register really recorded him.
      ev(
        destUnion.year,
        ca
          ? `Va deixar la parròquia${destText} i allà es va casar amb ${destSpouse.name} ${destSpouse.surname}; el registre d'aquell poble el recull des d'aleshores, i la resta de la seva vida hi queda escrita.`
          : `Left the parish${destText} and there married ${destSpouse.name} ${destSpouse.surname}; that village's register carries him from then on, and the rest of his life is written there.`,
        "marriage",
        undefined,
        [nameRef(destSpouse, destRecord)],
      );
    } else {
      const heir = region.inheritance === "partible" || isFirstBornSon(env, id);
      const reasons = ca
        ? [
            `Sense terra pròpia que esperar, va marxar${destText} a provar sort en un ofici.`,
            `Va entrar al seguici armat d'un senyor, i el registre no en sap dir més que va marxar.`,
            `Va anar a servir en una altra casa senyorial${destText}, no havent-hi tinença aquí per a un segon fill.`,
          ]
        : [
            `With no holding of his own to wait for, he left${destText} to try his luck at a trade.`,
            `Took service in a lord's armed retinue, and the register can say no more than that he left.`,
            `Went to serve in another manor's household${destText}, there being no tenement here for a second son.`,
          ];
      ev(
        p.birth + region.marriageM[1],
        heir || p.death.age < region.marriageM[1] + 3
          ? ca
            ? `Va marxar de la parròquia${destText}; el seu nom surt d'aquest registre cap a un altre, i la resta de la seva vida hi queda escrita.`
            : `Left the parish${destText}; his name leaves this register for another, and the rest of his life is written there.`
          : rng.pick(reasons),
        "life",
      );
    }
  } else if (!own && !p.marriedOut && !p.emigrated && p.death.age >= 30 && !p.inOrders && rng.chance(0.7)) {
    ev(
      p.birth + 30,
      ca
        ? `No es va casar mai — el registre {{el/la}} mostra a la mateixa casa any rere any, ${p.sex === "F" ? "filant i portant la casa dels seus parents" : "treballant la terra familiar"}.`
        : `Never married — the register shows ${obj} in the same household year after year, ${p.sex === "F" ? "spinning and keeping house for kin" : "labouring on the family land"}.`,
      "life",
    );
  }

  // Children — real, from the envelope
  for (const c of children) {
    const cp = plagueAt(c.birth);
    if (c.death.age === 0) {
      ev(
        c.birth,
        ca
          ? `Va néixer ${c.sex === "M" ? "un fill" : "una filla"}, ${c.name}, i va morir abans de complir l'any, ${cp && c.death.cause === "plague" ? "de la pesta que aleshores feia estralls" : "com un de cada quatre nadons"}. Enterrat{{/da}} al cementiri, sense làpida.`
          : `A ${c.sex === "M" ? "son" : "daughter"}, ${c.name}, was born — and died within the year, ${cp && c.death.cause === "plague" ? "of the pestilence then raging" : "as one in four infants did"}. Buried in the churchyard, unmarked.`,
        "grief",
        undefined,
        [nameRef(c, selfAddr, false)],
      );
    } else {
      ev(
        c.birth,
        ca
          ? `Va néixer ${c.sex === "M" ? "un fill" : "una filla"}, ${c.name}${c.death.age >= 16 ? ", que va viure" : ""}.`
          : `A ${c.sex === "M" ? "son" : "daughter"}, ${c.name}, was born${c.death.age >= 16 ? ", and lived" : ""}.`,
        "child",
        undefined,
        [nameRef(c, selfAddr, false)],
      );
      if (c.death.age < 16) {
        const cause =
          c.death.cause === "plague"
            ? ca
              ? "de la pesta"
              : "of the pestilence"
            : ca
              ? "de " + rng.pick(CHILD_DEATH_CAUSE.ca)
              : "of " + rng.pick(CHILD_DEATH_CAUSE.en);
        ev(
          c.death.year,
          ca
            ? `${c.name} va morir als ${c.death.age} anys, ${cause}. Els pares van pagar ciris a l'altar de la Mare de Déu.`
            : `${c.name} died at ${c.death.age}, ${cause}. The parents paid for candles at the altar of the Virgin.`,
          "grief",
          undefined,
          [nameRef(c, selfAddr, false)],
        );
      }
    }
  }

  // Spouse death & widowhood — real, once per union that ended in bereavement
  for (const c of unionCouples) {
    const s = spouseOf(c);
    if (s.death.year >= p.death.year) continue;
    const atHome = children.filter((k) => k.death.year > s.death.year && s.death.year - k.birth < 15 && k.birth < s.death.year).length;
    const causeTxt = ca
      ? s.death.cause === "plague"
        ? " de la pesta"
        : s.death.cause === "childbirth"
          ? " de part"
          : ""
      : s.death.cause === "plague"
        ? " of the pestilence"
        : s.death.cause === "childbirth"
          ? " in childbed"
          : "";
    ev(
      s.death.year,
      ca
        ? `${s.name} ${s.surname} va morir${causeTxt}, deixant ${p.name} {{vidu/vídua}}${atHome ? ` amb ${atHome} fills encara a casa` : ""}.`
        : `${s.name} ${s.surname} died${causeTxt}, leaving ${p.name} ${p.sex === "F" ? "a widow" : "a widower"}${atHome ? ` with ${atHome} children still at home` : ""}.`,
      "grief",
      undefined,
      [nameRef(s, selfAddr)],
    );
  }

  // Revolt
  if (region.revolt && region.revolt.year >= p.birth + 15 && region.revolt.year <= Math.min(p.death.year, p.birth + 55) && wealth <= 3 && rng.chance(0.35)) {
    const joined = rng.chance(0.55);
    const rname = region.revolt.name[locale],
      rdesc = region.revolt.desc[locale];
    ev(
      region.revolt.year,
      joined
        ? ca
          ? `Va esclatar ${rname} — ${rdesc}. ${p.name} va ser entre els qui es van revoltar, i després en va callar la resta de la seva vida, perquè les represàlies van ser dures.`
          : `${rname} broke out — ${rdesc}. ${p.name} was among those who rose, and afterwards kept quiet about it for the rest of ${pos} life, for the reprisals were savage.`
        : ca
          ? `${rname} va sacsejar el districte — ${rdesc}. ${p.name} va ajupir el cap i va tancar la porta.`
          : `${rname} swept the district — ${rdesc}. ${p.name} kept ${pos} head down and the door barred.`,
      "revolt",
      cite("chron"),
    );
  }

  // War touching the village
  for (const [a, b] of region.warYears) {
    if (b < p.birth + 6 || a > p.death.year) continue;
    if (rng.chance(0.35) && wealth <= 3) {
      const y = Math.max(a, p.birth + 6) + rng.int(0, Math.max(0, Math.min(b, p.death.year) - Math.max(a, p.birth + 6)));
      const wn = warAt(y, region, locale) || (ca ? "les guerres" : "the wars");
      const action = ca ? rng.pick(WAR_ACTION.ca) : rng.pick(WAR_ACTION.en);
      ev(
        y,
        ca
          ? `${wn.charAt(0).toUpperCase() + wn.slice(1)} va arribar a prop: uns soldats ${action}.`
          : `${wn.charAt(0).toUpperCase() + wn.slice(1)} came near: soldiers ${action}.`,
        "war",
        cite("account"),
      );
      break;
    }
  }

  // Personal texture events
  const earliestChildBirth = children.length ? Math.min(...children.map((c) => c.birth)) : null;
  function texture(pool: readonly [string, number, string | null][], lo: number, hi: number, n: number) {
    const span = Math.min(hi, p.death.age) - lo;
    if (span <= 0) return;
    let count = 0;
    for (const [tmpl, wgt, flag] of pool) {
      if (count >= n) break;
      if (flag === "englandM" && !(env.regionKey === "england" && p.sex === "M")) continue;
      // § texture marital gate: an entry that presupposes children of her
      // own (e.g. "raised them with {pos} own") must only ever be eligible
      // for someone who actually has any — otherwise it can fire for a
      // childless adult or even a celibate priest (§ occupation above
      // already excludes inOrders from having any union/children at all).
      if (flag === "hasChildren" && earliestChildBirth == null) continue;
      if (!rng.chance(wgt * 0.16)) continue;
      count++;
      // Never date it earlier than the year it's actually true: she has to
      // have a child ("her own") before she can raise one alongside it.
      const y = Math.max(p.birth + lo + rng.int(0, span), flag === "hasChildren" && earliestChildBirth != null ? earliestChildBirth : -Infinity);
      const text = tmpl
        .replace("{pos}", pos)
        .replace("{obj}", obj)
        .replace("{land}", region.landUnit[locale])
        .replace("{courtcause}", rng.pick(COURT_CAUSES[locale]));
      let src = cite("reg");
      if (flag === "court") src = cite("court");
      if (flag === "will") src = cite("will");
      if (flag === "literate") literate = true;
      ev(y, text, "life", src);
    }
  }
  texture(CHILD_EVENTS[locale], 5, 11, 2);
  texture(YOUTH_EVENTS[locale], 12, 20, 2);
  texture(ADULT_EVENTS[locale], 21, 58, 3);
  if (p.sex === "F" && own) texture(FEMALE_EVENTS[locale], 20, 45, 1);
  texture(OLD_EVENTS[locale], 58, 90, 2);

  // World events — run AFTER the texture passes above (not before): a
  // world event's text can read `literate`, and childhood literacy is only
  // ever set by the CHILD_EVENTS texture pass (ages 5-11). Reading it
  // beforehand always saw the initial `false`, so e.g. a child who WAS
  // taught letters at 5-11 could still get the illiterate-framed reaction
  // to the 1460s printing press. Narrative event ORDER in the finished
  // chronicle is unaffected either way (events.sort() below is by year,
  // not call order) — this only changes which value of `literate` this
  // block's own text-selection callback sees.
  for (const w of WORLD_EVENTS[locale]) {
    if (w[1] < p.birth + w[3] || w[0] > p.death.year) continue;
    if (w[2] && !w[2].includes(env.regionKey)) continue;
    if (rng.chance(w[4])) ev(Math.max(w[0], p.birth + w[3]), w[7](p, locale, literate), w[5], SRC[locale][w[6] as DocumentKind]);
  }

  // § nobility: royal accessions and depositions, derived from ROYAL_LINES
  // (real history, not dice) — same shape and gating as the world events
  // above, appended after them so their rng draws stay in a fixed order.
  for (const w of royalWorldEvents(locale)) {
    if (w[1] < p.birth + w[3] || w[0] > p.death.year) continue;
    if (w[2] && !w[2].includes(env.regionKey)) continue;
    if (rng.chance(w[4])) ev(Math.max(w[0], p.birth + w[3]), w[7](p, locale, literate), w[5], SRC[locale][w[6] as DocumentKind]);
  }

  // § nobility: a change of lord was parish news — homage sworn anew, the
  // relief taken, the court held under a new name. The successions are read
  // from the manor's own lord line, so every villager who mentions one
  // agrees on who died and who entered.
  {
    const line = manorLineOf(env.worldSeed, env.regionKey, env.villageIdx);
    const succ = line.heads
      .slice(1)
      .map((h, i) => ({ h, old: line.heads[i] }))
      .filter(({ h }) => h.acceded >= Math.max(p.birth + 10, 1292) && h.acceded <= p.death.year);
    if (succ.length && rng.chance(0.35)) {
      const { h, old } = rng.pick(succ);
      const died =
        old.cause === "war"
          ? ca
            ? " a la guerra del rei"
            : " in the king's wars"
          : old.cause === "plague"
            ? ca
              ? " en la mortaldat"
              : " in the pestilence"
            : "";
      ev(
        h.acceded,
        ca
          ? `El vell senyor ${old.name} morí${died}, i ${h.name} entrà en la senyoria; els tinents renovaren l'homenatge i la cort cobrà els seus drets.`
          : `The old lord ${old.name} died${died}, and ${h.name} entered the lordship; the tenants did homage anew and the court took its reliefs.`,
        "life",
        cite("court"),
        // Both lords link to the manor's house view.
        [
          { id: -1, name: old.name, addr: selfAddr, route: "house" },
          { id: -1, name: h.name, addr: selfAddr, route: "house" },
        ],
      );
    }
  }

  // Pilgrimage
  if (p.death.age >= 28 && rng.chance(0.18)) {
    const y = p.birth + rng.int(25, Math.min(55, p.death.age - 1));
    const shrine = rng.pick(region.pilgrim)[locale];
    ev(
      y,
      ca
        ? `Va anar en pelegrinatge a ${shrine}, en compliment d'un vot, i va tornar amb una insígnia de pelegrí cosida al barret.`
        : `Went on pilgrimage to ${shrine}, in fulfilment of a vow, and came home with a pilgrim badge sewn to ${pos} hat.`,
      "life",
      cite("chron"),
    );
  }

  // Death — real cause from envelope, decoded detail. A hazardous/maritime
  // trade occasionally pulls its detail from the matching occupational-
  // accident pool instead of the generic one, same "disease" cause bucket
  // the register would file it under either way, but the coroner's roll
  // (not the parish register) is what actually recorded such a death.
  const riskPool =
    p.death.cause === "disease" && (p.riskTrade === "hazardous" || p.riskTrade === "maritime") && rng.chance(0.55)
      ? RISK_DEATH_DETAIL[locale][p.riskTrade]
      : null;
  const deathPool = riskPool ?? DEATH_DETAIL[locale][p.death.cause];
  const dd = rng.pick(deathPool);
  let burialTxt: string;
  if (p.death.cause === "plague")
    burialTxt = ca
      ? "Enterrat{{/da}} de pressa, en una fossa compartida amb altres d'aquell temps de mort."
      : "Buried in haste, in a grave shared with others of that dying time.";
  else if (p.death.age === 0) burialTxt = "";
  else if (p.death.age < 12)
    burialTxt = ca ? "Enterrat{{/da}} al cementiri vora els altres fills de la família." : "Buried in the churchyard beside the other children of the family.";
  else if (wealth >= 4)
    burialTxt = ca
      ? "Enterrat{{/da}} a l'església parroquial davant l'altar, sota una llosa amb inscripció, amb misses fundades per la seva ànima."
      : "Buried in the parish church before the altar, beneath a marked stone, with masses endowed for the soul.";
  else burialTxt = rng.pick(BURIAL_PLAIN[locale]);
  const dSrc = riskPool || (p.death.cause === "disease" && CORONER_DEATHS[locale].has(dd)) ? cite("coroner") : cite("reg");
  ev(p.death.year, `${p.name} ${dd}. ${burialTxt}`, "death", dSrc);

  events.sort((a, b) => a.year - b.year || (a.kind === "birth" ? -1 : a.kind === "death" ? 1 : 0));

  // § nobility links: every sovereign named ANYWHERE in the chronicle —
  // accession news, war names, whatever prose mentions a king — links to
  // the region's royal line. Candidates are the reigns' styles, names, and
  // akas; all of them lead to the same royal-line view, so an ambiguous
  // "King Henry" can never link wrongly. Longest-match-first in the UI's
  // linkify keeps a person ref ("Lorenzo di Nardo") beating a shorter
  // royal candidate at the same position.
  addRoyalRefs(events, env.regionKey, locale, selfAddr);

  return {
    id,
    env,
    name: p.name,
    surname: p.surname,
    sex: p.sex,
    birth: p.birth,
    death: p.death,
    causeLabel: CAUSE_LABEL[locale][p.death.cause],
    cls: p.cls,
    clsLabel: CLASS_INFO[p.cls].label[locale],
    wealth,
    place: env.place[locale],
    region: region.name[locale],
    sovereign: sovereignAt(env.regionKey, p.birth)?.style[locale] ?? "",
    literate,
    inOrders: !!p.inOrders,
    incomer: !!p.incomer,
    founder: !!p.founder,
    marriedOut: !!p.marriedOut,
    originPlace: p.incomer && p.origin ? placeNameOf(env.worldSeed, p.origin, locale) : null,
    jurisdiction,
    fief,
    father: father
      ? {
          id: father.id,
          name: father.name + " " + father.surname,
          dead: father.death,
          birth: father.birth,
          death: father.death,
          addr: fatherAddr,
          foreign: fatherAddr !== selfAddr,
        }
      : null,
    mother: mother
      ? {
          id: mother.id,
          name: mother.name + " " + mother.surname,
          dead: mother.death,
          birth: mother.birth,
          death: mother.death,
          addr: motherAddr,
          foreign: motherAddr !== selfAddr,
        }
      : null,
    fatherOccupation: fatherOccText,
    occupation,
    siblings: siblings.map((s) => ({ id: s.id, name: s.name, sex: s.sex, birth: s.birth, death: s.death, addr: selfAddr })),
    spouse:
      destSpouse && destRecord
        ? spouseRefOf(destSpouse, destRecord, env.worldSeed, locale)
        : spouse
          ? spouseRefOf(spouse, selfAddr, env.worldSeed, locale)
          : null,
    marriageYear: destUnion ? destUnion.year : own ? own.year : null,
    unions:
      destUnion && destSpouse && destRecord
        ? [unionRefOf(destUnion, destSpouse, destChildren, destRecord, env.worldSeed, locale)]
        : unionCouples.map((c) =>
            unionRefOf(
              c,
              spouseOf(c),
              c.children.map((cid) => env.persons[cid]),
              selfAddr,
              env.worldSeed,
              locale,
            ),
          ),
    children:
      destUnion && destRecord
        ? destChildren.map((c) => ({ id: c.id, name: c.name, sex: c.sex, birth: c.birth, death: c.death, addr: addrOnly(destRecord) }))
        : children.map((c) => ({ id: c.id, name: c.name, sex: c.sex, birth: c.birth, death: c.death, addr: selfAddr })),
    destRecord,
    events,
    widowed: widowedUnions.length,
    plaguesLived: PLAGUES.filter(
      (pl) => pl[0] >= p.birth && pl[1] <= p.death.year && !(p.death.cause === "plague" && p.death.year >= pl[0] && p.death.year <= pl[1]),
    ).length,
  };
}

// § nobility links: see the call site in decodePerson. Kept as a plain
// module function — it reads only ROYAL_LINES data, never the rng.
function addRoyalRefs(events: BioEvent[], regionKey: string, locale: Locale, addr: Address): void {
  const line = royalLineOf(regionKey);
  if (!line) return;
  const candidates = new Set<string>();
  for (const r of line.reigns) {
    candidates.add(r.style[locale]);
    candidates.add(r.name[locale]);
    for (const aka of r.aka ?? []) candidates.add(aka[locale]);
  }
  for (const e of events) {
    const extra: EventRef[] = [];
    for (const name of candidates) if (e.text.includes(name)) extra.push({ id: -1, name, addr, route: "royal" });
    if (extra.length) e.refs = [...(e.refs ?? []), ...extra];
  }
}

// Father's occupation, decoded from the FATHER's own envelope address so all
// siblings agree on it (upward dependency only) — and, for an immigrant,
// from her ORIGIN envelope, since that's the manor her father actually held
// land of, not the destination's.
export function fatherOccupation(env: Envelope, fatherId: number, locale: Locale): string | null {
  if (fatherId < 0) return null;
  const f = env.persons[fatherId];
  const rng = makeRng(personStream(env.vHash, 60000, fatherId));
  // § nobility: the lord he held of is the head of the manor's line in his
  // own working prime, not the fief card's mid-register anchor.
  const lord = lordOfManorAt(env.worldSeed, env.regionKey, env.villageIdx, Math.min(f.death.year, f.birth + 30)).name;
  return rng
    .pick(FATHER_OCC[locale][f.cls])
    .replace("{land}", rng.int(CLASS_INFO[f.cls].wealth >= 2 ? 12 : 5, CLASS_INFO[f.cls].wealth >= 2 ? 40 : 15) + " " + env.region.landUnit[locale])
    .replace("{craft}", rng.pick(CRAFTS[locale]))
    .replace(/\{lord\}/g, lord);
}
