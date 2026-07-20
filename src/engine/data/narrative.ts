import type { Locale } from "../../i18n/locale.js";
import type { DeathCause, DocumentKind, SocialClass, TextureEvent, WorldEvent } from "../types.js";
import { CLASS_INFO } from "./classes.js";

export const SRC: Record<Locale, Record<DocumentKind, string>> = {
  en: {
    reg: "Parish register",
    court: "Manor court roll",
    coroner: "Coroner's roll",
    will: "Register of wills",
    chron: "Town chronicle",
    account: "Manorial account",
  },
  ca: {
    reg: "Registre parroquial",
    court: "Rotlle de la cort del senyor",
    coroner: "Rotlle del forense",
    will: "Registre de testaments",
    chron: "Crònica de la vila",
    account: "Compte senyorial",
  },
};

export const DEATH_DETAIL: Record<Locale, Record<DeathCause, string[]>> = {
  en: {
    plague: [
      "died of the pestilence, the swellings rising in the groin and armpit; dead within four days",
      "took the plague and died on the third day, buried quickly, for the priests could not keep pace with the dying",
      "died of the pestilence in its most sudden form, well at dawn and dead by nightfall",
    ],
    famine: ["died in the great hunger, weakened by failed harvests, of starvation and the fluxes that follow it"],
    war: [
      "was killed when soldiers came through the district, burning and taking what they would",
      "died of camp fever on campaign, as most soldiers did — disease killed far more than the sword",
      "was cut down in a skirmish",
    ],
    infancy: [
      "died in the first weeks of life, of the fevers that took so many newborns",
      "died before the first year was out, of the summer flux",
      "died in the cradle; the register says only 'infans'",
    ],
    childhood: [
      "died of the smallpox, which ran through the village children that year",
      "died of the measles and the fever that followed",
      "died of the bloody flux after the harvest",
      "drowned in the millpond, as the coroner's roll recorded of so many children",
    ],
    childbirth: ["died in childbed, of the fever that followed the birth, as roughly one mother in a hundred did with each delivery"],
    disease: [
      "died of a tertian fever that would not break",
      "died of the bloody flux",
      "died of a consumption of the lungs, wasting through a winter",
      "died of a wound gone bad — a cut that festered",
      "died suddenly, of what the record calls an apoplexy",
      "drowned crossing the river at the ford",
      "died of a fall from a cart",
    ],
    oldage: [
      "died full of years, of age and infirmity, having received the last rites",
      "died quietly in the winter, of the cold and a catarrh settling on the chest",
    ],
  },
  ca: {
    plague: [
      "va morir de la pesta, amb els bonys que se li inflaven a l'engonal i sota les aixelles: en quatre dies ja havia mort",
      "va agafar la pesta i va morir al tercer dia; l'enterrament va ser de pressa, perquè els capellans no donaven l'abast amb els morts",
      "va morir de la manera més sobtada de la pesta: {{bo/bona}} a trenc d'alba i {{mort/morta}} abans que caigués la nit",
    ],
    famine: ["va morir en la gran fam, {{afeblit/afeblida}} per les collites perdudes, de fam i dels fluxos que solen seguir-la"],
    war: [
      "va morir quan uns soldats van passar pel districte, cremant i prenent tot el que volien",
      "va morir de febre de campament en campanya, com la majoria de soldats — la malaltia matava molts més que no pas l'espasa",
      "va caure {{mort/morta}} en una escaramussa",
    ],
    infancy: [
      "va morir en les primeres setmanes de vida, de les febres que s'enduien tants nadons",
      "va morir abans de complir un any, del flux d'estiu",
      "va morir al bressol; el registre només diu «infans»",
    ],
    childhood: [
      "va morir de verola, que aquell any va córrer entre els nens del poble",
      "va morir de xarampió i de la febre que en va seguir",
      "va morir de flux de sang després de la collita",
      "es va negar a la bassa del molí, tal com el rotlle del forense va anotar de tants altres infants",
    ],
    childbirth: ["va morir de part, de la febre que va seguir el naixement, com li passava a poc més o menys una mare de cada cent en cada part"],
    disease: [
      "va morir d'una febre terçana que no li baixava mai",
      "va morir de flux de sang",
      "va morir d'una consumpció dels pulmons, consumint-se al llarg d'un hivern",
      "va morir d'una ferida que es va gangrenar — un tall que li va acabar podrint",
      "va morir de sobte, del que el registre anomena una apoplexia",
      "es va negar travessant el riu pel gual",
      "va morir d'una caiguda del carro",
    ],
    oldage: [
      "va morir ple d'anys, de vellesa i d'infermetat, després de rebre els darrers sagraments",
      "va morir tranquil·lament a l'hivern, del fred i d'un constipat que se li va instal·lar al pit",
    ],
  },
};

export const CAUSE_LABEL: Record<Locale, Record<DeathCause, string>> = {
  en: {
    plague: "Plague",
    famine: "Famine",
    war: "War",
    infancy: "Infancy",
    childhood: "Childhood disease",
    childbirth: "Childbirth",
    disease: "Disease",
    oldage: "Old age",
  },
  ca: {
    plague: "Pesta",
    famine: "Fam",
    war: "Guerra",
    infancy: "Infantesa",
    childhood: "Malaltia infantil",
    childbirth: "Part",
    disease: "Malaltia",
    oldage: "Vellesa",
  },
};

export const FATHER_OCC: Record<Locale, Record<SocialClass, string[]>> = {
  en: {
    serf: [
      "held {land} of {lord} by servile tenure, owing week-work and boon-work",
      "ploughed the demesne of {lord} three days a week as a bound tenant",
      "held a toft and croft in villeinage under {lord}, and paid merchet when his daughters married",
    ],
    freePeasant: [
      "farmed {land} at money rent as a free tenant",
      "kept his own plough-team as a yeoman",
      "held {land} and served his turn in the village offices",
    ],
    artisan: [
      "worked as the village {craft}, his forge-mark known through the parish",
      "kept the {craft}'s shop by the church",
      "was the parish {craft}, and trained his sons to it",
    ],
    merchant: ["traded cloth and small wares to the market towns", "kept a stall at the weekly market and lent money quietly"],
    clergyFamily: ["served as parish clerk and kept the church accounts", "was a notary in minor orders, drawing wills and contracts"],
    gentry: ["held the manor and a seat at the sessions", "was an esquire with two manors, and men owed him suit of court"],
  },
  ca: {
    serf: [
      "tenia {land} de {lord} en tinença servil, i devia setmanera i jornades de prestació",
      "llaurava el domini de {lord} tres dies per setmana com a colon adscrit a la terra",
      "tenia un mas i un hort en vilatania sota {lord}, i li pagava un dret quan es casaven les filles",
    ],
    freePeasant: [
      "conreava {land} a canvi d'un cens en diners, com a pagès lliure",
      "tenia el seu propi jou de bous, com a pagès benestant",
      "tenia {land} i complia el seu torn en els càrrecs del poble",
    ],
    artisan: [
      "treballava com a {craft} del poble, i la seva marca de forja era coneguda per tota la parròquia",
      "portava el taller de {craft} vora l'església",
      "era el {craft} de la parròquia, i hi va formar els seus fills",
    ],
    merchant: ["comerciava amb draps i mercaderies menudes cap a les viles de mercat", "tenia una parada al mercat setmanal i prestava diners discretament"],
    clergyFamily: ["feia de clergue de la parròquia i portava els comptes de l'església", "era notari en ordes menors, i redactava testaments i contractes"],
    gentry: ["tenia el senyoriu i un escó a les sessions", "era escuder amb dues senyories, i homes li devien obligacions de cort"],
  },
};

export const WORLD_EVENTS: Record<Locale, WorldEvent[]> = {
  en: [
    [
      1319,
      1321,
      ["england", "france", "germany"],
      6,
      0.8,
      "hardship",
      "account",
      (p) =>
        `The great murrain struck: cattle and oxen died across the whole country, the plough-teams with them. The manorial account for those years records the herd ${CLASS_INFO[p.cls].wealth <= 2 ? "lost and the land half-tilled for two seasons" : "replaced at ruinous cost"}.`,
    ],
    [
      1356,
      1356,
      ["germany"],
      4,
      0.6,
      "hardship",
      "chron",
      () =>
        "On St Luke's day the earth shook — the great earthquake that threw down the towers of Basel. Even at a distance walls cracked and everyone slept out of doors for a week.",
    ],
    [
      1362,
      1362,
      ["england", "germany"],
      4,
      0.5,
      "hardship",
      "chron",
      () =>
        "The Great Wind of January 1362 — the storm the chronicles called Grote Mandrenke — tore the roof from the church and flattened barns across the district.",
    ],
    [
      1378,
      1380,
      null,
      12,
      0.5,
      "life",
      "chron",
      () =>
        "Word came that there were now two popes, one at Rome and one at Avignon, each cursing the other. The priest could not say which was the true one; folk paid their tithes and hoped God would sort it out.",
    ],
    [
      1391,
      1391,
      ["catalonia"],
      8,
      0.55,
      "war",
      "chron",
      () =>
        "That summer mobs attacked the Jewish quarters in the cities — Barcelona, Girona, València. Many were killed or forced to the font; the calls stood half-empty ever after. It was spoken of for a generation.",
    ],
    [
      1407,
      1408,
      null,
      4,
      0.4,
      "hardship",
      "chron",
      () =>
        "The great frost of that winter: rivers froze to the bed, birds fell dead from the trees, and wine was cut with an axe. The old said no winter like it had been known.",
    ],
    [
      1414,
      1418,
      ["germany"],
      12,
      0.45,
      "life",
      "chron",
      () =>
        "The great Council sat at Constance to heal the Schism — three popes deposed or resigned, one elected, and the Bohemian preacher Hus burned, which set Bohemia alight.",
    ],
    [
      1428,
      1428,
      ["catalonia"],
      4,
      0.7,
      "hardship",
      "chron",
      () =>
        "On Candlemas the earth shook — the terratrèmol that ruined churches from the Pyrenees to Girona, where the falling vault killed worshippers at mass. Aftershocks came for weeks and people confessed in the streets.",
    ],
    [
      1429,
      1431,
      ["france"],
      10,
      0.6,
      "life",
      "chron",
      () =>
        "News ran through the country of the Maid — Jeanne, the peasant girl who raised the siege of Orléans and led the Dauphin to be crowned at Reims. Two years later came the word that the English had burned her at Rouen.",
    ],
    [
      1450,
      1450,
      ["italy"],
      15,
      0.4,
      "life",
      "chron",
      () =>
        "A Jubilee year at Rome: the roads south filled with pilgrims from every nation. So great was the crush that hundreds died on the bridge of Sant'Angelo.",
    ],
    [
      1453,
      1454,
      null,
      12,
      0.5,
      "life",
      "chron",
      () =>
        "Terrible news came from the east: Constantinople, the great city of the Greeks, had fallen to the Turk. Preachers called for crusade; princes promised much and did nothing.",
    ],
    [
      1456,
      1456,
      null,
      6,
      0.5,
      "life",
      "chron",
      () =>
        "A great comet burned in the sky for weeks — a hairy star, taken by all as an omen. The Pope ordered prayers against it and against the Turk in the same breath.",
    ],
    [
      1460,
      1475,
      ["germany"],
      14,
      0.3,
      "life",
      "chron",
      (p) =>
        p.literate
          ? "Saw one of the new printed books, made with movable letters at Mainz — a whole Bible, each copy the twin of the last — and understood the world had changed."
          : "Heard of the new art of printing books with metal letters, by which a man at Mainz made a hundred Bibles in the time a scribe made one. Few in the village believed it.",
    ],
  ],
  ca: [
    [
      1319,
      1321,
      ["england", "france", "germany"],
      6,
      0.8,
      "hardship",
      "account",
      (p) =>
        `Va esclatar la gran pesta bovina: bous i vaques van morir per tot el país, i amb ells les colles de llaurada. El compte del manso d'aquells anys registra el ramat ${CLASS_INFO[p.cls].wealth <= 2 ? "perdut, i la terra només mig llaurada durant dues temporades" : "reposat a preu de ruïna"}.`,
    ],
    [
      1356,
      1356,
      ["germany"],
      4,
      0.6,
      "hardship",
      "chron",
      () =>
        "El dia de Sant Lluc va tremolar la terra — el gran terratrèmol que va enderrocar les torres de Basilea. Fins i tot a distància es van esquerdar parets, i tothom va dormir a la intempèrie durant una setmana.",
    ],
    [
      1362,
      1362,
      ["england", "germany"],
      4,
      0.5,
      "hardship",
      "chron",
      () =>
        "El Gran Vent del gener de 1362 — la tempesta que les cròniques van anomenar Grote Mandrenke — va arrencar el sostre de l'església i va aplanar graners per tot el districte.",
    ],
    [
      1378,
      1380,
      null,
      12,
      0.5,
      "life",
      "chron",
      () =>
        "Va arribar la notícia que ara hi havia dos papes, un a Roma i un altre a Avinyó, i cadascun maleïa l'altre. El capellà no sabia dir quin era el vertader; la gent pagava els delmes i esperava que Déu ho resolgués.",
    ],
    [
      1391,
      1391,
      ["catalonia"],
      8,
      0.55,
      "war",
      "chron",
      () =>
        "Aquell estiu unes turbes van atacar els calls jueus de les ciutats — Barcelona, Girona, València. Molts van morir o van ser forçats a la pica baptismal; els calls van quedar mig buits per sempre més. Se'n va parlar durant tota una generació.",
    ],
    [
      1407,
      1408,
      null,
      4,
      0.4,
      "hardship",
      "chron",
      () =>
        "La gran gelada d'aquell hivern: els rius es van glaçar fins al fons, els ocells queien morts dels arbres, i calia tallar el vi amb destral. Els vells deien que mai s'havia conegut un hivern així.",
    ],
    [
      1414,
      1418,
      ["germany"],
      12,
      0.45,
      "life",
      "chron",
      () =>
        "El gran Concili es va reunir a Constança per posar fi al Cisma — tres papes deposats o dimitits, un d'elegit, i el predicador bohemi Hus cremat, cosa que va encendre Bohèmia.",
    ],
    [
      1428,
      1428,
      ["catalonia"],
      4,
      0.7,
      "hardship",
      "chron",
      () =>
        "Per la Candelera va tremolar la terra — el terratrèmol que va arruïnar esglésies des dels Pirineus fins a Girona, on la volta caiguda va matar fidels que sentien missa. Les rèpliques van durar setmanes i la gent es confessava als carrers.",
    ],
    [
      1429,
      1431,
      ["france"],
      10,
      0.6,
      "life",
      "chron",
      () =>
        "Va córrer pel país la notícia de la Donzella — Jeanne, la pagesa que va aixecar el setge d'Orleans i va portar el Dofí a coronar-se a Reims. Dos anys després va arribar la notícia que els anglesos l'havien cremada a Rouen.",
    ],
    [
      1450,
      1450,
      ["italy"],
      15,
      0.4,
      "life",
      "chron",
      () =>
        "Any de Jubileu a Roma: els camins del sud es van omplir de pelegrins de totes les nacions. Va ser tanta l'aglomeració que centenars van morir al pont de Sant'Angelo.",
    ],
    [
      1453,
      1454,
      null,
      12,
      0.5,
      "life",
      "chron",
      () =>
        "Van arribar notícies terribles de l'orient: Constantinoble, la gran ciutat dels grecs, havia caigut en mans del turc. Els predicadors cridaven a la croada; els prínceps prometien molt i no feien res.",
    ],
    [
      1456,
      1456,
      null,
      6,
      0.5,
      "life",
      "chron",
      () =>
        "Un gran cometa va cremar al cel durant setmanes — una estrella cabelluda, presa per tothom com un averany. El Papa va ordenar pregàries contra ell i contra el turc alhora.",
    ],
    [
      1460,
      1475,
      ["germany"],
      14,
      0.3,
      "life",
      "chron",
      (p) =>
        p.literate
          ? "Va veure un d'aquells nous llibres impresos, fets amb lletres mòbils a Magúncia — una Bíblia sencera, cada exemplar bessó de l'altre — i va entendre que el món havia canviat."
          : "Va sentir parlar de la nova art d'imprimir llibres amb lletres de metall, amb què un home de Magúncia feia cent Bíblies en el temps que un escrivà en feia una. Poca gent del poble s'ho creia.",
    ],
  ],
};

export const CHILD_EVENTS: Record<Locale, TextureEvent[]> = {
  en: [
    ["Caught the smallpox and survived it, though it left {pos} face pitted for life.", 1.2, null],
    ["Was set to work at seven, scaring crows from the seed corn and gleaning at harvest, as every child of the village was.", 1.5, null],
    ["Nearly drowned in the river in summer and was pulled out by a neighbour — a vow of a candle to St Nicholas was made and kept.", 0.8, null],
    ["Saw the Corpus Christi plays in the town — Noah's flood with a real ark on wheels — and talked of nothing else for a year.", 1, null],
    ["Was taught letters by the parish priest, who thought {obj} quick.", 0.7, "literate"],
  ],
  ca: [
    ["Va agafar la verola i la va superar, tot i que li va deixar la cara marcada de per vida.", 1.2, null],
    ["Va començar a treballar als set anys, espantant corbs del blat de sement i espigolant a l'estiu, com feien tots els infants del poble.", 1.5, null],
    [
      "Gairebé es va negar al riu un estiu, i un veí {{el/la}} va treure a temps de l'aigua — es va fer, i complir, la promesa d'un ciri a Sant Nicolau.",
      0.8,
      null,
    ],
    [
      "Va veure les representacions de Corpus Christi a la vila — el diluvi de Noè amb una arca de veritat sobre rodes — i no va parlar de res més durant un any.",
      1,
      null,
    ],
    ["El capellà de la parròquia li va ensenyar les lletres, perquè el va trobar {{espavilat/espavilada}}.", 0.7, "literate"],
  ],
};
export const YOUTH_EVENTS: Record<Locale, TextureEvent[]> = {
  en: [
    ["Was sent into service in another household, as was the custom — years of board, wages, and learning another family's ways.", 1.2, "nw"],
    ["A betrothal was arranged and then broken off when the families could not agree the dowry; there was bad blood over it for years.", 0.8, null],
    ["Was fined in the manor court for taking hares from the lord's warren with snares.", 0.8, "court"],
    ["Won the wrestling at the summer fair, and was remembered for it longer than for anything else.", 0.7, null],
    ["Practised at the butts every Sunday after mass, as the law required of every able man.", 0.6, "englandM"],
  ],
  ca: [
    ["Va anar a servir a una altra casa, com era costum — anys de dispesa, jornal, i aprenent els costums d'una altra família.", 1.2, "nw"],
    [
      "Es va concertar un esponsalici que després es va desfer perquè les famílies no es van posar d'acord amb el dot; en va quedar mala sang durant anys.",
      0.8,
      null,
    ],
    ["Va ser {{multat/multada}} a la cort del senyor per caçar llebres amb llaços a la conillera senyorial.", 0.8, "court"],
    ["Va guanyar la lluita a la fira d'estiu, i se'n va parlar més anys que de qualsevol altra cosa que fes.", 0.7, null],
    ["Practicava tir amb arc cada diumenge després de missa, com la llei exigia a tot home capaç.", 0.6, "englandM"],
  ],
};
export const ADULT_EVENTS: Record<Locale, TextureEvent[]> = {
  en: [
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
    [
      "When a widower of the village remarried a girl thirty years younger, joined the crowd that gave them the charivari — pans, horns, and mockery under the window till midnight.",
      0.6,
      null,
    ],
  ],
  ca: [
    [
      "Una nit de tardor el foc va cremar la casa — palla i fusta perdudes en una hora. Els veïns van ajudar a aixecar un nou envelat abans de l'hivern.",
      1,
      null,
    ],
    ["Va acollir dos infants orfes de parents morts després d'un any de pesta, i els va criar juntament amb els seus propis.", 0.9, null],
    ["Va fer de {{padrí/padrina}} en el bateig d'un infant del veïnat — un lligam de {{compare/comare}} tan seriós com el de sang.", 1, null],
    ["Es va afiliar a la confraria de la parròquia, pagant la candela anual per les misses de difunts i un enterrament digne.", 1, null],
    [
      "Va ser {{citat/citada}} davant el tribunal eclesiàstic per delmes impagats de xais i llana, i va fer penitència en lloc de pagar la multa.",
      0.7,
      "court",
    ],
    ["Un veí {{el/la}} va acusar de difamació — paraules dures al pou — i va haver de purgar l'ofensa davant l'ardiaca.", 0.7, "court"],
    ["Un hivern dur va fer baixar llops dels boscos alts; es va vigilar la cleda amb focs fins a Quaresma.", 0.6, null],
    ["Va passar un rodamon venent indulgències i una ploma de l'àngel Gabriel; es va pagar un diner, i després se'n va dubtar.", 0.8, null],
    [
      "Va caure greument {{malalt/malalta}}, va rebre els darrers sagraments — i després, per meravella de tota la parròquia, es va refer. Va viure la resta dels dies com {{un tornat/una tornada}} de l'altre món.",
      0.8,
      null,
    ],
    ["Va comprar {land} més de terra a un veí arruïnat per deutes — escripturat, segellat i testimoniat a la porta de l'església.", 0.9, "court"],
    ["Va ser {{multat/multada}} a la cort del senyor per {courtcause}.", 1.4, "court"],
    [
      "Quan un vidu del poble es va tornar a casar amb una noia trenta anys més jove, es va sumar a la colla que els va fer el xivarri — cassoles, banyes i burles sota la finestra fins mitjanit.",
      0.6,
      null,
    ],
  ],
};
export const COURT_CAUSES: Record<Locale, string[]> = {
  en: [
    "letting beasts stray into the lord's corn",
    "brewing ale against the assize",
    "an affray with a neighbour over a boundary stone",
    "gleaning before the sheaves were carried",
    "taking firewood from the lord's coppice",
  ],
  ca: [
    "deixar que el bestiar entrés al blat del senyor",
    "elaborar cervesa contra l'ordenança de preus",
    "una batussa amb un veí per una fita de terme",
    "espigolar abans que s'haguessin retirat les garbes",
    "agafar llenya del bosc del senyor",
  ],
};
export const FEMALE_EVENTS: Record<Locale, TextureEvent[]> = {
  en: [
    ["Was churched after each childbed with candles and a feast — her return to the world marked as it was for every mother.", 1, null],
    [
      "Was presented in the manor court, as most brewing women were, for selling ale before it was tasted — the fine treated by all as a licence fee.",
      1,
      "court",
    ],
  ],
  ca: [
    ["Va ser beneïda a l'església després de cada part, amb ciris i un àpat — el seu retorn al món marcat, com el de totes les mares.", 1, null],
    [
      "Va ser presentada a la cort del senyor, com la majoria de dones cerveseres, per vendre cervesa abans de ser tastada — una multa que tothom tractava com si fos una llicència.",
      1,
      "court",
    ],
  ],
};
export const OLD_EVENTS: Record<Locale, TextureEvent[]> = {
  en: [
    [
      "Grew too old to work the holding and made a maintenance agreement before the manor court: the land passed to the next generation in exchange for a room by the fire, food at table, and boots each winter — all written down, for kindness was not left to chance.",
      2,
      "court",
    ],
    [
      "Dictated a will to the parish clerk: the bed and brass pot named heirloom by heirloom, pence for the church fabric, and bread for the poor at the funeral.",
      1.2,
      "will",
    ],
    ["Became the oldest in the parish, called on to swear to the ancient boundaries and customs — living memory serving as the law's record.", 1, "court"],
  ],
  ca: [
    [
      "Es va fer massa gran per treballar la terra i va signar un acord de manteniment davant la cort del senyor: la terra passava a la generació següent a canvi d'un racó vora el foc, menjar a taula i sabates cada hivern — tot per escrit, perquè la bondat no es deixava a l'atzar.",
      2,
      "court",
    ],
    [
      "Va dictar testament al clergue de la parròquia: el llit i l'olla de llautó anomenats peça per peça, diners per a la fàbrica de l'església, i pa per als pobres a l'enterrament.",
      1.2,
      "will",
    ],
    [
      "Es va convertir en {{el més vell/la més vella}} de la parròquia, {{cridat/cridada}} a jurar els límits i costums antics — la memòria viva servint de registre de la llei.",
      1,
      "court",
    ],
  ],
};
