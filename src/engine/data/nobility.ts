import type { Reign, RoyalLine } from "../types.js";

// ---------- royal lines (§ nobility) ----------
// The REAL sovereigns of each region, as fixed historical data — no RNG, the
// same grounding rule as the plague chronology and the war years. Regnal
// years are inclusive; on a transition year the incoming reign wins the
// sovereignAt() lookup (so 1399 is Henry IV's year, not Richard II's).
// Coverage must span the whole register era with margin: founders are born
// from 1235 and the last recorded births are 1490, so every line runs from
// before 1235 to past 1500.
//
// `accession` texts are the hand-written notable transitions (depositions,
// disputed successions, Caspe, the Medici); everything else falls through to
// the generic accession-news template in nobility.ts, steered by `end`.

const r = (from: number, to: number, reign: Omit<Reign, "from" | "to">): Reign => ({ from, to, ...reign });

export const ROYAL_LINES: Record<string, RoyalLine> = {
  england: {
    title: { en: "Kings of England", ca: "Reis d'Anglaterra" },
    reigns: [
      r(1216, 1272, {
        name: { en: "Henry III", ca: "Enric III" },
        house: { en: "Plantagenet", ca: "Plantagenet" },
        style: { en: "King Henry III", ca: "el rei Enric III" },
      }),
      r(1272, 1307, {
        name: { en: "Edward I", ca: "Eduard I" },
        house: { en: "Plantagenet", ca: "Plantagenet" },
        style: { en: "King Edward I", ca: "el rei Eduard I" },
      }),
      r(1307, 1327, {
        name: { en: "Edward II", ca: "Eduard II" },
        house: { en: "Plantagenet", ca: "Plantagenet" },
        style: { en: "King Edward II", ca: "el rei Eduard II" },
        end: "deposed",
      }),
      r(1327, 1377, {
        name: { en: "Edward III", ca: "Eduard III" },
        house: { en: "Plantagenet", ca: "Plantagenet" },
        style: { en: "King Edward III", ca: "el rei Eduard III" },
        accession: {
          en: "Word ran through the country that the old king had been made to yield his crown, and that his young son was crowned King Edward III at Westminster — and later, in whispers, that the old king had been done to death at Berkeley castle.",
          ca: "Va córrer pel país que el vell rei havia estat forçat a cedir la corona, i que el seu jove fill fou coronat rei Eduard III a Westminster — i més tard, en veu baixa, que el vell rei havia estat mort al castell de Berkeley.",
        },
      }),
      r(1377, 1399, {
        name: { en: "Richard II", ca: "Ricard II" },
        house: { en: "Plantagenet", ca: "Plantagenet" },
        style: { en: "King Richard II", ca: "el rei Ricard II" },
        end: "deposed",
      }),
      r(1399, 1413, {
        name: { en: "Henry IV", ca: "Enric IV" },
        house: { en: "Lancaster", ca: "Lancaster" },
        style: { en: "King Henry IV", ca: "el rei Enric IV" },
        accession: {
          en: "News came that King Richard had been put down from his throne, and Henry of Lancaster crowned in his place. The lawyers said the oath to the old king was void; the old men shook their heads at a crowned king pulled down by a subject.",
          ca: "Va arribar la nova que el rei Ricard havia estat deposat del tron, i que Enric de Lancaster havia estat coronat al seu lloc. Els homes de lleis deien que el jurament al vell rei ja no valia; els vells brandaven el cap davant d'un rei coronat abatut per un vassall.",
        },
      }),
      r(1413, 1422, {
        name: { en: "Henry V", ca: "Enric V" },
        house: { en: "Lancaster", ca: "Lancaster" },
        style: { en: "King Henry V", ca: "el rei Enric V" },
      }),
      r(1422, 1461, {
        name: { en: "Henry VI", ca: "Enric VI" },
        house: { en: "Lancaster", ca: "Lancaster" },
        style: { en: "King Henry VI", ca: "el rei Enric VI" },
        end: "deposed",
      }),
      r(1461, 1483, {
        name: { en: "Edward IV", ca: "Eduard IV" },
        house: { en: "York", ca: "York" },
        style: { en: "King Edward IV", ca: "el rei Eduard IV" },
        accession: {
          en: "After the great slaughter in the snow at Towton, word came that young Edward of York was king, and that King Henry had fled into the north. Men who had sworn to both houses kept their counsel.",
          ca: "Després de la gran matança sota la neu a Towton, va arribar la nova que el jove Eduard de York era rei, i que el rei Enric havia fugit cap al nord. Els qui havien jurat a totes dues cases callaven.",
        },
      }),
      r(1483, 1483, {
        name: { en: "Edward V", ca: "Eduard V" },
        house: { en: "York", ca: "York" },
        style: { en: "King Edward V", ca: "el rei Eduard V" },
        end: "deposed",
      }),
      r(1483, 1485, {
        name: { en: "Richard III", ca: "Ricard III" },
        house: { en: "York", ca: "York" },
        style: { en: "King Richard III", ca: "el rei Ricard III" },
        end: "killed",
        accession: {
          en: "The boy king Edward was set aside before ever he was crowned, and his uncle took the throne as King Richard III. Of the two princes lodged in the Tower no more was heard, and men drew their own conclusions quietly.",
          ca: "El rei infant Eduard fou apartat abans i tot de ser coronat, i el seu oncle prengué el tron com a rei Ricard III. Dels dos prínceps tancats a la Torre no se'n va saber res més, i cadascú en treia les seves conclusions en silenci.",
        },
      }),
      r(1485, 1509, {
        name: { en: "Henry VII", ca: "Enric VII" },
        house: { en: "Tudor", ca: "Tudor" },
        style: { en: "King Henry VII", ca: "el rei Enric VII" },
        accession: {
          en: "Riders brought news of a battle at Bosworth: King Richard slain in the press of it, and the crown, found on the field, set on the head of Henry Tudor. He would wed the old king Edward's daughter, and so, men said, the two roses were joined.",
          ca: "Els correus dugueren noves d'una batalla a Bosworth: el rei Ricard mort enmig de la brega, i la corona, trobada al camp, posada al cap d'Enric Tudor. Es casaria amb la filla del vell rei Eduard, i així, deia la gent, les dues roses quedaven unides.",
        },
      }),
      r(1509, 1547, {
        name: { en: "Henry VIII", ca: "Enric VIII" },
        house: { en: "Tudor", ca: "Tudor" },
        style: { en: "King Henry VIII", ca: "el rei Enric VIII" },
      }),
    ],
  },

  france: {
    title: { en: "Kings of France", ca: "Reis de França" },
    reigns: [
      r(1226, 1270, {
        name: { en: "Louis IX", ca: "Lluís IX" },
        house: { en: "Capet", ca: "Capet" },
        style: { en: "King Louis IX, the saint", ca: "el rei Lluís IX, el sant" },
      }),
      r(1270, 1285, {
        name: { en: "Philip III", ca: "Felip III" },
        house: { en: "Capet", ca: "Capet" },
        style: { en: "King Philip III", ca: "el rei Felip III" },
      }),
      r(1285, 1314, {
        name: { en: "Philip IV", ca: "Felip IV" },
        house: { en: "Capet", ca: "Capet" },
        style: { en: "King Philip IV, the Fair", ca: "el rei Felip IV, el Bell" },
      }),
      r(1314, 1316, {
        name: { en: "Louis X", ca: "Lluís X" },
        house: { en: "Capet", ca: "Capet" },
        style: { en: "King Louis X", ca: "el rei Lluís X" },
      }),
      r(1316, 1322, {
        name: { en: "Philip V", ca: "Felip V" },
        house: { en: "Capet", ca: "Capet" },
        style: { en: "King Philip V", ca: "el rei Felip V" },
      }),
      r(1322, 1328, {
        name: { en: "Charles IV", ca: "Carles IV" },
        house: { en: "Capet", ca: "Capet" },
        style: { en: "King Charles IV", ca: "el rei Carles IV" },
      }),
      r(1328, 1350, {
        name: { en: "Philip VI", ca: "Felip VI" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Philip VI", ca: "el rei Felip VI" },
        accession: {
          en: "King Charles died leaving no son, and the crown passed to his cousin Philip of Valois — though the King of England claimed it through his mother. A quarrel of kings, men said, that common folk would pay for; and so it proved.",
          ca: "El rei Carles morí sense deixar fill, i la corona passà al seu cosí Felip de Valois — encara que el rei d'Anglaterra la reclamava per part de mare. Una baralla de reis, deia la gent, que pagaria el poble menut; i així fou.",
        },
      }),
      r(1350, 1364, {
        name: { en: "John II", ca: "Joan II" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King John II", ca: "el rei Joan II" },
      }),
      r(1364, 1380, {
        name: { en: "Charles V", ca: "Carles V" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles V, the Wise", ca: "el rei Carles V, el Savi" },
        accession: {
          en: "King John died a prisoner in London, whither he had returned of his own will to keep his given word, and his son Charles the Wise was crowned at Reims.",
          ca: "El rei Joan morí presoner a Londres, on havia tornat per pròpia voluntat per mantenir la paraula donada, i el seu fill Carles el Savi fou coronat a Reims.",
        },
      }),
      r(1380, 1422, {
        name: { en: "Charles VI", ca: "Carles VI" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles VI", ca: "el rei Carles VI" },
      }),
      r(1422, 1461, {
        name: { en: "Charles VII", ca: "Carles VII" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles VII", ca: "el rei Carles VII" },
        accession: {
          en: "The mad king died, and there were two who called themselves King of France: the infant Henry of England, proclaimed at Paris, and the Dauphin Charles, south of the Loire. Every parish prayed for a king, and few had seen either.",
          ca: "El rei boig morí, i n'hi hagué dos que es deien rei de França: l'infant Enric d'Anglaterra, proclamat a París, i el Delfí Carles, al sud del Loira. Cada parròquia pregava per un rei, i pocs n'havien vist cap dels dos.",
        },
      }),
      r(1461, 1483, {
        name: { en: "Louis XI", ca: "Lluís XI" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Louis XI", ca: "el rei Lluís XI" },
      }),
      r(1483, 1498, {
        name: { en: "Charles VIII", ca: "Carles VIII" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles VIII", ca: "el rei Carles VIII" },
      }),
      r(1498, 1515, {
        name: { en: "Louis XII", ca: "Lluís XII" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Louis XII", ca: "el rei Lluís XII" },
      }),
    ],
  },

  catalonia: {
    title: { en: "Kings of Aragon and Counts of Barcelona", ca: "Reis d'Aragó i comtes de Barcelona" },
    reigns: [
      r(1213, 1276, {
        name: { en: "James I", ca: "Jaume I" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King James I, the Conqueror", ca: "el rei Jaume I, el Conqueridor" },
      }),
      r(1276, 1285, {
        name: { en: "Peter III", ca: "Pere el Gran" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King Peter III, the Great", ca: "el rei Pere el Gran" },
      }),
      r(1285, 1291, {
        name: { en: "Alfonso III", ca: "Alfons el Franc" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King Alfonso III", ca: "el rei Alfons el Franc" },
      }),
      r(1291, 1327, {
        name: { en: "James II", ca: "Jaume II" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King James II, the Just", ca: "el rei Jaume II, el Just" },
      }),
      r(1327, 1336, {
        name: { en: "Alfonso IV", ca: "Alfons el Benigne" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King Alfonso IV", ca: "el rei Alfons el Benigne" },
      }),
      r(1336, 1387, {
        name: { en: "Peter IV", ca: "Pere el Cerimoniós" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King Peter IV, the Ceremonious", ca: "el rei Pere el Cerimoniós" },
      }),
      r(1387, 1396, {
        name: { en: "John I", ca: "Joan I" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King John I, the Hunter", ca: "el rei Joan I, el Caçador" },
      }),
      r(1396, 1410, {
        name: { en: "Martin I", ca: "Martí l'Humà" },
        house: { en: "Barcelona", ca: "Barcelona" },
        style: { en: "King Martin, the Humane", ca: "el rei Martí l'Humà" },
      }),
      r(1410, 1412, {
        name: { en: "the Interregnum", ca: "l'Interregne" },
        house: null,
        style: { en: "no king — the realm in interregnum", ca: "cap rei — la terra en interregne" },
        interregnum: true,
        accession: {
          en: "King Martin died leaving no heir of his body, the last of the old line of the counts of Barcelona, and the land stood two years without a king while the parliaments disputed who should reign.",
          ca: "El rei Martí morí sense fill hereu, el darrer del vell llinatge dels comtes de Barcelona, i la terra restà dos anys sense rei mentre els parlaments disputaven qui havia de regnar.",
        },
      }),
      r(1412, 1416, {
        name: { en: "Ferdinand I", ca: "Ferran I" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King Ferdinand I", ca: "el rei Ferran I" },
        accession: {
          en: "The nine compromissaries met at Caspe and gave the crown to Ferdinand of Trastámara, of Castile. The interregnum was ended, though not all the land was glad of the choosing.",
          ca: "Els nou compromissaris es reuniren a Casp i donaren la corona a Ferran de Trastàmara, castellà. L'interregne s'havia acabat, encara que no tota la terra s'alegrà de l'elecció.",
        },
      }),
      r(1416, 1458, {
        name: { en: "Alfonso V", ca: "Alfons el Magnànim" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King Alfonso V, the Magnanimous", ca: "el rei Alfons el Magnànim" },
      }),
      r(1458, 1479, {
        name: { en: "John II", ca: "Joan II" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King John II", ca: "el rei Joan II" },
      }),
      r(1479, 1516, {
        name: { en: "Ferdinand II", ca: "Ferran II" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King Ferdinand II, the Catholic", ca: "el rei Ferran II, el Catòlic" },
        accession: {
          en: "King John died full of years, and his son Ferdinand — already wed to Isabella, Queen of Castile — took the crown, and men understood that the realms of Spain were being gathered into one house.",
          ca: "El rei Joan morí carregat d'anys, i el seu fill Ferran — ja casat amb Isabel, reina de Castella — prengué la corona, i la gent entengué que els regnes d'Espanya s'aplegaven en una sola casa.",
        },
      }),
    ],
  },

  italy: {
    title: { en: "The government of Florence", ca: "El govern de Florència" },
    reigns: [
      r(1230, 1342, {
        name: { en: "the Commune", ca: "el Comú" },
        house: null,
        style: { en: "the commune of Florence, governed by its priors", ca: "el comú de Florència, governat pels seus priors" },
        republic: true,
      }),
      r(1342, 1343, {
        name: { en: "Walter of Brienne", ca: "Gualter de Brienne" },
        house: { en: "Brienne", ca: "Brienne" },
        style: { en: "Walter of Brienne, Duke of Athens, lord of Florence", ca: "Gualter de Brienne, duc d'Atenes, senyor de Florència" },
        end: "deposed",
        accession: {
          en: "Florence gave itself a lord: Walter of Brienne, the French duke they called the Duke of Athens, took the signoria for life amid shouting in the piazza. The wiser heads said no city ever gave away its liberty and kept it.",
          ca: "Florència es donà un senyor: Gualter de Brienne, el duc francès que anomenaven duc d'Atenes, prengué la senyoria de per vida enmig dels crits de la plaça. Els més assenyats deien que cap ciutat no havia donat mai la seva llibertat i l'havia conservada.",
        },
      }),
      r(1343, 1434, {
        name: { en: "the Commune restored", ca: "el Comú restaurat" },
        house: null,
        style: { en: "the commune of Florence, under the great families", ca: "el comú de Florència, sota les grans famílies" },
        republic: true,
        accession: {
          en: "On St Anne's day the whole city rose against the Duke of Athens and drove him from Florence, and the commune took back its government. The day was kept as a feast of liberty ever after.",
          ca: "El dia de Santa Anna tota la ciutat s'aixecà contra el duc d'Atenes i el foragità de Florència, i el comú recuperà el seu govern. Aquell dia es guardà des d'aleshores com a festa de la llibertat.",
        },
      }),
      r(1434, 1464, {
        name: { en: "Cosimo de' Medici", ca: "Cosimo de' Medici" },
        house: { en: "Medici", ca: "Mèdici" },
        style: { en: "Cosimo de' Medici, first citizen of Florence", ca: "Cosimo de' Medici, primer ciutadà de Florència" },
        accession: {
          en: "Word came from the city that Cosimo de' Medici, banished the year before, had returned in triumph, and that his enemies were exiled in their turn. The Medici ruled Florence thereafter, though no man of them wore a crown.",
          ca: "Va arribar de la ciutat la nova que Cosimo de' Medici, bandejat l'any abans, havia tornat en triomf, i que els seus enemics eren ara els exiliats. Els Mèdici governaren Florència des d'aleshores, per bé que cap d'ells no duia corona.",
        },
      }),
      r(1464, 1469, {
        name: { en: "Piero de' Medici", ca: "Piero de' Medici" },
        house: { en: "Medici", ca: "Mèdici" },
        style: { en: "Piero di Cosimo de' Medici, first citizen of Florence", ca: "Piero di Cosimo de' Medici, primer ciutadà de Florència" },
        accession: {
          en: "Cosimo the Elder died, whom the city wrote down in its books as Father of the Fatherland, and his son Piero, gouty and bedridden, held the state after him.",
          ca: "Morí Cosimo el Vell, que la ciutat inscriví als seus llibres com a Pare de la Pàtria, i el seu fill Piero, gotós i enllitat, tingué l'estat després d'ell.",
        },
      }),
      r(1469, 1492, {
        name: { en: "Lorenzo the Magnificent", ca: "Lorenzo el Magnífic" },
        house: { en: "Medici", ca: "Mèdici" },
        style: { en: "Lorenzo de' Medici, the Magnificent", ca: "Lorenzo de' Medici, el Magnífic" },
        accession: {
          en: "Piero de' Medici died, and his son Lorenzo, a young man of twenty, took the state upon himself — Lorenzo whom men would call the Magnificent.",
          ca: "Morí Piero de' Medici, i el seu fill Lorenzo, un jove de vint anys, prengué l'estat — Lorenzo, que la gent anomenaria el Magnífic.",
        },
      }),
      r(1492, 1494, {
        name: { en: "Piero the Unfortunate", ca: "Piero el Dissortat" },
        house: { en: "Medici", ca: "Mèdici" },
        style: { en: "Piero di Lorenzo de' Medici", ca: "Piero di Lorenzo de' Medici" },
        end: "deposed",
        accession: {
          en: "Lorenzo the Magnificent was dead. The bells tolled through the contado, and men said the peace of Italy had died with him; his son Piero held the state, but not, as it proved, for long.",
          ca: "Lorenzo el Magnífic era mort. Les campanes tocaren per tot el comtat, i la gent deia que la pau d'Itàlia havia mort amb ell; el seu fill Piero tingué l'estat, però, com es veié, no pas per gaire temps.",
        },
      }),
      r(1494, 1498, {
        name: { en: "the Republic, under Savonarola", ca: "la República, sota Savonarola" },
        house: null,
        style: { en: "the Republic, under the friar Savonarola", ca: "la República, sota fra Savonarola" },
        republic: true,
        accession: {
          en: "The French king came over the mountains with an army such as Italy had not seen, Piero de' Medici fled the city, and the friar Savonarola preached that Florence should take Christ alone for its king. The great bonfires of vanities followed.",
          ca: "El rei francès passà les muntanyes amb un exèrcit com Itàlia no n'havia vist, Piero de' Medici fugí de la ciutat, i fra Savonarola predicà que Florència havia de prendre Crist per únic rei. Seguiren les grans fogueres de les vanitats.",
        },
      }),
      r(1498, 1512, {
        name: { en: "the Republic restored", ca: "la República restaurada" },
        house: null,
        style: { en: "the Republic of Florence, restored", ca: "la República de Florència, restaurada" },
        republic: true,
        accession: {
          en: "The friar Savonarola, excommunicated and condemned, was hanged and burned in the Piazza della Signoria, where his bonfires had blazed the year before; and the city governed itself again as before.",
          ca: "Fra Savonarola, excomunicat i condemnat, fou penjat i cremat a la plaça de la Senyoria, on l'any abans havien cremat les seves fogueres; i la ciutat tornà a governar-se com abans.",
        },
      }),
      r(1512, 1530, {
        name: { en: "the Medici restored", ca: "els Mèdici restaurats" },
        house: { en: "Medici", ca: "Mèdici" },
        style: { en: "the Medici, restored to the state", ca: "els Mèdici, restaurats a l'estat" },
      }),
    ],
  },

  germany: {
    title: { en: "Emperors and Kings of the Romans", ca: "Emperadors i reis dels Romans" },
    reigns: [
      r(1220, 1250, {
        name: { en: "Frederick II", ca: "Frederic II" },
        house: { en: "Hohenstaufen", ca: "Hohenstaufen" },
        style: { en: "the Emperor Frederick II", ca: "l'emperador Frederic II" },
      }),
      r(1250, 1273, {
        name: { en: "the Great Interregnum", ca: "el Gran Interregne" },
        house: null,
        style: { en: "no king — the Great Interregnum", ca: "cap rei — el Gran Interregne" },
        interregnum: true,
      }),
      r(1273, 1291, {
        name: { en: "Rudolf I", ca: "Rodolf I" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "King Rudolf I of the Romans", ca: "el rei Rodolf I dels Romans" },
      }),
      r(1292, 1298, {
        name: { en: "Adolf of Nassau", ca: "Adolf de Nassau" },
        house: { en: "Nassau", ca: "Nassau" },
        style: { en: "King Adolf of the Romans", ca: "el rei Adolf dels Romans" },
        end: "killed",
      }),
      r(1298, 1308, {
        name: { en: "Albert I", ca: "Albert I" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "King Albert I of the Romans", ca: "el rei Albert I dels Romans" },
        end: "killed",
      }),
      r(1308, 1313, {
        name: { en: "Henry VII", ca: "Enric VII" },
        house: { en: "Luxembourg", ca: "Luxemburg" },
        style: { en: "the Emperor Henry VII", ca: "l'emperador Enric VII" },
      }),
      r(1314, 1347, {
        name: { en: "Louis IV", ca: "Lluís IV" },
        house: { en: "Wittelsbach", ca: "Wittelsbach" },
        style: { en: "the Emperor Louis the Bavarian", ca: "l'emperador Lluís el Bavarès" },
      }),
      r(1347, 1378, {
        name: { en: "Charles IV", ca: "Carles IV" },
        house: { en: "Luxembourg", ca: "Luxemburg" },
        style: { en: "the Emperor Charles IV", ca: "l'emperador Carles IV" },
        accession: {
          en: "The Emperor Louis fell from his horse and died a-hunting, and Charles of Luxembourg, King of Bohemia, was king in his place — the same years the great mortality began its march through the world.",
          ca: "L'emperador Lluís caigué del cavall i morí caçant, i Carles de Luxemburg, rei de Bohèmia, fou rei al seu lloc — els mateixos anys que la gran mortaldat començava el seu camí pel món.",
        },
      }),
      r(1378, 1400, {
        name: { en: "Wenceslas", ca: "Venceslau" },
        house: { en: "Luxembourg", ca: "Luxemburg" },
        style: { en: "King Wenceslas of the Romans", ca: "el rei Venceslau dels Romans" },
        end: "deposed",
      }),
      r(1400, 1410, {
        name: { en: "Rupert", ca: "Rupert" },
        house: { en: "Wittelsbach", ca: "Wittelsbach" },
        style: { en: "King Rupert of the Romans", ca: "el rei Rupert dels Romans" },
        accession: {
          en: "The Electors, meeting on the Rhine, put down King Wenceslas for idleness and drunkenness, and chose the Count Palatine Rupert in his stead. Two men now called themselves King of the Romans, and the roads were no safer for it.",
          ca: "Els Electors, reunits vora el Rin, deposaren el rei Venceslau per peresa i embriaguesa, i escolliren el comte palatí Rupert al seu lloc. Dos homes es deien ara rei dels Romans, i els camins no eren pas més segurs per això.",
        },
      }),
      r(1410, 1437, {
        name: { en: "Sigismund", ca: "Segimon" },
        house: { en: "Luxembourg", ca: "Luxemburg" },
        style: { en: "the Emperor Sigismund", ca: "l'emperador Segimon" },
      }),
      r(1438, 1439, {
        name: { en: "Albert II", ca: "Albert II" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "King Albert II of the Romans", ca: "el rei Albert II dels Romans" },
      }),
      r(1440, 1493, {
        name: { en: "Frederick III", ca: "Frederic III" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "the Emperor Frederick III", ca: "l'emperador Frederic III" },
      }),
      r(1493, 1519, {
        name: { en: "Maximilian I", ca: "Maximilià I" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "the Emperor Maximilian I", ca: "l'emperador Maximilià I" },
      }),
    ],
  },
};
