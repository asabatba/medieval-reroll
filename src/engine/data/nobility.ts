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
        aka: [{ en: "King Richard", ca: "el rei Ricard" }],
      }),
      r(1399, 1413, {
        name: { en: "Henry IV", ca: "Enric IV" },
        house: { en: "Lancaster", ca: "Lancaster" },
        style: { en: "King Henry IV", ca: "el rei Enric IV" },
        aka: [{ en: "Henry of Lancaster", ca: "Enric de Lancaster" }],
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
        aka: [{ en: "King Henry", ca: "el rei Enric" }],
      }),
      r(1461, 1483, {
        name: { en: "Edward IV", ca: "Eduard IV" },
        house: { en: "York", ca: "York" },
        style: { en: "King Edward IV", ca: "el rei Eduard IV" },
        aka: [{ en: "Edward of York", ca: "Eduard de York" }],
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
        aka: [{ en: "boy king Edward", ca: "rei infant Eduard" }],
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
        aka: [{ en: "Henry Tudor", ca: "Enric Tudor" }],
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
        aka: [{ en: "King Charles", ca: "el rei Carles" }],
      }),
      r(1328, 1350, {
        name: { en: "Philip VI", ca: "Felip VI" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Philip VI", ca: "el rei Felip VI" },
        aka: [{ en: "Philip of Valois", ca: "Felip de Valois" }],
        accession: {
          en: "King Charles died leaving no son, and the crown passed to his cousin Philip of Valois — though the King of England claimed it through his mother. A quarrel of kings, men said, that common folk would pay for; and so it proved.",
          ca: "El rei Carles morí sense deixar fill, i la corona passà al seu cosí Felip de Valois — encara que el rei d'Anglaterra la reclamava per part de mare. Una baralla de reis, deia la gent, que pagaria el poble menut; i així fou.",
        },
      }),
      r(1350, 1364, {
        name: { en: "John II", ca: "Joan II" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King John II", ca: "el rei Joan II" },
        aka: [{ en: "King John", ca: "el rei Joan" }],
      }),
      r(1364, 1380, {
        name: { en: "Charles V", ca: "Carles V" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles V, the Wise", ca: "el rei Carles V, el Savi" },
        aka: [{ en: "Charles the Wise", ca: "Carles el Savi" }],
        accession: {
          en: "King John died a prisoner in London, whither he had returned of his own will to keep his given word, and his son Charles the Wise was crowned at Reims.",
          ca: "El rei Joan morí presoner a Londres, on havia tornat per pròpia voluntat per mantenir la paraula donada, i el seu fill Carles el Savi fou coronat a Reims.",
        },
      }),
      r(1380, 1422, {
        name: { en: "Charles VI", ca: "Carles VI" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles VI", ca: "el rei Carles VI" },
        aka: [{ en: "the mad king", ca: "el rei boig" }],
      }),
      r(1422, 1461, {
        name: { en: "Charles VII", ca: "Carles VII" },
        house: { en: "Valois", ca: "Valois" },
        style: { en: "King Charles VII", ca: "el rei Carles VII" },
        aka: [
          { en: "Dauphin Charles", ca: "Delfí Carles" },
          { en: "the Dauphin", ca: "el Delfí" },
        ],
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
        aka: [{ en: "King Martin", ca: "el rei Martí" }],
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
        aka: [{ en: "Ferdinand of Trastámara", ca: "Ferran de Trastàmara" }],
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
        aka: [{ en: "King John", ca: "el rei Joan" }],
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
        aka: [
          { en: "the friar Savonarola", ca: "fra Savonarola" },
          { en: "Savonarola", ca: "Savonarola" },
        ],
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
        aka: [{ en: "The Emperor Louis", ca: "L'emperador Lluís" }],
      }),
      r(1347, 1378, {
        name: { en: "Charles IV", ca: "Carles IV" },
        house: { en: "Luxembourg", ca: "Luxemburg" },
        style: { en: "the Emperor Charles IV", ca: "l'emperador Carles IV" },
        aka: [{ en: "Charles of Luxembourg", ca: "Carles de Luxemburg" }],
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
        aka: [{ en: "King Wenceslas", ca: "el rei Venceslau" }],
      }),
      r(1400, 1410, {
        name: { en: "Rupert", ca: "Rupert" },
        house: { en: "Wittelsbach", ca: "Wittelsbach" },
        style: { en: "King Rupert of the Romans", ca: "el rei Rupert dels Romans" },
        aka: [{ en: "Count Palatine Rupert", ca: "comte palatí Rupert" }],
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

  castile: {
    title: { en: "Kings and Queens of Castile", ca: "Reis i reines de Castella" },
    reigns: [
      r(1217, 1252, {
        name: { en: "Ferdinand III", ca: "Ferran III" },
        house: { en: "Castile", ca: "Castella" },
        style: { en: "King Ferdinand III, the Saint", ca: "el rei Ferran III, el Sant" },
      }),
      r(1252, 1284, {
        name: { en: "Alfonso X", ca: "Alfons X" },
        house: { en: "Castile", ca: "Castella" },
        style: { en: "King Alfonso X, the Wise", ca: "el rei Alfons X, el Savi" },
      }),
      r(1284, 1295, {
        name: { en: "Sancho IV", ca: "Sanç IV" },
        house: { en: "Castile", ca: "Castella" },
        style: { en: "King Sancho IV, the Brave", ca: "el rei Sanç IV, el Brau" },
      }),
      r(1295, 1312, {
        name: { en: "Ferdinand IV", ca: "Ferran IV" },
        house: { en: "Castile", ca: "Castella" },
        style: { en: "King Ferdinand IV, the Summoned", ca: "el rei Ferran IV, l'Emplaçat" },
      }),
      r(1312, 1350, {
        name: { en: "Alfonso XI", ca: "Alfons XI" },
        house: { en: "Castile", ca: "Castella" },
        style: { en: "King Alfonso XI", ca: "el rei Alfons XI" },
      }),
      r(1350, 1369, {
        name: { en: "Peter I", ca: "Pere I" },
        house: { en: "Castile", ca: "Castella" },
        style: { en: "King Peter I, the Cruel", ca: "el rei Pere I, el Cruel" },
        end: "killed",
        accession: {
          en: "Word reached the parish that King Alfonso had died of the pestilence before the walls of Gibraltar, and that his young son Peter reigned in his place — a king the years would come to call the Cruel.",
          ca: "Va arribar a la parròquia la nova que el rei Alfons havia mort de la pesta davant els murs de Gibraltar, i que el seu jove fill Pere regnava al seu lloc — un rei que els anys acabarien anomenant el Cruel.",
        },
      }),
      r(1369, 1379, {
        name: { en: "Henry II", ca: "Enric II" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King Henry II", ca: "el rei Enric II" },
        aka: [{ en: "Henry of Trastámara", ca: "Enric de Trastàmara" }],
        accession: {
          en: "After years of civil war between the brothers, word came that King Peter had been slain with his own hand by Henry of Trastámara at Montiel, and that the crown had passed to the house of Trastámara. The lawyers argued long over which of the two had ever been the rightful king.",
          ca: "Després d'anys de guerra civil entre els germans, va arribar la nova que el rei Pere havia estat mort a mans del seu germà Enric de Trastàmara a Montiel, i que la corona havia passat a la casa de Trastàmara. Els homes de lleis discutiren llargament sobre quin dels dos havia estat mai el rei legítim.",
        },
      }),
      r(1379, 1390, {
        name: { en: "John I", ca: "Joan I" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King John I", ca: "el rei Joan I" },
        aka: [{ en: "King John", ca: "el rei Joan" }],
      }),
      r(1390, 1406, {
        name: { en: "Henry III", ca: "Enric III" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King Henry III, the Infirm", ca: "el rei Enric III, el Doliente" },
        accession: {
          en: "News came that King John had died of a fall from his horse while hunting hares near Alcalá, still a young man, and that his sickly son Henry reigned as a boy in his place, with regents to govern for him.",
          ca: "Va arribar la nova que el rei Joan havia mort d'una caiguda de cavall caçant llebres prop d'Alcalá, encara jove, i que el seu fill malaltís Enric regnava com a infant al seu lloc, amb regents que governaven per ell.",
        },
      }),
      r(1406, 1454, {
        name: { en: "John II", ca: "Joan II" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King John II", ca: "el rei Joan II" },
        aka: [{ en: "King John", ca: "el rei Joan" }],
      }),
      r(1454, 1474, {
        name: { en: "Henry IV", ca: "Enric IV" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "King Henry IV", ca: "el rei Enric IV" },
      }),
      r(1474, 1504, {
        name: { en: "Isabella I", ca: "Isabel I" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "Queen Isabella I, the Catholic", ca: "la reina Isabel I, la Catòlica" },
        accession: {
          en: "King Henry died leaving only a daughter the realm called doubtful-born, and his sister Isabella — already wed to Ferdinand of Aragon — claimed the crown instead. Portugal took up the other girl's cause, and five years of war followed before the parishes were sure whose writ they lived under.",
          ca: "El rei Enric morí sense deixar més que una filla que el regne tenia per dubtosa, i la seva germana Isabel — ja casada amb Ferran d'Aragó — reclamà la corona en el seu lloc. Portugal prengué la causa de l'altra noia, i seguiren cinc anys de guerra abans que les parròquies sabessin del cert sota quin manament vivien.",
        },
      }),
      r(1504, 1506, {
        name: { en: "Philip I", ca: "Felip I" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "King Philip I, the Fair", ca: "el rei Felip I, el Bell" },
        aka: [{ en: "Philip the Fair", ca: "Felip el Bell" }],
        accession: {
          en: "Queen Isabella died, and the crown passed to her daughter Joanna — but it was Joanna's husband, Philip of Habsburg, whom men styled king in the parish's own hearing, since the queen herself was said to be too grieved in her wits to rule alone.",
          ca: "Morí la reina Isabel, i la corona passà a la seva filla Joana — però fou el marit de Joana, Felip d'Habsburg, a qui la gent anomenava rei, car es deia que la reina mateixa tenia el seny massa afligit per governar sola.",
        },
      }),
      r(1506, 1516, {
        name: { en: "Joanna", ca: "Joana" },
        house: { en: "Trastámara", ca: "Trastàmara" },
        style: { en: "Queen Joanna, with her father Ferdinand governing as regent", ca: "la reina Joana, amb el seu pare Ferran governant com a regent" },
        aka: [{ en: "Joanna the Mad", ca: "Joana la Boja" }],
        accession: {
          en: "King Philip died suddenly, not two years crowned, and the old king Ferdinand of Aragon came back to govern the realm as regent for his daughter Joanna, whose grief and wandering wits, it was said, unfitted her to rule alone.",
          ca: "El rei Felip morí de sobte, no fets dos anys de regnat, i el vell rei Ferran d'Aragó tornà a governar el regne com a regent per la seva filla Joana, la dolor i el seny esgarriat de la qual, es deia, la feien inhàbil per governar sola.",
        },
      }),
      r(1516, 1556, {
        name: { en: "Charles I", ca: "Carles I" },
        house: { en: "Habsburg", ca: "Habsburg" },
        style: { en: "King Charles I", ca: "el rei Carles I" },
        aka: [{ en: "the young King Charles", ca: "el jove rei Carles" }],
        accession: {
          en: "The old king Ferdinand died, and his grandson Charles — raised abroad in Flanders, and a stranger to most who now called him king — was proclaimed sovereign of Castile jointly with his mother Joanna, still living, still, they said, unfit to reign.",
          ca: "Morí el vell rei Ferran, i el seu nét Carles — criat a l'estranger, a Flandes, i un desconegut per a la majoria que ara l'anomenaven rei — fou proclamat sobirà de Castella conjuntament amb la seva mare Joana, encara viva, encara, es deia, inhàbil per regnar.",
        },
      }),
    ],
  },

  scotland: {
    title: { en: "Kings of Scots", ca: "Reis d'Escòcia" },
    reigns: [
      r(1214, 1249, {
        name: { en: "Alexander II", ca: "Alexandre II" },
        house: { en: "Dunkeld", ca: "Dunkeld" },
        style: { en: "King Alexander II", ca: "el rei Alexandre II" },
      }),
      r(1249, 1286, {
        name: { en: "Alexander III", ca: "Alexandre III" },
        house: { en: "Dunkeld", ca: "Dunkeld" },
        style: { en: "King Alexander III", ca: "el rei Alexandre III" },
      }),
      r(1286, 1292, {
        name: { en: "the Great Cause", ca: "la Gran Causa" },
        house: null,
        style: { en: "no king — the succession disputed in the Great Cause", ca: "cap rei — la successió disputada en la Gran Causa" },
        interregnum: true,
        accession: {
          en: "King Alexander was thrown from his horse on a black night riding home to his young queen, and found dead on the shore below Kinghorn. His only heir was a granddaughter, an infant in far Norway, who herself died crossing the sea before ever setting foot in her kingdom — and for six years the great lords of Scotland could not agree among themselves who should wear the crown.",
          ca: "El rei Alexandre caigué del cavall una nit negra tornant a casa amb la seva jove reina, i fou trobat mort a la platja sota Kinghorn. La seva única hereva era una néta, infanta a la llunyana Noruega, que morí ella mateixa travessant el mar abans de trepitjar mai el seu regne — i durant sis anys els grans senyors d'Escòcia no es posaren d'acord sobre qui n'havia de dur la corona.",
        },
      }),
      r(1292, 1296, {
        name: { en: "John Balliol", ca: "Joan Balliol" },
        house: { en: "Balliol", ca: "Balliol" },
        style: { en: "King John Balliol", ca: "el rei Joan Balliol" },
        end: "deposed",
        aka: [{ en: "King John", ca: "el rei Joan" }],
        accession: {
          en: "The King of England was asked to judge among thirteen claimants to the empty throne, and gave it to John Balliol, who did him homage for it — a beginning, the old men said, that boded no good for a kingdom's freedom.",
          ca: "Es demanà al rei d'Anglaterra que jutgés entre tretze pretendents al tron buit, i el donà a Joan Balliol, que li'n féu homenatge — un començament, deien els vells, que no auspiciava res de bo per a la llibertat d'un regne.",
        },
      }),
      r(1296, 1306, {
        name: { en: "the Wars of Independence", ca: "les Guerres d'Independència" },
        house: null,
        style: {
          en: "no king — the Guardians of Scotland, in the wars against King Edward of England",
          ca: "cap rei — els Guardians d'Escòcia, en les guerres contra el rei Eduard d'Anglaterra",
        },
        interregnum: true,
        accession: {
          en: "King Edward of England stripped King John of the royal arms off his own surcoat before the whole army — men called him Toom Tabard, the empty coat, ever after — and led the realm's great men south in chains. No crowned king sat in Scotland for ten hard years of war, while William Wallace and other guardians carried on the fight in the kingdom's name.",
          ca: "El rei Eduard d'Anglaterra arrencà al rei Joan les armes reials de la mateixa sobrevesta davant tot l'exèrcit — d'aleshores ençà l'anomenaren Toom Tabard, la casaca buida — i s'endugué cap al sud, encadenats, els grans homes del regne. Cap rei coronat no segué a Escòcia durant deu anys durs de guerra, mentre William Wallace i altres guardians continuaven la lluita en nom del regne.",
        },
      }),
      r(1306, 1329, {
        name: { en: "Robert I", ca: "Robert I" },
        house: { en: "Bruce", ca: "Bruce" },
        style: { en: "King Robert I, the Bruce", ca: "el rei Robert I, Robert Bruce" },
        aka: [{ en: "Robert the Bruce", ca: "Robert Bruce" }],
        accession: {
          en: "Robert Bruce slew his rival Comyn before the high altar at Dumfries, and within weeks had himself crowned at Scone, though hardly a great man of the realm stood with him and the Pope himself declared him excommunicate for the deed. Years of the hardest war followed, before the crown he had seized in blood was his in fact as well as name.",
          ca: "Robert Bruce matà el seu rival Comyn davant l'altar major de Dumfries, i en poques setmanes es féu coronar a Scone, encara que gairebé cap gran home del regne no li fes costat i el mateix Papa el declarés excomunicat pel fet. Seguiren anys de la guerra més dura, abans que la corona presa amb sang fos seva també de fet, no només de nom.",
        },
      }),
      r(1329, 1371, {
        name: { en: "David II", ca: "David II" },
        house: { en: "Bruce", ca: "Bruce" },
        style: { en: "King David II", ca: "el rei David II" },
        accession: {
          en: "King Robert died full of years and hard-won victory, and his son David, a child of five, was crowned in his place — the first king of Scots crowned and anointed with the Pope's own blessing, which his father had fought a lifetime to win.",
          ca: "El rei Robert morí carregat d'anys i de victòries dures de guanyar, i el seu fill David, un infant de cinc anys, fou coronat al seu lloc — el primer rei d'Escòcia coronat i ungit amb la benedicció del Papa mateix, que son pare havia lluitat tota una vida per aconseguir.",
        },
      }),
      r(1371, 1390, {
        name: { en: "Robert II", ca: "Robert II" },
        house: { en: "Stewart", ca: "Stewart" },
        style: { en: "King Robert II", ca: "el rei Robert II" },
        accession: {
          en: "King David died leaving no son of his own body, and the crown passed to his nephew Robert Stewart, grown grey in the long waiting for it — the first of a new house that would hold the throne of Scotland after him.",
          ca: "El rei David morí sense deixar cap fill propi, i la corona passà al seu nebot Robert Stewart, ja canós de tant esperar-la — el primer d'una casa nova que tindria el tron d'Escòcia després d'ell.",
        },
      }),
      r(1390, 1406, {
        name: { en: "Robert III", ca: "Robert III" },
        house: { en: "Stewart", ca: "Stewart" },
        style: { en: "King Robert III", ca: "el rei Robert III" },
        accession: {
          en: "The old king died, and his son — christened John, but crowned Robert, for the name John had brought Balliol's kingdom nothing but grief — took the throne, a man already lamed and ailing, with the realm's true governance falling more and more to other hands.",
          ca: "El vell rei morí, i el seu fill — batejat Joan, però coronat Robert, car el nom de Joan no havia portat al regnat de Balliol res més que dol — prengué el tron, un home ja coix i malaltís, amb el govern real del regne caient cada cop més en altres mans.",
        },
      }),
      r(1406, 1437, {
        name: { en: "James I", ca: "Jaume I" },
        house: { en: "Stewart", ca: "Stewart" },
        style: { en: "King James I", ca: "el rei Jaume I" },
        end: "killed",
        accession: {
          en: "King Robert died of grief, men said, on the news that his last living son James, sent to France for his own safety, had been taken by English ships at sea and carried a prisoner to London — a boy king who would hold the name of king eighteen years before ever he held his own kingdom.",
          ca: "El rei Robert morí de dol, deia la gent, en saber que el seu darrer fill viu, Jaume, enviat a França per seguretat, havia estat pres per vaixells anglesos en alta mar i dut presoner a Londres — un rei infant que duria el nom de rei divuit anys abans de tenir mai el seu propi regne.",
        },
      }),
      r(1437, 1460, {
        name: { en: "James II", ca: "Jaume II" },
        house: { en: "Stewart", ca: "Stewart" },
        style: { en: "King James II", ca: "el rei Jaume II" },
        end: "killed",
        accession: {
          en: "King James was murdered in the night in the drains beneath the Blackfriars of Perth by men of his own blood, and his six-year-old son was crowned at Holyrood within the month, too young yet to know whom to trust among the lords who now knelt to him.",
          ca: "El rei Jaume fou assassinat de nit als clavegueram sota els dominics de Perth per homes de la seva pròpia sang, i el seu fill de sis anys fou coronat a Holyrood abans d'un mes, massa jove encara per saber de qui fiar-se entre els senyors que ara s'agenollaven davant seu.",
        },
      }),
      r(1460, 1488, {
        name: { en: "James III", ca: "Jaume III" },
        house: { en: "Stewart", ca: "Stewart" },
        style: { en: "King James III", ca: "el rei Jaume III" },
        end: "killed",
        accession: {
          en: "King James was killed before Roxburgh when the great bombard they called the Lion burst at its own firing, and his eight-year-old son reigned in his place, the castle taken the same week by the army that had lost its king in the winning of it.",
          ca: "El rei Jaume morí davant Roxburgh quan la gran bombarda que anomenaven el Lleó esclatà en dispar, i el seu fill de vuit anys regnà al seu lloc, el castell pres la mateixa setmana per l'exèrcit que havia perdut el seu rei tot guanyant-lo.",
        },
      }),
      r(1488, 1513, {
        name: { en: "James IV", ca: "Jaume IV" },
        house: { en: "Stewart", ca: "Stewart" },
        style: { en: "King James IV", ca: "el rei Jaume IV" },
        accession: {
          en: "King James was killed at Sauchieburn by rebel lords who had raised their banners in his own son's name, and the new young king, they said, wore an iron chain next his skin ever after, a penance for a father's death he had never willed but could not undo.",
          ca: "El rei Jaume fou mort a Sauchieburn per senyors rebels que havien alçat les seves banderes en nom del seu propi fill, i el nou rei jove, es deia, dugué des d'aleshores una cadena de ferro a la pell, penitència per una mort del pare que mai no havia volgut però que no podia desfer.",
        },
      }),
    ],
  },

  portugal: {
    title: { en: "Kings of Portugal", ca: "Reis de Portugal" },
    reigns: [
      r(1223, 1248, {
        name: { en: "Sancho II", ca: "Sanç II" },
        house: { en: "Burgundy", ca: "Borgonya" },
        style: { en: "King Sancho II", ca: "el rei Sanç II" },
        end: "deposed",
      }),
      r(1248, 1279, {
        name: { en: "Afonso III", ca: "Alfons III" },
        house: { en: "Burgundy", ca: "Borgonya" },
        style: { en: "King Afonso III", ca: "el rei Alfons III" },
        accession: {
          en: "The Pope himself declared King Sancho unfit to govern for the disorder of the realm, and the great men called over his brother Afonso, count of Boulogne by his own marriage, to rule in his stead — the old king dying in exile in Castile before the year was out, still calling himself king to the end.",
          ca: "El mateix Papa declarà el rei Sanç indigne de governar per la desordre del regne, i els grans homes cridaren el seu germà Alfons, comte de Boulogne pel seu propi matrimoni, a regnar en el seu lloc — el vell rei morí a l'exili a Castella abans que acabés l'any, encara anomenant-se rei fins al final.",
        },
      }),
      r(1279, 1325, {
        name: { en: "Dinis I", ca: "Dinis I" },
        house: { en: "Burgundy", ca: "Borgonya" },
        style: { en: "King Dinis I, the Farmer King", ca: "el rei Dinis I, el Rei Llaurador" },
        aka: [{ en: "the Farmer King", ca: "el Rei Llaurador" }],
      }),
      r(1325, 1357, {
        name: { en: "Afonso IV", ca: "Alfons IV" },
        house: { en: "Burgundy", ca: "Borgonya" },
        style: { en: "King Afonso IV, the Brave", ca: "el rei Alfons IV, el Brau" },
      }),
      r(1357, 1367, {
        name: { en: "Pedro I", ca: "Pere I" },
        house: { en: "Burgundy", ca: "Borgonya" },
        style: { en: "King Pedro I, the Just", ca: "el rei Pere I, el Just" },
        accession: {
          en: "King Afonso died, and his son Pedro, on taking the crown, hunted down the men who years before had murdered Inês de Castro, his father's secret wife, and tore the heart from one of them with his own hands. He had her body raised from the grave, crowned, and set upon the throne, that the whole court might come and kiss the dead queen's hand.",
          ca: "El rei Alfons morí, i el seu fill Pere, en prendre la corona, perseguí els homes que anys abans havien assassinat Inês de Castro, l'esposa secreta del seu pare, i arrencà el cor a un d'ells amb les seves pròpies mans. Féu desenterrar el cos d'ella, coronar-lo i asseure'l al tron, perquè tota la cort hi anés a besar la mà de la reina morta.",
        },
      }),
      r(1367, 1383, {
        name: { en: "Fernando I", ca: "Ferran I" },
        house: { en: "Burgundy", ca: "Borgonya" },
        style: { en: "King Fernando I, the Handsome", ca: "el rei Ferran I, el Bell" },
      }),
      r(1383, 1385, {
        name: { en: "the 1383–85 Crisis", ca: "la Crisi de 1383–85" },
        house: null,
        style: { en: "no king — the 1383–85 Crisis", ca: "cap rei — la Crisi de 1383–85" },
        interregnum: true,
        accession: {
          en: "King Fernando died leaving only a daughter, wed to the King of Castile, who claimed the crown of Portugal for his own. The widowed queen ruled as regent in her daughter's name, but the commons of Lisbon rose against her and against the Castilian claim both, until the Cortes met at Coimbra and acclaimed the old king's bastard half-brother, João, Master of the Order of Aviz.",
          ca: "El rei Ferran morí sense deixar més que una filla, casada amb el rei de Castella, que reclamà per a si la corona de Portugal. La reina vídua governà com a regent en nom de la filla, però el poble de Lisboa s'aixecà contra ella i contra la pretensió castellana alhora, fins que les Corts es reuniren a Coimbra i aclamaren el germanastre bastard del vell rei, Joan, mestre de l'orde d'Avis.",
        },
      }),
      r(1385, 1433, {
        name: { en: "João I", ca: "Joan I" },
        house: { en: "Aviz", ca: "Avis" },
        style: { en: "King João I", ca: "el rei Joan I" },
        aka: [{ en: "John, Master of Aviz", ca: "Joan, mestre d'Avis" }],
        accession: {
          en: "At Aljubarrota the Master of Aviz's small army, with English bowmen fighting at their side, broke the great host of Castile in a single afternoon, and the independence of Portugal — and the friendship with England — was sealed in that field for good.",
          ca: "A Aljubarrota, el petit exèrcit del mestre d'Avis, amb arquers anglesos combatent al seu costat, trencà la gran host de Castella en una sola tarda, i la independència de Portugal — i l'amistat amb Anglaterra — quedà segellada en aquell camp per sempre.",
        },
      }),
      r(1433, 1438, {
        name: { en: "Duarte I", ca: "Eduard I" },
        house: { en: "Aviz", ca: "Avis" },
        style: { en: "King Duarte I", ca: "el rei Eduard I" },
      }),
      r(1438, 1481, {
        name: { en: "Afonso V", ca: "Alfons V" },
        house: { en: "Aviz", ca: "Avis" },
        style: { en: "King Afonso V, the African", ca: "el rei Alfons V, l'Africà" },
        accession: {
          en: "King Duarte died of the pestilence after only five years crowned, and his son Afonso, a child of six, was raised up in his place — the realm split for years after between the boy's mother and his uncle Pedro, Duke of Coimbra, over who should govern for him, a quarrel that ended only on the battlefield.",
          ca: "El rei Eduard morí de la pesta després de només cinc anys coronat, i el seu fill Alfons, un infant de sis anys, fou alçat al seu lloc — el regne es dividí durant anys entre la mare del noi i el seu oncle Pere, duc de Coimbra, sobre qui l'havia de governar, una disputa que només acabà al camp de batalla.",
        },
      }),
      r(1481, 1495, {
        name: { en: "João II", ca: "Joan II" },
        house: { en: "Aviz", ca: "Avis" },
        style: { en: "King João II, the Perfect Prince", ca: "el rei Joan II, el Príncep Perfecte" },
        accession: {
          en: "King Afonso died a broken man after his own claim to the crown of Castile came to nothing on the battlefield, and his son João took the throne — a king who, within a few years, broke the power of the great houses that had defied his father in turn, and struck down the Duke of Viseu with his own dagger in the palace at Setúbal.",
          ca: "El rei Alfons morí un home vençut després que la seva pretensió a la corona de Castella no reeixís al camp de batalla, i el seu fill Joan prengué el tron — un rei que, en pocs anys, trencà el poder de les grans cases que havien desafiat el seu pare, i apunyalà el duc de Viseu amb les seves pròpies mans al palau de Setúbal.",
        },
      }),
      r(1495, 1521, {
        name: { en: "Manuel I", ca: "Manuel I" },
        house: { en: "Aviz", ca: "Avis" },
        style: { en: "King Manuel I, the Fortunate", ca: "el rei Manuel I, l'Afortunat" },
        accession: {
          en: "King João's only lawful son had died young, thrown from his horse into the Tagus at Santarém, and the crown passed instead to his cousin Manuel, whom fortune — and the ships now rounding Africa toward the Indies — would treat kinder than any king of Portugal before him.",
          ca: "L'únic fill legítim del rei Joan havia mort jove, llançat del cavall al Tejo a Santarém, i la corona passà en canvi al seu cosí Manuel, a qui la fortuna — i els vaixells que ara voltaven l'Àfrica cap a les Índies — tractarien millor que a cap rei de Portugal abans que ell.",
        },
      }),
    ],
  },
};
