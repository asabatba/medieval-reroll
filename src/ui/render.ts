import type * as Engine from "../engine/index.js";
import type { Address, Bio, Death, Envelope, EventRef, HouseholdState, MedievalDate, PersonAddress } from "../engine/index.js";
import { GENERATION_LAST_YEAR } from "../engine/index.js";
import type { Locale } from "../i18n/locale.js";
import { UI } from "../i18n/ui.js";
import { esc, KIND_LABEL } from "./dom.js";

// § nobility routes: besides person records, the navigation stack (and the
// hash) can hold the two nobility views — a region's royal line and a
// manor's noble house. `kind` is optional on person nodes so pre-existing
// history state (plain PersonAddress objects) keeps working.
export interface PersonNode extends PersonAddress {
  kind?: "person";
  crumb?: string;
  /** § the year in the locator: which year the village-in-year section is
   * standing on. See `locator` for why this is part of the address. */
  year?: number;
}
/** § the region route: the rung above the village, and until now the only
 * one in the whole app that dead-ended. Every locator in this world begins
 * `seed:region:…` and there was no page at `seed:region` — so the region
 * name was the one entity the UI printed that could not be clicked, and the
 * tree that walks person → village → parish → deanery → diocese simply
 * stopped when you tried to walk up out of a village. It is also the only
 * page that can be arrived at without already knowing an address, which
 * makes it the app's first real index. */
export interface RegionNode {
  kind: "region";
  regionKey: string;
  crumb?: string;
}
export interface RoyalNode {
  kind: "royal";
  regionKey: string;
  crumb?: string;
}
/** One sovereign's own page: reign `reignIdx` of the region's royal line. */
export interface KingNode {
  kind: "king";
  regionKey: string;
  reignIdx: number;
  crumb?: string;
}
export interface HouseNode {
  kind: "house";
  regionKey: string;
  villageIdx: number;
  crumb?: string;
}
/** One lord's own page: head `headIdx` of the manor's line ("lord") or of
 * the honour's baronial line ("baron"). */
export interface LordNode {
  kind: "lord" | "baron";
  regionKey: string;
  villageIdx: number;
  headIdx: number;
  crumb?: string;
}
/** § the village route: the village itself as a first-class record, not a
 * section buried inside whichever inhabitant you happened to open. The
 * shortest locator in the app — `seed:region:village`, with no fourth
 * segment — which is also what a person's locator looks like with the person
 * taken off the end, so truncating any record URL walks you up to its place. */
export interface VillageNode {
  kind: "village";
  regionKey: string;
  villageIdx: number;
  crumb?: string;
  /** § the year in the locator. */
  year?: number;
}
/** § the parish route: a rung of the ECCLESIASTICAL tree, which does not nest
 * inside the civil one (hierarchy.ts) — so it is addressed by a village that
 * belongs to it rather than by an index of its own, and resolves from there to
 * whichever mother church that village answers to. `level` is which rung: the
 * parish, its deanery, or the diocese above both. */
export interface ParishNode {
  kind: "parish" | "deanery" | "diocese";
  regionKey: string;
  villageIdx: number;
  crumb?: string;
}
/** § the Schism: a region's papal series — every pope IT obeyed, which is
 * not the same list as its neighbour's. Shaped exactly like the royal
 * route (a line view plus a page per holder) because it is exactly the
 * same kind of thing: a succession the villagers had no part in choosing
 * and heard about second-hand. */
export interface PapacyNode {
  kind: "papacy";
  regionKey: string;
  crumb?: string;
}
/** One pontificate — or one vacancy, or one stretch of obeying nobody —
 * as term `termIdx` of the region's series. */
export interface PontiffNode {
  kind: "pontiff";
  regionKey: string;
  termIdx: number;
  crumb?: string;
}
/** § the church's own line: one incumbent of a parish, indexed into its
 * clergy line. Addressed by a village of the parish, like the parish route
 * itself — the line belongs to the mother church, not to the village. */
export interface RectorNode {
  kind: "rector";
  regionKey: string;
  villageIdx: number;
  headIdx: number;
  crumb?: string;
}
/** § the tenement: one holding of a village, and every family that ever
 * stood on it. The only page in the app whose subject is a piece of
 * ground rather than a person or an institution. */
export interface TenementNode {
  kind: "tenement";
  regionKey: string;
  villageIdx: number;
  headIdx: number;
  crumb?: string;
}
/** § the pedigree: one person's line, many generations, in both directions.
 *
 * The engine has been able to do this since lineage.ts was written — and
 * `ancestorsOf`/`descendantsOf` were exported, tested, and called by
 * nothing. The family tree on a record is one step each way by design; this
 * is the view that spends what that traversal already paid for, including
 * the expensive part: following an immigrant ancestor UP into her own
 * origin register, and an emigrated child DOWN into the register where her
 * children were actually baptised. */
export interface PedigreeNode extends PersonAddress {
  kind: "pedigree";
  crumb?: string;
}
export type StackNode =
  | PersonNode
  | PedigreeNode
  | RegionNode
  | RoyalNode
  | KingNode
  | HouseNode
  | LordNode
  | VillageNode
  | ParishNode
  | PapacyNode
  | PontiffNode
  | RectorNode
  | TenementNode;

export function isPersonNode(node: StackNode): node is PersonNode {
  return node.kind == null || node.kind === "person";
}

export function pedigreeGoto(addr: PersonAddress): string {
  return `pedigree:${addr.regionKey}:${addr.villageIdx}:${addr.personId}`;
}

/** § the year in the locator.
 *
 * The village-in-year slider and the scrubbable population curve were pure
 * DOM state: you could drag to 1349, watch the households empty, copy the
 * link — and hand somebody a page standing on a different year entirely.
 * For an app whose entire premise is that the address IS the thing, that
 * was the sharpest remaining inconsistency in it.
 *
 * A suffix rather than a segment, because it is not a rung of the tree: it
 * qualifies a place (or a person's view of their place), and every locator
 * without it is still valid and still means what it always meant. */
function yearSuffix(node: StackNode | PersonAddress): string {
  const year = "year" in node ? node.year : undefined;
  return year == null ? "" : `@${year}`;
}

export function locator(worldSeed: number, node: StackNode | PersonAddress): string {
  // § the region route: two segments — the shortest locator there is, and
  // what a village's own looks like with the village taken off the end, so
  // truncating any URL in the app keeps walking up the tree.
  if ("kind" in node && node.kind === "region") return `${worldSeed}:${node.regionKey}`;
  // § the pedigree: a person's own locator with a word on the end, so it is
  // visibly a view OF that record rather than a different record.
  if ("kind" in node && node.kind === "pedigree") return `${worldSeed}:${node.regionKey}:${node.villageIdx}:${node.personId}:pedigree`;
  if ("kind" in node && node.kind === "village") return `${worldSeed}:${node.regionKey}:${node.villageIdx}${yearSuffix(node)}`;
  if ("kind" in node && (node.kind === "parish" || node.kind === "deanery" || node.kind === "diocese"))
    return `${worldSeed}:${node.regionKey}:${node.villageIdx}:${node.kind}`;
  if ("kind" in node && node.kind === "royal") return `${worldSeed}:${node.regionKey}:royal`;
  if ("kind" in node && node.kind === "king") return `${worldSeed}:${node.regionKey}:royal:${node.reignIdx}`;
  if ("kind" in node && node.kind === "papacy") return `${worldSeed}:${node.regionKey}:papacy`;
  if ("kind" in node && node.kind === "pontiff") return `${worldSeed}:${node.regionKey}:papacy:${node.termIdx}`;
  if ("kind" in node && node.kind === "house") return `${worldSeed}:${node.regionKey}:${node.villageIdx}:house`;
  if ("kind" in node && (node.kind === "lord" || node.kind === "baron" || node.kind === "rector" || node.kind === "tenement"))
    return `${worldSeed}:${node.regionKey}:${node.villageIdx}:${node.kind}:${node.headIdx}`;
  const p = node as PersonAddress;
  return worldSeed + ":" + p.regionKey + ":" + p.villageIdx + ":" + p.personId + yearSuffix(node);
}

// § the season: the engine hands back structured dates (MedievalDate) and
// never writes one into prose, so every date the UI shows is formatted
// here — which is also what lets Catalan elide its preposition and both
// locales name the feast the day fell on.
function fullDate(t: (typeof UI)[Locale], date: MedievalDate | null | undefined, year: number): string {
  return date ? t.fullDate(date.day, date.month, year) : String(year);
}

/** The feast the day was actually known by, where it fell on one. */
function feastLabel(E: typeof Engine, t: (typeof UI)[Locale], date: MedievalDate | null | undefined, year: number, locale: Locale): string {
  if (!date) return "";
  const feast = E.feastOf(year, date.month, date.day);
  return feast ? t.onFeast(feast[locale]) : "";
}

export function fateStr(d: Death, birth: number): string {
  if (d.age === 0) return "† inf. " + d.year;
  if (d.age < 16) return "† " + d.year + " aet. " + d.age;
  return birth + "–" + d.year;
}

function addrStr(addr: Address, id: number): string {
  return `${addr.regionKey}:${addr.villageIdx}:${id}`;
}

// data-goto targets for the nobility views (parsed in app.ts's bindGoto).
export function regionGoto(regionKey: string): string {
  return `region:${regionKey}`;
}

function royalGoto(regionKey: string): string {
  return `royal:${regionKey}`;
}
function kingGoto(regionKey: string, reignIdx: number): string {
  return `king:${regionKey}:${reignIdx}`;
}
function houseGoto(addr: Address): string {
  return `house:${addr.regionKey}:${addr.villageIdx}`;
}
export function villageGoto(addr: Address): string {
  return `village:${addr.regionKey}:${addr.villageIdx}`;
}
function parishGoto(kind: "parish" | "deanery" | "diocese", addr: Address): string {
  return `${kind}:${addr.regionKey}:${addr.villageIdx}`;
}
function lordGoto(kind: "lord" | "baron" | "rector" | "tenement", addr: Address, headIdx: number): string {
  return `${kind}:${addr.regionKey}:${addr.villageIdx}:${headIdx}`;
}
function papacyGoto(regionKey: string): string {
  return `papacy:${regionKey}`;
}
function pontiffGoto(regionKey: string, termIdx: number): string {
  return `pontiff:${regionKey}:${termIdx}`;
}

function gotoOf(ref: EventRef): string {
  // A route ref names a specific sovereign, lord, pope or parson — link
  // their own page rather than a person record they do not have.
  if (ref.route === "royal") return ref.routeIdx != null && ref.routeIdx >= 0 ? kingGoto(ref.addr.regionKey, ref.routeIdx) : royalGoto(ref.addr.regionKey);
  if (ref.route === "lord") return ref.routeIdx != null && ref.routeIdx >= 0 ? lordGoto("lord", ref.addr, ref.routeIdx) : houseGoto(ref.addr);
  if (ref.route === "pope") return ref.routeIdx != null && ref.routeIdx >= 0 ? pontiffGoto(ref.addr.regionKey, ref.routeIdx) : papacyGoto(ref.addr.regionKey);
  if (ref.route === "rector") return ref.routeIdx != null && ref.routeIdx >= 0 ? lordGoto("rector", ref.addr, ref.routeIdx) : parishGoto("parish", ref.addr);
  // § the far end: a PLACE, not a person — where a long-distance emigrant
  // went. She has no record in that register (the rank rule forbids
  // inventing one), but the village is real, browsable, and lists her
  // among its incomers, so the trail continues instead of stopping.
  if (ref.route === "village") return villageGoto(ref.addr);
  return addrStr(ref.addr, ref.id);
}

// § name links: an event's own text is plain prose (biography.ts never
// emits markup) — `refs` names exactly which substrings are other people,
// so this is the one place that turns them into clickable goto buttons,
// escaping everything else. A ref is consumed once, so equal names can link
// to distinct people when they occur more than once in the same event.
export function linkifyEventText(text: string, refs: EventRef[] | undefined): string {
  if (!refs?.length) return esc(text);
  const remaining = refs.filter((r) => r.name.length > 0);
  let out = "";
  let cursor = 0;
  while (cursor < text.length) {
    const matches = remaining
      .map((ref, index) => ({ ref, index }))
      .filter(({ ref }) => text.startsWith(ref.name, cursor))
      .sort((a, b) => b.ref.name.length - a.ref.name.length || a.index - b.index);
    const match = matches[0];
    if (!match) {
      out += esc(text[cursor]);
      cursor++;
      continue;
    }
    remaining.splice(match.index, 1);
    const end = cursor + match.ref.name.length;
    out += `<button class="namelink" data-goto="${gotoOf(match.ref)}">${esc(text.slice(cursor, end))}</button>`;
    cursor = end;
  }
  return out;
}

interface RelCardPerson {
  name: string;
  surname?: string;
  birth: number;
  death: Death;
}

interface RelCardOpts {
  self?: boolean;
  nolink?: boolean;
  note?: string;
}

function relCard(who: string, person: RelCardPerson, addr: string, opts?: RelCardOpts): string {
  opts = opts || {};
  const cls = (person.death.age < 16 ? "dead-young " : "") + (opts.self ? "self " : "") + (opts.nolink ? "nolink " : "");
  const dates = fateStr(person.death, person.birth);
  const inner = `<div class="rwho">${esc(who)}</div><div class="rname">${esc(person.name)}${person.surname ? " " + esc(person.surname) : ""}</div>
    <div class="rdates">${person.death.age < 16 ? '<span class="dagger">' + dates + "</span>" : dates}${opts.note ? " · " + esc(opts.note) : ""}</div>`;
  if (opts.nolink || opts.self) return `<div class="rel ${cls}">${inner}</div>`;
  return `<button class="rel ${cls}" data-goto="${addr}">${inner}</button>`;
}

interface FamNodePerson {
  name: string;
  birth: number;
  death: Death;
}

// A single clickable name+dates entry in the tree. `addr` null renders a
// non-interactive node (self — already the open record, nowhere to go).
function famNode(name: string, person: FamNodePerson, addr: string | null, opts?: { self?: boolean }): string {
  const dates = fateStr(person.death, person.birth);
  const cls = "fam-node" + (person.death.age < 16 ? " dead-young" : "") + (opts?.self ? " self" : "");
  const inner = `${esc(name)}<span class="fam-dates">${person.death.age < 16 ? '<span class="fam-dagger">' + dates + "</span>" : dates}</span>`;
  if (!addr) return `<span class="${cls}">${inner}</span>`;
  return `<button class="${cls}" data-goto="${addr}">${inner}</button>`;
}

// § one-step family tree: parents, then this generation (siblings, self,
// spouse(s)), then children — the compact diagram counterpart to the
// separate Parentage/Siblings/Marriage-&-issue list sections above, all
// drawn from the same Bio facts (never a new resolve). "One step" means
// exactly one generation each direction from self; it intentionally does
// NOT reach into grandparents/grandchildren or a sibling's own spouse.
//
// Rendered as a genealogical outline (parents line, then a branch list of
// siblings with self inserted in birth order and its own spouse/children
// nested underneath) rather than a card grid — a tree is naturally a
// nested list, so this needs no computed alignment between tiers, stays
// legible at any family size, and reads as an actual tree instead of a
// stack of same-sized boxes.
function renderFamilyTree(t: (typeof UI)[Locale], bio: Bio): string {
  const parentsHtml =
    bio.father || bio.mother
      ? `<div class="fam-parents">${bio.father ? famNode(bio.father.name, bio.father, addrStr(bio.father.addr, bio.father.id)) : ""}${
          bio.father && bio.mother ? '<span class="fam-knot" aria-hidden="true">⚭</span>' : ""
        }${bio.mother ? famNode(bio.mother.name, bio.mother, addrStr(bio.mother.addr, bio.mother.id)) : ""}</div>`
      : "";

  const selfName = bio.name + (bio.surname ? " " + bio.surname : "");
  const unionsHtml = bio.unions.length
    ? `<div class="fam-unions">${bio.unions
        .map((u) => {
          const kidsHtml = u.children.length
            ? `<div class="fam-branch">${u.children.map((c) => `<div class="fam-leaf">${famNode(c.name, c, addrStr(c.addr, c.id))}</div>`).join("")}</div>`
            : "";
          return `<div class="fam-union"><span class="fam-knot" aria-hidden="true">⚭</span>${famNode(u.spouse.name, u.spouse, addrStr(u.spouse.addr, u.spouse.id))}</div>${kidsHtml}`;
        })
        .join("")}</div>`
    : "";

  // § an unlegitimated natural child belongs to no Couple/union at all (her
  // parents never married — succession.ts's childrenOf direct-scan branch),
  // so she'd otherwise be invisible in this diagram even though she's counted
  // in bio.children and listed in the Marriage & Issue section. Show her in
  // her own branch off self rather than silently dropping her.
  const unionChildIds = new Set(bio.unions.flatMap((u) => u.children.map((c) => c.id)));
  const naturalChildren = bio.children.filter((c) => !unionChildIds.has(c.id));
  const naturalHtml = naturalChildren.length
    ? `<div class="fam-union fam-natural"><span class="fam-tag">${esc(t.outOfWedlock)}</span></div><div class="fam-branch">${naturalChildren.map((c) => `<div class="fam-leaf">${famNode(c.name, c, addrStr(c.addr, c.id))}</div>`).join("")}</div>`
    : "";

  const selfInner = `<div class="fam-self-row">${famNode(selfName, bio, null, { self: true })}<span class="fam-tag">${esc(t.self(bio.sex))}</span></div>${unionsHtml}${naturalHtml}`;

  const sibLeaf = (s: (typeof bio.siblings)[number]) => `<div class="fam-leaf">${famNode(s.name, s, addrStr(s.addr, s.id))}</div>`;
  const elderHtml = bio.siblings
    .filter((s) => s.birth <= bio.birth)
    .map(sibLeaf)
    .join("");
  const youngerHtml = bio.siblings
    .filter((s) => s.birth > bio.birth)
    .map(sibLeaf)
    .join("");

  let html = `<div class="sect reveal"><h2>${esc(t.familyTree)}</h2></div><div class="fam-tree reveal">${parentsHtml}`;
  html +=
    parentsHtml || bio.siblings.length
      ? `<div class="fam-branch">${elderHtml}<div class="fam-leaf fam-self-leaf">${selfInner}</div>${youngerHtml}</div>`
      : `<div class="fam-self-leaf fam-root">${selfInner}</div>`;
  html += `</div>`;
  return html;
}

// ---- village-in-year view (§ year layer) ----
export const VILLAGE_YEAR_MIN = 1290;
// § the register's own edge: pinned to the last year Tier 1 generates births
// for, not to a round 1500. Past that year births stop and burials do not, so
// the village appeared to fall off a cliff in its final five years — a fact
// about where generation stops, presented as a fact about the village.
export const VILLAGE_YEAR_MAX = GENERATION_LAST_YEAR;

/** Default snapshot year for a record: the subject's adult prime. */
export function defaultVillageYear(birth: number): number {
  return Math.min(VILLAGE_YEAR_MAX, Math.max(VILLAGE_YEAR_MIN, birth + 30));
}

// The households of one village in one year, as clickable member cards.
// Exported separately from the section wrapper so the year slider can
// re-render just this body without rebuilding the whole record page.
export function renderVillageBody(E: typeof Engine, env: Envelope, year: number, locale: Locale, currentId: number): string {
  const t = UI[locale];
  const state = E.villageStateAt(env, year);
  if (!state.population) return `<p class="vempty">${esc(t.emptyYear)}</p>`;
  const byId = new Map(state.residents.map((r) => [r.id, r]));

  const badges: string[] = [];
  const pl = E.plagueAt(year, env.regionKey);
  if (pl) badges.push(`<span class="badge b-plague">☠ ${esc(pl[3][locale])}</span>`);
  if (E.famineAt(year, env.region)) badges.push(`<span class="badge b-famine">${esc(env.region.famineName[locale])} · ${esc(t.famineBadge)}</span>`);
  const war = E.warAt(year, env.region, locale);
  if (war) badges.push(`<span class="badge b-war">⚔ ${esc(t.warBadge(war))}</span>`);

  const family = state.households.filter((h) => h.id >= 0).sort((a, b) => b.members.length - a.members.length || a.id - b.id);
  const pseudo = state.households.filter((h) => h.id < 0).sort((a, b) => b.id - a.id); // manor before church

  function roleOf(id: number, h: HouseholdState): string {
    const st = byId.get(id)!;
    const p = env.persons[id];
    // § service placement: a servant now sits in his master's own household,
    // where "kin" would be exactly the wrong word for him — so the service
    // tag is read off the person, not off which household he landed in.
    if (st.inService) return t.serviceTag;
    if (h.id === E.MANOR_HOUSEHOLD) return t.serviceTag;
    // § the celibate estate: religion is no longer a men's tonsure only.
    if (st.inOrders) return p.sex === "F" ? t.veiledTag : t.ordersTag;
    if (id === h.headId) return st.maritalStatus === "widowed" ? (p.sex === "F" ? t.widowTag : t.widowerTag) : t.headTag;
    if (st.spouseId === h.headId) return p.sex === "F" ? t.wife : t.husband;
    const headSpouse = byId.get(h.headId)?.spouseId;
    if (p.father === h.headId || p.mother === h.headId || (headSpouse != null && (p.father === headSpouse || p.mother === headSpouse)))
      return p.sex === "M" ? t.son : t.daughter;
    const head = env.persons[h.headId];
    // § stem family: the retired generation living in the heir's house — the
    // commonest new relationship in a household now that solitaries are
    // taken in, and the one "kin" read worst.
    if (head && (head.father === id || head.mother === id)) return p.sex === "M" ? t.fatherTag : t.motherTag;
    if (head && p.father >= 0 && p.father === head.father) return p.sex === "M" ? t.brother : t.sister;
    return t.kinTag;
  }

  function hhCard(h: HouseholdState): string {
    const isManor = h.id === E.MANOR_HOUSEHOLD;
    const isChurch = h.id === E.CHURCH_HOUSEHOLD;
    const orphan = h.id >= 200000;
    const head = h.headId >= 0 ? env.persons[h.headId] : null;
    const title = isManor ? t.manorHouse : isChurch ? t.churchHouse : head ? `${head.name} ${head.surname}` : "";
    const rank = (id: number) => (id === h.headId ? 0 : byId.get(id)?.spouseId === h.headId ? 1 : 2);
    const members = h.members.slice().sort((a, b) => rank(a) - rank(b) || env.persons[a].birth - env.persons[b].birth || a - b);
    const rows = members
      .map((id) => {
        const p = env.persons[id];
        const st = byId.get(id)!;
        return `<button class="member${id === currentId ? " current" : ""}" data-goto="${env.regionKey}:${env.villageIdx}:${id}">
        <span class="m-name">${esc(p.name)} ${esc(p.surname)}</span>
        <span class="m-role">${esc(roleOf(id, h))}</span>
        <span class="m-age">aet. ${st.age}</span></button>`;
      })
      .join("");
    // § nobility links: the manor pseudo-household's title opens the house view.
    const titleHtml = isManor
      ? `<button class="namelink" data-goto="${houseGoto({ regionKey: env.regionKey, villageIdx: env.villageIdx })}">${esc(title)}</button>`
      : esc(title);
    return `<div class="hh${orphan ? " orphan" : ""}${isManor || isChurch ? " pseudo" : ""}">
      <div class="hh-title">${titleHtml}${orphan ? ` <i>${esc(t.orphanTag)}</i>` : ""}</div>
      <div class="hh-members">${rows}</div></div>`;
  }

  return (
    `<div class="vstats">${esc(t.hearthCount(state.population, family.length))}${badges.length ? badges.join("") : ""}</div>` +
    `<div class="hhgrid">${family.map(hhCard).join("")}${pseudo.map(hhCard).join("")}</div>`
  );
}

// ---- § population curve ----
// The whole point of the carrying-capacity model (engine/capacity.ts) is a
// SHAPE: a village pressed against its land through the thirteenth century,
// gutted in one year by the Black Death, and never quite refilling the ground
// the fifteenth century had given up farming. None of that was visible
// anywhere. The year slider could show it, but only to someone who thought to
// drag it across two centuries and remember what they saw — so the single
// most interesting thing the engine computes was, in practice, hidden.
//
// Drawn full-bleed on purpose: the x axis runs edge to edge over exactly
// [VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX], so a click anywhere maps to a year by
// plain proportion and app.ts needs no shared geometry to invert it.
const CHART_W = 840;
const CHART_H = 96;
/** Room at the top so the peak's stroke isn't clipped by the viewBox edge. */
const CHART_TOP = 6;
/** The last year Tier 1 actually generates births for (village.ts's own
 * genChildren cap). The curve is still drawn past it — those people really are
 * on the register and you can still visit them — but the trough label is not
 * taken from there: with births stopped and deaths continuing, the final years
 * fall away steeply, and reading that as the village's low point would report
 * a fact about where the register ends rather than about the village. */
const REGISTER_LAST_FULL_YEAR = 1495;

/** § the year in the locator: a year off a hand-edited URL, kept inside the
 * register or thrown away. Returns undefined rather than clamping a wild
 * value, so a nonsense year falls back to the page's own default instead of
 * silently opening on 1290. */
export function clampVillageYear(year: number | undefined): number | undefined {
  if (year == null || !Number.isFinite(year)) return undefined;
  return year >= VILLAGE_YEAR_MIN && year <= VILLAGE_YEAR_MAX ? year : undefined;
}

export function chartYearAt(fraction: number): number {
  const span = VILLAGE_YEAR_MAX - VILLAGE_YEAR_MIN;
  return Math.max(VILLAGE_YEAR_MIN, Math.min(VILLAGE_YEAR_MAX, Math.round(VILLAGE_YEAR_MIN + fraction * span)));
}

/** The x of a year, and of the marker line, share this one mapping. */
function chartX(year: number): number {
  return ((year - VILLAGE_YEAR_MIN) / (VILLAGE_YEAR_MAX - VILLAGE_YEAR_MIN)) * CHART_W;
}

function renderPopulationChart(E: typeof Engine, env: Envelope, year: number, locale: Locale): string {
  const t = UI[locale];
  const counts = E.populationSeries(env, VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX);
  const peak = counts.reduce((best, n, i) => (n > counts[best] ? i : best), 0);
  // The trough that means something is the one AFTER the height — the Black
  // Death and the century that never refilled the ground it emptied — not the
  // handful of souls the village started the register with.
  const lastFull = Math.min(counts.length - 1, REGISTER_LAST_FULL_YEAR - VILLAGE_YEAR_MIN);
  const low = counts.reduce((best, n, i) => (i >= peak && i <= lastFull && n < counts[best] ? i : best), peak);
  const ceiling = Math.max(1, counts[peak]);
  const yOf = (n: number) => CHART_H - (n / ceiling) * (CHART_H - CHART_TOP);

  const points = counts.map((n, i) => `${chartX(VILLAGE_YEAR_MIN + i).toFixed(1)},${yOf(n).toFixed(1)}`);
  const line = `M${points.join("L")}`;
  const area = `${line}L${CHART_W},${CHART_H}L0,${CHART_H}Z`;

  // Crisis bands, in the same three colours the year badges already use, so
  // the trough in the curve and the badge that explains it read as one thing.
  const band = (from: number, to: number, cls: string, label: string) => {
    const x = chartX(Math.max(VILLAGE_YEAR_MIN, from));
    const w = Math.max(1.5, chartX(Math.min(VILLAGE_YEAR_MAX, to)) - x);
    return `<rect class="${cls}" x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${CHART_H}"><title>${esc(label)}</title></rect>`;
  };
  const bands = E.PLAGUES.filter((pl) => pl[1] >= VILLAGE_YEAR_MIN && pl[0] <= VILLAGE_YEAR_MAX)
    .map((pl) => band(pl[0], pl[1], "pc-plague", `${pl[3][locale]} · ${pl[0]}${pl[1] > pl[0] ? `–${pl[1]}` : ""}`))
    .join("");
  const famine = band(
    env.region.famine[0],
    env.region.famine[1],
    "pc-famine",
    `${env.region.famineName[locale]} · ${env.region.famine[0]}–${env.region.famine[1]}`,
  );

  const peakYear = VILLAGE_YEAR_MIN + peak;
  const lowYear = VILLAGE_YEAR_MIN + low;
  return `<figure class="popchart">
    <svg class="popsvg" viewBox="0 0 ${CHART_W} ${CHART_H}" preserveAspectRatio="none" role="img"
         aria-label="${esc(t.chartAria(env.place[locale], VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX, counts[peak], peakYear, counts[low], lowYear))}">
      ${bands}${famine}
      <path class="pc-area" d="${area}"/>
      <path class="pc-line" d="${line}" vector-effect="non-scaling-stroke"/>
      <line class="pc-now" id="vnow" x1="${chartX(year).toFixed(1)}" x2="${chartX(year).toFixed(1)}" y1="0" y2="${CHART_H}" vector-effect="non-scaling-stroke"/>
    </svg>
    <figcaption class="poplegend">
      <span>${VILLAGE_YEAR_MIN}</span>
      <span class="pc-peak">${esc(t.chartPeak(counts[peak], peakYear))}</span>
      <span class="pc-low">${esc(t.chartLow(counts[low], lowYear))}</span>
      <span>${VILLAGE_YEAR_MAX}</span>
    </figcaption>
  </figure>`;
}

// ---- U2 § the lifeline ----
//
// The population curve is the best thing on the village page and it is
// used exactly once. This is the same idiom turned on a single life: the
// span from baptism to burial, drawn against the crises that ran across
// it, so "lived through four plagues" stops being a number in the ledger
// and becomes a picture of a man who was eleven in 1349.
//
// Emphasis, not categorical: ONE subject (the life, in the same verdigris
// the population curve uses for the living) against recessive context in
// the two colours the crisis badges and the curve's own bands already
// use. Nothing here asks the reader to tell two data series apart.
const LIFE_W = 840;
const LIFE_H = 54;
const LIFE_BAR_Y = 20;
const LIFE_BAR_H = 12;

function renderLifeline(E: typeof Engine, bio: Bio, locale: Locale): string {
  const t = UI[locale];
  const from = bio.birth;
  const to = Math.max(bio.death.year, bio.birth + 1);
  const span = to - from;
  const x = (year: number) => ((Math.max(from, Math.min(to, year)) - from) / span) * LIFE_W;

  // Context bands first, under everything — plague waves and war years the
  // life actually overlapped, plus the region's famine window.
  const bands: string[] = [];
  const band = (a: number, b: number, cls: string, label: string) => {
    if (b < from || a > to) return;
    const x1 = x(a);
    const w = Math.max(2, x(b) - x1);
    bands.push(`<rect class="${cls}" x="${x1.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${LIFE_H}"><title>${esc(label)}</title></rect>`);
  };
  for (const pl of E.PLAGUES) band(pl[0], pl[1], "lf-plague", `${pl[3][locale]} · ${pl[0]}${pl[1] > pl[0] ? `–${pl[1]}` : ""}`);
  const region = bio.env.region;
  band(region.famine[0], region.famine[1], "lf-famine", `${region.famineName[locale]} · ${region.famine[0]}–${region.famine[1]}`);
  for (const [a, b] of region.warYears) band(a, b, "lf-war", `${region.warNames[a]?.[locale] ?? ""} · ${a}–${b}`);

  // The life itself: one mark, 4px rounded at both ends since both ends
  // are real data (a baptism and a burial), not a baseline.
  const life = `<rect class="lf-life" x="0" y="${LIFE_BAR_Y}" width="${LIFE_W}" height="${LIFE_BAR_H}" rx="4"/>`;

  // Dated register entries as ticks on the bar. Selective labelling: no
  // numbers on the ticks at all — the chronicle right below is the table
  // view, and each tick carries its own entry in a tooltip.
  const ticks = bio.events
    .filter((e) => e.date)
    .map((e) => {
      const tx = x(e.year);
      const title = `${t.fullDate(e.date!.day, e.date!.month, e.year)} · aet. ${e.age} — ${e.text.slice(0, 90)}${e.text.length > 90 ? "…" : ""}`;
      return `<g class="lf-tick k-${e.kind}"><rect x="${(tx - 1).toFixed(1)}" y="${LIFE_BAR_Y - 4}" width="2" height="${LIFE_BAR_H + 8}"/><rect class="lf-hit" x="${(tx - 7).toFixed(1)}" y="0" width="14" height="${LIFE_H}"><title>${esc(title)}</title></rect></g>`;
    })
    .join("");

  // Decade rules, recessive, so the span reads as time and not as a bar.
  let rules = "";
  for (let d = Math.ceil(from / 10) * 10; d <= to; d += 10) {
    rules += `<line class="lf-rule" x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${LIFE_BAR_Y}" y2="${LIFE_BAR_Y + LIFE_BAR_H}"/>`;
  }

  return `<figure class="lifeline reveal">
    <svg class="lifesvg" viewBox="0 0 ${LIFE_W} ${LIFE_H}" preserveAspectRatio="none" role="img"
         aria-label="${esc(t.lifelineAria(bio.name, bio.birth, bio.death.year, bio.death.age, bio.plaguesLived))}">
      ${bands.join("")}${life}${rules}${ticks}
    </svg>
    <figcaption class="lifelegend">
      <span>${bio.birth}</span>
      <span class="lf-mid">${esc(t.lifelineCaption(bio.death.age, bio.plaguesLived))}</span>
      <span>${bio.death.year}</span>
    </figcaption>
  </figure>`;
}

// ---- § the season: the year inside the year ----
//
// Two column charts, deliberately NOT one. Weddings and burials are
// different measures on different scales, and putting them in one plot
// would mean either a second y-axis (never) or a shared one that flattens
// whichever is smaller. Small multiples: one series each, its own scale,
// its own title — which also means neither chart asks the reader to tell
// gilt from rubric inside a single figure, a discrimination this palette
// does not survive under deuteranopia in light mode.
//
// The recessive hatched underlay is the share of each month's days that
// canon law closed to weddings, averaged across the whole register era
// (two of the three closed seasons move with Easter, so no single year's
// mask would be honest behind a two-century summary). It is what explains
// the two empty columns rather than leaving them looking like a bug.
const SEASON_W = 420;
const SEASON_H = 104;
const SEASON_PAD_B = 16;
const SEASON_PAD_T = 12;
/** Cap the mark rather than filling the slot — the leftover is the air. */
const SEASON_BAR_MAX = 24;

function renderMonthChart(t: (typeof UI)[Locale], title: string, counts: number[], closedShare: number[], cls: string): string {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const slot = SEASON_W / 12;
  // 2px of surface between neighbours — the gap does the separating, never a stroke.
  const barW = Math.min(SEASON_BAR_MAX, slot - 2);
  const plotH = SEASON_H - SEASON_PAD_B - SEASON_PAD_T;
  const peak = counts.indexOf(max);

  let marks = "";
  counts.forEach((n, i) => {
    const x = i * slot + (slot - barW) / 2;
    // Closed-season underlay, behind the data, one step off the surface.
    const shade = closedShare[i];
    if (shade > 0.02) {
      marks += `<rect class="sc-closed" x="${x.toFixed(1)}" y="${SEASON_PAD_T}" width="${barW.toFixed(1)}" height="${plotH}" opacity="${(shade * 0.85).toFixed(2)}"><title>${esc(`${t.months[i]} — ${Math.round(shade * 100)}% ${t.closedSeasonLabel}`)}</title></rect>`;
    }
    const h = (n / max) * plotH;
    const y = SEASON_PAD_T + plotH - h;
    // 4px rounded data-end, square at the baseline: draw the round rect and
    // square the foot back off with a small overlay of the same fill.
    if (h > 0) {
      marks += `<g class="${cls}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4"/><rect x="${x.toFixed(1)}" y="${(y + Math.min(h, 4)).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h - Math.min(h, 4)).toFixed(1)}"/></g>`;
    }
    // Hit target spans the whole slot, not just the mark — a two-count
    // month is otherwise unhoverable.
    marks += `<rect class="sc-hit" x="${(i * slot).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${SEASON_H}"><title>${esc(`${t.monthCount(t.months[i], n)}${total ? ` · ${((n / total) * 100).toFixed(1)}%` : ""}`)}</title></rect>`;
  });

  // Label selectively: the peak alone. The axis carries the rest.
  const labelX = peak * slot + slot / 2;
  const labelY = SEASON_PAD_T + plotH - (counts[peak] / max) * plotH - 3;
  const ticks = counts
    .map((_, i) => `<text class="sc-tick" x="${(i * slot + slot / 2).toFixed(1)}" y="${SEASON_H - 4}">${esc(t.monthsShort[i][0])}</text>`)
    .join("");

  return `<figure class="seasonfig">
    <figcaption class="sc-title">${esc(title)} <span class="sc-total">${total}</span></figcaption>
    <svg class="seasonsvg" viewBox="0 0 ${SEASON_W} ${SEASON_H}" role="img"
         aria-label="${esc(`${title}: ${counts.map((n, i) => t.monthCount(t.months[i], n)).join(", ")}`)}">
      ${marks}
      <line class="sc-base" x1="0" y1="${SEASON_PAD_T + plotH}" x2="${SEASON_W}" y2="${SEASON_PAD_T + plotH}"/>
      <text class="sc-peak" x="${labelX.toFixed(1)}" y="${Math.max(9, labelY).toFixed(1)}">${counts[peak]}</text>
      ${ticks}
    </svg>
  </figure>`;
}

function renderSeasonSection(E: typeof Engine, env: Envelope, locale: Locale): string {
  const t = UI[locale];
  const s = E.seasonalCounts(env, VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX);
  // A worked example of the movable feast, so the note is not an assertion.
  const easter = E.julianEaster(1400);
  const easter2 = E.julianEaster(1401);
  return `<details class="register season reveal"><summary>${esc(t.seasonHeader)}</summary>
    <p class="season-note">${esc(t.seasonNote)}</p>
    <p class="season-note dim">${esc(`${t.easterOf(1400, easter.day, t.months[easter.month - 1])}; ${t.easterOf(1401, easter2.day, t.months[easter2.month - 1])}.`)}</p>
    <div class="seasongrid">
      ${renderMonthChart(t, t.marriagesByMonth, s.marriages, s.closedShare, "sc-wed")}
      ${renderMonthChart(
        t,
        t.burialsByMonth,
        s.burials,
        s.closedShare.map(() => 0),
        "sc-bur",
      )}
    </div>
  </details>`;
}

// The full roster of a village, as clickable rows. Shared by the person
// record (where it is one section among many) and the village's own page
// (§ the village route), which is the register and little else.
function renderParishRegister(E: typeof Engine, env: Envelope, locale: Locale, currentId: number, open = false): string {
  const t = UI[locale];
  const reg = E.roster(env)
    .slice()
    .sort((a, b) => a.birth - b.birth);
  // U1 § finding a person: a village runs to several hundred souls and the
  // only ways into one were a random roll and a locator you already had.
  // The haystack was always right here; it just had no way in. Filtering is
  // done in the DOM (app.ts) rather than by re-rendering, so it stays
  // instant on a register this long and needs no engine call at all — every
  // row already carries the text it would be matched on.
  const searchOf = (r: Engine.RosterRow) => `${r.name} ${r.surname} ${r.birth} ${r.death.year}`.toLowerCase();
  return (
    `<details class="register reveal"${open ? " open" : ""}><summary>${esc(t.parishRegisterHeader(reg.length, env.place[locale]))}</summary>` +
    `<div class="regfilter">
      <label class="sr-only" for="regq">${esc(t.registerFilterLabel)}</label>
      <input type="search" id="regq" class="regq" placeholder="${esc(t.registerFilterPlaceholder)}" autocomplete="off" data-total="${reg.length}">
      <span class="regcount" id="regcount"></span>
    </div>` +
    `<p class="regempty" id="regempty" hidden>${esc(t.registerFilterEmpty)}</p>` +
    `<div class="register-list" id="reglist">` +
    reg
      .map(
        (
          r,
        ) => `<button class="regrow${r.id === currentId ? " current" : ""}" data-goto="${env.regionKey}:${env.villageIdx}:${r.id}" data-q="${esc(searchOf(r))}">
      <span class="rr-name">${esc(r.name)} ${esc(r.surname)}${r.founder ? ` <i>${t.founderTag}</i>` : r.incomer ? ` <i>${t.incomerTag}</i>` : r.emigrated ? ` <i>${t.emigratedTag}</i>` : ""}</span>
      <span class="rr-dates">${r.birth}–${r.death.year}</span>
      <span class="rr-cause${r.death.cause === "plague" ? " plague" : ""}">${esc(E.CAUSE_LABEL[locale][r.death.cause])}</span>
    </button>`,
      )
      .join("") +
    `</div></details>`
  );
}

function renderVillageSection(E: typeof Engine, env: Envelope, year: number, locale: Locale, currentId: number, open = false): string {
  const t = UI[locale];
  return `<details class="register village reveal"${open ? " open" : ""}><summary>${esc(t.villageHeader(env.place[locale]))}</summary>
    ${renderPopulationChart(E, env, year, locale)}
    <div class="village-controls">
      <label class="vyear-lbl" for="vyear">${esc(t.yearLabel)}</label>
      <input type="range" id="vyear" min="${VILLAGE_YEAR_MIN}" max="${VILLAGE_YEAR_MAX}" step="1" value="${year}">
      <output class="vyear-out" id="vyearout" for="vyear">${year}</output>
    </div>
    <div class="village-body" id="vbody">${renderVillageBody(E, env, year, locale, currentId)}</div>
  </details>`;
}

// § nobility: the region's royal line as a collapsed register-style block —
// every reign of the REAL sovereign line (data, not dice), with the reigns
// this person actually lived under highlighted. Rows are plain rows, not
// goto buttons: kings live in no village register to navigate to.
function renderRoyalLineSection(E: typeof Engine, regionKey: string, bio: Bio, locale: Locale): string {
  const t = UI[locale];
  const line = E.royalLineOf(regionKey);
  if (!line) return "";
  const rows = line.reigns
    .map((r) => {
      // Lived-under = reign years overlap [birth, death]; the incoming reign
      // owns its accession year, mirroring sovereignAt. Each row links to
      // the royal-line view (§ everything that can be a link is a link).
      const lived = r.from <= bio.death.year && r.to >= bio.birth;
      const i = line.reigns.indexOf(r);
      return `<button class="ryrow${lived ? " lived" : ""}${r.interregnum ? " interregnum" : ""}" data-goto="${kingGoto(regionKey, i)}"${lived ? ` title="${esc(t.reignedInLifetime)}"` : ""}>
      <span class="ry-years">${r.from}–${r.to}</span>
      <span class="ry-style">${esc(r.style[locale])}</span>
      <span class="ry-house">${r.house ? esc(r.house[locale]) : "—"}</span>
    </button>`;
    })
    .join("");
  return `<details class="register royal reveal"><summary>${esc(t.royalLineHeader(line.title[locale]))}</summary><div class="register-list royal-list">${rows}</div></details>`;
}

// § the Schism: the region's papal series as a collapsed register-style
// block, mirroring renderRoyalLineSection. Only the terms overlapping this
// life are worth walking, so the section shows those and links on to the
// whole series — a list of forty-odd popes is a page, not a sidebar.
function renderPapalSection(E: typeof Engine, regionKey: string, bio: Bio, locale: Locale): string {
  const t = UI[locale];
  const series = E.papalSeriesOf(regionKey);
  const lived = series.map((term, i) => ({ term, i })).filter(({ term }) => term.from <= bio.death.year && term.to >= bio.birth);
  if (!lived.length) return "";
  const rows = lived
    .map(
      ({
        term,
        i,
      }) => `<button class="ryrow lived${term.kind !== "pope" ? " interregnum" : ""}" data-goto="${pontiffGoto(regionKey, i)}" title="${esc(t.obeyedHere)}">
      <span class="ry-years">${termYears(term)}</span>
      <span class="ry-style">${esc(termLabel(t, term, locale))}</span>
      <span class="ry-house">${esc(term.pope ? t.seatName[term.pope.seat] : "—")}</span>
    </button>`,
    )
    .join("");
  return `<details class="register royal reveal"><summary>${esc(t.papalSeriesHeader(bio.region))}</summary>
    <div class="register-list royal-list">${rows}</div>
    <div class="royal-link"><button class="namelink" data-goto="${papacyGoto(regionKey)}">${esc(t.pontificatesHeader)}</button></div>
  </details>`;
}

function renderLineageBar(stack: StackNode[], t: (typeof UI)[Locale]): string {
  if (stack.length <= 1) return "";
  let h = `<nav class="lineage reveal" aria-label="${esc(t.trail)}">`;
  stack.forEach((n, i) => {
    const here = i === stack.length - 1;
    h += `<button class="crumb${here ? " here" : ""}" data-jump="${i}" ${here ? "disabled" : ""}>${esc(n.crumb)}</button>`;
    if (!here) h += '<span class="sep">›</span>';
  });
  h += "</nav>";
  return h;
}

// Dispatches the current top of the navigation stack to its view builder —
// person record, royal line, or noble house (§ nobility routes).
// One definition of the famine hatch for the whole document — both the
// population curve and the lifeline reference it, and an SVG id may only
// be defined once. Prepended to every view so the pattern exists whichever
// page is up.
const CHART_DEFS = `<svg class="chartdefs" aria-hidden="true" focusable="false"><defs>
  <pattern id="hatch-famine" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="rgba(var(--gilt-rgb), 0.10)"/>
    <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(var(--gilt-rgb), 0.55)" stroke-width="2"/>
  </pattern>
</defs></svg>`;

export function buildViewHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], locale: Locale): string {
  const body = buildViewBody(E, worldSeed, stack, locale);
  // An unresolvable node still renders as nothing at all, defs included:
  // pattern definitions for a page with no marks on it are just noise.
  return body ? CHART_DEFS + body : "";
}

function buildViewBody(E: typeof Engine, worldSeed: number, stack: StackNode[], locale: Locale): string {
  const node = stack[stack.length - 1];
  if (node.kind === "region") return buildRegionHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "pedigree") return buildPedigreeHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "village") return buildVillageHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "parish" || node.kind === "deanery" || node.kind === "diocese") return buildParishHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "royal") return buildRoyalLineHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "king") return buildKingHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "papacy") return buildPapacyHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "pontiff") return buildPontiffHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "rector") return buildRectorHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "tenement") return buildTenementHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "house") return buildNobleHouseHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "lord" || node.kind === "baron") return buildLordHTML(E, worldSeed, stack, node, locale);
  return buildRecordHTML(E, worldSeed, stack, locale);
}

// Builds the full record view for the current top of the navigation stack.
// Mutates `node.crumb` (as the original did) so the lineage bar can label it.
export function buildRecordHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], locale: Locale): string {
  const t = UI[locale];
  const node = stack[stack.length - 1];
  if (!isPersonNode(node)) return "";
  const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
  const bio = E.decodePerson(env, node.personId, locale);
  if (!bio) return "";
  node.crumb = bio.name + " " + bio.surname;

  const sibsDead = bio.siblings.filter((s) => s.death.age < 16).length;
  // § the season: a date that landed on a feast is named by it, because
  // that is how the day was actually known — beside the number, not
  // instead of it.
  const birthFeast = feastLabel(E, t, bio.birthDate, bio.birth, locale);
  const deathFeast = feastLabel(E, t, bio.deathDate, bio.death.year, locale);
  // § the tenement: the ground this person's own household stood on — the
  // first union they held, which is the holding their record belongs to.
  // An undersettle held none, and the page says so rather than inventing
  // one: the category is real and the surveys record it.
  const ownCouple = env.persons[node.personId].unions?.[0];
  const ownTenement = ownCouple != null ? env.couples[ownCouple].tenement : undefined;
  const tenements = E.tenementsOf(worldSeed, node.regionKey, node.villageIdx);
  const holdingHtml =
    ownTenement != null && tenements[ownTenement]
      ? `<button class="namelink" data-goto="${lordGoto("tenement", node, ownTenement)}">${esc(
          E.tenementName(env, ownTenement) ? t.tenementNamed(E.tenementName(env, ownTenement)!) : t.tenementUnnamed(ownTenement + 1),
        )}</button>`
      : `<span class="dim">${esc(ownCouple != null ? t.undersettle : t.none)}</span>`;
  const vitals: [string, string, string][] = [
    [t.born, bio.birth + "", ""],
    [t.died, bio.death.year + " · " + (locale === "ca" ? "als " + bio.death.age + " anys" : "aged " + bio.death.age), "red"],
    [t.causeOfDeath, bio.causeLabel, "red"],
    [t.estate, bio.clsLabel, ""],
    [t.region, bio.region, ""],
    [
      t.children,
      bio.children.length
        ? t.bornRaised(bio.children.length, bio.children.filter((c) => c.death.age >= 16).length)
        : bio.inOrders
          ? t.noneInOrders
          : // § the marriage squeeze: she left for service in a town, so this
            // register is as unable to answer for her issue as if she had
            // married out — which is what "in another register" says.
            bio.marriedOut || bio.cityService
            ? t.inAnotherRegister
            : t.none,
      bio.children.some((c) => c.death.age >= 16) ? "gold" : "",
    ],
  ];

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(bio.name[0])}</span>${esc(bio.name.slice(1))} ${esc(bio.surname)}</h1>
    <div class="dates">natus <b>${esc(fullDate(t, bio.birthDate, bio.birth))}</b>${birthFeast ? ` <i class="feast">${esc(birthFeast)}</i>` : ""} · <span class="obiit">obiit ${esc(fullDate(t, bio.deathDate, bio.death.year))}</span>${deathFeast ? ` <i class="feast">${esc(deathFeast)}</i>` : ""} · <button class="namelink" data-goto="${villageGoto(node)}">${esc(bio.place)}</button>, ${esc(bio.region)}</div>
    <div class="vitals">${vitals.map((v) => `<div class="vital"><div class="k">${v[0]}</div><div class="v ${v[2]}">${esc(v[1])}</div></div>`).join("")}</div>
  </article>`;

  // Jurisdictions — the ecclesiastical and feudal trees, independent of the
  // civil region/village tree and of each other; a parish boundary rarely
  // lines up with a manor's, and neither lines up with the county's.
  // § nobility links: the lord vital opens the anchor-year head's own page;
  // the sovereign vital opens the birth-year sovereign's page.
  const lordVitalGoto = lordGoto("lord", node, E.tenureIndexAt(E.manorLineOf(worldSeed, node.regionKey, node.villageIdx).heads, E.ANCHOR_YEAR));
  const birthReignIdx = E.reignIndexAt(node.regionKey, bio.birth);
  const sovereignVitalGoto = birthReignIdx >= 0 ? kingGoto(node.regionKey, birthReignIdx) : royalGoto(node.regionKey);
  html += `<div class="sect reveal"><h2>${esc(t.jurisdictions)}</h2></div>
  <div class="vitals reveal">
    <div class="vital"><div class="k">${t.parish}</div><div class="v"><button class="namelink" data-goto="${parishGoto("parish", node)}">${esc(bio.jurisdiction.parish)}</button></div></div>
    <div class="vital"><div class="k">${t.deanery}</div><div class="v"><button class="namelink" data-goto="${parishGoto("deanery", node)}">${esc(bio.jurisdiction.deanery)}</button></div></div>
    <div class="vital"><div class="k">${t.diocese}</div><div class="v"><button class="namelink" data-goto="${parishGoto("diocese", node)}">${esc(bio.jurisdiction.diocese)}</button></div></div>
    <div class="vital"><div class="k">${t.manor}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(bio.fief.manor)}</button></div></div>
    <div class="vital"><div class="k">${t.honour}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(bio.fief.honour)}</button></div></div>
    <div class="vital"><div class="k">${t.lord}</div><div class="v"><button class="namelink" data-goto="${lordVitalGoto}">${esc(bio.fief.lord)}</button></div></div>
    <div class="vital"><div class="k">${t.sovereign}</div><div class="v"><button class="namelink" data-goto="${sovereignVitalGoto}">${esc(bio.sovereign)}</button></div></div>
    <div class="vital"><div class="k">${t.region}</div><div class="v"><button class="namelink" data-goto="${regionGoto(node.regionKey)}">${esc(bio.region)}</button></div></div>
    <div class="vital"><div class="k">${t.incumbentTitle[bio.rectorTitle]}</div><div class="v"><button class="namelink" data-goto="${lordGoto("rector", node, bio.rectorIdx)}">${esc(bio.rector)}</button></div></div>
    <div class="vital"><div class="k">${t.holdingLabel}</div><div class="v">${holdingHtml}</div></div>
    <div class="vital"><div class="k">${t.pontiff}</div><div class="v">${
      bio.pontiffIdx >= 0
        ? `<button class="namelink" data-goto="${pontiffGoto(node.regionKey, bio.pontiffIdx)}">${esc(bio.pontiff || t.noPontiff)}</button>`
        : esc(t.noPontiff)
    }</div></div>
  </div>`;

  // U2 § the lifeline: directly under the card, because it is a picture of
  // the two dates the card just gave and everything that happened between
  // them — it belongs with them, not filed under a heading further down.
  html += renderLifeline(E, bio, locale);

  // Royal line — collapsed under the jurisdictions it crowns.
  html += renderRoyalLineSection(E, node.regionKey, bio, locale);
  // § the Schism: and the other head, on the same footing. Collapsed, with
  // the terms this person actually lived under highlighted — which for
  // anyone alive between 1378 and 1417 is where their region's list stops
  // agreeing with everyone else's.
  html += renderPapalSection(E, node.regionKey, bio, locale);

  // Parentage
  html += `<div class="sect reveal"><h2>${esc(t.parentage)}</h2></div><div class="parents reveal">`;
  if (bio.father) {
    const fOcc = bio.fatherOccupation;
    // § nobility links: the lord the father held of (fatherOccupation's
    // {lord}, resolved at his working prime — same formula as biography.ts)
    // links to that manor's house; for an immigrant this is the ORIGIN
    // village's manor, which is exactly what bio.father.addr carries.
    const fLine = E.manorLineOf(worldSeed, bio.father.addr.regionKey, bio.father.addr.villageIdx);
    const fLordIdx = E.tenureIndexAt(fLine.heads, Math.min(bio.father.death.year, bio.father.birth + 30));
    const fOccHtml = fOcc
      ? linkifyEventText(fOcc.charAt(0).toUpperCase() + fOcc.slice(1), [
          { id: -1, name: fLine.heads[fLordIdx].name, addr: bio.father.addr, route: "lord", routeIdx: fLordIdx },
        ])
      : "";
    html += `<div class="parent"><div class="who">${t.father}${bio.father.foreign ? esc(t.ofPlace(bio.originPlace || "")) : ""}</div><button class="pname" data-goto="${addrStr(bio.father.addr, bio.father.id)}">${esc(bio.father.name)}</button><p>${fOccHtml}.</p><button class="openrel plink" data-goto="${addrStr(bio.father.addr, bio.father.id)}">${esc(t.openHisRecord)}</button></div>`;
  } else {
    html += `<div class="parent"><div class="who">${t.father}</div><div class="pname">${bio.incomer ? t.ofAnotherParish : t.beforeRegister}</div><p>${bio.incomer ? t.fatherIncomerNote : t.fatherBeforeNote}</p></div>`;
  }
  if (bio.mother) {
    html += `<div class="parent"><div class="who">${t.mother}${bio.mother.foreign ? esc(t.ofPlace(bio.originPlace || "")) : ""}</div><button class="pname" data-goto="${addrStr(bio.mother.addr, bio.mother.id)}">${esc(bio.mother.name)}</button><p>${bio.mother.dead.cause === "childbirth" ? t.motherChildbedNote : t.motherRaisedNote}</p><button class="openrel plink" data-goto="${addrStr(bio.mother.addr, bio.mother.id)}">${esc(t.openHerRecord)}</button></div>`;
  } else {
    html += `<div class="parent"><div class="who">${t.mother}</div><div class="pname">${bio.incomer ? t.ofAnotherParish : t.beforeRegister}</div><p>${t.motherIncomerNote}</p></div>`;
  }
  html += `</div>`;

  // Siblings
  if (bio.siblings.length) {
    html +=
      `<div class="sect reveal"><h2>${esc(t.siblingsHeader(bio.siblings.length, sibsDead))}</h2></div>
    <div class="relgrid reveal">` +
      bio.siblings.map((s) => relCard(s.sex === "M" ? t.brother : t.sister, s, addrStr(s.addr, s.id))).join("") +
      `</div>`;
  }

  // Chronicle — a chronicle that closes with an "elsewhere" entry (§
  // departure: she married out or he left for good, with nothing further
  // true to narrate here) gets a fading treatment instead of ending flush,
  // so the page itself reads as trailing off rather than just stopping.
  const trailsOff = bio.events.at(-1)?.kind === "elsewhere";
  html += `<div class="sect reveal"><h2>${esc(t.chronicle)}</h2></div><div class="chronicle${trailsOff ? " chronicle-fade" : ""}">`;
  bio.events.forEach((e, i) => {
    const label = KIND_LABEL[locale][e.kind] || "";
    // § the season: only the entries a parish register really dated to the
    // day carry one (baptism, wedding, burial). The rest keep the bare
    // year, which is the honest rendering of a chronicle note or a court
    // roll's business — so the column is deliberately uneven.
    const day = e.date
      ? `<span class="dm" title="${esc(feastLabel(E, t, e.date, e.year, locale) || fullDate(t, e.date, e.year))}">${esc(t.shortDate(e.date.day, e.date.month))}</span>`
      : "";
    html += `<div class="entry k-${e.kind} reveal" style="animation-delay:${Math.min(i * 55, 850)}ms">
      <div class="yr">${day}${e.year}<span class="age">aet. ${e.age}</span></div>
      <div class="tx">${linkifyEventText(e.text, e.refs)}${label ? `<span class="tag">${label}</span>` : ""}<span class="src">${esc(e.src)}</span></div>
    </div>`;
  });
  html += `</div>`;

  // Marriage & children — every union (remarriage included), spouses first
  if (bio.unions.length || bio.children.length) {
    html += `<div class="sect reveal"><h2>${esc(t.marriageIssue)}</h2></div><div class="relgrid reveal">`;
    for (const u of bio.unions) {
      const note = t.marriedAbbr(u.year) + (u.spouse.originPlace ? t.fromPlace(u.spouse.originPlace) : "");
      html += relCard(
        bio.sex === "M" ? t.wife : t.husband,
        { name: u.spouse.name, surname: "", birth: u.spouse.birth, death: u.spouse.death },
        addrStr(u.spouse.addr, u.spouse.id),
        { note },
      );
    }
    html += bio.children.map((c) => relCard(c.sex === "M" ? t.son : t.daughter, c, addrStr(c.addr, c.id))).join("");
    html += `</div>`;
  }

  // § the price of bread: whether this household's own land fed it. Placed
  // after the marriage section because it needs a household to be about —
  // and taken twelve years in, when the children are born and eating and
  // the holding is under the most strain it will ever be under.
  if (ownCouple != null) {
    const c = env.couples[ownCouple];
    html += renderSubsistenceSection(E, worldSeed, env, ownCouple, Math.min(c.year + 12, bio.death.year), locale);
  }

  // Parish register browser
  html += renderParishRegister(E, env, locale, node.personId);

  // Village-in-year view (§ year layer), defaulting to the subject's prime
  // — or to whatever year the locator carries (§ the year in the locator),
  // so a shared link opens on the year it was shared from.
  html += renderVillageSection(E, env, clampVillageYear(node.year) ?? defaultVillageYear(bio.birth), locale, node.personId);

  html += `<div class="ledger reveal">
    ${t.ledger(bio.death.age, bio.plaguesLived, !!bio.widowed, bio.literate)}
  </div>`;

  html += renderFamilyTree(t, bio);
  // § the pedigree: the one-step tree above is deliberately one step. This
  // is the way out of it, into the many-generation traversal the engine has
  // always been able to do and nothing ever asked it for.
  html += `<div class="royal-link reveal"><button class="namelink" data-goto="${pedigreeGoto(node)}">${esc(t.pedigreeOpen)}</button></div>`;

  return html;
}

// ---- § nobility routes: the two nobility views ----

// The royal line of a region: every reign with years, style, house, and the
// hand-written accession story where one exists. The page every king link
// in the app resolves to.
function buildRoyalLineHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: RoyalNode, locale: Locale): string {
  const t = UI[locale];
  const line = E.royalLineOf(node.regionKey);
  if (!line) return "";
  const title = line.title[locale];
  node.crumb = title;

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(E.REGIONS[node.regionKey].name[locale])}</div>
  </article>`;

  html += `<div class="sect reveal"><h2>${esc(t.reignsHeader)}</h2></div><div class="reigns reveal">`;
  line.reigns.forEach((r, i) => {
    // Every reign row opens that sovereign's own page (§ everything linkable).
    html += `<div class="reign${r.interregnum ? " interregnum" : ""}">
      <button class="reign-head" data-goto="${kingGoto(node.regionKey, i)}">
        <span class="ry-years">${r.from}–${r.to}</span>
        <span class="reign-style">${esc(r.style[locale])}</span>
        <span class="ry-house">${r.house ? esc(r.house[locale]) : "—"}</span>
      </button>
      ${r.accession ? `<p class="reign-note">${esc(r.accession[locale])}</p>` : ""}
    </div>`;
  });
  html += `</div>`;
  return html;
}

// One sovereign's own page: the reign's vitals, its accession story, and
// the events of the region that fell within it — with predecessor and
// successor pages a click away.
function buildKingHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: KingNode, locale: Locale): string {
  const t = UI[locale];
  const line = E.royalLineOf(node.regionKey);
  const r = line?.reigns[node.reignIdx];
  if (!line || !r) return "";
  node.crumb = r.name[locale];
  const region = E.REGIONS[node.regionKey];

  const neighbour = (i: number, label: string): string => {
    const other = line.reigns[i];
    if (!other) return "";
    return `<div class="vital"><div class="k">${esc(label)}</div><div class="v"><button class="namelink" data-goto="${kingGoto(node.regionKey, i)}">${esc(other.name[locale])}</button></div></div>`;
  };

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(r.name[locale][0])}</span>${esc(r.name[locale].slice(1))}</h1>
    <div class="dates">${esc(r.style[locale])} · ${esc(region.name[locale])}</div>
  </article>`;

  html += `<div class="vitals reveal">
    <div class="vital"><div class="k">${t.reignedLabel}</div><div class="v">${r.from}–${r.to}</div></div>
    <div class="vital"><div class="k">${t.houseLabel}</div><div class="v">${r.house ? esc(r.house[locale]) : "—"}</div></div>
    ${neighbour(node.reignIdx - 1, t.predecessor)}
    ${neighbour(node.reignIdx + 1, t.successor)}
  </div>`;

  // Chronicle of the reign: the accession story plus the region's dated
  // events (plagues, wars, famine, revolt) that fell inside it — the same
  // data the villagers' own chronicles are grounded in.
  const entries: { year: number; text: string }[] = [];
  const accession = E.accessionTextOf(node.regionKey, node.reignIdx, locale);
  if (accession) entries.push({ year: r.from, text: accession });
  for (const pl of E.PLAGUES) if (pl[0] <= r.to && pl[1] >= r.from) entries.push({ year: Math.max(pl[0], r.from), text: pl[3][locale] });
  for (const [a, b] of region.warYears) if (a <= r.to && b >= r.from) entries.push({ year: Math.max(a, r.from), text: region.warNames[a]?.[locale] ?? "" });
  if (region.famine[0] <= r.to && region.famine[1] >= r.from) entries.push({ year: Math.max(region.famine[0], r.from), text: region.famineName[locale] });
  if (region.revolt && region.revolt.year >= r.from && region.revolt.year <= r.to) entries.push({ year: region.revolt.year, text: region.revolt.name[locale] });
  if (r.end && node.reignIdx < line.reigns.length - 1) entries.push({ year: r.to, text: t.reignEnd[r.end](r.to) });
  entries.sort((a, b) => a.year - b.year);

  if (entries.length) {
    html += `<div class="sect reveal"><h2>${esc(t.reignChronicle)}</h2></div><div class="reigns reveal">${entries
      .filter((e) => e.text)
      .map((e) => `<div class="ryrow tenure"><span class="ry-years">${e.year}</span><span class="ry-style">${esc(e.text)}</span></div>`)
      .join("")}</div>`;
  }

  html += `<div class="royal-link reveal"><button class="namelink" data-goto="${royalGoto(node.regionKey)}">${esc(t.royalLineHeader(line.title[locale]))}</button></div>`;
  return html;
}

// A manor's noble house: the lord line of the manor itself and the baronial
// house of the honour it belongs to — the destination of every lord link.
function buildNobleHouseHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: HouseNode, locale: Locale): string {
  const t = UI[locale];
  const fief = E.manorOf(worldSeed, node.regionKey, node.villageIdx, locale);
  const manorLine = E.manorLineOf(worldSeed, node.regionKey, node.villageIdx);
  const honourLine = E.honourLineOf(worldSeed, node.regionKey, node.villageIdx);
  const royal = E.royalLineOf(node.regionKey);
  const title = t.houseOf(manorLine.surname);
  node.crumb = title;

  // Every head row opens that lord's own page (§ everything linkable).
  const tenureRows = (kind: "lord" | "baron", line: { surname: string; heads: Engine.LordTenure[] }): string =>
    line.heads
      .map(
        (h, i) => `<button class="ryrow tenure" data-goto="${lordGoto(kind, node, i)}">
      <span class="ry-years">${h.acceded}–${h.died}</span>
      <span class="ry-style">${esc(h.name)}</span>
      <span class="ry-house">${esc(t.tenureRelation[h.relation])} · ${esc(t.tenureCause[h.cause])}</span>
    </button>`,
      )
      .join("");

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(fief.manor)} · ${esc(fief.honour)} · ${esc(fief.earldom)}</div>
  </article>`;

  html += `<div class="sect reveal"><h2>${esc(t.lordsOfHeader)}</h2></div><div class="reigns reveal">${tenureRows("lord", manorLine)}</div>`;

  // The honour's own baronial family — the same family as the manor's when
  // the manor is held by a cadet (same surname), a different one otherwise.
  html += `<div class="sect reveal"><h2>${esc(t.honourHouseHeader)}</h2></div>
  <div class="honour-note reveal">${esc(t.houseOf(honourLine.surname))} · ${esc(fief.earldom)}</div>
  <div class="reigns reveal">${tenureRows("baron", honourLine)}</div>`;

  if (royal) {
    html += `<div class="royal-link reveal"><button class="namelink" data-goto="${royalGoto(node.regionKey)}">${esc(t.royalLineHeader(royal.title[locale]))}</button></div>`;
  }
  return html;
}

// One lord's own page: a head of the manor's line ("lord") or of the
// honour's baronial line ("baron") — tenure, succession, how he died, the
// sovereigns of his time, and his predecessor/successor a click away.
function buildLordHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: LordNode, locale: Locale): string {
  const t = UI[locale];
  const line = node.kind === "lord" ? E.manorLineOf(worldSeed, node.regionKey, node.villageIdx) : E.honourLineOf(worldSeed, node.regionKey, node.villageIdx);
  const h = line.heads[node.headIdx];
  if (!h) return "";
  node.crumb = h.name;
  const fief = E.manorOf(worldSeed, node.regionKey, node.villageIdx, locale);
  const royal = E.royalLineOf(node.regionKey);

  const neighbour = (i: number, label: string): string => {
    const other = line.heads[i];
    if (!other) return "";
    return `<div class="vital"><div class="k">${esc(label)}</div><div class="v"><button class="namelink" data-goto="${lordGoto(node.kind, node, i)}">${esc(other.name)}</button></div></div>`;
  };

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(h.name[0])}</span>${esc(h.name.slice(1))}</h1>
    <div class="dates">natus <b>${h.born}</b> · <span class="obiit">obiit ${h.died}</span> · ${esc(node.kind === "lord" ? fief.manor : fief.honour)}</div>
  </article>`;

  html += `<div class="vitals reveal">
    <div class="vital"><div class="k">${t.tenureLabel}</div><div class="v">${h.acceded}–${h.died}</div></div>
    <div class="vital"><div class="k">${node.kind === "lord" ? t.manor : t.honour}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(node.kind === "lord" ? fief.manor : fief.honour)}</button></div></div>
    <div class="vital"><div class="k">${t.successionLabel}</div><div class="v">${esc(t.tenureRelation[h.relation])}</div></div>
    <div class="vital"><div class="k">${t.causeOfDeath}</div><div class="v red">${esc(t.tenureCause[h.cause])}</div></div>
    ${neighbour(node.headIdx - 1, t.predecessor)}
    ${neighbour(node.headIdx + 1, t.successor)}
  </div>`;

  // The sovereigns whose reigns overlapped his tenure — each linking to
  // their own page.
  if (royal) {
    const reigns = royal.reigns.map((r, i) => ({ r, i })).filter(({ r }) => r.from <= h.died && r.to >= h.acceded);
    if (reigns.length) {
      html += `<div class="sect reveal"><h2>${esc(t.sovereignsOfTime)}</h2></div><div class="reigns reveal">${reigns
        .map(
          ({ r, i }) => `<button class="ryrow tenure" data-goto="${kingGoto(node.regionKey, i)}">
        <span class="ry-years">${r.from}–${r.to}</span>
        <span class="ry-style">${esc(r.style[locale])}</span>
        <span class="ry-house">${r.house ? esc(r.house[locale]) : "—"}</span>
      </button>`,
        )
        .join("")}</div>`;
    }
  }

  html += `<div class="royal-link reveal"><button class="namelink" data-goto="${houseGoto(node)}">${esc(t.houseOf(line.surname))}</button></div>`;
  return html;
}

// ---- § the Schism: the two papal views ----

/** A term's label and years, shared by the series list and the term page —
 * a vacancy and a withdrawal of obedience are terms too, and saying so is
 * the point of showing the series rather than only the popes in it. */
function termLabel(t: (typeof UI)[Locale], term: Engine.PapalTerm, locale: Locale): string {
  if (term.kind === "pope") return term.pope!.style[locale];
  return term.kind === "vacant" ? t.sedeVacante : t.noObedienceTerm;
}

function termYears(term: Engine.PapalTerm): string {
  return term.from === term.to ? `${term.from}` : `${term.from}–${term.to}`;
}

// The popes of one region — which is a different list from the popes of
// the region next door, and the only page in the app where that is true.
function buildPapacyHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: PapacyNode, locale: Locale): string {
  const t = UI[locale];
  const region = E.REGIONS[node.regionKey];
  const series = E.papalSeriesOf(node.regionKey);
  const title = t.papalSeriesHeader(region.name[locale]);
  node.crumb = title;

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(region.name[locale])}</div>
  </article>`;
  html += `<div class="honour-note reveal">${t.schismNote}</div>`;

  html += `<div class="sect reveal"><h2>${esc(t.pontificatesHeader)}</h2></div><div class="reigns reveal">`;
  series.forEach((term, i) => {
    // A vacancy or a withdrawal is styled like an interregnum for the same
    // reason: it is one.
    const gap = term.kind !== "pope";
    const seat = term.pope ? t.seatName[term.pope.seat] : "—";
    html += `<button class="ryrow${gap ? " interregnum" : ""}" data-goto="${pontiffGoto(node.regionKey, i)}">
      <span class="ry-years">${termYears(term)}</span>
      <span class="ry-style">${esc(termLabel(t, term, locale))}</span>
      <span class="ry-house">${esc(seat)}</span>
    </button>`;
  });
  html += `</div>`;
  return html;
}

// One pontificate as this region lived it: the years IT obeyed him (not
// necessarily the years he reigned), his seat, his obedience, and the
// jubilees that fell inside.
function buildPontiffHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: PontiffNode, locale: Locale): string {
  const t = UI[locale];
  const series = E.papalSeriesOf(node.regionKey);
  const term = series[node.termIdx];
  if (!term) return "";
  const region = E.REGIONS[node.regionKey];
  const title = term.kind === "pope" ? term.pope!.name[locale] : termLabel(t, term, locale);
  node.crumb = title;

  const neighbour = (i: number, label: string): string => {
    const other = series[i];
    if (!other) return "";
    return `<div class="vital"><div class="k">${esc(label)}</div><div class="v"><button class="namelink" data-goto="${pontiffGoto(node.regionKey, i)}">${esc(other.kind === "pope" ? other.pope!.name[locale] : termLabel(t, other, locale))}</button></div></div>`;
  };

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(term.kind === "pope" ? term.pope!.style[locale] : title)} · ${esc(region.name[locale])}</div>
  </article>`;

  html += `<div class="vitals reveal">
    <div class="vital"><div class="k">${t.heldSeeLabel}</div><div class="v">${esc(termYears(term))}</div></div>
    ${term.pope ? `<div class="vital"><div class="k">${t.seatLabel}</div><div class="v">${esc(t.seatName[term.pope.seat])}</div></div>` : ""}
    ${term.pope ? `<div class="vital"><div class="k">${t.obedienceLabel}</div><div class="v">${esc(t.lineName[term.pope.line])}</div></div>` : ""}
    ${term.pope?.end ? `<div class="vital"><div class="k">${t.causeOfDeath}</div><div class="v red">${esc(t.pontificateEnd[term.pope.end])}</div></div>` : ""}
    ${neighbour(node.termIdx - 1, t.predecessor)}
    ${neighbour(node.termIdx + 1, t.successor)}
  </div>`;

  if (term.pope?.note) html += `<div class="honour-note reveal">${esc(term.pope.note[locale])}</div>`;

  const jubilees = E.JUBILEES.filter((y) => y >= term.from && y <= term.to);
  if (jubilees.length) {
    html += `<div class="sect reveal"><h2>${esc(t.jubileesInPontificate)}</h2></div><div class="reigns reveal">${jubilees
      .map((y) => `<div class="ryrow tenure"><span class="ry-years">${y}</span><span class="ry-style">${esc(t.jubileeTag)}</span></div>`)
      .join("")}</div>`;
  }

  html += `<div class="royal-link reveal"><button class="namelink" data-goto="${papacyGoto(node.regionKey)}">${esc(t.papalSeriesHeader(region.name[locale]))}</button></div>`;
  return html;
}

// ---- § the church's own line: one incumbent's page ----
// The parish priest gets what the lord of the manor already had: a record
// of his own, his predecessor and successor a click away, and — where the
// living fell vacant by pestilence — the year said plainly.
function buildRectorHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: RectorNode, locale: Locale): string {
  const t = UI[locale];
  const line = E.parishClergyOf(worldSeed, node.regionKey, node.villageIdx);
  const h = line.heads[node.headIdx];
  if (!h) return "";
  node.crumb = h.name;
  const jur = E.parishOf(worldSeed, node.regionKey, node.villageIdx, locale);
  const saint = saintName(E, locale, line.patronSaintIdx);
  const titleWord = t.incumbentTitle[line.title];

  const neighbour = (i: number, label: string): string => {
    const other = line.heads[i];
    if (!other) return "";
    return `<div class="vital"><div class="k">${esc(label)}</div><div class="v"><button class="namelink" data-goto="${lordGoto("rector", node, i)}">${esc(other.name)}</button></div></div>`;
  };

  // Who put him in: the appropriating house, or the lord holding the manor
  // in the year he was instituted (§ nobility — and a link to that lord).
  const lordIdx = E.tenureIndexAt(E.manorLineOf(worldSeed, node.regionKey, node.villageIdx).heads, h.instituted);
  const lordName = E.manorLineOf(worldSeed, node.regionKey, node.villageIdx).heads[lordIdx].name;
  const presenter = line.appropriated ? esc(saint) : `<button class="namelink" data-goto="${lordGoto("lord", node, lordIdx)}">${esc(lordName)}</button>`;

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(h.name[0])}</span>${esc(h.name.slice(1))}</h1>
    <div class="dates">natus <b>${h.born}</b> · ${esc(titleWord)} · <button class="namelink" data-goto="${parishGoto("parish", node)}">${esc(jur.parish)}</button></div>
  </article>`;

  html += `<div class="vitals reveal">
    <div class="vital"><div class="k">${t.institutedLabel}</div><div class="v">${h.instituted}</div></div>
    <div class="vital"><div class="k">${t.incumbencyLabel}</div><div class="v">${h.instituted}–${h.vacated}</div></div>
    <div class="vital"><div class="k">${t.causeOfDeath}</div><div class="v${h.end === "plague" || h.end === "died" ? " red" : ""}">${esc(t.incumbencyEnd[h.end])}</div></div>
    <div class="vital"><div class="k">${t.presentedByLabel}</div><div class="v">${presenter}</div></div>
    ${neighbour(node.headIdx - 1, t.predecessor)}
    ${neighbour(node.headIdx + 1, t.successor)}
  </div>`;

  html += `<div class="honour-note reveal">${esc(line.appropriated ? t.appropriatedNote(saint) : t.rectoryNote)}</div>`;
  html += `<div class="royal-link reveal"><button class="namelink" data-goto="${parishGoto("parish", node)}">${esc(t.incumbentsHeader)}</button></div>`;
  return html;
}

/** The saint an appropriated living's priory is named for. Kept in one
 * place because the parish page, the incumbent page and the biography all
 * have to name the same house — the index is stored on the clergy line
 * precisely so the name can be localized rather than frozen at generation. */
function saintName(E: typeof Engine, locale: Locale, idx: number): string {
  const saints = E.SAINTS[locale];
  return saints[idx % saints.length];
}

/** The register of incumbents — the section that makes a plague year
 * visible by simple arithmetic. Rendered on the parish page, where the
 * line actually belongs. */
function renderIncumbents(E: typeof Engine, worldSeed: number, node: ParishNode, locale: Locale): string {
  const t = UI[locale];
  const line = E.parishClergyOf(worldSeed, node.regionKey, node.villageIdx);
  const saint = saintName(E, locale, line.patronSaintIdx);
  // Only the incumbents inside the browsable register era — the line runs
  // wider than that so every year a biography can name has a priest, but
  // the page is a register, not the whole simulation.
  const rows = line.heads
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h.vacated >= VILLAGE_YEAR_MIN && h.instituted <= VILLAGE_YEAR_MAX)
    .map(
      ({ h, i }) => `<button class="ryrow${h.end === "plague" ? " interregnum" : ""}" data-goto="${lordGoto("rector", node, i)}">
      <span class="ry-years">${h.instituted}–${h.vacated}</span>
      <span class="ry-style">${esc(h.name)}</span>
      <span class="ry-house">${esc(t.incumbencyEnd[h.end])}</span>
    </button>`,
    )
    .join("");

  // Count the institutions of the worst plague year this parish saw — the
  // whole argument for generating this line rather than naming one priest.
  let worstYear = 0;
  let worstCount = 0;
  const byYear = new Map<number, number>();
  for (const h of line.heads) {
    if (!E.plagueAt(h.instituted, node.regionKey)) continue;
    const n = (byYear.get(h.instituted) ?? 0) + 1;
    byYear.set(h.instituted, n);
    if (n > worstCount) {
      worstCount = n;
      worstYear = h.instituted;
    }
  }

  return (
    `<div class="sect reveal"><h2>${esc(t.incumbentsHeader)}</h2></div>` +
    `<div class="honour-note reveal">${esc(line.appropriated ? t.appropriatedNote(saint) : t.rectoryNote)}</div>` +
    (worstCount >= 2 ? `<div class="honour-note reveal">${esc(t.clergyPlagueNote(worstYear, worstCount))}</div>` : "") +
    `<div class="reigns reveal">${rows}</div>`
  );
}

// ---- § the far end ----
//
// The other half of the loop. A long-distance emigrant's own register says
// where she went; this is the destination saying she came. She has no
// record here — the rank rule forbids one village inventing people in
// another's register — so what is listed is her ENTRY IN HER OWN REGISTER,
// linking back to it. Both ends name each other and neither depends on the
// other's solve.
//
// Only rendered on a village's own page, never inside resolveVillage:
// resolving the paired origin is one memoized solve of a strictly
// lower-ranked address, which is affordable on demand and would have been
// ruinous inside the solve (see engine/migration.ts).
function renderFarEndSection(E: typeof Engine, worldSeed: number, env: Envelope, locale: Locale): string {
  const t = UI[locale];
  const inbound = E.inboundLongDistance(worldSeed, env.regionKey, env.villageIdx);
  const outbound = E.outboundLongDistance(env);
  if (!inbound.length && !outbound.length) return "";

  const row = (m: Engine.InboundMigrant, addr: Engine.Address, place: string, region: string) =>
    `<button class="ryrow tenure" data-goto="${addrStr(addr, m.person.id)}">
      <span class="ry-years">${m.year}</span>
      <span class="ry-style">${esc(`${m.person.name} ${m.person.surname}`)}</span>
      <span class="ry-house">${esc(`${place}, ${region}`)}</span>
    </button>`;

  let html = `<details class="register reveal"><summary>${esc(t.farEndHeader)}</summary>
    <div class="honour-note">${esc(t.farEndNote)}</div>`;
  if (inbound.length) {
    const src = inbound[0].origin;
    const place = E.placeShortOf(worldSeed, src.regionKey, src.villageIdx);
    const region = E.REGIONS[src.regionKey].name[locale];
    html += `<div class="sect"><h2>${esc(t.farEndIn(inbound.length))}</h2></div><div class="reigns">${inbound
      .map((m) => row(m, m.origin, place, region))
      .join("")}</div>`;
  }
  if (outbound.length) {
    html += `<div class="sect"><h2>${esc(t.farEndOut(outbound.length))}</h2></div><div class="reigns">${outbound
      .map((m) => {
        const to = m.person.emigrateTo!;
        return row(
          m,
          { regionKey: env.regionKey, villageIdx: env.villageIdx },
          E.placeShortOf(worldSeed, to.regionKey, to.villageIdx),
          E.REGIONS[to.regionKey].name[locale],
        );
      })
      .join("")}</div>`;
  }
  return `${html}</details>`;
}

// ---- § the harvest ----
//
// Deliberately NOT a diverging colour pair. The data is polarity — above
// or below an ordinary year — and the textbook answer is two hues either
// side of a neutral midpoint. This palette cannot supply one: it has
// three chromatic tokens, and two of the three pairs (gilt/rubric,
// rubric/verdigris) collapse under deuteranopia, red-green being the
// classic failure. So the POSITION carries the polarity — the bar grows up
// or down from the ordinary-year line — and colour is used for emphasis
// only, with the failures in rubric and every other year recessive. A
// reader who sees no colour at all still reads the chart off the baseline.
//
// Drawn on exactly the population curve's x-scale, so the trough in one
// can be read against the bad years in the other.
const HARVEST_H = 68;
const HARVEST_MID = 34;

function renderHarvestSection(E: typeof Engine, worldSeed: number, env: Envelope, locale: Locale): string {
  const t = UI[locale];
  const years = VILLAGE_YEAR_MAX - VILLAGE_YEAR_MIN;
  const slot = CHART_W / (years + 1);
  const barW = Math.max(1.2, slot - 0.6);
  let marks = "";
  for (let y = VILLAGE_YEAR_MIN; y <= VILLAGE_YEAR_MAX; y++) {
    const yield_ = E.harvestAt(worldSeed, env.regionKey, y);
    const grade = E.gradeOf(yield_);
    // Clamped so one catastrophic year cannot flatten the rest of the
    // series; 0.45–1.3 covers the table's whole range.
    const dev = Math.max(-1, Math.min(1, (yield_ - 1) / 0.4));
    const h = Math.abs(dev) * (HARVEST_MID - 4);
    const x = (y - VILLAGE_YEAR_MIN) * slot;
    const cls = grade === "famine" || grade === "dearth" ? "hv-bad" : grade === "poor" ? "hv-poor" : grade === "good" ? "hv-good" : "hv-ord";
    const named = E.namedDearthAt(env.regionKey, y);
    const label = `${t.harvestYear(y, t.harvestGrade[grade])}${named ? ` · ${named.name[locale]}` : ""}`;
    marks += `<rect class="${cls}" x="${x.toFixed(1)}" y="${(dev >= 0 ? HARVEST_MID - h : HARVEST_MID).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0.8, h).toFixed(1)}"><title>${esc(label)}</title></rect>`;
  }
  return `<details class="register reveal"><summary>${esc(t.harvestHeader)}</summary>
    <p class="season-note">${esc(t.harvestNote)}</p>
    <figure class="harvestfig">
      <svg class="harvestsvg" viewBox="0 0 ${CHART_W} ${HARVEST_H}" preserveAspectRatio="none" role="img"
           aria-label="${esc(`${t.harvestHeader}: ${VILLAGE_YEAR_MIN}–${VILLAGE_YEAR_MAX}, ${env.region.name[locale]}`)}">
        ${marks}
        <line class="hv-mid" x1="0" y1="${HARVEST_MID}" x2="${CHART_W}" y2="${HARVEST_MID}"/>
      </svg>
      <figcaption class="poplegend"><span>${VILLAGE_YEAR_MIN}</span><span class="pc-low">${esc(t.harvestGrade.famine)}</span><span>${VILLAGE_YEAR_MAX}</span></figcaption>
    </figure>
  </details>`;
}

// ---- § the price of bread ----
//
// One series, deliberately, and the same reason the rest of this file gives:
// this palette's gilt and rubric are 0.3 ΔE apart under deuteranopia in the
// light theme, so no figure here may ask a reader to tell two lines apart.
// Which is convenient, because the two-line version (price and wage) is the
// worse chart anyway. The number that means something is the ratio — how
// many days of his own work a labourer gave for a quarter of wheat — and it
// carries both movements at once: the spikes are the failed harvests, and
// the step down in the middle of the century is the Black Death paying the
// survivors. Price and wage are still there, on every year's tooltip.
//
// Drawn on the population curve's x-scale, like the harvest figure, so all
// three read against each other.
const PRICE_H = 76;
const PRICE_TOP = 6;

function renderPriceSection(E: typeof Engine, worldSeed: number, env: Envelope, locale: Locale): string {
  const t = UI[locale];
  const series = E.priceSeries(worldSeed, env.regionKey, VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX);
  // Clamped rather than auto-scaled: one Great Famine year would otherwise
  // flatten two centuries of the thing worth looking at.
  const ceiling = 90;
  const yOf = (days: number) => PRICE_H - (Math.min(days, ceiling) / ceiling) * (PRICE_H - PRICE_TOP);
  const points = series.map((row, i) => `${chartX(VILLAGE_YEAR_MIN + i).toFixed(1)},${yOf(row.realWage).toFixed(1)}`);
  const line = `M${points.join("L")}`;

  const money = (pence: number) => {
    const m = E.lsd(pence);
    return t.money(m.l, m.s, m.d);
  };
  // Per-year hit targets, so every point on the line can name its price and
  // its wage — the two numbers the ratio is hiding.
  const slot = CHART_W / series.length;
  const tips = series
    .map((row, i) => {
      const year = VILLAGE_YEAR_MIN + i;
      return `<rect class="pr-hit" x="${(i * slot).toFixed(1)}" y="0" width="${slot.toFixed(2)}" height="${PRICE_H}"><title>${esc(
        t.priceYearTip(year, money(row.price), money(row.wage), row.realWage),
      )}</title></rect>`;
    })
    .join("");
  const bands = E.PLAGUES.filter((pl) => pl[1] >= VILLAGE_YEAR_MIN && pl[0] <= VILLAGE_YEAR_MAX)
    .map((pl) => {
      const x = chartX(Math.max(VILLAGE_YEAR_MIN, pl[0]));
      const w = Math.max(1.5, chartX(Math.min(VILLAGE_YEAR_MAX, pl[1])) - x);
      return `<rect class="pc-plague" x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${PRICE_H}"><title>${esc(pl[3][locale])}</title></rect>`;
    })
    .join("");

  const early = series[1330 - VILLAGE_YEAR_MIN];
  const late = series[1450 - VILLAGE_YEAR_MIN];
  return `<details class="register reveal"><summary>${esc(t.pricesHeader)}</summary>
    <p class="season-note">${esc(t.pricesNote)}</p>
    <div class="vitals">
      <div class="vital"><div class="k">${esc(t.wheatPriceLabel)} · 1330</div><div class="v">${esc(money(early.price))}</div></div>
      <div class="vital"><div class="k">${esc(t.dayWageLabel)} · 1330</div><div class="v">${esc(money(early.wage))}</div></div>
      <div class="vital"><div class="k">${esc(t.realWageLabel)} · 1330</div><div class="v red">${esc(t.realWageDays(early.realWage))}</div></div>
      <div class="vital"><div class="k">${esc(t.realWageLabel)} · 1450</div><div class="v gold">${esc(t.realWageDays(late.realWage))}</div></div>
    </div>
    <figure class="pricefig">
      <svg class="pricesvg" viewBox="0 0 ${CHART_W} ${PRICE_H}" preserveAspectRatio="none" role="img"
           aria-label="${esc(`${t.pricesHeader}: ${t.realWageLabel}, ${VILLAGE_YEAR_MIN}–${VILLAGE_YEAR_MAX}, ${env.region.name[locale]}`)}">
        ${bands}
        <path class="pr-line" d="${line}" vector-effect="non-scaling-stroke"/>
        ${tips}
      </svg>
      <figcaption class="poplegend">
        <span>${VILLAGE_YEAR_MIN}</span>
        <span class="pc-low">${esc(t.realWageLabel)}</span>
        <span>${VILLAGE_YEAR_MAX}</span>
      </figcaption>
    </figure>
  </details>`;
}

/** § the price of bread: the court roll of one holding — the section the
 * tenement page was always missing. documents.ts has been citing "Manor
 * court roll" as a source since long before there was any court business
 * to put in one. */
function renderCourtRollSection(E: typeof Engine, worldSeed: number, env: Envelope, tenementIdx: number, locale: Locale): string {
  const t = UI[locale];
  const roll = E.courtRollOf(worldSeed, env, tenementIdx);
  const money = (pence: number) => {
    const m = E.lsd(pence);
    return t.money(m.l, m.s, m.d);
  };
  const rows = roll
    .map((e) => {
      const p = env.persons[e.personId];
      return `<button class="ryrow tenure" data-goto="${env.regionKey}:${env.villageIdx}:${e.personId}">
        <span class="ry-years">${e.year}</span>
        <span class="ry-style">${esc(`${p.name} ${p.surname}`)} · <i class="due">${esc(t.dueLabel[e.kind])}</i>${
          e.heir ? ` <i class="feast">${esc(t.dueHeirTag)}</i>` : ""
        }<br><small class="dim">${esc(t.dueReason[e.kind])}</small></span>
        <span class="ry-house due-amount">${esc(money(e.amount))}</span>
      </button>`;
    })
    .join("");
  const total = roll.reduce((s, e) => s + e.amount, 0);
  return `<div class="sect reveal"><h2>${esc(t.courtRollHeader)}</h2></div>
    <div class="honour-note reveal">${esc(t.courtRollNote)}</div>
    <div class="reigns reveal">${rows || `<div class="ryrow"><span class="ry-style">${esc(t.courtRollEmpty)}</span></div>`}</div>
    ${roll.length ? `<div class="honour-note reveal">${esc(t.dueTotal(roll.length, money(total)))}</div>` : ""}`;
}

/** § the subsistence line: whether this household's own land fed it. The
 * calculation that finally makes the size classes in tenement.ts mean
 * something — and the one that explains the undersettle. */
function renderSubsistenceSection(E: typeof Engine, worldSeed: number, env: Envelope, coupleIdx: number, year: number, locale: Locale): string {
  const t = UI[locale];
  const s = E.subsistenceOf(worldSeed, env, coupleIdx, year);
  if (!s) return "";
  const land = env.region.landUnit[locale];
  const money = (pence: number) => {
    const m = E.lsd(pence);
    return t.money(m.l, m.s, m.d);
  };
  const verdict = s.acres === 0 ? t.subsistenceNoLand : s.wageDays > 0 ? t.subsistenceShort(s.wageDays) : t.subsistenceFed(money(s.surplusPence));
  return `<div class="sect reveal"><h2>${esc(t.subsistenceHeader)}</h2></div>
    <div class="honour-note reveal">${esc(t.subsistenceNote)}</div>
    <div class="vitals reveal">
      <div class="vital"><div class="k">${year}</div><div class="v">${esc(t.subsistenceYield(s.netQuarters.toFixed(1), s.acres, land))}</div></div>
      <div class="vital"><div class="k">${esc(t.subsistenceNeed(s.needQuarters.toFixed(1), s.mouths))}</div><div class="v ${s.wageDays > 0 ? "red" : "gold"}">${esc(verdict)}</div></div>
    </div>`;
}

// ---- § the tenement ----
//
// The page this whole phase exists for. Every other record in the app is
// about a person or an institution; this one is about a piece of ground,
// and what it shows is the thing a manorial court roll series actually
// records and nothing else here could: one holding, and the succession of
// families across two and a half centuries of it — the gaps where it stood
// vacant after a plague, the surname changing when a line failed, the
// widow keeping it, the neighbour taking it up.
function buildTenementHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: TenementNode, locale: Locale): string {
  const t = UI[locale];
  const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
  const tenements = E.tenementsOf(worldSeed, node.regionKey, node.villageIdx);
  const ten = tenements[node.headIdx];
  if (!ten) return "";
  const history = E.tenementHistory(env, ten.idx);
  const known = E.tenementName(env, ten.idx);
  const title = known ? t.tenementNamed(known) : t.tenementUnnamed(ten.idx + 1);
  node.crumb = title;
  const land = env.region.landUnit[locale];

  // Vacancy is the point, not a gap in the data: a holding standing empty
  // for thirty years after 1349 is the single most eloquent thing a court
  // roll can say, so the empty stretches get rows of their own.
  const rows: string[] = [];
  let prevEnd: number | null = null;
  for (const ten2 of history) {
    if (prevEnd != null && ten2.from - prevEnd > 2) {
      rows.push(
        `<div class="ryrow interregnum"><span class="ry-years">${prevEnd + 1}–${ten2.from - 1}</span><span class="ry-style">${esc(t.tenementVacant(ten2.from - prevEnd - 1))}</span><span class="ry-house">—</span></div>`,
      );
    }
    const H = env.persons[ten2.couple.husband];
    const W = env.persons[ten2.couple.wife];
    rows.push(`<button class="ryrow tenure" data-goto="${env.regionKey}:${env.villageIdx}:${H.id}">
      <span class="ry-years">${ten2.from}–${ten2.to}</span>
      <span class="ry-style">${esc(`${H.name} ${H.surname}`)} &amp; ${esc(`${W.name} ${W.surname}`)}</span>
      <span class="ry-house">${esc(t.childrenBorne(ten2.couple.children.length))}</span>
    </button>`);
    prevEnd = ten2.to;
  }

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(t.tenementSize[ten.size])} · ${esc(t.acresOf(ten.acres, land))} · <button class="namelink" data-goto="${villageGoto(node)}">${esc(env.place[locale])}</button></div>
    <div class="vitals">
      <div class="vital"><div class="k">${t.tenementLandLabel}</div><div class="v">${esc(t.acresOf(ten.acres, land))}</div></div>
      <div class="vital"><div class="k">${t.tenementHoldersLabel}</div><div class="v gold">${history.length}</div></div>
      <div class="vital"><div class="k">${t.tenementStandingLabel}</div><div class="v">${history.length ? `${history[0].from}–${history[history.length - 1].to}` : "—"}</div></div>
    </div>
  </article>`;
  html += `<div class="honour-note reveal">${esc(t.tenementNote)}</div>`;
  html += `<div class="sect reveal"><h2>${esc(t.tenementHolders)}</h2></div><div class="reigns reveal">${rows.join("") || `<div class="ryrow"><span class="ry-style">${esc(t.tenementNeverHeld)}</span></div>`}</div>`;
  // § the price of bread: the court roll of this ground, and whether it fed
  // the first household that stood on it — the two things a page about a
  // piece of land was still unable to say. The subsistence reckoning is
  // taken twelve years into a tenure, when the household is at full size
  // and the question actually bites.
  html += renderCourtRollSection(E, worldSeed, env, ten.idx, locale);
  if (history.length) {
    html += renderSubsistenceSection(E, worldSeed, env, history[0].coupleIdx, Math.min(history[0].from + 12, history[0].to), locale);
  }
  html += `<div class="royal-link reveal"><button class="namelink" data-goto="${villageGoto(node)}">${esc(env.place[locale])}</button></div>`;
  return html;
}

/** The village's whole tenantry, largest holding first — the manorial
 * extent, which is the document this list actually is. */
function renderTenementSection(E: typeof Engine, worldSeed: number, node: Address, env: Envelope, locale: Locale, currentTen: number | null): string {
  const t = UI[locale];
  const tenements = E.tenementsOf(worldSeed, node.regionKey, node.villageIdx);
  const land = env.region.landUnit[locale];
  const rows = tenements
    .map((ten) => {
      const history = E.tenementHistory(env, ten.idx);
      const known = E.tenementName(env, ten.idx);
      return `<button class="ryrow${ten.idx === currentTen ? " lived" : ""}" data-goto="${lordGoto("tenement", node, ten.idx)}">
      <span class="ry-years">${esc(t.acresOf(ten.acres, land))}</span>
      <span class="ry-style">${esc(known ? t.tenementNamed(known) : t.tenementUnnamed(ten.idx + 1))}</span>
      <span class="ry-house">${esc(t.tenementSize[ten.size])} · ${esc(t.holdersCount(history.length))}</span>
    </button>`;
    })
    .join("");
  return `<details class="register reveal"><summary>${esc(t.tenantryHeader(tenements.length))}</summary>
    <div class="honour-note">${esc(t.tenantryNote)}</div>
    <div class="reigns">${rows}</div>
  </details>`;
}

// ---- § the village route ----
// The village as a record in its own right. Everything here already existed
// and was reachable only sideways: the year slider, the population curve and
// the full register were sections of whichever INHABITANT you happened to
// open, so a place could not be linked to, bookmarked, or arrived at — you
// had to go through a person to look at their village, and the crumb trail
// then said their name for a page that was mostly about the parish.
//
// The locator is a person's with the person taken off the end, so truncating
// any record URL walks up to its place — and this page is where every place
// name in the app now points.
function buildVillageHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: VillageNode, locale: Locale): string {
  const t = UI[locale];
  const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
  const title = env.place[locale];
  node.crumb = E.placeShortOf(worldSeed, node.regionKey, node.villageIdx);

  const urban = E.settlementTypeOf(worldSeed, node.regionKey, node.villageIdx) === "urban";
  const jur = E.parishOf(worldSeed, node.regionKey, node.villageIdx, locale);
  const fief = E.manorOf(worldSeed, node.regionKey, node.villageIdx, locale);
  const lordVitalGoto = lordGoto("lord", node, E.tenureIndexAt(E.manorLineOf(worldSeed, node.regionKey, node.villageIdx).heads, E.ANCHOR_YEAR));

  // § carrying capacity, made visible. The whole preventive check is measured
  // against these two numbers (engine/capacity.ts) and neither was anywhere on
  // the page — so the model's central constraint was invisible next to the
  // curve it produces.
  const stock = E.holdingsOf(worldSeed, node.regionKey, node.villageIdx);
  const cultivated = Math.round(E.holdingsAt(worldSeed, node.regionKey, node.villageIdx, VILLAGE_YEAR_MAX));
  const counts = E.populationSeries(env, VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX);
  let peak = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[peak]) peak = i;

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(urban ? t.settlementUrban : t.settlementRural)} · <button class="namelink" data-goto="${regionGoto(node.regionKey)}">${esc(env.region.name[locale])}</button> · ${t.registerSpanValue(VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX)}</div>
    <div class="vitals">
      <div class="vital"><div class="k">${t.holdingsLabel}</div><div class="v">${esc(t.holdingsValue(stock, cultivated, VILLAGE_YEAR_MAX))}</div></div>
      <div class="vital"><div class="k">${t.peakLabel}</div><div class="v gold">${esc(t.peakValue(counts[peak], VILLAGE_YEAR_MIN + peak))}</div></div>
      <div class="vital"><div class="k">${t.registerSpan}</div><div class="v">${esc(t.soulsOnRegister(env.persons.length))}</div></div>
    </div>
  </article>`;

  html += `<div class="sect reveal"><h2>${esc(t.jurisdictions)}</h2></div>
  <div class="vitals reveal">
    <div class="vital"><div class="k">${t.parish}</div><div class="v"><button class="namelink" data-goto="${parishGoto("parish", node)}">${esc(jur.parish)}</button></div></div>
    <div class="vital"><div class="k">${t.deanery}</div><div class="v"><button class="namelink" data-goto="${parishGoto("deanery", node)}">${esc(jur.deanery)}</button></div></div>
    <div class="vital"><div class="k">${t.diocese}</div><div class="v"><button class="namelink" data-goto="${parishGoto("diocese", node)}">${esc(jur.diocese)}</button></div></div>
    <div class="vital"><div class="k">${t.manor}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(fief.manor)}</button></div></div>
    <div class="vital"><div class="k">${t.honour}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(fief.honour)}</button></div></div>
    <div class="vital"><div class="k">${t.lord}</div><div class="v"><button class="namelink" data-goto="${lordVitalGoto}">${esc(fief.lord)}</button></div></div>
  </div>`;

  // Open by default: on a person's page the village is an aside, but on the
  // village's own page it is the subject, and a page whose subject is folded
  // shut is a page that looks empty. It opens on the year of greatest
  // extent, not defaultVillageYear's birth-plus-thirty — that is a PERSON's
  // prime, and a place has no such thing.
  // § the deserted village: a village whose last soul is gone is a fact
  // about the late Middle Ages, not an empty page — so say it. The harvest
  // series made this common enough (3% of villages, against a tenth in the
  // English record) that leaving it silent would read as a broken page.
  let lastYear = -1;
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) {
      lastYear = i;
      break;
    }
  }
  if (lastYear >= 0 && lastYear < counts.length - 1) {
    html += `<div class="honour-note deserted reveal">${esc(t.desertedNote(VILLAGE_YEAR_MIN + lastYear + 1))}</div>`;
  }

  html += renderVillageSection(E, env, clampVillageYear(node.year) ?? VILLAGE_YEAR_MIN + peak, locale, -1, true);
  // § the tenement: the village's land, holding by holding — the extent
  // that the population curve above is measured against.
  html += renderTenementSection(E, worldSeed, node, env, locale, null);
  // § the season: the register's own shape across the twelve months —
  // which is a fact about the place, so it lives on the place's page.
  html += renderSeasonSection(E, env, locale);
  html += renderHarvestSection(E, worldSeed, env, locale);
  // § the price of bread: directly under the harvest, because it is what
  // the harvest MEANT to anyone who had to buy bread — the same x-scale,
  // so a spike here sits over the failure that caused it.
  html += renderPriceSection(E, worldSeed, env, locale);
  // § the far end: who came from beyond the region, and who left for it —
  // the one section that reads another region's register, and the reason
  // it is here rather than inside the solve.
  html += renderFarEndSection(E, worldSeed, env, locale);
  html += renderParishRegister(E, env, locale, -1);
  return html;
}

// ---- § the pedigree ----
//
// Four generations up and three down. The asymmetry is not arbitrary:
// ancestors are bounded at 2^depth and cost one memoized solve per
// immigrant line, while descendants branch by however many children each
// generation actually had and can run to hundreds of nodes at depth four.
// Three down is where a real family reaches the edge of the register
// anyway.
const PEDIGREE_UP = 4;
const PEDIGREE_DOWN = 3;

function pedigreeRow(name: string, sub: string, person: { birth: number; death: Death }, addr: string): string {
  return `<button class="ryrow tenure" data-goto="${addr}">
    <span class="ry-years">${person.birth}–${person.death.year}</span>
    <span class="ry-style">${esc(name)}</span>
    <span class="ry-house">${esc(sub)}</span>
  </button>`;
}

function buildPedigreeHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: PedigreeNode, locale: Locale): string {
  const t = UI[locale];
  const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
  const subject = env.persons[node.personId];
  if (!subject) return "";
  const title = `${subject.name} ${subject.surname}`;
  node.crumb = title;

  const ancestors = E.ancestorsOf(env, node.personId, PEDIGREE_UP);
  const descendants = E.descendantsOf(env, node.personId, PEDIGREE_DOWN);

  const groupUp = new Map<number, string[]>();
  for (const a of ancestors) {
    const row = pedigreeRow(`${a.name} ${a.surname}`, t.lineLabel(a.line), a, addrStr(a.addr, a.id));
    groupUp.set(a.generation, [...(groupUp.get(a.generation) ?? []), row]);
  }
  const groupDown = new Map<number, string[]>();
  for (const d of descendants) {
    // A descendant found in another register is worth saying so about —
    // it is the whole reason this traversal is not a local one.
    const away = d.addr.regionKey !== node.regionKey || d.addr.villageIdx !== node.villageIdx;
    const sub = away ? E.placeShortOf(worldSeed, d.addr.regionKey, d.addr.villageIdx) : (t.self(d.sex) ?? "");
    const row = pedigreeRow(`${d.name} ${d.surname}`, away ? sub : "", d, addrStr(d.addr, d.id));
    groupDown.set(d.generation, [...(groupDown.get(d.generation) ?? []), row]);
  }

  const section = (header: string, group: Map<number, string[]>, label: (n: number) => string, empty: string): string => {
    let out = `<div class="sect reveal"><h2>${esc(header)}</h2></div>`;
    if (!group.size) return `${out}<div class="honour-note reveal">${esc(empty)}</div>`;
    for (const gen of [...group.keys()].sort((a, b) => a - b)) {
      out += `<div class="sect reveal sub"><h2>${esc(label(gen))}</h2></div><div class="reigns reveal">${group.get(gen)!.join("")}</div>`;
    }
    return out;
  };

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(t.pedigreeHeader[0])}</span>${esc(t.pedigreeHeader.slice(1))}</h1>
    <div class="dates"><button class="namelink" data-goto="${addrStr(node, node.personId)}">${esc(title)}</button> · ${subject.birth}–${subject.death.year} · <button class="namelink" data-goto="${villageGoto(node)}">${esc(env.place[locale])}</button></div>
    <div class="vitals">
      <div class="vital"><div class="k">${esc(t.ancestorsHeader)}</div><div class="v gold">${ancestors.length}</div></div>
      <div class="vital"><div class="k">${esc(t.descendantsHeader)}</div><div class="v gold">${descendants.length}</div></div>
    </div>
  </article>`;
  html += `<div class="honour-note reveal">${esc(t.pedigreeNote)}</div>`;
  html += section(t.ancestorsHeader, groupUp, t.generationBack, t.pedigreeNoAncestors);
  html += section(t.descendantsHeader, groupDown, t.generationDown, t.pedigreeNoDescendants);
  return html;
}

// ---- § the region route ----
//
// How wide a window on the village address space this page shows. The
// space itself is unbounded (rank.ts's RANK_SCALE), so like the deanery's
// visitation window this is a sample and says so.
//
// Every column here is a PURE FUNCTION OF THE ADDRESS — the place name,
// whether it is a market town, how many holdings its fields carry, which
// parish it answers to. None of it resolves a village. That is the whole
// reason the page can list two dozen of them at once: a solve is ~30ms and
// twenty-four of them would be a page that visibly hangs, for columns that
// would tell you less than these do.
const REGION_WINDOW = 24;

function buildRegionHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: RegionNode, locale: Locale): string {
  const t = UI[locale];
  const region = E.REGIONS[node.regionKey];
  if (!region) return "";
  const title = region.name[locale];
  node.crumb = title;

  const rows: string[] = [];
  for (let i = 0; i < REGION_WINDOW; i++) {
    const urban = E.settlementTypeOf(worldSeed, node.regionKey, i) === "urban";
    const holdings = E.holdingsOf(worldSeed, node.regionKey, i);
    const parish = E.bareParishOf(worldSeed, node.regionKey, i);
    rows.push(`<button class="ryrow" data-goto="${villageGoto({ regionKey: node.regionKey, villageIdx: i })}">
      <span class="ry-years">${i}</span>
      <span class="ry-style">${esc(E.placeShortOf(worldSeed, node.regionKey, i))}${urban ? ` <i class="feast">${esc(t.settlementUrban)}</i>` : ""}</span>
      <span class="ry-house">${esc(`${t.holdersCount(holdings)} · ${parish.deanery}`)}</span>
    </button>`);
  }

  // The crises of record: everything this region's own data says happened
  // to all of it at once, in one chronological list. Scattered across four
  // tables until now (regions.ts, harvest.ts, plagues.ts, epidemics.ts) and
  // visible only as bands behind a chart.
  type Crisis = { year: number; to: number; kind: "famine" | "war" | "plague" | "revolt" | "epidemic"; name: string };
  const crises: Crisis[] = [];
  for (const d of E.DEARTHS) {
    if (d.regions && !d.regions.includes(node.regionKey)) continue;
    crises.push({ year: d.from, to: d.to, kind: "famine", name: d.name[locale] });
  }
  for (const pl of E.PLAGUES) {
    const only = pl[5];
    if (only && !only.includes(node.regionKey)) continue;
    crises.push({ year: pl[0], to: pl[1], kind: "plague", name: pl[3][locale] });
  }
  for (const e of E.EPIDEMICS) {
    // Only the dated outbreaks: the endemic entries are a standing fact
    // about the place, not an event in its history.
    if (e.to - e.from >= 20) continue;
    if (e.regions && !e.regions.includes(node.regionKey)) continue;
    crises.push({ year: e.from, to: e.to, kind: "epidemic", name: e.name[locale] });
  }
  for (const [from, to] of region.warYears) {
    crises.push({ year: from, to, kind: "war", name: region.warNames[from]?.[locale] ?? t.regionCrisisKind.war });
  }
  if (region.revolt) crises.push({ year: region.revolt.year, to: region.revolt.year, kind: "revolt", name: region.revolt.name[locale] });
  crises.sort((a, b) => a.year - b.year);
  const crisisRows = crises
    .map(
      (c) => `<div class="ryrow">
      <span class="ry-years">${c.year}${c.to > c.year ? `–${c.to}` : ""}</span>
      <span class="ry-style">${esc(c.name)}</span>
      <span class="ry-house">${esc(t.regionCrisisKind[c.kind])}</span>
    </div>`,
    )
    .join("");

  const royal = E.royalLineOf(node.regionKey);
  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(t.registerSpanValue(VILLAGE_YEAR_MIN, VILLAGE_YEAR_MAX))}</div>
    <div class="vitals">
      <div class="vital"><div class="k">${esc(t.inheritanceLabel)}</div><div class="v">${esc(t.inheritanceCustom[region.inheritance])}</div></div>
      <div class="vital"><div class="k">${esc(t.currencyLabel)}</div><div class="v">${esc(region.currency)}</div></div>
      <div class="vital"><div class="k">${esc(t.royalLineLabel)}</div><div class="v"><button class="namelink" data-goto="${royalGoto(node.regionKey)}">${esc(
        royal?.title[locale] ?? "—",
      )}</button></div></div>
      <div class="vital"><div class="k">${esc(t.papacyLabel)}</div><div class="v"><button class="namelink" data-goto="${papacyGoto(node.regionKey)}">${esc(
        t.papacyLabel,
      )}</button></div></div>
    </div>
  </article>`;
  html += `<div class="honour-note reveal">${esc(t.regionNote)}</div>`;
  html += `<div class="sect reveal"><h2>${esc(t.regionCrisesHeader)}</h2></div><div class="reigns reveal">${crisisRows}</div>`;
  html += `<div class="sect reveal"><h2>${esc(t.villagesHeader)}</h2></div>
    <div class="honour-note reveal">${esc(t.villagesNote(REGION_WINDOW))}</div>
    <div class="reigns reveal">${rows.join("")}</div>`;
  return html;
}

// ---- § the parish route ----
// The ecclesiastical tree, walkable. parish/deanery/diocese were the only
// jurisdiction vitals on a record that were dead text while manor, honour,
// lord and sovereign all opened pages — and the parish is the one rung of the
// whole structure that a medieval person would have felt every week.
//
// It is also where the model says something the civil tree cannot: parishes
// do not nest inside villages (hierarchy.ts), and roughly a third of blocks
// put several villages under one mother church. That fact existed in the
// engine, was flagged on `Jurisdiction.shared`, and had nowhere to be seen.
//
// A deanery and a diocese have no bounded extent — villageIdx runs on
// forever — so those two levels walk a fixed window of the address space and
// say so, as a visitation would.
const VISITATION_WINDOW = 60;

function buildParishHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], node: ParishNode, locale: Locale): string {
  const t = UI[locale];
  const jur = E.parishOf(worldSeed, node.regionKey, node.villageIdx, locale);
  const region = E.REGIONS[node.regionKey];
  const mother = E.parishMotherVillageIdx(node.villageIdx);
  // A shared block hangs off its mother village's own parish; an unshared one
  // is the village's own. Either way THIS is the address that names it.
  const parishSeat = jur.shared ? mother : node.villageIdx;

  const placeRow = (idx: number, tag: string): string => {
    const seatEnv = E.parishOf(worldSeed, node.regionKey, idx, locale);
    return `<button class="ryrow" data-goto="${villageGoto({ regionKey: node.regionKey, villageIdx: idx })}">
      <span class="ry-years">${idx}</span>
      <span class="ry-style">${esc(E.placeShortOf(worldSeed, node.regionKey, idx))}</span>
      <span class="ry-house">${esc(tag || seatEnv.parish)}</span>
    </button>`;
  };

  let title: string;
  let subtitle: string;
  let body: string;

  if (node.kind === "parish") {
    title = t.parishOfHeader(jur.parish);
    const siblings: number[] = [];
    for (let i = mother; i < mother + E.PARISH_CLUSTER; i++) if (jur.shared || i === node.villageIdx) siblings.push(i);
    subtitle = jur.shared
      ? t.sharedParishNote(E.placeShortOf(worldSeed, node.regionKey, mother), siblings.length)
      : t.ownParishNote(E.placeShortOf(worldSeed, node.regionKey, node.villageIdx));
    body =
      `<div class="sect reveal"><h2>${esc(t.villagesInParish)}</h2></div><div class="reigns reveal">` +
      siblings.map((i) => placeRow(i, jur.shared ? (i === mother ? t.motherChurchTag : t.chapelryTag) : t.motherChurchTag)).join("") +
      `</div>` +
      // § the church's own line: the men who actually served this church.
      // Only the parish rung gets it — a deanery's or a diocese's clergy is
      // every incumbent under it, which is not a list this page can hold.
      renderIncumbents(E, worldSeed, node, locale);
  } else if (node.kind === "deanery") {
    title = t.deaneryOfHeader(jur.deanery);
    subtitle = `${jur.diocese} · ${jur.province}`;
    // A deanery's parishes really are unbounded — parishes run on as far as
    // the village address space does — so this is the one level that has to
    // walk a window and say so.
    const here = E.bareParishOf(worldSeed, node.regionKey, node.villageIdx).deanery;
    // One row per PARISH SEAT, not per village: a shared block would
    // otherwise list the same church up to five times over.
    const seen = new Set<number>();
    const rows: string[] = [];
    for (let i = 0; i < VISITATION_WINDOW; i++) {
      const b = E.bareParishOf(worldSeed, node.regionKey, i);
      if (b.deanery !== here) continue;
      const seat = b.shared ? E.parishMotherVillageIdx(i) : i;
      if (seen.has(seat)) continue;
      seen.add(seat);
      rows.push(`<button class="ryrow${seat === parishSeat ? " lived" : ""}" data-goto="${parishGoto("parish", { regionKey: node.regionKey, villageIdx: seat })}">
        <span class="ry-years">${seat}</span>
        <span class="ry-style">${esc(E.parishOf(worldSeed, node.regionKey, seat, locale).parish)}</span>
        <span class="ry-house">${esc(E.placeShortOf(worldSeed, node.regionKey, seat))}</span>
      </button>`);
    }
    body =
      `<div class="sect reveal"><h2>${esc(t.parishesInDeanery)}</h2></div>` +
      `<div class="honour-note reveal">${esc(t.visitationNote(VISITATION_WINDOW))}</div>` +
      `<div class="reigns reveal">${rows.join("")}</div>`;
  } else {
    title = t.dioceseOfHeader(jur.diocese);
    subtitle = jur.province;
    // Exact, not sampled: a region's deaneries are a fixed short list and
    // each answers to one diocese by name alone (engine/hierarchy.ts), so
    // this really is EVERY deanery of this diocese and no visitation caveat
    // is owed. Only the village used to address each row has to be looked
    // for, and any village of that deanery will do.
    const here = E.bareParishOf(worldSeed, node.regionKey, node.villageIdx);
    const rows = E.deaneriesOf(node.regionKey)
      .filter((d) => E.dioceseOfDeanery(worldSeed, node.regionKey, d) === here.diocese)
      .map((d) => {
        let seat = -1;
        const seen = new Set<number>();
        for (let i = 0; i < VISITATION_WINDOW; i++) {
          const b = E.bareParishOf(worldSeed, node.regionKey, i);
          if (b.deanery !== d) continue;
          if (seat < 0) seat = i;
          seen.add(b.shared ? E.parishMotherVillageIdx(i) : i);
        }
        const label = `<span class="ry-years">${seat < 0 ? "—" : seat}</span><span class="ry-style">${esc(d)}</span><span class="ry-house">${esc(t.parishesFound(seen.size))}</span>`;
        // No village of this deanery turned up nearby — it is still part of
        // the diocese, just not somewhere this page can open.
        if (seat < 0) return `<div class="ryrow">${label}</div>`;
        return `<button class="ryrow${d === here.deanery ? " lived" : ""}" data-goto="${parishGoto("deanery", { regionKey: node.regionKey, villageIdx: seat })}">${label}</button>`;
      });
    body = `<div class="sect reveal"><h2>${esc(t.deaneriesInDiocese)}</h2></div><div class="reigns reveal">${rows.join("")}</div>`;
  }
  node.crumb = title;

  let html = renderLineageBar(stack, t);
  html += `
  <article class="card reveal">
    <div class="eyebrow">${esc(t.record)} ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(title[0])}</span>${esc(title.slice(1))}</h1>
    <div class="dates">${esc(subtitle)}</div>
  </article>`;

  // The rungs above this one, each a link — so the tree walks both ways.
  const up: string[] = [];
  if (node.kind !== "diocese") {
    if (node.kind === "parish")
      up.push(
        `<div class="vital"><div class="k">${t.deanery}</div><div class="v"><button class="namelink" data-goto="${parishGoto("deanery", node)}">${esc(jur.deanery)}</button></div></div>`,
      );
    up.push(
      `<div class="vital"><div class="k">${t.diocese}</div><div class="v"><button class="namelink" data-goto="${parishGoto("diocese", node)}">${esc(jur.diocese)}</button></div></div>`,
    );
  }
  up.push(`<div class="vital"><div class="k">${t.province}</div><div class="v">${esc(jur.province)}</div></div>`);
  up.push(
    `<div class="vital"><div class="k">${t.region}</div><div class="v"><button class="namelink" data-goto="${regionGoto(node.regionKey)}">${esc(region.name[locale])}</button></div></div>`,
  );
  html += `<div class="vitals reveal">${up.join("")}</div>`;
  html += body;
  return html;
}
