import type { Locale } from "./locale.js";

interface UiStrings {
  brandSuffix: string;
  seedboxPlaceholder: string;
  seedboxLabel: string;
  seedboxTitle: string;
  openRecord: string;
  openRecordTitle: string;
  rollALife: string;
  newWorld: string;
  newWorldTitle: string;
  worldSeed: (seed: number) => string;
  locatorError: string;
  recordOpened: (name: string) => string;
  intro: string;
  trail: string;
  record: string;
  born: string;
  died: string;
  causeOfDeath: string;
  estate: string;
  region: string;
  children: string;
  bornRaised: (n: number, raised: number) => string;
  noneInOrders: string;
  inAnotherRegister: string;
  none: string;
  jurisdictions: string;
  parish: string;
  deanery: string;
  diocese: string;
  manor: string;
  honour: string;
  lord: string;
  parentage: string;
  father: string;
  mother: string;
  ofPlace: (place: string) => string;
  ofAnotherParish: string;
  beforeRegister: string;
  fatherIncomerNote: string;
  fatherBeforeNote: string;
  motherIncomerNote: string;
  motherChildbedNote: string;
  motherRaisedNote: string;
  openHisRecord: string;
  openHerRecord: string;
  siblingsHeader: (n: number, dead: number) => string;
  brother: string;
  sister: string;
  chronicle: string;
  marriageIssue: string;
  wife: string;
  husband: string;
  marriedAbbr: (year: number) => string;
  fromPlace: (place: string) => string;
  son: string;
  daughter: string;
  parishRegisterHeader: (n: number, place: string) => string;
  founderTag: string;
  incomerTag: string;
  emigratedTag: string;
  ledger: (age: number, plagues: number, widowed: boolean, literate: boolean) => string;
  // ---- village-in-year view (§ year layer) ----
  villageHeader: (place: string) => string;
  yearLabel: string;
  hearthCount: (souls: number, hearths: number) => string;
  headTag: string;
  widowTag: string;
  widowerTag: string;
  kinTag: string;
  serviceTag: string;
  ordersTag: string;
  manorHouse: string;
  churchHouse: string;
  orphanTag: string;
  emptyYear: string;
  famineBadge: string;
  warBadge: (name: string) => string;
  // ---- family tree (§ one-step tree: parents / self+siblings+spouses / children) ----
  familyTree: string;
  self: (sex: "M" | "F") => string;
}

export const UI: Record<Locale, UiStrings> = {
  en: {
    brandSuffix: "REROLL",
    seedboxPlaceholder: "record locator",
    seedboxLabel: "Record locator",
    seedboxTitle: "worldseed:region:village:person",
    openRecord: "Open record",
    openRecordTitle: "Open this exact record",
    rollALife: "Another life",
    newWorld: "New world",
    newWorldTitle: "Generate a new world, then open a life within it",
    worldSeed: (seed) => `World ${seed}`,
    locatorError: "Enter a locator in the form worldseed:region:village:person.",
    recordOpened: (name) => `Opened the record of ${name}.`,
    intro:
      "Every soul in this world already exists at a fixed address — <b>world · region · village · person</b> — waiting to be decoded. Roll to open one register at random, then follow the connections: every spouse, sibling, parent, and child is a real entry in the same records, and every path through them agrees. The odds are the historical ones; the ink was dry before you arrived.",
    trail: "Trail",
    record: "Record",
    born: "Born",
    died: "Died",
    causeOfDeath: "Cause of death",
    estate: "Estate",
    region: "Region",
    children: "Children",
    bornRaised: (n: number, raised: number) => `${n} born · ${raised} raised`,
    noneInOrders: "None — in orders",
    inAnotherRegister: "In another register",
    none: "None",
    jurisdictions: "Jurisdictions",
    parish: "Parish",
    deanery: "Deanery",
    diocese: "Diocese",
    manor: "Manor",
    honour: "Honour",
    lord: "Lord",
    parentage: "Parentage",
    father: "Father",
    mother: "Mother",
    ofPlace: (place: string) => ` · of ${place}`,
    ofAnotherParish: "Of another parish",
    beforeRegister: "Before the register",
    fatherIncomerNote: "Her people are entered in the register of the next parish, which does not survive.",
    fatherBeforeNote: "The register begins after his time; only the name of the line remains.",
    motherIncomerNote: "Nothing more is written of her here.",
    motherChildbedNote: "Died in childbed — the register marks her burial in the same week as a baptism.",
    motherRaisedNote: "Bore and raised the children of the house through the years the register records.",
    openHisRecord: "Open his record →",
    openHerRecord: "Open her record →",
    siblingsHeader: (n: number, dead: number) => `Siblings — ${n}${dead ? `, of whom ${dead} died young` : ""}`,
    brother: "Brother",
    sister: "Sister",
    chronicle: "The chronicle",
    marriageIssue: "Marriage & issue",
    wife: "Wife",
    husband: "Husband",
    marriedAbbr: (year: number) => `m. ${year}`,
    fromPlace: (place: string) => ` · from ${place}`,
    son: "Son",
    daughter: "Daughter",
    parishRegisterHeader: (n: number, place: string) => `The full parish register — ${n} souls, ${place}`,
    founderTag: " (founder)",
    incomerTag: " (incomer)",
    emigratedTag: " (removed elsewhere)",
    ledger: (age: number, plagues: number, widowed: boolean, literate: boolean) =>
      `lifespan <b>${age} years</b> · plagues lived through <b>${plagues}</b> · widowed <b>${widowed ? "yes" : "no"}</b> · literate <b>${literate ? "yes" : "no"}</b>`,
    villageHeader: (place: string) => `Visit ${place} through the years`,
    yearLabel: "Anno Domini",
    hearthCount: (souls: number, hearths: number) => `${souls} souls · ${hearths} hearths`,
    headTag: "head",
    widowTag: "widow",
    widowerTag: "widower",
    kinTag: "kin",
    serviceTag: "in service",
    ordersTag: "in orders",
    manorHouse: "The manor — servants & apprentices",
    churchHouse: "The church",
    orphanTag: "orphaned kin",
    emptyYear: "No one is yet entered in this register.",
    famineBadge: "famine",
    warBadge: (name: string) => name,
    familyTree: "Family tree",
    self: (sex) => (sex === "F" ? "Herself" : "Himself"),
  },
  ca: {
    brandSuffix: "REROLL",
    seedboxPlaceholder: "localitzador de registre",
    seedboxLabel: "Localitzador de registre",
    seedboxTitle: "llavordelmón:regió:poble:persona",
    openRecord: "Obre el registre",
    openRecordTitle: "Obre exactament aquest registre",
    rollALife: "Una altra vida",
    newWorld: "Món nou",
    newWorldTitle: "Genera un món nou i obre-hi una vida",
    worldSeed: (seed) => `Món ${seed}`,
    locatorError: "Introdueix un localitzador amb el format llavordelmón:regió:poble:persona.",
    recordOpened: (name) => `S'ha obert el registre de ${name}.`,
    intro:
      "Cada ànima d'aquest món ja existeix en una adreça fixa — <b>món · regió · poble · persona</b> — a l'espera de ser desxifrada. Tira els daus per obrir un registre a l'atzar, i després segueix les connexions: cada cònjuge, germà, pare i fill és una entrada real en els mateixos registres, i qualsevol camí entre ells hi concorda. Les probabilitats són les històriques; la tinta ja era seca abans que hi arribessis.",
    trail: "Camí",
    record: "Registre",
    born: "Naixement",
    died: "Defunció",
    causeOfDeath: "Causa de la mort",
    estate: "Estament",
    region: "Regió",
    children: "Fills",
    bornRaised: (n: number, raised: number) => `${n} nascuts · ${raised} criats`,
    noneInOrders: "Cap — en ordes",
    inAnotherRegister: "En un altre registre",
    none: "Cap",
    jurisdictions: "Jurisdiccions",
    parish: "Parròquia",
    deanery: "Deganat",
    diocese: "Bisbat",
    manor: "Senyoriu",
    honour: "Honor",
    lord: "Senyor",
    parentage: "Filiació",
    father: "Pare",
    mother: "Mare",
    ofPlace: (place: string) => ` · de ${place}`,
    ofAnotherParish: "D'una altra parròquia",
    beforeRegister: "Abans del registre",
    fatherIncomerNote: "La seva família consta al registre de la parròquia veïna, que no s'ha conservat.",
    fatherBeforeNote: "El registre comença després del seu temps; només en queda el nom del llinatge.",
    motherIncomerNote: "Aquí no se n'escriu res més.",
    motherChildbedNote: "Va morir de part — el registre marca el seu enterrament la mateixa setmana que un bateig.",
    motherRaisedNote: "Va infantar i criar els fills de la casa durant els anys que el registre recull.",
    openHisRecord: "Obre el seu registre →",
    openHerRecord: "Obre el seu registre →",
    siblingsHeader: (n: number, dead: number) => `Germans — ${n}${dead ? `, dels quals ${dead} van morir joves` : ""}`,
    brother: "Germà",
    sister: "Germana",
    chronicle: "La crònica",
    marriageIssue: "Casament i descendència",
    wife: "Esposa",
    husband: "Espòs",
    marriedAbbr: (year: number) => `c. ${year}`,
    fromPlace: (place: string) => ` · de ${place}`,
    son: "Fill",
    daughter: "Filla",
    parishRegisterHeader: (n: number, place: string) => `El registre parroquial complet — ${n} ànimes, ${place}`,
    founderTag: " (fundador)",
    incomerTag: " (nouvingut)",
    emigratedTag: " (traslladat)",
    ledger: (age: number, plagues: number, widowed: boolean, literate: boolean) =>
      `durada de vida <b>${age} anys</b> · pestes viscudes <b>${plagues}</b> · vidu/vídua <b>${widowed ? "sí" : "no"}</b> · alfabetitzat <b>${literate ? "sí" : "no"}</b>`,
    villageHeader: (place: string) => `Visita ${place} a través dels anys`,
    yearLabel: "Anno Domini",
    hearthCount: (souls: number, hearths: number) => `${souls} ànimes · ${hearths} focs`,
    headTag: "cap de casa",
    widowTag: "vídua",
    widowerTag: "vidu",
    kinTag: "parent",
    serviceTag: "servint",
    ordersTag: "en ordes",
    manorHouse: "La casa senyorial — criats i aprenents",
    churchHouse: "L'església",
    orphanTag: "orfes",
    emptyYear: "Encara no hi ha ningú inscrit en aquest registre.",
    famineBadge: "fam",
    warBadge: (name: string) => name,
    familyTree: "Arbre genealògic",
    self: (sex) => (sex === "F" ? "Ella mateixa" : "Ell mateix"),
  },
};
