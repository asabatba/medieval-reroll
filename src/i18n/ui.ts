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
  sovereign: string;
  royalLineHeader: (title: string) => string;
  reignedInLifetime: string;
  reignsHeader: string;
  houseOf: (surname: string) => string;
  lordsOfHeader: string;
  honourHouseHeader: string;
  tenureRelation: Record<"founder" | "son" | "brother" | "nephew", string>;
  tenureCause: Record<"war" | "plague" | "oldage", string>;
  reignedLabel: string;
  houseLabel: string;
  predecessor: string;
  successor: string;
  reignChronicle: string;
  reignEnd: Record<"died" | "deposed" | "killed", (year: number) => string>;
  tenureLabel: string;
  successionLabel: string;
  sovereignsOfTime: string;
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
  // ---- § population curve ----
  chartPeak: (souls: number, year: number) => string;
  chartLow: (souls: number, year: number) => string;
  /** `from`/`to` are passed in rather than read from render.ts's own
   * VILLAGE_YEAR_MIN/MAX: render.ts imports this file, so importing back
   * would close a cycle. */
  chartAria: (place: string, from: number, to: number, peak: number, peakYear: number, low: number, lowYear: number) => string;
  headTag: string;
  widowTag: string;
  widowerTag: string;
  kinTag: string;
  /** § stem family: the head's own widowed parent, living in the heir's house. */
  fatherTag: string;
  motherTag: string;
  serviceTag: string;
  ordersTag: string;
  /** § the celibate estate: a woman in religion, as against a man in orders. */
  veiledTag: string;
  manorHouse: string;
  churchHouse: string;
  orphanTag: string;
  emptyYear: string;
  famineBadge: string;
  warBadge: (name: string) => string;
  // ---- § the village route: the village as a record of its own ----
  /** The place's own page heading — "Elmleigh, Kent", the register's subject. */
  settlementRural: string;
  settlementUrban: string;
  holdingsLabel: string;
  /** "17 tenements · 13 in cultivation by 1470" — the land the whole
   * preventive check is measured against (engine/capacity.ts). */
  holdingsValue: (stock: number, cultivated: number, year: number) => string;
  peakLabel: string;
  peakValue: (souls: number, year: number) => string;
  registerSpan: string;
  registerSpanValue: (from: number, to: number) => string;
  openVillage: string;
  // ---- § the parish route: the ecclesiastical tree, walkable ----
  province: string;
  parishOfHeader: (parish: string) => string;
  deaneryOfHeader: (deanery: string) => string;
  dioceseOfHeader: (diocese: string) => string;
  /** The shared-parish case: several villages under one mother church. */
  sharedParishNote: (mother: string, n: number) => string;
  ownParishNote: (place: string) => string;
  villagesInParish: string;
  parishesInDeanery: string;
  deaneriesInDiocese: string;
  motherChurchTag: string;
  chapelryTag: string;
  /** A deanery's parishes run on as far as the village address space does, so
   * that one page says how far it actually walked. (The diocese level needs no
   * such caveat — its deaneries are a fixed list, enumerated exactly.) */
  visitationNote: (villages: number) => string;
  /** How many parishes of a deanery the same visitation window turned up. */
  parishesFound: (n: number) => string;
  soulsOnRegister: (n: number) => string;
  // ---- § the Schism: the papal series a region actually obeyed ----
  pontiff: string;
  /** The honest answer where the region obeyed nobody, or the see stood empty. */
  noPontiff: string;
  papalSeriesHeader: (region: string) => string;
  pontificatesHeader: string;
  obedienceLabel: string;
  seatLabel: string;
  seatName: Record<"rome" | "avignon" | "pisa", string>;
  lineName: Record<"roman" | "avignon" | "pisan", string>;
  sedeVacante: string;
  noObedienceTerm: string;
  pontificateEnd: Record<"died" | "resigned" | "deposed", string>;
  heldSeeLabel: string;
  jubileeTag: string;
  jubileesInPontificate: string;
  obeyedHere: string;
  schismNote: string;
  // ---- § the church's own line: the parish incumbents ----
  incumbentTitle: Record<"rector" | "vicar", string>;
  incumbentsHeader: string;
  institutedLabel: string;
  incumbencyLabel: string;
  incumbencyEnd: Record<"died" | "plague" | "resigned" | "exchanged", string>;
  appropriatedNote: (saint: string) => string;
  rectoryNote: string;
  presentedByLabel: string;
  servingInYear: string;
  clergyPlagueNote: (year: number, n: number) => string;
  // ---- U1: finding a person in the register ----
  registerFilterLabel: string;
  registerFilterPlaceholder: string;
  registerFilterEmpty: string;
  registerFilterCount: (shown: number, total: number) => string;
  // ---- U4: the locator is the record; make it takeable ----
  copyLocator: string;
  copyLocatorDone: string;
  // ---- § the season: dating the register to the day ----
  /** Full month names, January first. */
  months: string[];
  /** Short forms, for the chronicle's narrow date column. */
  monthsShort: string[];
  /** "3 February 1361" / "3 de febrer de 1361". */
  fullDate: (day: number, month: number, year: number) => string;
  /** "3 Feb" — the chronicle column, where the year is already alongside. */
  shortDate: (day: number, month: number) => string;
  /** The feast the day fell on, as people would actually have named it. */
  onFeast: (feast: string) => string;
  seasonHeader: string;
  seasonNote: string;
  marriagesByMonth: string;
  burialsByMonth: string;
  closedSeasonLabel: string;
  monthCount: (month: string, n: number) => string;
  easterOf: (year: number, day: number, month: string) => string;
  // ---- § the tenement: the ground itself as a record ----
  tenementSize: Record<"virgate" | "halfVirgate" | "cottage" | "toft", string>;
  tenementNamed: (surname: string) => string;
  tenementUnnamed: (n: number) => string;
  acresOf: (n: number, unit: string) => string;
  tenementLandLabel: string;
  tenementHoldersLabel: string;
  tenementStandingLabel: string;
  tenementHolders: string;
  tenementNote: string;
  tenementVacant: (years: number) => string;
  tenementNeverHeld: string;
  childrenBorne: (n: number) => string;
  tenantryHeader: (n: number) => string;
  tenantryNote: string;
  holdersCount: (n: number) => string;
  holdingLabel: string;
  undersettle: string;
  // ---- § the harvest / § the deserted village ----
  desertedNote: (year: number) => string;
  harvestHeader: string;
  harvestNote: string;
  harvestGrade: Record<"good" | "ordinary" | "poor" | "dearth" | "famine", string>;
  harvestYear: (year: number, grade: string) => string;
  // ---- U2: the lifeline ----
  lifelineCaption: (age: number, plagues: number) => string;
  lifelineAria: (name: string, birth: number, death: number, age: number, plagues: number) => string;
  // ---- family tree (§ one-step tree: parents / self+siblings+spouses / children) ----
  familyTree: string;
  self: (sex: "M" | "F") => string;
  outOfWedlock: string;
  // ---- theme switch ----
  themeDark: string;
  themeLight: string;
}

/** Catalan elides `de` before a vowel or a mute h — "d'Osona", not "de
 * Osona". Place names come from the generated tables, so the article has to
 * be chosen at the point of use rather than baked into the data. */
function deCa(name: string): string {
  return /^[aeiouAEIOUhH]/.test(name) ? `d'${name}` : `de ${name}`;
}

export const UI: Record<Locale, UiStrings> = {
  en: {
    brandSuffix: "REROLL",
    seedboxPlaceholder: "record locator",
    seedboxLabel: "Record locator",
    seedboxTitle: "worldseed:region:village:person — drop the last part for the village itself",
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
    sovereign: "Sovereign",
    royalLineHeader: (title: string) => `Royal line — ${title}`,
    reignedInLifetime: "Reigning during this life",
    reignsHeader: "Reigns",
    houseOf: (surname: string) => `The house of ${surname}`,
    lordsOfHeader: "Lords of the manor",
    honourHouseHeader: "The honour's baronial house",
    tenureRelation: {
      founder: "first of the recorded line",
      son: "son of the last lord",
      brother: "brother of the last lord",
      nephew: "nephew of the last lord",
    },
    tenureCause: { war: "fell in the wars", plague: "died in the pestilence", oldage: "died in his bed" },
    reignedLabel: "Reigned",
    houseLabel: "House",
    predecessor: "Predecessor",
    successor: "Successor",
    reignChronicle: "Chronicle of the reign",
    reignEnd: {
      died: (year: number) => `Died in ${year}.`,
      deposed: (year: number) => `Put down from the throne in ${year}.`,
      killed: (year: number) => `Slain in ${year}.`,
    },
    tenureLabel: "Tenure",
    successionLabel: "Succession",
    sovereignsOfTime: "Sovereigns of his time",
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
    chartPeak: (souls: number, year: number) => `peak ${souls} · ${year}`,
    chartLow: (souls: number, year: number) => `low ${souls} · ${year}`,
    chartAria: (place: string, from: number, to: number, peak: number, peakYear: number, low: number, lowYear: number) =>
      `Population of ${place}, ${from} to ${to}: at its height ${peak} souls in ${peakYear}, falling to ${low} in ${lowYear}. Plague and famine years are shaded. Use the year slider below to visit any year.`,
    headTag: "head",
    widowTag: "widow",
    widowerTag: "widower",
    kinTag: "kin",
    fatherTag: "father",
    motherTag: "mother",
    serviceTag: "in service",
    ordersTag: "in orders",
    veiledTag: "veiled",
    manorHouse: "The manor — servants & apprentices",
    churchHouse: "The church and the cloister",
    orphanTag: "orphaned kin",
    emptyYear: "No one is yet entered in this register.",
    famineBadge: "famine",
    warBadge: (name: string) => name,
    settlementRural: "Village",
    settlementUrban: "Market town",
    holdingsLabel: "Holdings",
    holdingsValue: (stock, cultivated, year) => `${stock} tenements · ${cultivated} still in cultivation by ${year}`,
    peakLabel: "Greatest extent",
    peakValue: (souls, year) => `${souls} souls in ${year}`,
    registerSpan: "Register",
    registerSpanValue: (from, to) => `${from}–${to}`,
    openVillage: "Open the village record",
    province: "Province",
    parishOfHeader: (parish) => `${parish[0].toUpperCase()}${parish.slice(1)}`,
    deaneryOfHeader: (deanery) => `${deanery[0].toUpperCase()}${deanery.slice(1)}`,
    dioceseOfHeader: (diocese) => `${diocese[0].toUpperCase()}${diocese.slice(1)}`,
    sharedParishNote: (mother, n) =>
      `A mother church at ${mother}, serving ${n} villages — the rest have no font of their own, and are christened and buried here.`,
    ownParishNote: (place) => `The parish church of ${place}, serving that village alone.`,
    villagesInParish: "Villages of this parish",
    parishesInDeanery: "Parishes of this deanery",
    deaneriesInDiocese: "Deaneries of this diocese",
    motherChurchTag: "mother church",
    chapelryTag: "chapelry",
    visitationNote: (villages) =>
      `As found on visitation of the first ${villages} villages of the region. A deanery reaches further than any one visitation did.`,
    parishesFound: (n) => (n === 1 ? "1 parish found" : `${n} parishes found`),
    soulsOnRegister: (n) => `${n} souls on the register`,
    pontiff: "Pontiff",
    noPontiff: "None obeyed here",
    papalSeriesHeader: (region) => `The popes obeyed in ${region}`,
    pontificatesHeader: "Pontificates",
    obedienceLabel: "Obedience",
    seatLabel: "Seat",
    seatName: { rome: "Rome", avignon: "Avignon", pisa: "Pisa" },
    lineName: { roman: "the Roman line", avignon: "the Avignon obedience", pisan: "the Pisan line" },
    sedeVacante: "The see stood vacant",
    noObedienceTerm: "No pope obeyed in this realm",
    pontificateEnd: { died: "Died in office.", resigned: "Resigned the office.", deposed: "Deposed by a council." },
    heldSeeLabel: "Held the see",
    jubileeTag: "year of jubilee",
    jubileesInPontificate: "Jubilees proclaimed",
    obeyedHere: "Obeyed in this region during this life",
    schismNote:
      "Between 1378 and 1417 there was no single Church. This is the succession <b>this region</b> recognised — a neighbouring realm's list runs differently through those years, and each was told the other's pope was no pope at all.",
    incumbentTitle: { rector: "Rector", vicar: "Vicar" },
    incumbentsHeader: "Incumbents of this church",
    institutedLabel: "Instituted",
    incumbencyLabel: "Incumbency",
    incumbencyEnd: {
      died: "died in the living",
      plague: "died of the pestilence",
      resigned: "resigned the living",
      exchanged: "exchanged the benefice",
    },
    appropriatedNote: (saint) =>
      `The living is appropriated: the great tithes belong to the priory of ${saint}, which presents a salaried vicar to do the work of the parish.`,
    rectoryNote: "The living is a rectory: the parson holds the tithes of the parish himself, and the lord of the manor presents him.",
    presentedByLabel: "Presented by",
    servingInYear: "Serving this year",
    clergyPlagueNote: (year, n) =>
      `${n === 1 ? "One institution" : `${n} institutions`} to this church in ${year} alone — which is how the bishops' registers came to be the best record of the mortality that survives.`,
    registerFilterLabel: "Find in the register",
    registerFilterPlaceholder: "name, surname or year…",
    registerFilterEmpty: "Nobody of that name on this register.",
    registerFilterCount: (shown, total) => `${shown} of ${total}`,
    copyLocator: "Copy link",
    copyLocatorDone: "Link copied",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    fullDate: (day, month, year) => `${day} ${UI.en.months[month - 1]} ${year}`,
    shortDate: (day, month) => `${day} ${UI.en.monthsShort[month - 1]}`,
    onFeast: (feast) => `the feast of ${feast}`,
    seasonHeader: "The year in the register",
    seasonNote:
      "Canon law closed three seasons of the year to weddings — Advent to the octave of Epiphany, Septuagesima to the octave of Easter, and Rogationtide to the octave of Pentecost — and two of the three move with Easter. What is left is the shape below: a rush before Lent, a short spring window, and the great autumn peak after harvest. The burials answer to something else entirely.",
    marriagesByMonth: "Weddings",
    burialsByMonth: "Burials",
    closedSeasonLabel: "closed to weddings",
    monthCount: (month, n) => `${month}: ${n}`,
    easterOf: (year, day, month) => `Easter ${year} fell on ${day} ${month}`,
    tenementSize: { virgate: "A virgate", halfVirgate: "A half-virgate", cottage: "A cottage holding", toft: "A toft" },
    tenementNamed: (surname) => `${surname}'s tenement`,
    tenementUnnamed: (n) => `The ${n === 1 ? "first" : n === 2 ? "second" : n === 3 ? "third" : `${n}th`} tenement`,
    acresOf: (n, unit) => `${n} ${unit}`,
    tenementLandLabel: "Arable",
    tenementHoldersLabel: "Families",
    tenementStandingLabel: "Held",
    tenementHolders: "Successive holders",
    tenementNote:
      "A holding kept its name long after the family that gave it one had gone — court rolls are full of tenements named for people not in them. What follows is the succession of households on this one piece of ground, and the vacancies are as much a part of it as the tenures.",
    tenementVacant: (years) => `Stood vacant ${years} ${years === 1 ? "year" : "years"}`,
    tenementNeverHeld: "No household is recorded on this ground.",
    childrenBorne: (n) => (n ? `${n} ${n === 1 ? "child" : "children"}` : "no issue"),
    tenantryHeader: (n) => `The tenantry — ${n} holdings`,
    tenantryNote:
      "The village's land as an extent would list it: every tenement with its size, largest first. A household needed one of these to exist at all, which is what holds this population to its land.",
    holdersCount: (n) => `${n} ${n === 1 ? "family" : "families"}`,
    holdingLabel: "Holding",
    undersettle: "None — an undersettle",
    desertedNote: (year) =>
      `The village stood empty by ${year}. Its land went back to pasture and its name survived on a map: something like a tenth of English villages ended this way, and a run of failed harvests on thin ground is how.`,
    harvestHeader: "The harvest",
    harvestNote:
      "The yield of the region's harvest, year by year. The documented failures are history — the Great Famine, lo mal any primer, the dear years of the 1430s — and the ordinary variation around them is this world's own weather. A bad year killed the old and the young, and it postponed weddings.",
    harvestGrade: { good: "a good harvest", ordinary: "an ordinary year", poor: "a poor harvest", dearth: "dearth", famine: "famine" },
    harvestYear: (year, grade) => `${year} — ${grade}`,
    lifelineCaption: (age, plagues) => `${age} years · ${plagues === 1 ? "one pestilence" : `${plagues} pestilences`} lived through`,
    lifelineAria: (name, birth, death, age, plagues) =>
      `The life of ${name}, ${birth} to ${death}, ${age} years, against the plagues, famines and wars of the region: ${plagues} pestilences lived through.`,
    familyTree: "Family tree",
    self: (sex) => (sex === "F" ? "Herself" : "Himself"),
    outOfWedlock: "Born out of wedlock",
    themeDark: "Night parchment",
    themeLight: "Day parchment",
  },
  ca: {
    brandSuffix: "REROLL",
    seedboxPlaceholder: "localitzador de registre",
    seedboxLabel: "Localitzador de registre",
    seedboxTitle: "llavordelmón:regió:poble:persona — treu-ne l'última part per al poble mateix",
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
    sovereign: "Sobirà",
    royalLineHeader: (title: string) => `Línia reial — ${title}`,
    reignedInLifetime: "Regnant durant aquesta vida",
    reignsHeader: "Regnats",
    houseOf: (surname: string) => `La casa de ${surname}`,
    lordsOfHeader: "Senyors del senyoriu",
    honourHouseHeader: "La casa baronial de l'honor",
    tenureRelation: {
      founder: "primer del llinatge registrat",
      son: "fill del senyor anterior",
      brother: "germà del senyor anterior",
      nephew: "nebot del senyor anterior",
    },
    tenureCause: { war: "caigué a les guerres", plague: "morí en la mortaldat", oldage: "morí al seu llit" },
    reignedLabel: "Regnà",
    houseLabel: "Casa",
    predecessor: "Predecessor",
    successor: "Successor",
    reignChronicle: "Crònica del regnat",
    reignEnd: {
      died: (year: number) => `Morí el ${year}.`,
      deposed: (year: number) => `Deposat del tron el ${year}.`,
      killed: (year: number) => `Occís el ${year}.`,
    },
    tenureLabel: "Tinença",
    successionLabel: "Successió",
    sovereignsOfTime: "Sobirans del seu temps",
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
    chartPeak: (souls: number, year: number) => `màxim ${souls} · ${year}`,
    chartLow: (souls: number, year: number) => `mínim ${souls} · ${year}`,
    chartAria: (place: string, from: number, to: number, peak: number, peakYear: number, low: number, lowYear: number) =>
      `Població de ${place}, ${from}–${to}: al seu punt àlgid ${peak} ànimes el ${peakYear}, i ${low} el ${lowYear}. Els anys de pesta i de fam són ombrejats. Feu servir el control d'any de sota per visitar qualsevol any.`,
    headTag: "cap de casa",
    widowTag: "vídua",
    widowerTag: "vidu",
    kinTag: "parent",
    fatherTag: "pare",
    motherTag: "mare",
    serviceTag: "servint",
    ordersTag: "en ordes",
    veiledTag: "monja",
    manorHouse: "La casa senyorial — criats i aprenents",
    churchHouse: "L'església i el claustre",
    orphanTag: "orfes",
    emptyYear: "Encara no hi ha ningú inscrit en aquest registre.",
    famineBadge: "fam",
    warBadge: (name: string) => name,
    settlementRural: "Poble",
    settlementUrban: "Vila de mercat",
    holdingsLabel: "Tinences",
    holdingsValue: (stock, cultivated, year) => `${stock} tinences · ${cultivated} encara conreades el ${year}`,
    peakLabel: "Màxima extensió",
    peakValue: (souls, year) => `${souls} ànimes el ${year}`,
    registerSpan: "Registre",
    registerSpanValue: (from, to) => `${from}–${to}`,
    openVillage: "Obre el registre del poble",
    province: "Província",
    parishOfHeader: (parish) => `${parish[0].toUpperCase()}${parish.slice(1)}`,
    deaneryOfHeader: (deanery) => `${deanery[0].toUpperCase()}${deanery.slice(1)}`,
    dioceseOfHeader: (diocese) => `${diocese[0].toUpperCase()}${diocese.slice(1)}`,
    sharedParishNote: (mother, n) =>
      `Una església mare a ${mother}, que serveix ${n} pobles — els altres no tenen pila baptismal pròpia, i s'hi bategen i s'hi enterren.`,
    ownParishNote: (place) => `L'església parroquial ${deCa(place)}, que serveix només aquell poble.`,
    villagesInParish: "Pobles d'aquesta parròquia",
    parishesInDeanery: "Parròquies d'aquest deganat",
    deaneriesInDiocese: "Deganats d'aquest bisbat",
    motherChurchTag: "església mare",
    chapelryTag: "sufragània",
    visitationNote: (villages) =>
      `Tal com es va trobar en la visita als primers ${villages} pobles de la regió. Un deganat s'estén més enllà del que cap visita va arribar.`,
    parishesFound: (n) => (n === 1 ? "1 parròquia trobada" : `${n} parròquies trobades`),
    soulsOnRegister: (n) => `${n} ànimes al registre`,
    pontiff: "Pontífex",
    noPontiff: "Cap d'obeït aquí",
    papalSeriesHeader: (region) => `Els papes obeïts a ${region}`,
    pontificatesHeader: "Pontificats",
    obedienceLabel: "Obediència",
    seatLabel: "Seu",
    seatName: { rome: "Roma", avignon: "Avinyó", pisa: "Pisa" },
    lineName: { roman: "la línia romana", avignon: "l'obediència d'Avinyó", pisan: "la línia de Pisa" },
    sedeVacante: "La seu va restar vacant",
    noObedienceTerm: "Cap papa obeït en aquest reialme",
    pontificateEnd: { died: "Morí en el càrrec.", resigned: "Renuncià al càrrec.", deposed: "Deposat per un concili." },
    heldSeeLabel: "Va tenir la seu",
    jubileeTag: "any de jubileu",
    jubileesInPontificate: "Jubileus proclamats",
    obeyedHere: "Obeït en aquesta regió durant aquesta vida",
    schismNote:
      "Entre 1378 i 1417 no hi hagué una sola Església. Aquesta és la successió que <b>aquesta regió</b> va reconèixer — la llista d'un reialme veí corre diferent per aquells anys, i a cadascun li deien que el papa de l'altre no era papa.",
    incumbentTitle: { rector: "Rector", vicar: "Vicari" },
    incumbentsHeader: "Rectors d'aquesta església",
    institutedLabel: "Instituït",
    incumbencyLabel: "Regiment",
    incumbencyEnd: {
      died: "morí servint el benefici",
      plague: "morí de la pestilència",
      resigned: "renuncià al benefici",
      exchanged: "bescanvià el benefici",
    },
    appropriatedNote: (saint) =>
      `El benefici és apropiat: les dècimes majors són del priorat de ${saint}, que presenta un vicari assalariat perquè faci la feina de la parròquia.`,
    rectoryNote: "El benefici és una rectoria: el rector té les dècimes de la parròquia ell mateix, i el senyor de la senyoria el presenta.",
    presentedByLabel: "Presentat per",
    servingInYear: "Servint aquest any",
    clergyPlagueNote: (year, n) =>
      `${n === 1 ? "Una institució" : `${n} institucions`} a aquesta església només l'any ${year} — i és així com els registres dels bisbes esdevingueren el millor testimoni de la mortaldat que ens ha arribat.`,
    registerFilterLabel: "Cerca al registre",
    registerFilterPlaceholder: "nom, cognom o any…",
    registerFilterEmpty: "Ningú amb aquest nom en aquest registre.",
    registerFilterCount: (shown, total) => `${shown} de ${total}`,
    copyLocator: "Copia l'enllaç",
    copyLocatorDone: "Enllaç copiat",
    months: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
    monthsShort: ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."],
    // Catalan elides `de` before a vowel — "d'abril", "d'agost", "d'octubre".
    fullDate: (day, month, year) => `${day} ${deCa(UI.ca.months[month - 1])} de ${year}`,
    shortDate: (day, month) => `${day} ${UI.ca.monthsShort[month - 1]}`,
    onFeast: (feast) => `${feast}`,
    seasonHeader: "L'any dins del registre",
    seasonNote:
      "El dret canònic tancava tres temporades de l'any als casaments — de l'Advent a l'octava de l'Epifania, de la Septuagèsima a l'octava de Pasqua, i de les Rogacions a l'octava de Pentecosta — i dues de les tres es mouen amb la Pasqua. El que en queda és la forma de sota: una pressa abans de Quaresma, una finestra curta de primavera, i el gran pic de tardor després de la collita. Els enterraments responen a una altra cosa ben diferent.",
    marriagesByMonth: "Casaments",
    burialsByMonth: "Enterraments",
    closedSeasonLabel: "tancat als casaments",
    monthCount: (month, n) => `${month}: ${n}`,
    easterOf: (year, day, month) => `La Pasqua de ${year} va caure el ${day} ${deCa(month)}`,
    tenementSize: { virgate: "Un mas sencer", halfVirgate: "Mig mas", cottage: "Un maset", toft: "Un corral" },
    tenementNamed: (surname) => `El mas dels ${surname}`,
    tenementUnnamed: (n) => `El mas ${n}è`,
    acresOf: (n, unit) => `${n} ${unit}`,
    tenementLandLabel: "Terra de conreu",
    tenementHoldersLabel: "Famílies",
    tenementStandingLabel: "Tingut",
    tenementHolders: "Successió de tinents",
    tenementNote:
      "Un mas conservava el nom molt després que la família que l'hi havia donat hagués desaparegut — els rotlles de la cort són plens de masos anomenats per gent que ja no hi és. El que segueix és la successió de cases damunt d'aquest tros de terra, i els buits en formen part tant com les tinences.",
    tenementVacant: (years) => `Va restar buit ${years} ${years === 1 ? "any" : "anys"}`,
    tenementNeverHeld: "No consta cap casa en aquesta terra.",
    childrenBorne: (n) => (n ? `${n} ${n === 1 ? "fill" : "fills"}` : "sense descendència"),
    tenantryHeader: (n) => `La tinença — ${n} masos`,
    tenantryNote:
      "La terra del poble tal com la llistaria un capbreu: cada mas amb la seva mida, del més gran al més petit. Una casa necessitava un d'aquests per existir, i això és el que lliga aquesta població a la seva terra.",
    holdersCount: (n) => `${n} ${n === 1 ? "família" : "famílies"}`,
    holdingLabel: "Mas",
    undersettle: "Cap — hi vivia de rellogat",
    desertedNote: (year) =>
      `El poble era buit el ${year}. La terra tornà a pastura i el nom va sobreviure en un mapa: alguna cosa com un desè dels pobles anglesos van acabar així, i una seguida de collites fallides en terra prima és com.`,
    harvestHeader: "La collita",
    harvestNote:
      "El rendiment de la collita de la regió, any per any. Les fallides documentades són història — la Gran Fam, lo mal any primer, els anys cars dels anys 1430 — i la variació ordinària al seu voltant és el temps propi d'aquest món. Un mal any matava els vells i els infants, i endarreria els casaments.",
    harvestGrade: { good: "bona collita", ordinary: "any ordinari", poor: "collita pobra", dearth: "carestia", famine: "fam" },
    harvestYear: (year, grade) => `${year} — ${grade}`,
    lifelineCaption: (age, plagues) => `${age} anys · ${plagues === 1 ? "una pestilència" : `${plagues} pestilències`} viscudes`,
    lifelineAria: (name, birth, death, age, plagues) =>
      `La vida de ${name}, de ${birth} a ${death}, ${age} anys, contra les pestes, fams i guerres de la regió: ${plagues} pestilències viscudes.`,
    familyTree: "Arbre genealògic",
    self: (sex) => (sex === "F" ? "Ella mateixa" : "Ell mateix"),
    outOfWedlock: "Nascuts fora del matrimoni",
    themeDark: "Pergamí de nit",
    themeLight: "Pergamí de dia",
  },
};
