// Ecclesiastical and feudal geography, independent of the civil region/village
// tree they overlay. Names only — the actual tree shape (province > diocese >
// deanery > parish, earldom > honour > manor) is resolved in hierarchy.js.
export const JURISDICTIONS = {
  england: {
    province: "the province of Canterbury",
    dioceses: ["Canterbury", "Rochester", "London", "Ely", "Worcester", "Lincoln"],
    deaneries: ["Sittingbourne", "Sockburn", "Bickley", "Rushford", "Cattal", "Elmside", "Netherwell", "Ashcombe"],
    earldoms: ["Kent", "Huntingdon", "Warwick", "Chester", "Gloucester", "Hereford"]
  },
  france: {
    province: "the province of Rouen",
    dioceses: ["Beauvais", "Rouen", "Bayeux", "Sens", "Autun"],
    deaneries: ["Gerberoy", "Clermont", "Neufmarché", "Auneuil", "Formerie", "Songeons"],
    earldoms: ["Beauvaisis", "Normandy", "Burgundy", "Champagne", "Anjou"]
  },
  catalonia: {
    province: "the province of Tarragona",
    dioceses: ["Barcelona", "Girona", "Vic", "Urgell", "Tarragona"],
    deaneries: ["Vallès", "Osona", "Empordà", "Bages", "Penedès", "Selva"],
    earldoms: ["Barcelona", "Urgell", "Empúries", "Osona", "Cerdanya"]
  },
  italy: {
    province: "the province of Florence",
    dioceses: ["Florence", "Fiesole", "Pistoia", "Siena", "Arezzo"],
    deaneries: ["Mugello", "Val di Pesa", "Chianti", "Valdarno", "Val di Sieve", "Val d'Elsa"],
    earldoms: ["Poppi", "Modigliana", "Massa", "Santa Fiora"]
  },
  germany: {
    province: "the province of Mainz",
    dioceses: ["Mainz", "Cologne", "Worms", "Speyer", "Würzburg"],
    deaneries: ["Wetterau", "Rheingau", "Nahegau", "Ortenau", "Hunsrück", "Taunus"],
    earldoms: ["Nassau", "Katzenelnbogen", "Sponheim", "Hanau", "Isenburg"]
  }
};

export const SAINTS = ["St Mary", "St Peter", "St John the Baptist", "All Saints", "St Andrew", "St Nicholas", "Holy Trinity", "St Michael", "St Margaret", "St Giles", "St Leonard", "Our Lady", "St Botolph", "St Swithun", "St Lawrence"];
