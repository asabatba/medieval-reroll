import { esc, KIND_LABEL } from "./dom.js";
import type * as Engine from "../engine/index.js";
import type { Address, Death, PersonAddress } from "../engine/index.js";

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

function renderLineageBar(stack: StackNode[]): string {
  if (stack.length <= 1) return "";
  let h = '<nav class="lineage reveal" aria-label="Trail">';
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
export function buildRecordHTML(E: typeof Engine, worldSeed: number, stack: StackNode[]): string {
  const node = stack[stack.length - 1];
  const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
  const bio = E.decodePerson(env, node.personId);
  if (!bio) return "";
  node.crumb = bio.name + " " + bio.surname;

  const sibsDead = bio.siblings.filter(s => s.death.age < 16).length;
  const vitals: [string, string, string][] = [
    ["Born", bio.birth + "", ""],
    ["Died", bio.death.year + " · aged " + bio.death.age, "red"],
    ["Cause of death", bio.causeLabel, "red"],
    ["Estate", bio.clsLabel, ""],
    ["Region", bio.region, ""],
    ["Children", bio.children.length ? bio.children.length + " born · " + bio.children.filter(c => c.death.age >= 16).length + " raised" : (bio.inOrders ? "None — in orders" : bio.marriedOut ? "In another register" : "None"), bio.children.some(c => c.death.age >= 16) ? "gold" : ""]
  ];

  let html = renderLineageBar(stack);
  html += `
  <article class="card reveal">
    <div class="eyebrow">Record ${esc(locator(worldSeed, node))}</div>
    <h1 class="name"><span class="init">${esc(bio.name[0])}</span>${esc(bio.name.slice(1))} ${esc(bio.surname)}</h1>
    <div class="dates">natus <b>${bio.birth}</b> · <span class="obiit">obiit ${bio.death.year}</span> · ${esc(bio.place)}, ${esc(bio.region)}</div>
    <div class="vitals">${vitals.map(v => `<div class="vital"><div class="k">${v[0]}</div><div class="v ${v[2]}">${esc(v[1])}</div></div>`).join("")}</div>
  </article>
  <p class="villhead reveal">All persons below are entries in the same register — <b>every link agrees from both sides.</b></p>`;

  // Jurisdictions — the ecclesiastical and feudal trees, independent of the
  // civil region/village tree and of each other; a parish boundary rarely
  // lines up with a manor's, and neither lines up with the county's.
  html += `<div class="sect reveal"><h2>Jurisdictions</h2></div>
  <div class="vitals reveal">
    <div class="vital"><div class="k">Parish</div><div class="v">${esc(bio.jurisdiction.parish)}</div></div>
    <div class="vital"><div class="k">Deanery</div><div class="v">${esc(bio.jurisdiction.deanery)}</div></div>
    <div class="vital"><div class="k">Diocese</div><div class="v">${esc(bio.jurisdiction.diocese)}</div></div>
    <div class="vital"><div class="k">Manor</div><div class="v">${esc(bio.fief.manor)}</div></div>
    <div class="vital"><div class="k">Honour</div><div class="v">${esc(bio.fief.honour)}</div></div>
    <div class="vital"><div class="k">Lord</div><div class="v">${esc(bio.fief.lord)}</div></div>
  </div>`;

  // Parentage
  html += `<div class="sect reveal"><h2>Parentage</h2></div><div class="parents reveal">`;
  if (bio.father) {
    const fOcc = bio.fatherOccupation;
    html += `<div class="parent"><div class="who">Father${bio.father.foreign ? " · of " + esc(bio.originPlace) : ""}</div><div class="pname">${esc(bio.father.name)}</div><p>${esc(fOcc ? fOcc.charAt(0).toUpperCase() + fOcc.slice(1) : "")}.</p><button class="openrel plink" data-goto="${addrStr(bio.father.addr, bio.father.id)}">Open his record →</button></div>`;
  } else {
    html += `<div class="parent"><div class="who">Father</div><div class="pname">${bio.incomer ? "Of another parish" : "Before the register"}</div><p>${bio.incomer ? "Her people are entered in the register of the next parish, which does not survive." : "The register begins after his time; only the name of the line remains."}</p></div>`;
  }
  if (bio.mother) {
    html += `<div class="parent"><div class="who">Mother${bio.mother.foreign ? " · of " + esc(bio.originPlace) : ""}</div><div class="pname">${esc(bio.mother.name)}</div><p>${bio.mother.dead.cause === "childbirth" ? "Died in childbed — the register marks her burial in the same week as a baptism." : "Bore and raised the children of the house through the years the register records."}</p><button class="openrel plink" data-goto="${addrStr(bio.mother.addr, bio.mother.id)}">Open her record →</button></div>`;
  } else {
    html += `<div class="parent"><div class="who">Mother</div><div class="pname">${bio.incomer ? "Of another parish" : "Before the register"}</div><p>Nothing more is written of her here.</p></div>`;
  }
  html += `</div>`;

  // Siblings
  if (bio.siblings.length) {
    html += `<div class="sect reveal"><h2>Siblings — ${bio.siblings.length}${sibsDead ? ", of whom " + sibsDead + " died young" : ""}</h2></div>
    <div class="relgrid reveal">` + bio.siblings.map(s =>
      relCard(s.sex === "M" ? "Brother" : "Sister", s, addrStr(s.addr, s.id))
    ).join("") + `</div>`;
  }

  // Chronicle
  html += `<div class="sect reveal"><h2>The chronicle</h2></div><div class="chronicle">`;
  bio.events.forEach((e, i) => {
    const label = KIND_LABEL[e.kind] || "";
    html += `<div class="entry k-${e.kind} reveal" style="animation-delay:${Math.min(i * 55, 850)}ms">
      <div class="yr">${e.year}<span class="age">aet. ${e.age}</span></div>
      <div class="tx">${esc(e.text)}${label ? `<span class="tag">${label}</span>` : ""}<span class="src">${esc(e.src)}</span></div>
    </div>`;
  });
  html += `</div>`;

  // Marriage & children
  if (bio.spouse || bio.children.length) {
    html += `<div class="sect reveal"><h2>Marriage & issue</h2></div><div class="relgrid reveal">`;
    if (bio.spouse) {
      const note = "m. " + bio.marriageYear + (bio.spouse.originPlace ? ` · from ${bio.spouse.originPlace}` : "");
      html += relCard(bio.sex === "M" ? "Wife" : "Husband", { name: bio.spouse.name, surname: "", birth: bio.spouse.birth, death: bio.spouse.death }, addrStr(bio.spouse.addr, bio.spouse.id), { note });
    }
    html += bio.children.map(c => relCard(c.sex === "M" ? "Son" : "Daughter", c, addrStr(c.addr, c.id))).join("");
    html += `</div>`;
  }

  // Parish register browser
  const reg = E.roster(env).slice().sort((a, b) => a.birth - b.birth);
  html += `<details class="register reveal"><summary>The full parish register — ${reg.length} souls, ${esc(bio.place)}</summary><div class="register-list">` +
    reg.map(r => `<button class="regrow${r.id === node.personId ? " current" : ""}" data-goto="${node.regionKey}:${node.villageIdx}:${r.id}">
      <span class="rr-name">${esc(r.name)} ${esc(r.surname)}${r.founder ? " <i>(founder)</i>" : r.incomer ? " <i>(incomer)</i>" : r.emigrated ? " <i>(removed elsewhere)</i>" : ""}</span>
      <span class="rr-dates">${r.birth}–${r.death.year}</span>
      <span class="rr-cause${r.death.cause === "plague" ? " plague" : ""}">${esc(E.CAUSE_LABEL[r.death.cause])}</span>
    </button>`).join("") + `</div></details>`;

  html += `<div class="ledger reveal">
    lifespan <b>${bio.death.age} years</b> · plagues lived through <b>${bio.plaguesLived}</b> · widowed <b>${bio.widowed ? "yes" : "no"}</b> · literate <b>${bio.literate ? "yes" : "no"}</b> · village <b>${node.regionKey}/${node.villageIdx}</b>
  </div>
  <p class="footnote reveal">Nothing here is simulated on demand. The village is resolved once — its whole genealogy, every death and its cause, and the marriage matching — as a pure function of its address, and each person's chronicle is decoded from that shared record. Follow any chain of relatives in any order and return: the facts cannot disagree, because they are all read from the same envelope. Mortality after J.C. Russell's life tables; plagues 1347–1500; the Great Famine; the European marriage pattern.</p>`;

  return html;
}
