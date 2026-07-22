import type { Locale } from "../../i18n/locale.js";
import type { JurisdictionData } from "../types.js";

// Ecclesiastical and feudal geography, independent of the civil region/village
// tree they overlay. Names only (bare place names, not the wrapping phrase —
// hierarchy.ts localizes "the province of X" / "la província de X") — the
// actual tree shape (province > diocese > deanery > parish, earldom > honour
// > manor) is resolved in hierarchy.ts.
export const JURISDICTIONS: Record<string, JurisdictionData> = {
  england: {
    province: "Canterbury",
    dioceses: ["Canterbury", "Rochester", "London", "Ely", "Worcester", "Lincoln"],
    deaneries: ["Sittingbourne", "Sockburn", "Bickley", "Rushford", "Cattal", "Elmside", "Netherwell", "Ashcombe"],
    earldoms: ["Kent", "Huntingdon", "Warwick", "Chester", "Gloucester", "Hereford"],
  },
  france: {
    province: "Rouen",
    dioceses: ["Beauvais", "Rouen", "Bayeux", "Sens", "Autun"],
    deaneries: ["Gerberoy", "Clermont", "Neufmarché", "Auneuil", "Formerie", "Songeons"],
    earldoms: ["Beauvaisis", "Normandy", "Burgundy", "Champagne", "Anjou"],
  },
  catalonia: {
    province: "Tarragona",
    dioceses: ["Barcelona", "Girona", "Vic", "Urgell", "Tarragona"],
    deaneries: ["Vallès", "Osona", "Empordà", "Bages", "Penedès", "Selva"],
    earldoms: ["Barcelona", "Urgell", "Empúries", "Osona", "Cerdanya"],
  },
  italy: {
    province: "Florence",
    dioceses: ["Florence", "Fiesole", "Pistoia", "Siena", "Arezzo"],
    deaneries: ["Mugello", "Val di Pesa", "Chianti", "Valdarno", "Val di Sieve", "Val d'Elsa"],
    earldoms: ["Poppi", "Modigliana", "Massa", "Santa Fiora"],
  },
  germany: {
    province: "Mainz",
    dioceses: ["Mainz", "Cologne", "Worms", "Speyer", "Würzburg"],
    deaneries: ["Wetterau", "Rheingau", "Nahegau", "Ortenau", "Hunsrück", "Taunus"],
    earldoms: ["Nassau", "Katzenelnbogen", "Sponheim", "Hanau", "Isenburg"],
  },
  castile: {
    province: "Toledo",
    dioceses: ["Toledo", "Burgos", "Palencia", "Segovia", "Ávila", "León"],
    deaneries: ["Sepúlveda", "Arévalo", "Astudillo", "Belorado", "Aranda", "Roa", "Cuéllar", "Peñafiel"],
    earldoms: ["Trastámara", "Haro", "Lara", "Alburquerque", "Medinaceli", "Benavente"],
  },
};

export const SAINTS: Record<Locale, string[]> = {
  en: [
    "St Mary",
    "St Peter",
    "St John the Baptist",
    "All Saints",
    "St Andrew",
    "St Nicholas",
    "Holy Trinity",
    "St Michael",
    "St Margaret",
    "St Giles",
    "St Leonard",
    "Our Lady",
    "St Botolph",
    "St Swithun",
    "St Lawrence",
  ],
  ca: [
    "Santa Maria",
    "Sant Pere",
    "Sant Joan Baptista",
    "Tots Sants",
    "Sant Andreu",
    "Sant Nicolau",
    "Santíssima Trinitat",
    "Sant Miquel",
    "Santa Margarida",
    "Sant Gil",
    "Sant Leonard",
    "Nostra Senyora",
    "Sant Botolf",
    "Sant Swithun",
    "Sant Llorenç",
  ],
};
