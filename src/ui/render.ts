import type * as Engine from "../engine/index.js";
import type { Address, Death, PersonAddress } from "../engine/index.js";
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
    html += `<div class="parent"><div class="who">${t.father}${bio.father.foreign ? esc(t.ofPlace(bio.originPlace || "")) : ""}</div><div class="pname">${esc(bio.father.name)}</div><p>${esc(fOcc ? fOcc.charAt(0).toUpperCase() + fOcc.slice(1) : "")}.</p><button class="openrel plink" data-goto="${addrStr(bio.father.addr, bio.father.id)}">${esc(t.openHisRecord)}</button></div>`;
  } else {
    html += `<div class="parent"><div class="who">${t.father}</div><div class="pname">${bio.incomer ? t.ofAnotherParish : t.beforeRegister}</div><p>${bio.incomer ? t.fatherIncomerNote : t.fatherBeforeNote}</p></div>`;
  }
  if (bio.mother) {
    html += `<div class="parent"><div class="who">${t.mother}${bio.mother.foreign ? esc(t.ofPlace(bio.originPlace || "")) : ""}</div><div class="pname">${esc(bio.mother.name)}</div><p>${bio.mother.dead.cause === "childbirth" ? t.motherChildbedNote : t.motherRaisedNote}</p><button class="openrel plink" data-goto="${addrStr(bio.mother.addr, bio.mother.id)}">${esc(t.openHerRecord)}</button></div>`;
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
      <div class="tx">${esc(e.text)}${label ? `<span class="tag">${label}</span>` : ""}<span class="src">${esc(e.src)}</span></div>
    </div>`;
  });
  html += `</div>`;

  // Marriage & children
  if (bio.spouse || bio.children.length) {
    html += `<div class="sect reveal"><h2>${esc(t.marriageIssue)}</h2></div><div class="relgrid reveal">`;
    if (bio.spouse) {
      const note = t.marriedAbbr(bio.marriageYear || 0) + (bio.spouse.originPlace ? t.fromPlace(bio.spouse.originPlace) : "");
      html += relCard(
        bio.sex === "M" ? t.wife : t.husband,
        { name: bio.spouse.name, surname: "", birth: bio.spouse.birth, death: bio.spouse.death },
        addrStr(bio.spouse.addr, bio.spouse.id),
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

  html += `<div class="ledger reveal">
    ${t.ledger(bio.death.age, bio.plaguesLived, !!bio.widowed, bio.literate)}
  </div>`;

  return html;
}
