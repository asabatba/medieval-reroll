export const SRC = { reg: "Parish register", court: "Manor court roll", coroner: "Coroner's roll", will: "Register of wills", chron: "Town chronicle", account: "Manorial account" };

export const DEATH_DETAIL = {
  plague: ["died of the pestilence, the swellings rising in the groin and armpit; dead within four days", "took the plague and died on the third day, buried quickly, for the priests could not keep pace with the dying", "died of the pestilence in its most sudden form, well at dawn and dead by nightfall"],
  famine: ["died in the great hunger, weakened by failed harvests, of starvation and the fluxes that follow it"],
  war: ["was killed when soldiers came through the district, burning and taking what they would", "died of camp fever on campaign, as most soldiers did — disease killed far more than the sword", "was cut down in a skirmish"],
  infancy: ["died in the first weeks of life, of the fevers that took so many newborns", "died before the first year was out, of the summer flux", "died in the cradle; the register says only 'infans'"],
  childhood: ["died of the smallpox, which ran through the village children that year", "died of the measles and the fever that followed", "died of the bloody flux after the harvest", "drowned in the millpond, as the coroner's roll recorded of so many children"],
  childbirth: ["died in childbed, of the fever that followed the birth, as roughly one mother in a hundred did with each delivery"],
  disease: ["died of a tertian fever that would not break", "died of the bloody flux", "died of a consumption of the lungs, wasting through a winter", "died of a wound gone bad — a cut that festered", "died suddenly, of what the record calls an apoplexy", "drowned crossing the river at the ford", "died of a fall from a cart"],
  oldage: ["died full of years, of age and infirmity, having received the last rites", "died quietly in the winter, of the cold and a catarrh settling on the chest"]
};

export const CAUSE_LABEL = { plague: "Plague", famine: "Famine", war: "War", infancy: "Infancy", childhood: "Childhood disease", childbirth: "Childbirth", disease: "Disease", oldage: "Old age" };

export const FATHER_OCC = {
  serf: ["held {land} of the lord by servile tenure, owing week-work and boon-work", "ploughed the lord's demesne three days a week as a bound tenant", "held a toft and croft in villeinage, and paid merchet when his daughters married"],
  freePeasant: ["farmed {land} at money rent as a free tenant", "kept his own plough-team as a yeoman", "held {land} and served his turn in the village offices"],
  artisan: ["worked as the village {craft}, his forge-mark known through the parish", "kept the {craft}'s shop by the church", "was the parish {craft}, and trained his sons to it"],
  merchant: ["traded cloth and small wares to the market towns", "kept a stall at the weekly market and lent money quietly"],
  clergyFamily: ["served as parish clerk and kept the church accounts", "was a notary in minor orders, drawing wills and contracts"],
  gentry: ["held the manor and a seat at the sessions", "was an esquire with two manors, and men owed him suit of court"]
};

export const WORLD_EVENTS = [
  [1319, 1321, ["england", "france", "germany"], 6, 0.8, "hardship", SRC.account, p => `The great murrain struck: cattle and oxen died across the whole country, the plough-teams with them. The manorial account for those years records the herd ${p.wealth <= 2 ? "lost and the land half-tilled for two seasons" : "replaced at ruinous cost"}.`],
  [1356, 1356, ["germany"], 4, 0.6, "hardship", SRC.chron, p => `On St Luke's day the earth shook — the great earthquake that threw down the towers of Basel. Even at a distance walls cracked and everyone slept out of doors for a week.`],
  [1362, 1362, ["england", "germany"], 4, 0.5, "hardship", SRC.chron, p => `The Great Wind of January 1362 — the storm the chronicles called Grote Mandrenke — tore the roof from the church and flattened barns across the district.`],
  [1378, 1380, null, 12, 0.5, "life", SRC.chron, p => `Word came that there were now two popes, one at Rome and one at Avignon, each cursing the other. The priest could not say which was the true one; folk paid their tithes and hoped God would sort it out.`],
  [1391, 1391, ["catalonia"], 8, 0.55, "war", SRC.chron, p => `That summer mobs attacked the Jewish quarters in the cities — Barcelona, Girona, València. Many were killed or forced to the font; the calls stood half-empty ever after. It was spoken of for a generation.`],
  [1407, 1408, null, 4, 0.4, "hardship", SRC.chron, p => `The great frost of that winter: rivers froze to the bed, birds fell dead from the trees, and wine was cut with an axe. The old said no winter like it had been known.`],
  [1414, 1418, ["germany"], 12, 0.45, "life", SRC.chron, p => `The great Council sat at Constance to heal the Schism — three popes deposed or resigned, one elected, and the Bohemian preacher Hus burned, which set Bohemia alight.`],
  [1428, 1428, ["catalonia"], 4, 0.7, "hardship", SRC.chron, p => `On Candlemas the earth shook — the terratrèmol that ruined churches from the Pyrenees to Girona, where the falling vault killed worshippers at mass. Aftershocks came for weeks and people confessed in the streets.`],
  [1429, 1431, ["france"], 10, 0.6, "life", SRC.chron, p => `News ran through the country of the Maid — Jeanne, the peasant girl who raised the siege of Orléans and led the Dauphin to be crowned at Reims. Two years later came the word that the English had burned her at Rouen.`],
  [1450, 1450, ["italy"], 15, 0.4, "life", SRC.chron, p => `A Jubilee year at Rome: the roads south filled with pilgrims from every nation. So great was the crush that hundreds died on the bridge of Sant'Angelo.`],
  [1453, 1454, null, 12, 0.5, "life", SRC.chron, p => `Terrible news came from the east: Constantinople, the great city of the Greeks, had fallen to the Turk. Preachers called for crusade; princes promised much and did nothing.`],
  [1456, 1456, null, 6, 0.5, "life", SRC.chron, p => `A great comet burned in the sky for weeks — a hairy star, taken by all as an omen. The Pope ordered prayers against it and against the Turk in the same breath.`],
  [1460, 1475, ["germany"], 14, 0.3, "life", SRC.chron, p => p.literate
    ? `Saw one of the new printed books, made with movable letters at Mainz — a whole Bible, each copy the twin of the last — and understood the world had changed.`
    : `Heard of the new art of printing books with metal letters, by which a man at Mainz made a hundred Bibles in the time a scribe made one. Few in the village believed it.`],
];

export const CHILD_EVENTS = [
  ["Caught the smallpox and survived it, though it left {pos} face pitted for life.", 1.2, null],
  ["Was set to work at seven, scaring crows from the seed corn and gleaning at harvest, as every child of the village was.", 1.5, null],
  ["Nearly drowned in the river in summer and was pulled out by a neighbour — a vow of a candle to St Nicholas was made and kept.", 0.8, null],
  ["Saw the Corpus Christi plays in the town — Noah's flood with a real ark on wheels — and talked of nothing else for a year.", 1, null],
  ["Was taught letters by the parish priest, who thought {obj} quick.", 0.7, "literate"],
];

export const YOUTH_EVENTS = [
  ["Was sent into service in another household, as was the custom — years of board, wages, and learning another family's ways.", 1.2, "nw"],
  ["A betrothal was arranged and then broken off when the families could not agree the dowry; there was bad blood over it for years.", 0.8, null],
  ["Was fined in the manor court for taking hares from the lord's warren with snares.", 0.8, "court"],
  ["Won the wrestling at the summer fair, and was remembered for it longer than for anything else.", 0.7, null],
  ["Practised at the butts every Sunday after mass, as the law required of every able man.", 0.6, "englandM"],
];

export const ADULT_EVENTS = [
  ["Fire took the house one autumn night — thatch and timber gone in an hour. Neighbours helped raise a new frame before winter.", 1, null],
  ["Took in two orphaned children of dead kin after a plague year, and raised them with {pos} own.", 0.9, null],
  ["Stood godparent to a neighbour's child — a bond of gossipred taken as seriously as blood.", 1, null],
  ["Joined the confraternity of the parish, paying the yearly candle-money for prayers after death and a decent funeral.", 1, null],
  ["Was cited before the church court over unpaid tithes of lambs and wool, and did penance rather than pay the fine.", 0.7, "court"],
  ["Was accused of defamation by a neighbour — hot words at the well — and had to purge the offence before the archdeacon.", 0.7, "court"],
  ["A hard winter brought wolves down from the high woods; the sheepfold was watched with fires until Lent.", 0.6, null],
  ["A pardoner came through selling indulgences and a feather of the angel Gabriel; a penny was paid, and doubted after.", 0.8, null],
  ["Fell gravely ill, received the last rites — and then, to the wonder of the parish, recovered. Lived ever after as one returned.", 0.8, null],
  ["Bought several more {land} of land from a neighbour ruined by debt — written, sealed, and witnessed at the church door.", 0.9, "court"],
  ["Was fined in the manor court for {courtcause}.", 1.4, "court"],
  ["When a widower of the village remarried a girl thirty years younger, joined the crowd that gave them the charivari — pans, horns, and mockery under the window till midnight.", 0.6, null],
];

export const COURT_CAUSES = ["letting beasts stray into the lord's corn", "brewing ale against the assize", "an affray with a neighbour over a boundary stone", "gleaning before the sheaves were carried", "taking firewood from the lord's coppice"];

export const FEMALE_EVENTS = [
  ["Was churched after each childbed with candles and a feast — her return to the world marked as it was for every mother.", 1, null],
  ["Was presented in the manor court, as most brewing women were, for selling ale before it was tasted — the fine treated by all as a licence fee.", 1, "court"],
];

export const OLD_EVENTS = [
  ["Grew too old to work the holding and made a maintenance agreement before the manor court: the land passed to the next generation in exchange for a room by the fire, food at table, and boots each winter — all written down, for kindness was not left to chance.", 2, "court"],
  ["Dictated a will to the parish clerk: the bed and brass pot named heirloom by heirloom, pence for the church fabric, and bread for the poor at the funeral.", 1.2, "will"],
  ["Became the oldest in the parish, called on to swear to the ancient boundaries and customs — living memory serving as the law's record.", 1, "court"],
];
