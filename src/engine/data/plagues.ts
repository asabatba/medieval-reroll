import type { Plague } from "../types.js";

export const PLAGUES: Plague[] = [
  [1347, 1351, 14, { en: "the Great Mortality — the Black Death", ca: "la Gran Mortaldat — la Pesta Negra" }, 0],
  [
    1361,
    1363,
    6,
    { en: "the second pestilence, which they called the children's plague", ca: "la segona pestilència, que anomenaven la pesta dels infants" },
    1.6,
  ],
  [1369, 1370, 4, { en: "the third pestilence", ca: "la tercera pestilència" }, 1.2],
  [1374, 1375, 3.5, { en: "the fourth pestilence", ca: "la quarta pestilència" }, 1],
  [1390, 1391, 3, { en: "the pestilence of 1390", ca: "la pestilència de 1390" }, 1.2],
  [1400, 1401, 3.5, { en: "the great plague of 1400", ca: "la gran pesta de 1400" }, 1],
  [1411, 1412, 2.5, { en: "the pestilence of 1411", ca: "la pestilència de 1411" }, 1],
  [1420, 1421, 2.5, { en: "the plague of 1420", ca: "la pesta de 1420" }, 1.2],
  [1433, 1435, 3, { en: "the pestilence of the 1430s", ca: "la pestilència dels anys 1430" }, 1],
  [1438, 1439, 3, { en: "the plague and famine of 1438–39", ca: "la pesta i la fam de 1438–39" }, 1],
  [1450, 1452, 2.5, { en: "the mid-century pestilence", ca: "la pestilència de mig segle" }, 1.2],
  [1463, 1465, 2.5, { en: "the plague of the 1460s", ca: "la pesta dels anys 1460" }, 1],
  [1471, 1473, 2.5, { en: "the pestilence of 1471", ca: "la pestilència de 1471" }, 1.2],
  [1479, 1480, 3, { en: "the great plague of 1479–80", ca: "la gran pesta de 1479–80" }, 1],
  [1485, 1486, 2, { en: "the sweating sickness", ca: "la malaltia de la suor" }, 0.5],
];

export function plagueAt(year: number): Plague | null {
  for (const p of PLAGUES) if (year >= p[0] && year <= p[1]) return p;
  return null;
}
