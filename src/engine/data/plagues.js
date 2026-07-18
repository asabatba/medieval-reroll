export const PLAGUES = [
  [1347, 1351, 14, "the Great Mortality — the Black Death", 0],
  [1361, 1363, 6, "the second pestilence, which they called the children's plague", 1.6],
  [1369, 1370, 4, "the third pestilence", 1.2],
  [1374, 1375, 3.5, "the fourth pestilence", 1],
  [1390, 1391, 3, "the pestilence of 1390", 1.2],
  [1400, 1401, 3.5, "the great plague of 1400", 1],
  [1411, 1412, 2.5, "the pestilence of 1411", 1],
  [1420, 1421, 2.5, "the plague of 1420", 1.2],
  [1433, 1435, 3, "the pestilence of the 1430s", 1],
  [1438, 1439, 3, "the plague and famine of 1438–39", 1],
  [1450, 1452, 2.5, "the mid-century pestilence", 1.2],
  [1463, 1465, 2.5, "the plague of the 1460s", 1],
  [1471, 1473, 2.5, "the pestilence of 1471", 1.2],
  [1479, 1480, 3, "the great plague of 1479–80", 1],
  [1485, 1486, 2, "the sweating sickness", 0.5],
];

export function plagueAt(year) {
  for (const p of PLAGUES) if (year >= p[0] && year <= p[1]) return p;
  return null;
}
