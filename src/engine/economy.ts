// =====================================================================
// § the price of bread — what a year, and a holding, were worth.
//
// data/economy.ts holds the series and the tariff; this turns them into
// the three things the model could not previously say.
//
//  1. WHAT A YEAR COST. `wheatPriceAt` applies the year's own harvest to
//     the price trend, and it does so with the inverse elasticity the
//     grain series actually show — which is the reason a subsistence
//     crisis is a crisis. A tenth off the crop does not put a tenth on
//     the price; it puts a third on it, and half a crop can quadruple it.
//     That non-linearity is the single most important economic fact of a
//     grain economy, and it is why the same failed harvest that merely
//     inconveniences a virgater destroys a cottar.
//
//  2. WHAT A DAY OF WORK BOUGHT. `realWageDays` divides one by the other:
//     how many days a labourer worked for a quarter of wheat. It runs at
//     forty-odd days before the plague and falls to a dozen after it. No
//     other number in this engine moves that far, and it is the reason
//     the fifteenth century is called the golden age of the labourer even
//     though it was, by every other measure here, a worse century to be
//     born in.
//
//  3. WHETHER A HOLDING FED ITS HOUSEHOLD. `subsistenceOf` measures the
//     tenement against the mouths on it, which is what finally makes the
//     size classes in tenement.ts mean something: a half-virgate sat
//     almost exactly on the subsistence line, so a virgater sold grain in
//     a good year and a cottar bought it in every year — and had to earn
//     the money at somebody else's harvest, which is the dependency the
//     whole village economy actually ran on.
//
// And the court roll (`courtRollOf`): every one of its entries is
// triggered by an event the engine already had and had never charged
// anybody for. documents.ts has been citing "Manor court roll" as a
// source since long before there was any court business to put in one.
// =====================================================================
import { DAY_WAGE, type DueKind, ENTRY_FINE, HERIOT, LEYRWITE_RANGE, MERCHET_RANGE, trendAt, WHEAT_TREND } from "./data/economy.js";
import { harvestAt } from "./harvest.js";
import { addrHash, makeRng } from "./hash.js";
import { type Tenement, tenementHistory, tenementsOf } from "./tenement.js";
import type { Envelope } from "./types.js";

/** Bushels of grain an acre of medieval arable yielded, net of nothing. */
const GROSS_QUARTERS_PER_ACRE = 1;
/** Two-field and three-field both leave a large share fallow each year. */
const SOWN_SHARE = 0.65;
/** A quarter in four goes back into the ground as next year's seed, and a
 * tenth of what is left goes to the church before the household eats. */
const SEED_AND_TITHE = 0.25 + 0.1 * 0.75;
/** Quarters of grain a year, as bread and as ale, for an adult and for a
 * child. Grain was between two-thirds and four-fifths of the diet. */
const ADULT_QUARTERS = 1.5;
const CHILD_QUARTERS = 0.8;

/** The price of a quarter of wheat, in pence, in one region and year.
 *
 * The elasticity is deliberately asymmetric. A deficit runs the price up
 * far harder than a glut runs it down, because in a bad year everyone is
 * bidding for the same short supply and nobody can choose not to eat,
 * whereas in a good year the surplus has nowhere profitable to go. This
 * asymmetry is visible in every pre-modern price series that survives. */
export function wheatPriceAt(worldSeed: number, regionKey: string, year: number): number {
  const trend = trendAt(WHEAT_TREND, year);
  const yield_ = harvestAt(worldSeed, regionKey, year);
  const elasticity = yield_ < 1 ? 2.6 : 1.5;
  const price = trend * (1 / yield_) ** elasticity;
  // Bounded at both ends: even the Great Famine's peak was about five
  // times an ordinary year, and even a glut left grain worth carting.
  return Math.max(trend * 0.55, Math.min(trend * 5, price));
}

/** What a day's labour fetched, in pence. A trend and nothing else: this
 * is not weather, it is the standing rate for work in a given decade, and
 * every villager in the region faced the same one. */
export function dayWageAt(year: number): number {
  return trendAt(DAY_WAGE, year);
}

/** Days of a labourer's work for a quarter of wheat — the real wage, and
 * the one number here worth watching across the whole register. */
export function realWageDays(worldSeed: number, regionKey: string, year: number): number {
  return wheatPriceAt(worldSeed, regionKey, year) / dayWageAt(year);
}

/** The whole series, for the UI to draw on the harvest chart's own scale. */
export function priceSeries(worldSeed: number, regionKey: string, from: number, to: number): { price: number; wage: number; realWage: number }[] {
  const out: { price: number; wage: number; realWage: number }[] = [];
  for (let y = from; y <= to; y++) {
    const price = wheatPriceAt(worldSeed, regionKey, y);
    const wage = dayWageAt(y);
    out.push({ price, wage, realWage: price / wage });
  }
  return out;
}

/** Pounds/shillings/pence, which is how any of these figures was ever
 * written down. The UI formats it; this only does the division. */
export function lsd(pence: number): { l: number; s: number; d: number } {
  const p = Math.round(pence);
  return { l: Math.floor(p / 240), s: Math.floor((p % 240) / 12), d: p % 12 };
}

// ---- § the court roll ----

/** One entry in a manor court roll: a payment, the tenant who owed it, and
 * the event that gave rise to it. */
export interface CourtEntry {
  year: number;
  kind: DueKind;
  /** Who paid — a real person on the register, always. */
  personId: number;
  /** In pence. */
  amount: number;
  /** The holding it arose on. */
  tenement: number;
  /** Entry fine only: the tenant was the last holder's heir, so he came in
   * by inheritance rather than off the open market — which the roll
   * distinguishes and which cost him less. */
  heir?: boolean;
}

/** How hard the land was being competed for, in one year: the share of the
 * village's holdings that had a household on them.
 *
 * This is the same occupancy the preventive check in village.ts measures
 * itself against, read back out — so an entry fine and the age of marriage
 * answer to the same pressure, which is exactly the connection the
 * manorial evidence draws. When half the tenements stand empty after 1349,
 * fines collapse and men marry early; both are the same fact. */
export function occupancyAt(env: Envelope, year: number, holdings: number): number {
  if (holdings <= 0) return 0;
  let occupied = 0;
  for (const c of env.couples) {
    if (c.tenement == null || c.year > year) continue;
    const H = env.persons[c.husband];
    const W = env.persons[c.wife];
    if (H.death.year > year || W.death.year > year) occupied++;
  }
  return Math.min(1.4, occupied / holdings);
}

/** The land-hunger multiplier on an entry fine. Steeply non-linear on
 * purpose: the difference between a manor with two vacant holdings and one
 * with none is the difference between a fine of a few shillings and a
 * fine of several pounds, because in the second case the lord is holding
 * an auction. */
function fineMultiplier(occupancy: number): number {
  return 0.3 + 1.25 * occupancy ** 2.2;
}

function dueRng(env: Envelope, tenement: number, year: number, kind: DueKind, personId: number) {
  return makeRng(addrHash(env.worldSeed, [env.regionKey, env.villageIdx, "due", tenement, year, kind, personId]));
}

/** Jitter around a tariff — no two entries in a real roll are the same
 * figure, and the variation is where the bargaining was. */
function vary(base: number, rng: ReturnType<typeof makeRng>): number {
  return Math.max(2, Math.round(base * (0.7 + rng() * 0.6)));
}

/** The court roll of one holding: every payment its successive households
 * owed the lord, in order.
 *
 * Nothing here is invented. Each entry is an event already in the
 * envelope — a tenure beginning, a tenant dying on the land, a daughter
 * of the house marrying, a child born to her out of wedlock — priced by
 * the tariff in data/economy.ts and, for the entry fine, by how badly
 * other men wanted the same ground that year. */
export function courtRollOf(worldSeed: number, env: Envelope, tenementIdx: number): CourtEntry[] {
  const tenements = tenementsOf(worldSeed, env.regionKey, env.villageIdx);
  const holding: Tenement | undefined = tenements[tenementIdx];
  if (!holding) return [];
  const out: CourtEntry[] = [];
  const history = tenementHistory(env, tenementIdx);

  history.forEach((tenure, i) => {
    const c = tenure.couple;
    const H = env.persons[c.husband];
    const W = env.persons[c.wife];

    // Entry fine, on taking the holding up. An heir is a son of the last
    // household to hold this same ground.
    const prev = history[i - 1];
    const heir = prev != null && (H.father === prev.couple.husband || W.father === prev.couple.husband);
    const rng = dueRng(env, tenementIdx, tenure.from, "entryfine", H.id);
    const base = ENTRY_FINE[holding.size] * fineMultiplier(occupancyAt(env, tenure.from, tenements.length)) * (heir ? 0.55 : 1);
    out.push({ year: tenure.from, kind: "entryfine", personId: H.id, amount: vary(base, rng), tenement: tenementIdx, heir });

    // Heriot, on the death of a tenant who was still on the land. Both
    // spouses can owe one: a widow holding in her own right died a tenant.
    for (const p of [H, W]) {
      if (p.death.year < tenure.from || p.death.year > tenure.to) continue;
      if (p.emigrated) continue;
      out.push({
        year: p.death.year,
        kind: "heriot",
        personId: p.id,
        amount: vary(HERIOT[holding.size], dueRng(env, tenementIdx, p.death.year, "heriot", p.id)),
        tenement: tenementIdx,
      });
    }

    // Merchet and leyrwite fall on the daughters of the house — and only
    // on an unfree one. A free tenant's daughter married whom she liked
    // and the court had nothing to say about it, which is precisely the
    // distinction the word "serf" is doing work for elsewhere in this
    // engine and had never once cost anybody anything.
    if (H.cls !== "serf") return;
    for (const kidId of c.children) {
      const kid = env.persons[kidId];
      if (kid?.sex !== "F") continue;
      if (kid.marriageYear != null) {
        // Marrying off the manor cost more: the lord was losing her and
        // her issue to another lordship for good.
        const away = kid.marriedOut || kid.emigrated;
        const mr = dueRng(env, tenementIdx, kid.marriageYear, "merchet", kid.id);
        const merchet = MERCHET_RANGE[0] + mr() * (MERCHET_RANGE[1] - MERCHET_RANGE[0]);
        out.push({
          year: kid.marriageYear,
          kind: "merchet",
          personId: kid.id,
          amount: Math.round(merchet * (away ? 1.8 : 1)),
          tenement: tenementIdx,
        });
      }
      // Leyrwite: she bore a child whose parents never married.
      for (const other of env.persons) {
        if (!other.illegitimate || other.mother !== kid.id) continue;
        const lr = dueRng(env, tenementIdx, other.birth, "leyrwite", kid.id);
        out.push({
          year: other.birth,
          kind: "leyrwite",
          personId: kid.id,
          amount: Math.round(LEYRWITE_RANGE[0] + lr() * (LEYRWITE_RANGE[1] - LEYRWITE_RANGE[0])),
          tenement: tenementIdx,
        });
      }
    }
  });

  out.sort((a, b) => a.year - b.year || a.kind.localeCompare(b.kind) || a.personId - b.personId);
  return out;
}

// ---- § the subsistence line ----

export interface Subsistence {
  acres: number;
  /** Mouths in the household that year. */
  mouths: number;
  /** Quarters the holding actually put on the table, after fallow, seed
   * and tithe, in this year's yield. */
  netQuarters: number;
  /** Quarters the household had to eat. */
  needQuarters: number;
  /** Days of wage labour needed to buy the shortfall — 0 in surplus. */
  wageDays: number;
  /** Pence the surplus would fetch — 0 in deficit. */
  surplusPence: number;
}

/** Whether a household's own land fed it, in one year.
 *
 * The threshold this exposes is the well-attested one: about ten to
 * twelve acres of arable to feed a family of five under these yields,
 * which puts a half-virgate just above the line and every cottage below
 * it. A cottar was not a smaller virgater; he was a wage labourer with a
 * garden, and this is the calculation that says so. */
export function subsistenceOf(worldSeed: number, env: Envelope, coupleIdx: number, year: number): Subsistence | null {
  const c = env.couples[coupleIdx];
  if (!c) return null;
  const tenements = tenementsOf(worldSeed, env.regionKey, env.villageIdx);
  const acres = c.tenement != null ? (tenements[c.tenement]?.acres ?? 0) : 0;

  // Two different counts of the same household, deliberately. What it EATS
  // is weighted — a child of six is not half a ploughman but he is not a
  // whole eater either — and what the page SAYS is a head count, because
  // "4.6 people in the house" is not a sentence.
  const inHouse = [env.persons[c.husband], env.persons[c.wife], ...c.children.map((k) => env.persons[k])].filter(
    (p) => p && p.birth <= year && p.death.year >= year && !p.emigrated,
  );
  let needQuarters = 0;
  for (const p of inHouse) needQuarters += p.id === c.husband || p.id === c.wife || year - p.birth >= 14 ? ADULT_QUARTERS : CHILD_QUARTERS;
  if (needQuarters === 0) return null;

  const yield_ = harvestAt(worldSeed, env.regionKey, year);
  const netQuarters = acres * GROSS_QUARTERS_PER_ACRE * SOWN_SHARE * (1 - SEED_AND_TITHE) * yield_;
  const gap = needQuarters - netQuarters;
  const price = wheatPriceAt(worldSeed, env.regionKey, year);
  return {
    acres,
    mouths: inHouse.length,
    netQuarters,
    needQuarters,
    wageDays: gap > 0 ? (gap * price) / dayWageAt(year) : 0,
    surplusPence: gap < 0 ? -gap * price : 0,
  };
}
