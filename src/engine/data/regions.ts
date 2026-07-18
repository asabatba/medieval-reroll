import type { Region } from "../types.js";

// ---------- world data ----------
export const REGIONS: Record<string, Region> = {
  england: {
    name: "England", places: ["the village of Elmleigh, Kent", "the manor of Elton, Huntingdonshire", "the vill of Netherstoke, Yorkshire", "the parish of Halesowen, Worcestershire", "the fenland vill of Merewick, near Ely"],
    maleNames: ["John", "William", "Robert", "Thomas", "Richard", "Henry", "Walter", "Geoffrey", "Adam", "Simon", "Nicholas", "Roger", "Hugh", "Gilbert", "Ralph", "Stephen", "Peter"],
    femaleNames: ["Alice", "Agnes", "Joan", "Matilda", "Margery", "Isabella", "Emma", "Cecily", "Juliana", "Edith", "Beatrice", "Christina", "Avice", "Sibyl", "Amice"],
    surnames: ["atte Wode", "Smith", "Carter", "Baker", "Webster", "Fletcher", "atte Well", "Shepherd", "Turner", "Clerk", "Reeve", "Fowler", "Chapman", "Underhill", "Frankeleyn", "Godwin"],
    marriageF: [19, 24], marriageM: [23, 28],
    famine: [1315, 1322], famineName: "the Great Famine",
    warYears: [[1346, 1360], [1369, 1389], [1415, 1453], [1455, 1487]],
    warNames: { 1346: "the king's wars in France", 1369: "the French war", 1415: "King Henry's war in France", 1455: "the wars between Lancaster and York" },
    revolt: { year: 1381, name: "the Great Rising of 1381", desc: "when the commons rose against the poll tax, marched on London, and burned the Savoy Palace" },
    pilgrim: ["the shrine of St Thomas at Canterbury", "Our Lady of Walsingham", "the shrine of St Cuthbert at Durham"],
    currency: "shillings", landUnit: "acres"
  },
  france: {
    name: "France", places: ["the village of Saint-Ouen-le-Petit, in the Beauvaisis", "a parish in Normandy near Caen", "the village of Montcler, Languedoc", "the vill of Fresnay, Burgundy"],
    maleNames: ["Jean", "Guillaume", "Pierre", "Jacques", "Colin", "Étienne", "Thomas", "Robert", "Michel", "Raymond", "Bernard", "Arnaud", "Perrin", "Denis"],
    femaleNames: ["Jeanne", "Marguerite", "Perrette", "Alison", "Isabelle", "Catherine", "Agnès", "Guillemette", "Jacquette", "Sibille", "Mahaut", "Denise"],
    surnames: ["le Charpentier", "du Bois", "Lefèvre", "Moreau", "de la Rue", "Boulanger", "Tisserand", "le Breton", "Fournier", "Pelletier", "Vachier", "Gastinel"],
    marriageF: [17, 22], marriageM: [22, 27],
    famine: [1315, 1322], famineName: "the Great Famine",
    warYears: [[1337, 1360], [1369, 1389], [1415, 1453]],
    warNames: { 1337: "the English war", 1369: "the war against the English", 1415: "the English invasion and the wars of the mad king's reign" },
    revolt: { year: 1358, name: "the Jacquerie of 1358", desc: "when the peasants of the Beauvaisis rose against the nobles amid the ruin of the English war" },
    pilgrim: ["Mont-Saint-Michel", "Saint-Martin of Tours", "Notre-Dame du Puy"],
    currency: "sous", landUnit: "arpents", routiers: true
  },
  catalonia: {
    name: "the Crown of Aragon", places: ["the village of Santa Coloma del Vallès", "a mas-scattered parish in Osona", "the village of Vilamarí, near Girona", "the vill of Riudellots, in the Empordà"],
    maleNames: ["Pere", "Joan", "Bernat", "Guillem", "Ramon", "Berenguer", "Arnau", "Jaume", "Antoni", "Francesc", "Bartomeu", "Miquel", "Galceran"],
    femaleNames: ["Maria", "Elisenda", "Sança", "Blanca", "Constança", "Margarida", "Caterina", "Eulàlia", "Sibil·la", "Agnès", "Violant", "Francesca"],
    surnames: ["Ferrer", "Puig", "Riera", "Soler", "Vila", "Serra", "Mas", "Font", "Rovira", "Camps", "Oller", "Batlle", "Espígol"],
    marriageF: [16, 20], marriageM: [21, 26],
    famine: [1333, 1334], famineName: "lo mal any primer, the first bad year",
    warYears: [[1356, 1369], [1462, 1472]],
    warNames: { 1356: "the War of the Two Peres against Castile", 1462: "the Catalan civil war" },
    revolt: { year: 1462, name: "the remença uprisings", desc: "when the bound peasants of Old Catalonia rose against the mals usos, demanding freedom from their lords" },
    pilgrim: ["Santa Maria de Montserrat", "Sant Jaume de Galícia — Santiago de Compostela", "the shrine of Sant Narcís at Girona"],
    currency: "sous", landUnit: "quarteres"
  },
  italy: {
    name: "Tuscany", places: ["the village of Colle Alberti, in the contado of Florence", "a parish in the Mugello", "the village of San Donnino, near Prato", "the vill of Montefollonico, in the Sienese"],
    maleNames: ["Giovanni", "Antonio", "Francesco", "Piero", "Niccolò", "Bartolomeo", "Domenico", "Matteo", "Andrea", "Lorenzo", "Jacopo", "Cristofano", "Nofri"],
    femaleNames: ["Caterina", "Margherita", "Antonia", "Francesca", "Lucia", "Giovanna", "Piera", "Lisabetta", "Nanna", "Tessa", "Ginevra", "Bartolomea"],
    surnames: ["di Nardo", "del Rosso", "Fabbri", "di Lapo", "Vannucci", "del Bene", "di Cecco", "Mazzei", "Bonaccorsi", "di Vanni", "Ciardi"],
    marriageF: [15, 18], marriageM: [26, 32],
    famine: [1328, 1330], famineName: "the dearth of 1328–30",
    warYears: [[1375, 1378], [1390, 1402], [1424, 1433]],
    warNames: { 1375: "the War of the Eight Saints against the Pope", 1390: "the wars against Giangaleazzo of Milan", 1424: "the wars against Milan and Lucca" },
    revolt: { year: 1378, name: "the Revolt of the Ciompi", desc: "when the wool-carders of Florence seized the government and demanded their own guild" },
    pilgrim: ["Rome for the Jubilee", "Assisi and the tomb of St Francis", "Our Lady of Impruneta"],
    currency: "soldi", landUnit: "staiora"
  },
  germany: {
    name: "the Holy Roman Empire", places: ["the village of Obergrund, Franconia", "a parish in the Rhineland near Cologne", "the village of Lindheim, in the Wetterau", "the vill of Eschenbach, Swabia"],
    maleNames: ["Hans", "Heinrich", "Konrad", "Ulrich", "Friedrich", "Peter", "Nikolaus", "Michel", "Jörg", "Wilhelm", "Albrecht", "Wolf", "Endres"],
    femaleNames: ["Katharina", "Margarethe", "Anna", "Elisabeth", "Barbara", "Agnes", "Ursula", "Gertrud", "Adelheid", "Kunigunde", "Else"],
    surnames: ["Müller", "Weber", "Schmidt", "Wagner", "Fischer", "Zimmermann", "Schneider", "Bauer", "Koch", "Gerber", "Pfeifer", "Hofmann"],
    marriageF: [19, 24], marriageM: [24, 29],
    famine: [1315, 1322], famineName: "the Great Famine",
    warYears: [[1419, 1436], [1449, 1450]],
    warNames: { 1419: "the Hussite wars in Bohemia", 1449: "the towns' war against the margrave" },
    revolt: null,
    pilgrim: ["the Holy Blood of Wilsnack", "the Three Kings at Cologne", "Rome across the Alps for the Jubilee"],
    currency: "pfennige", landUnit: "morgen"
  }
};
