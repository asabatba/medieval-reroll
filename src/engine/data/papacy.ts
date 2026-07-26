// =====================================================================
// § the Schism — the papacy, as data.
//
// The other head of the medieval world, and until now the engine had one
// line about it (a texture entry: "there were now two popes"). It belongs
// with ROYAL_LINES rather than with anything generated, for exactly the
// reason kings do: these men are real, their dates are known, and which
// one a given parish obeyed is a FACT ABOUT THE REGION, not a die roll.
//
// And it is the sharpest region-differentiating fact the engine has. From
// 1378 to 1417 there was no single Church: France, Castile, the Crown of
// Aragon and Scotland held to Avignon; England, the Empire and most of
// Italy to Rome; Portugal changed sides after Aljubarrota; France
// renounced BOTH popes for five years and recognised none at all. A
// villager in Catalonia and a villager in England, in the same year, were
// obeying different popes and each was told the other was damned. Nothing
// else in this model separates two regions so completely.
//
// Three lines are kept, and they are three different things:
//  - "roman": the undivided line, which is also the line that ran the
//    whole Avignon RESIDENCE of 1309–77. That period is not the Schism —
//    one pope, sitting in the wrong place — so it is `seat: "avignon"` on
//    the roman line, never the avignon line.
//  - "avignon": the schism claimants, Clement VII and Benedict XIII.
//  - "pisan": the line the Council of Pisa (1409) created while trying to
//    end the Schism, thereby making three popes where there had been two.
//
// Gaps between pontificates are NOT written here — papacy.ts fills them
// as sede vacante from the dates themselves, which is why the two-and-a-
// half-year vacancy of 1268–71 needs no entry to show up as one.
// =====================================================================
import type { LocalText } from "../types.js";

export type PapalLine = "roman" | "avignon" | "pisan";
export type PapalSeat = "rome" | "avignon" | "pisa";
export type PontificateEnd = "died" | "resigned" | "deposed";

export interface Pontificate {
  /** First and last year of the pontificate (inclusive). On a transition year the incoming pope wins the lookup. */
  from: number;
  to: number;
  /** Regnal name alone: "Gregory IX". */
  name: LocalText;
  /** Full style usable mid-sentence: "Pope Gregory IX" / "el papa Gregori IX". */
  style: LocalText;
  line: PapalLine;
  /** Where he actually sat — not the same question as which line he belongs to. */
  seat: PapalSeat;
  end?: PontificateEnd;
  /** Hand-written chronicle sentence for pontificates that were news in themselves. */
  note?: LocalText;
}

/** [from, to, English name, Catalan name, end?] — expanded below. */
type PopeRow = [number, number, string, string, PontificateEnd?];

function expand(rows: PopeRow[], line: PapalLine, seatOf: (from: number) => PapalSeat, notes: Record<number, LocalText> = {}): Pontificate[] {
  return rows.map(([from, to, en, ca, end]) => ({
    from,
    to,
    name: { en, ca },
    style: { en: `Pope ${en}`, ca: `el papa ${ca}` },
    line,
    seat: seatOf(from),
    ...(end ? { end } : {}),
    ...(notes[from] ? { note: notes[from] } : {}),
  }));
}

// The undivided line, and after 1417 the reunited one. Seat follows the
// residence: Rome (and the various Italian exiles, which this does not
// try to distinguish) until Clement V, Avignon 1309–1377, Rome after.
const ROMAN_ROWS: PopeRow[] = [
  [1227, 1241, "Gregory IX", "Gregori IX"],
  [1241, 1241, "Celestine IV", "Celestí IV"],
  [1243, 1254, "Innocent IV", "Innocenci IV"],
  [1254, 1261, "Alexander IV", "Alexandre IV"],
  [1261, 1264, "Urban IV", "Urbà IV"],
  [1265, 1268, "Clement IV", "Climent IV"],
  [1271, 1276, "Gregory X", "Gregori X"],
  [1276, 1276, "Innocent V", "Innocenci V"],
  [1276, 1276, "Adrian V", "Adrià V"],
  [1276, 1277, "John XXI", "Joan XXI"],
  [1277, 1280, "Nicholas III", "Nicolau III"],
  [1281, 1285, "Martin IV", "Martí IV"],
  [1285, 1287, "Honorius IV", "Honori IV"],
  [1288, 1292, "Nicholas IV", "Nicolau IV"],
  [1294, 1294, "Celestine V", "Celestí V", "resigned"],
  [1294, 1303, "Boniface VIII", "Bonifaci VIII"],
  [1303, 1304, "Benedict XI", "Benet XI"],
  [1305, 1314, "Clement V", "Climent V"],
  [1316, 1334, "John XXII", "Joan XXII"],
  [1334, 1342, "Benedict XII", "Benet XII"],
  [1342, 1352, "Clement VI", "Climent VI"],
  [1352, 1362, "Innocent VI", "Innocenci VI"],
  [1362, 1370, "Urban V", "Urbà V"],
  [1370, 1378, "Gregory XI", "Gregori XI"],
  [1378, 1389, "Urban VI", "Urbà VI"],
  [1389, 1404, "Boniface IX", "Bonifaci IX"],
  [1404, 1406, "Innocent VII", "Innocenci VII"],
  [1406, 1415, "Gregory XII", "Gregori XII", "resigned"],
  [1417, 1431, "Martin V", "Martí V"],
  [1431, 1447, "Eugene IV", "Eugeni IV"],
  [1447, 1455, "Nicholas V", "Nicolau V"],
  [1455, 1458, "Callixtus III", "Calixt III"],
  [1458, 1464, "Pius II", "Pius II"],
  [1464, 1471, "Paul II", "Pau II"],
  [1471, 1484, "Sixtus IV", "Sixt IV"],
  [1484, 1492, "Innocent VIII", "Innocenci VIII"],
  [1492, 1503, "Alexander VI", "Alexandre VI"],
];

const ROMAN_NOTES: Record<number, LocalText> = {
  1294: {
    en: "A hermit of the Abruzzi was fetched from his cave and made pope, and five months later laid the office down again — the only pope within memory to walk away from it.",
    ca: "Un ermità dels Abruços fou tret de la seva cova i fet papa, i al cap de cinc mesos deixà el càrrec — l'únic papa de memòria d'home que se n'ha apartat.",
  },
  1305: {
    en: "The new pope was never crowned at Rome at all. He was a Gascon, and the court settled at Avignon on the Rhône, where it stayed for seventy years.",
    ca: "El nou papa no fou mai coronat a Roma. Era gascó, i la cort s'establí a Avinyó, vora el Roine, on romangué setanta anys.",
  },
  1378: {
    en: "The cardinals elected an Italian under the shouting of the Roman crowd, then fled, declared the election forced, and elected another. Christendom had two popes, and would keep them for forty years.",
    ca: "Els cardenals elegiren un italià sota els crits de la gentada romana, després fugiren, declararen l'elecció forçada i n'elegiren un altre. La cristiandat tingué dos papes, i els mantingué quaranta anys.",
  },
  1417: {
    en: "The Council at Constance made an end of it: one pope resigned, one was deposed, one was abandoned by all but a handful, and a single pope was chosen for the whole Church again.",
    ca: "El concili de Constança hi posà fi: un papa renuncià, un fou deposat, un fou abandonat per tothom llevat d'un grapat, i s'elegí un sol papa per a tota l'Església.",
  },
};

// The Avignon obedience of the Schism proper. Benedict XIII — Pedro de
// Luna, an Aragonese — was deposed at Constance in 1417 and simply
// refused to accept it, holding out at Peníscola on the Valencian coast
// with a handful of cardinals until his death.
const AVIGNON_ROWS: PopeRow[] = [
  [1378, 1394, "Clement VII", "Climent VII"],
  [1394, 1423, "Benedict XIII", "Benet XIII", "deposed"],
];

const AVIGNON_NOTES: Record<number, LocalText> = {
  // The same event as ROMAN_NOTES[1378], told from the other obedience —
  // which is the whole point of keeping the two lines apart. A parish in
  // Catalonia and a parish in England heard two different accounts of the
  // same fortnight, and each was told the other's pope was no pope.
  1378: {
    en: "The cardinals declared that the Italian they had crowned in April had been forced upon them by the Roman mob, and that the election was void; they chose another, who went to Avignon. Word was that the man at Rome refused to go, and that there were now two.",
    ca: "Els cardenals declararen que l'italià que havien coronat a l'abril els havia estat imposat per la gentada romana, i que l'elecció era nul·la; n'elegiren un altre, que anà a Avinyó. Es deia que el de Roma no volgué marxar, i que ara n'hi havia dos.",
  },
  1394: {
    en: "The cardinals at Avignon chose Pedro de Luna, an Aragonese, who took the name Benedict. He would outlast every attempt to be rid of him.",
    ca: "Els cardenals d'Avinyó elegiren Pere de Luna, aragonès, que prengué el nom de Benet. Sobrevisqué a tots els intents de desempallegar-se'n.",
  },
};

// Pisa, 1409: a council called to end the Schism deposed both existing
// popes and elected a third. Neither of the first two went anywhere.
const PISAN_ROWS: PopeRow[] = [
  [1409, 1410, "Alexander V", "Alexandre V"],
  [1410, 1415, "John XXIII", "Joan XXIII", "deposed"],
];

const PISAN_NOTES: Record<number, LocalText> = {
  1409: {
    en: "A council at Pisa deposed both popes and elected a third. Neither of the others accepted it, so where there had been two there were now three.",
    ca: "Un concili a Pisa deposà tots dos papes i n'elegí un tercer. Cap dels altres no ho acceptà, i on n'hi havia dos ara n'hi havia tres.",
  },
};

export const PAPAL_LINES: Record<PapalLine, Pontificate[]> = {
  roman: expand(ROMAN_ROWS, "roman", (from) => (from >= 1305 && from < 1378 ? "avignon" : "rome"), ROMAN_NOTES),
  avignon: expand(AVIGNON_ROWS, "avignon", () => "avignon", AVIGNON_NOTES),
  pisan: expand(PISAN_ROWS, "pisan", () => "pisa", PISAN_NOTES),
};

// ---- obedience ----
//
// Which line a region actually recognised, and when. Outside the years
// covered here every region is on the roman line, which is the whole
// point: before 1378 and after 1417 there is nothing to disagree about.
//
// `null` means the region recognised NO pope — which is not a gap in the
// data but a real and deliberately strange thing that happened: in 1398
// the French crown, tired of a schism its own candidate would not end,
// formally withdrew obedience from Benedict XIII and recognised nobody
// for five years, besieging him in his own palace at Avignon.

/** [from, to, line recognised — null for no obedience at all]. */
export type ObedienceSpan = [number, number, PapalLine | null];

export const OBEDIENCE: Record<string, ObedienceSpan[]> = {
  // Held to Rome from the first, then followed the Pisan line its own
  // clergy had helped call, then Martin V.
  england: [
    [1378, 1408, "roman"],
    [1409, 1415, "pisan"],
    [1416, 1416, null],
  ],
  // The Empire divided, but the crown and the greater part of Germany
  // stood with Rome, then with Pisa, then with Constance — which sat on
  // imperial soil at Sigismund's own summons.
  germany: [
    [1378, 1408, "roman"],
    [1409, 1415, "pisan"],
    [1416, 1416, null],
  ],
  // Italy is Rome's own ground; the Pisan line took much of the north and
  // Florence in particular, which had quarrelled with Rome for a decade.
  italy: [
    [1378, 1408, "roman"],
    [1409, 1415, "pisan"],
    [1416, 1416, null],
  ],
  // France made the Avignon pope and then unmade him: the subtraction of
  // obedience, 1398–1403, when the realm recognised no pope whatever.
  france: [
    [1378, 1397, "avignon"],
    [1398, 1402, null],
    [1403, 1408, "avignon"],
    [1409, 1415, "pisan"],
    [1416, 1416, null],
  ],
  // Castile deliberated for three years before declaring for Clement VII
  // at Medina del Campo, and left Benedict XIII in 1416.
  castile: [
    [1378, 1380, null],
    [1381, 1415, "avignon"],
    [1416, 1416, null],
  ],
  // The Crown of Aragon stayed neutral under Pere the Ceremonious and
  // declared for Avignon only under his son — then held to Benedict XIII,
  // its own countryman, longer than anyone but Scotland.
  catalonia: [
    [1378, 1386, null],
    [1387, 1415, "avignon"],
    [1416, 1416, null],
  ],
  // The most loyal of the Avignon obediences: Scotland kept Benedict XIII
  // a year past Constance, having recognised him for forty.
  scotland: [[1378, 1417, "avignon"]],
  // Portugal followed Castile toward Avignon, then reversed after
  // Aljubarrota and the English alliance that came with the house of Aviz.
  portugal: [
    [1378, 1384, "avignon"],
    [1385, 1408, "roman"],
    [1409, 1415, "pisan"],
    [1416, 1416, null],
  ],
};

/** Years of jubilee — a plenary indulgence for those who came to Rome and
 * kept the stations. Proclaimed for every hundredth year, then every
 * fiftieth, then (Urban VI, on the argument that no man lives to see two)
 * every thirty-third, which is why the list thickens as it goes. */
export const JUBILEES: readonly number[] = [1300, 1350, 1390, 1400, 1423, 1450, 1475, 1500];
