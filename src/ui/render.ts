import type * as Engine from "../engine/index.js";
import type { Address, Bio, Death, Envelope, EventRef, HouseholdState, PersonAddress } from "../engine/index.js";
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
export type StackNode = PersonNode | RoyalNode | KingNode | HouseNode | LordNode;

export function isPersonNode(node: StackNode): node is PersonNode {
  return node.kind == null || node.kind === "person";
}

export function locator(worldSeed: number, node: StackNode | PersonAddress): string {
  if ("kind" in node && node.kind === "royal") return `${worldSeed}:${node.regionKey}:royal`;
  if ("kind" in node && node.kind === "king") return `${worldSeed}:${node.regionKey}:royal:${node.reignIdx}`;
  if ("kind" in node && node.kind === "house") return `${worldSeed}:${node.regionKey}:${node.villageIdx}:house`;
  if ("kind" in node && (node.kind === "lord" || node.kind === "baron"))
    return `${worldSeed}:${node.regionKey}:${node.villageIdx}:${node.kind}:${node.headIdx}`;
  const p = node as PersonAddress;
  return worldSeed + ":" + p.regionKey + ":" + p.villageIdx + ":" + p.personId;
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
function royalGoto(regionKey: string): string {
  return `royal:${regionKey}`;
}
function kingGoto(regionKey: string, reignIdx: number): string {
  return `king:${regionKey}:${reignIdx}`;
}
function houseGoto(addr: Address): string {
  return `house:${addr.regionKey}:${addr.villageIdx}`;
}
function lordGoto(kind: "lord" | "baron", addr: Address, headIdx: number): string {
  return `${kind}:${addr.regionKey}:${addr.villageIdx}:${headIdx}`;
}

function gotoOf(ref: EventRef): string {
  // A route ref names a specific sovereign or lord — link their own page.
  if (ref.route === "royal") return ref.routeIdx != null && ref.routeIdx >= 0 ? kingGoto(ref.addr.regionKey, ref.routeIdx) : royalGoto(ref.addr.regionKey);
  if (ref.route === "lord") return ref.routeIdx != null && ref.routeIdx >= 0 ? lordGoto("lord", ref.addr, ref.routeIdx) : houseGoto(ref.addr);
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

  const selfInner = `<div class="fam-self-row">${famNode(selfName, bio, null, { self: true })}<span class="fam-tag">${esc(t.self(bio.sex))}</span></div>${unionsHtml}`;

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
export const VILLAGE_YEAR_MAX = 1500;

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
  const pl = E.plagueAt(year);
  if (pl) badges.push(`<span class="badge b-plague">☠ ${esc(pl[3][locale])}</span>`);
  if (E.famineAt(year, env.region)) badges.push(`<span class="badge b-famine">${esc(env.region.famineName[locale])} · ${esc(t.famineBadge)}</span>`);
  const war = E.warAt(year, env.region, locale);
  if (war) badges.push(`<span class="badge b-war">⚔ ${esc(t.warBadge(war))}</span>`);

  const family = state.households.filter((h) => h.id >= 0).sort((a, b) => b.members.length - a.members.length || a.id - b.id);
  const pseudo = state.households.filter((h) => h.id < 0).sort((a, b) => b.id - a.id); // manor before church

  function roleOf(id: number, h: HouseholdState): string {
    if (h.id === E.MANOR_HOUSEHOLD) return t.serviceTag;
    if (h.id === E.CHURCH_HOUSEHOLD) return t.ordersTag;
    const st = byId.get(id)!;
    const p = env.persons[id];
    if (id === h.headId) return st.maritalStatus === "widowed" ? (p.sex === "F" ? t.widowTag : t.widowerTag) : t.headTag;
    if (st.spouseId === h.headId) return p.sex === "F" ? t.wife : t.husband;
    const headSpouse = byId.get(h.headId)?.spouseId;
    if (p.father === h.headId || p.mother === h.headId || (headSpouse != null && (p.father === headSpouse || p.mother === headSpouse)))
      return p.sex === "M" ? t.son : t.daughter;
    const head = env.persons[h.headId];
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

function renderVillageSection(E: typeof Engine, env: Envelope, year: number, locale: Locale, currentId: number): string {
  const t = UI[locale];
  return `<details class="register village reveal"><summary>${esc(t.villageHeader(env.place[locale]))}</summary>
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
export function buildViewHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], locale: Locale): string {
  const node = stack[stack.length - 1];
  if (node.kind === "royal") return buildRoyalLineHTML(E, worldSeed, stack, node, locale);
  if (node.kind === "king") return buildKingHTML(E, worldSeed, stack, node, locale);
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
          : bio.marriedOut
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
    <div class="dates">natus <b>${bio.birth}</b> · <span class="obiit">obiit ${bio.death.year}</span> · ${esc(bio.place)}, ${esc(bio.region)}</div>
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
    <div class="vital"><div class="k">${t.parish}</div><div class="v">${esc(bio.jurisdiction.parish)}</div></div>
    <div class="vital"><div class="k">${t.deanery}</div><div class="v">${esc(bio.jurisdiction.deanery)}</div></div>
    <div class="vital"><div class="k">${t.diocese}</div><div class="v">${esc(bio.jurisdiction.diocese)}</div></div>
    <div class="vital"><div class="k">${t.manor}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(bio.fief.manor)}</button></div></div>
    <div class="vital"><div class="k">${t.honour}</div><div class="v"><button class="namelink" data-goto="${houseGoto(node)}">${esc(bio.fief.honour)}</button></div></div>
    <div class="vital"><div class="k">${t.lord}</div><div class="v"><button class="namelink" data-goto="${lordVitalGoto}">${esc(bio.fief.lord)}</button></div></div>
    <div class="vital"><div class="k">${t.sovereign}</div><div class="v"><button class="namelink" data-goto="${sovereignVitalGoto}">${esc(bio.sovereign)}</button></div></div>
  </div>`;

  // Royal line — collapsed under the jurisdictions it crowns.
  html += renderRoyalLineSection(E, node.regionKey, bio, locale);

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
    html += `<div class="entry k-${e.kind} reveal" style="animation-delay:${Math.min(i * 55, 850)}ms">
      <div class="yr">${e.year}<span class="age">aet. ${e.age}</span></div>
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

  // Parish register browser
  const reg = E.roster(env)
    .slice()
    .sort((a, b) => a.birth - b.birth);
  html +=
    `<details class="register reveal"><summary>${esc(t.parishRegisterHeader(reg.length, bio.place))}</summary><div class="register-list">` +
    reg
      .map(
        (r) => `<button class="regrow${r.id === node.personId ? " current" : ""}" data-goto="${node.regionKey}:${node.villageIdx}:${r.id}">
      <span class="rr-name">${esc(r.name)} ${esc(r.surname)}${r.founder ? ` <i>${t.founderTag}</i>` : r.incomer ? ` <i>${t.incomerTag}</i>` : r.emigrated ? ` <i>${t.emigratedTag}</i>` : ""}</span>
      <span class="rr-dates">${r.birth}–${r.death.year}</span>
      <span class="rr-cause${r.death.cause === "plague" ? " plague" : ""}">${esc(E.CAUSE_LABEL[locale][r.death.cause])}</span>
    </button>`,
      )
      .join("") +
    `</div></details>`;

  // Village-in-year view (§ year layer), defaulting to the subject's prime
  html += renderVillageSection(E, env, defaultVillageYear(bio.birth), locale, node.personId);

  html += `<div class="ledger reveal">
    ${t.ledger(bio.death.age, bio.plaguesLived, !!bio.widowed, bio.literate)}
  </div>`;

  html += renderFamilyTree(t, bio);

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
