import type * as Engine from "../engine/index.js";
import type { Address, Death, Envelope, EventRef, HouseholdState, PersonAddress } from "../engine/index.js";
import type { Locale } from "../i18n/locale.js";
import { UI } from "../i18n/ui.js";
import { esc, KIND_LABEL } from "./dom.js";

export interface StackNode extends PersonAddress {
  crumb?: string;
}

export function locator(worldSeed: number, addr: PersonAddress): string {
  return worldSeed + ":" + addr.regionKey + ":" + addr.villageIdx + ":" + addr.personId;
}

export function fateStr(d: Death, birth: number): string {
  if (d.age === 0) return "† inf. " + d.year;
  if (d.age < 16) return "† " + d.year + " aet. " + d.age;
  return birth + "–" + d.year;
}

function addrStr(addr: Address, id: number): string {
  return `${addr.regionKey}:${addr.villageIdx}:${id}`;
}

// § name links: an event's own text is plain prose (biography.ts never
// emits markup) — `refs` names exactly which substrings are other people,
// so this is the one place that turns them into clickable goto buttons,
// escaping everything else. Overlapping/unfound refs are simply skipped.
export function linkifyEventText(text: string, refs: EventRef[] | undefined): string {
  if (!refs?.length) return esc(text);
  const matches = refs
    .map((r) => ({ start: text.indexOf(r.name), ref: r }))
    .filter((m) => m.start !== -1)
    .sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue; // overlapping with a previous match — skip
    const end = m.start + m.ref.name.length;
    out += esc(text.slice(cursor, m.start));
    out += `<button class="namelink" data-goto="${addrStr(m.ref.addr, m.ref.id)}">${esc(text.slice(m.start, end))}</button>`;
    cursor = end;
  }
  out += esc(text.slice(cursor));
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
    return `<div class="hh${orphan ? " orphan" : ""}${isManor || isChurch ? " pseudo" : ""}">
      <div class="hh-title">${esc(title)}${orphan ? ` <i>${esc(t.orphanTag)}</i>` : ""}</div>
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

// Builds the full record view for the current top of the navigation stack.
// Mutates `node.crumb` (as the original did) so the lineage bar can label it.
export function buildRecordHTML(E: typeof Engine, worldSeed: number, stack: StackNode[], locale: Locale): string {
  const t = UI[locale];
  const node = stack[stack.length - 1];
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
  html += `<div class="sect reveal"><h2>${esc(t.jurisdictions)}</h2></div>
  <div class="vitals reveal">
    <div class="vital"><div class="k">${t.parish}</div><div class="v">${esc(bio.jurisdiction.parish)}</div></div>
    <div class="vital"><div class="k">${t.deanery}</div><div class="v">${esc(bio.jurisdiction.deanery)}</div></div>
    <div class="vital"><div class="k">${t.diocese}</div><div class="v">${esc(bio.jurisdiction.diocese)}</div></div>
    <div class="vital"><div class="k">${t.manor}</div><div class="v">${esc(bio.fief.manor)}</div></div>
    <div class="vital"><div class="k">${t.honour}</div><div class="v">${esc(bio.fief.honour)}</div></div>
    <div class="vital"><div class="k">${t.lord}</div><div class="v">${esc(bio.fief.lord)}</div></div>
  </div>`;

  // Parentage
  html += `<div class="sect reveal"><h2>${esc(t.parentage)}</h2></div><div class="parents reveal">`;
  if (bio.father) {
    const fOcc = bio.fatherOccupation;
    html += `<div class="parent"><div class="who">${t.father}${bio.father.foreign ? esc(t.ofPlace(bio.originPlace || "")) : ""}</div><button class="pname" data-goto="${addrStr(bio.father.addr, bio.father.id)}">${esc(bio.father.name)}</button><p>${esc(fOcc ? fOcc.charAt(0).toUpperCase() + fOcc.slice(1) : "")}.</p><button class="openrel plink" data-goto="${addrStr(bio.father.addr, bio.father.id)}">${esc(t.openHisRecord)}</button></div>`;
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

  // Chronicle
  html += `<div class="sect reveal"><h2>${esc(t.chronicle)}</h2></div><div class="chronicle">`;
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

  return html;
}
