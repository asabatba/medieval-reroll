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
  COURT_CAUSES,
  DEATH_DETAIL,
  FATHER_OCC,
  FEMALE_EVENTS,
  OLD_EVENTS,
  SRC,
  WORLD_EVENTS,
  YOUTH_EVENTS,
} from "./data/narrative.js";
import { PLAGUES, plagueAt } from "./data/plagues.js";
import { REGIONS } from "./data/regions.js";
import { citeDocument } from "./documents.js";
import { makeRng, mix } from "./hash.js";
import { manorOf, parishOf } from "./hierarchy.js";
import { famineAt, warAt } from "./mortality.js";
import type { Address, Bio, BioEvent, DocumentKind, Envelope, Person, Sex, SocialClass } from "./types.js";
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
}
const OCCUPATIONS: Record<Locale, Record<SocialClass, Record<Sex, OccEntry[]>>> = {
  en: {
    serf: {
      M: [
        { text: "worked his father's servile holding, and inherited its bondage with its land" },
        { text: "laboured on the lord's demesne as a ploughman" },
        { text: "kept the lord's sheep as a shepherd" },
      ],
      F: [{ text: "worked the holding, the dairy, and the harvest alongside the family" }, { text: "went into service at the manor house at twelve" }],
    },
    freePeasant: {
      M: [{ text: "farmed the family holding" }, { text: "worked as the village {craft}" }, { text: "leased extra strips and prospered as a yeoman" }],
      F: [{ text: "ran the dairy, the poultry, the garden, and the brewing" }, { text: "went into service in a townhouse at fourteen" }],
    },
    artisan: {
      M: [{ text: "was apprenticed to the family trade of {craft} and in time kept the shop" }, { text: "became a journeyman {craft}" }],
      F: [
        { text: "worked in the family workshop, minding the shop and the accounts" },
        { text: "carried on the workshop in widowhood, with journeymen under her" },
      ],
    },
    merchant: {
      M: [{ text: "rode to the fairs with the family's cloth and kept the books", literate: true }],
      F: [{ text: "kept the shop and the books when her husband travelled", literate: true }],
    },
    clergyFamily: {
      M: [{ text: "was taught his letters and became a clerk", literate: true }],
      F: [{ text: "was taught to read her psalter, unusual for a girl", literate: true }],
    },
    gentry: {
      M: [{ text: "was raised to arms and the management of the estate" }, { text: "studied law and served at the sessions", literate: true }],
      F: [{ text: "was raised to needlework, estate accounts, and the marriage market" }, { text: "ran the manor entirely during her husband's absences" }],
    },
  },
  ca: {
    serf: {
      M: [
        { text: "va treballar l'explotació servil del seu pare, i en va heretar la servitud amb la terra" },
        { text: "va llaurar el domini del senyor com a bover" },
        { text: "va guardar les ovelles del senyor com a pastor" },
      ],
      F: [
        { text: "va treballar l'explotació, la lleteria i la collita al costat de la família" },
        { text: "va entrar a servir a la casa senyorial als dotze anys" },
      ],
    },
    freePeasant: {
      M: [
        { text: "va conrear l'explotació familiar" },
        { text: "va treballar com a {craft} del poble" },
        { text: "va arrendar terres addicionals i va prosperar com a pagès benestant" },
      ],
      F: [{ text: "va portar la lleteria, els corrals, l'hort i la cervesa" }, { text: "va entrar a servir en una casa de vila als catorze anys" }],
    },
    artisan: {
      M: [{ text: "va aprendre l'ofici familiar de {craft} i amb el temps va portar el taller" }, { text: "es va fer oficial {craft}" }],
      F: [
        { text: "va treballar al taller familiar, cuidant la botiga i els comptes" },
        { text: "va portar el taller en la viduïtat, amb oficials al seu càrrec" },
      ],
    },
    merchant: {
      M: [{ text: "va anar a les fires amb els draps de la família i en va portar els comptes", literate: true }],
      F: [{ text: "va portar la botiga i els comptes quan el seu marit viatjava", literate: true }],
    },
    clergyFamily: {
      M: [{ text: "va aprendre les lletres i es va fer clergue", literate: true }],
      F: [{ text: "va aprendre a llegir el seu saltiri, cosa poc habitual en una noia", literate: true }],
    },
    gentry: {
      M: [{ text: "va ser format en les armes i el govern de l'hisenda" }, { text: "va estudiar dret i va servir a les sessions", literate: true }],
      F: [
        { text: "va ser formada en la brodadora, els comptes de l'hisenda i el mercat matrimonial" },
        { text: "va portar tot el senyoriu durant les absències del marit" },
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
function placeNameOf(addr: Address | null | undefined, locale: Locale): string | null {
  if (!addr) return null;
  const region = REGIONS[addr.regionKey];
  if (!region) return null;
  return region.places[addr.villageIdx % region.places.length][locale];
}

export function decodePerson(env: Envelope, id: number, locale: Locale): Bio | null {
  const p = env.persons[id];
  if (!p) return null;
  const region = env.region;
  const pHash = mix(env.vHash, 40000 + id);
  const rng = makeRng(pHash);
  const wealth = CLASS_INFO[p.cls].wealth;
  const pos = p.sex === "M" ? "his" : "her";
  const obj = p.sex === "M" ? "him" : "her";
  const selfAddr: Address = { regionKey: env.regionKey, villageIdx: env.villageIdx };
  const ca = locale === "ca";

  // Overlapping hierarchies (§10): independent of the civil village tree,
  // resolved fresh here — cheap, non-recursive, no memo needed.
  const jurisdiction = parishOf(env.worldSeed, env.regionKey, env.villageIdx, locale);
  const fief = manorOf(env.worldSeed, env.regionKey, env.villageIdx, locale);
  const cite = (kind: DocumentKind) => citeDocument(kind, { jurisdiction, fief, place: env.place[locale] }, locale);

  // --- family lookups (all from the envelope; symmetric by construction) ---
  let father: Person | null = p.father >= 0 ? env.persons[p.father] : null;
  let mother: Person | null = p.mother >= 0 ? env.persons[p.mother] : null;
  let fatherAddr = selfAddr,
    motherAddr = selfAddr;
  let fatherEnvForOcc: Envelope | null = father ? env : null;
  let fatherIdForOcc: number | null = father ? father.id : null;

  // An immigrant's local record has no local parents (father/mother = -1),
  // but a real originAddr points at the lower-rank village that DOES —
  // read it, don't invent it.
  if (!father && p.incomer && p.origin && p.originId != null) {
    const originEnv = resolveVillage(env.worldSeed, p.origin.regionKey, p.origin.villageIdx); // lower rank: safe
    const originPerson = originEnv.persons[p.originId];
    if (originPerson) {
      if (originPerson.father >= 0) {
        father = originEnv.persons[originPerson.father];
        fatherAddr = p.origin;
        fatherEnvForOcc = originEnv;
        fatherIdForOcc = originPerson.father;
      }
      if (originPerson.mother >= 0) {
        mother = originEnv.persons[originPerson.mother];
        motherAddr = p.origin;
      }
    }
  }
  const fatherOccText = fatherEnvForOcc && fatherIdForOcc != null ? fatherOccupation(fatherEnvForOcc, fatherIdForOcc, locale) : null;

  const natal = p.father >= 0 ? env.couples[env.coupleOf[p.father]] : null;
  const siblings = natal ? natal.children.filter((cid) => cid !== id).map((cid) => env.persons[cid]) : [];
  const own = p.spouse != null ? env.couples[env.coupleOf[id]] : null;
  const spouse = p.spouse != null ? env.persons[p.spouse] : null;
  const children = own ? own.children.map((cid) => env.persons[cid]) : [];

  const events: BioEvent[] = [];
  const ev = (year: number, text: string, kind: string, src?: string) => {
    if (year <= p.death.year) events.push({ year, age: year - p.birth, text: gender(text, p.sex), kind, src: src || cite("reg") });
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
        ? `Va néixer a ${placeNameOf(p.origin, locale)}; la seva família consta al registre d'aquell poble. Entra en aquest amb el seu casament.`
        : `Born in ${placeNameOf(p.origin, locale)}; her people are entered in that village's own register. She comes into this one on her marriage.`,
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
    );
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

  // Occupation
  if (p.death.age >= 12 && !p.inOrders) {
    const pool = OCCUPATIONS[locale][p.cls][p.sex];
    const occ = rng.pick(pool);
    const craft = rng.pick(CRAFTS[locale]);
    const occText = occ.text.replace("{craft}", craft);
    p.occupation = occText;
    if (occ.literate) p.literate = true;
    ev(p.birth + 13, `${p.name} ${occText}.`, "life");
  }
  if (p.inOrders) {
    p.literate = true;
    ev(
      p.birth + 14,
      ca
        ? `Va ser destinat a l'Església: va aprendre llatí del capellà de la parròquia, va rebre la tonsura, i amb el temps va prendre els ordes. Va servir com a capellà de capellania, cantant misses pels morts dels anys de pesta.`
        : `Was marked out for the Church: learned Latin from the parish priest, was tonsured, and in time took orders. Served as a chantry priest, singing masses for the dead of the plague years.`,
      "life",
    );
  }

  // Marriage — real spouse from the matching
  if (own && spouse) {
    const sName = spouse.name + " " + spouse.surname;
    let extra = "";
    if (p.cls === "serf" && p.sex === "F")
      extra = ca ? ` El seu pare va pagar a ${fief.lord} el dret per casar-la.` : ` Her father paid merchet to ${fief.lord} for licence to marry.`;
    if (spouse.incomer && p.sex === "M") {
      extra = spouse.origin
        ? ca
          ? ` Ella venia de ${placeNameOf(spouse.origin, locale)}, amb un dot de roba de lli i una vaca.`
          : ` She came from ${placeNameOf(spouse.origin, locale)}, with a dowry of linen and a cow.`
        : ca
          ? ` Ella venia de la parròquia veïna, amb un dot de roba de lli i una vaca.`
          : ` She came from the next parish, with a dowry of linen and a cow.`;
    }
    const older = p.sex === "F" && spouse.birth < p.birth - 3;
    ev(
      own.year,
      ca
        ? `Es va casar amb ${sName}${older ? ", un home uns quants anys més gran, com era habitual" : ""}.${extra}`
        : `Married ${sName}${older ? ", a man some years older, as was usual" : ""}.${extra}`,
      "marriage",
    );
  } else if (p.marriedOut) {
    const dest = p.emigrateTo;
    const destPlace = placeNameOf(dest, locale);
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
    ev(
      p.birth + region.marriageF[1],
      ca
        ? `Es va casar fora de la parròquia${destText}; el seu nom surt d'aquest registre cap a un altre, i la resta de la seva vida hi queda escrita.`
        : `Married out of the parish${destText}; her name leaves this register for another, and the rest of her life is written there.`,
      "marriage",
    );
  } else if (p.death.age >= 30 && !p.inOrders && rng.chance(0.7)) {
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
      );
    } else {
      ev(
        c.birth,
        ca
          ? `Va néixer ${c.sex === "M" ? "un fill" : "una filla"}, ${c.name}${c.death.age >= 16 ? ", que va viure" : ""}.`
          : `A ${c.sex === "M" ? "son" : "daughter"}, ${c.name}, was born${c.death.age >= 16 ? ", and lived" : ""}.`,
        "child",
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
        );
      }
    }
  }

  // Spouse death & widowhood — real
  if (spouse && spouse.death.year < p.death.year) {
    const atHome = children.filter((c) => c.death.year > spouse.death.year && spouse.death.year - c.birth < 15 && c.birth < spouse.death.year).length;
    const causeTxt = ca
      ? spouse.death.cause === "plague"
        ? " de la pesta"
        : spouse.death.cause === "childbirth"
          ? " de part"
          : ""
      : spouse.death.cause === "plague"
        ? " of the pestilence"
        : spouse.death.cause === "childbirth"
          ? " in childbed"
          : "";
    ev(
      spouse.death.year,
      ca
        ? `${spouse.name} ${spouse.surname} va morir${causeTxt}, deixant ${p.name} {{vidu/vídua}}${atHome ? ` amb ${atHome} fills encara a casa` : ""}.`
        : `${spouse.name} ${spouse.surname} died${causeTxt}, leaving ${p.name} ${p.sex === "F" ? "a widow" : "a widower"}${atHome ? ` with ${atHome} children still at home` : ""}.`,
      "grief",
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

  // World events
  for (const w of WORLD_EVENTS[locale]) {
    if (w[1] < p.birth + w[3] || w[0] > p.death.year) continue;
    if (w[2] && !w[2].includes(env.regionKey)) continue;
    if (rng.chance(w[4])) ev(Math.max(w[0], p.birth + w[3]), w[7](p, locale), w[5], SRC[locale][w[6] as DocumentKind]);
  }

  // Personal texture events
  function texture(pool: readonly [string, number, string | null][], lo: number, hi: number, n: number) {
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
      const text = tmpl
        .replace("{pos}", pos)
        .replace("{obj}", obj)
        .replace("{land}", region.landUnit[locale])
        .replace("{courtcause}", rng.pick(COURT_CAUSES[locale]));
      let src = cite("reg");
      if (flag === "court") src = cite("court");
      if (flag === "will") src = cite("will");
      if (flag === "literate") p.literate = true;
      ev(y, text, "life", src);
    }
  }
  texture(CHILD_EVENTS[locale], 5, 11, 2);
  texture(YOUTH_EVENTS[locale], 12, 20, 2);
  texture(ADULT_EVENTS[locale], 21, 58, 3);
  if (p.sex === "F" && own) texture(FEMALE_EVENTS[locale], 20, 45, 1);
  texture(OLD_EVENTS[locale], 58, 90, 2);

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

  // Death — real cause from envelope, decoded detail
  const deathPool = DEATH_DETAIL[locale][p.death.cause];
  const ddIdx = rng.int(0, deathPool.length - 1);
  const dd = deathPool[ddIdx];
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
  const dSrc = p.death.cause === "disease" && (ddIdx === 5 || ddIdx === 6) ? cite("coroner") : cite("reg");
  ev(p.death.year, `${p.name} ${dd}. ${burialTxt}`, "death", dSrc);

  events.sort((a, b) => a.year - b.year || (a.kind === "birth" ? -1 : a.kind === "death" ? 1 : 0));

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
    literate: !!p.literate,
    inOrders: !!p.inOrders,
    incomer: !!p.incomer,
    founder: !!p.founder,
    marriedOut: !!p.marriedOut,
    originPlace: p.incomer && p.origin ? placeNameOf(p.origin, locale) : null,
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
    siblings: siblings.map((s) => ({ id: s.id, name: s.name, sex: s.sex, birth: s.birth, death: s.death, addr: selfAddr })),
    spouse: spouse
      ? {
          id: spouse.id,
          name: spouse.name + " " + spouse.surname,
          birth: spouse.birth,
          death: spouse.death,
          incomer: !!spouse.incomer,
          addr: selfAddr,
          originPlace: spouse.incomer && spouse.origin ? placeNameOf(spouse.origin, locale) : null,
        }
      : null,
    marriageYear: own ? own.year : null,
    children: children.map((c) => ({ id: c.id, name: c.name, sex: c.sex, birth: c.birth, death: c.death, addr: selfAddr })),
    events,
    widowed: spouse && spouse.death.year < p.death.year ? 1 : 0,
    plaguesLived: PLAGUES.filter(
      (pl) => pl[0] >= p.birth && pl[1] <= p.death.year && !(p.death.cause === "plague" && p.death.year >= pl[0] && p.death.year <= pl[1]),
    ).length,
  };
}

// Father's occupation, decoded from the FATHER's own envelope address so all
// siblings agree on it (upward dependency only) — and, for an immigrant,
// from her ORIGIN envelope, since that's the manor her father actually held
// land of, not the destination's.
export function fatherOccupation(env: Envelope, fatherId: number, locale: Locale): string | null {
  if (fatherId < 0) return null;
  const f = env.persons[fatherId];
  const rng = makeRng(mix(env.vHash, 60000 + fatherId));
  const fief = manorOf(env.worldSeed, env.regionKey, env.villageIdx, locale);
  return rng
    .pick(FATHER_OCC[locale][f.cls])
    .replace("{land}", rng.int(CLASS_INFO[f.cls].wealth >= 2 ? 12 : 5, CLASS_INFO[f.cls].wealth >= 2 ? 40 : 15) + " " + env.region.landUnit[locale])
    .replace("{craft}", rng.pick(CRAFTS[locale]))
    .replace(/\{lord\}/g, fief.lord);
}
