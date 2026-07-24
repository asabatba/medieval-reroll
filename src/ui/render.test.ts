// § name links: linkifyEventText turns the exact substrings biography.ts
// names in EventRef.name into clickable goto buttons, escaping every other
// character of the surrounding (untrusted-looking, though actually
// internally-generated) text normally.
import { describe, expect, it } from "vitest";
import type { EventRef } from "../engine/index.js";
import * as E from "../engine/index.js";
import { buildRecordHTML, buildViewHTML, defaultVillageYear, linkifyEventText, renderVillageBody, type StackNode, VILLAGE_YEAR_MIN } from "./render.js";

const ADDR = { regionKey: "england", villageIdx: 3 };
function ref(id: number, name: string): EventRef {
  return { id, name, addr: ADDR };
}

describe("linkifyEventText", () => {
  it("with no refs, just escapes the text (matching dom.ts's esc: text AND attribute contexts)", () => {
    expect(linkifyEventText("Married Agnes & <friends>.", undefined)).toBe("Married Agnes &amp; &lt;friends&gt;.");
    expect(linkifyEventText("Plain text.", [])).toBe("Plain text.");
  });

  it("wraps a single matched name in a goto button, escaping the rest", () => {
    const out = linkifyEventText("Married Agnes Carter.", [ref(7, "Agnes Carter")]);
    expect(out).toBe('Married <button class="namelink" data-goto="england:3:7">Agnes Carter</button>.');
  });

  it("wraps multiple non-overlapping refs, in text order regardless of ref array order", () => {
    const out = linkifyEventText("At the font, Agnes Carter and John Fowler stood godparents.", [ref(2, "John Fowler"), ref(7, "Agnes Carter")]);
    expect(out).toBe(
      'At the font, <button class="namelink" data-goto="england:3:7">Agnes Carter</button> and <button class="namelink" data-goto="england:3:2">John Fowler</button> stood godparents.',
    );
  });

  it("a ref whose name never appears in the text is silently skipped", () => {
    const out = linkifyEventText("Never married.", [ref(9, "Nobody Here")]);
    expect(out).toBe("Never married.");
  });

  // § nobility links: route refs target a specific sovereign's or lord's
  // own page; without an index they fall back to the line/house views.
  it("a route ref links to the named sovereign's or lord's own page", () => {
    const king = linkifyEventText("News came that King Henry V was dead.", [{ id: -1, name: "King Henry V", addr: ADDR, route: "royal", routeIdx: 6 }]);
    expect(king).toContain('data-goto="king:england:6"');
    const lord = linkifyEventText("Paid merchet to Hugh atte Wode.", [{ id: -1, name: "Hugh atte Wode", addr: ADDR, route: "lord", routeIdx: 2 }]);
    expect(lord).toContain('data-goto="lord:england:3:2"');
    const fallback = linkifyEventText("News came that King Henry V was dead.", [{ id: -1, name: "King Henry V", addr: ADDR, route: "royal" }]);
    expect(fallback).toContain('data-goto="royal:england"');
  });

  it("an overlapping second match starting inside the first is skipped, not double-wrapped", () => {
    // "Agnes" and "Agnes Carter" both match at the same start; only the
    // first-sorted (by start index) one should win, and the second is
    // simply dropped rather than corrupting the output.
    const out = linkifyEventText("Agnes Carter married.", [ref(7, "Agnes Carter"), ref(8, "Agnes")]);
    expect(out).toBe('<button class="namelink" data-goto="england:3:7">Agnes Carter</button> married.');
  });

  it("links repeated names to their distinct references in text order", () => {
    const out = linkifyEventText("Agnes Carter and Agnes Carter stood godparents.", [ref(2, "Agnes Carter"), ref(7, "Agnes Carter")]);
    expect(out).toBe(
      '<button class="namelink" data-goto="england:3:2">Agnes Carter</button> and <button class="namelink" data-goto="england:3:7">Agnes Carter</button> stood godparents.',
    );
  });

  it("escapes HTML-significant characters in both the linked name and the surrounding text", () => {
    const out = linkifyEventText("A & B married C <D>.", [ref(1, "C <D>")]);
    expect(out).toBe('A &amp; B married <button class="namelink" data-goto="england:3:1">C &lt;D&gt;</button>.');
  });
});

// Previously untested: buildRecordHTML/renderVillageBody are the two
// functions that actually assemble the page, and had zero direct
// assertions on their output (only linkifyEventText, a small piece of
// buildRecordHTML, was covered) — app.test.ts drives them through a real
// DOM now, but these check the section content directly.
describe("buildRecordHTML", () => {
  const env = E.resolveVillage(1444, "england", 0);
  const person = env.persons.find((p) => !p.founder) ?? env.persons[0];
  const stack: StackNode[] = [{ regionKey: "england", villageIdx: 0, personId: person.id }];

  it("renders the vitals, chronicle, and parentage sections for a real person", () => {
    const html = buildRecordHTML(E, 1444, stack, "en");
    expect(html).toContain('class="vital"');
    expect(html).toContain('class="chronicle"');
    expect(html).toContain('class="parents');
    // the person's own name appears somewhere in the record (vitals or chronicle)
    expect(html).toContain(person.name);
  });

  it("renders a Catalan record with the same structural sections as English", () => {
    const html = buildRecordHTML(E, 1444, stack, "ca");
    expect(html).toContain('class="vital"');
    expect(html).toContain('class="chronicle"');
  });

  // § nobility: the royal line is rendered as a collapsed register-style
  // block — every reign of the region's line, with the reigns overlapping
  // this person's life marked `.lived`.
  it("renders the royal line with every reign, highlighting exactly the lived-under ones", () => {
    const bio = E.decodePerson(env, person.id, "en")!;
    const html = buildRecordHTML(E, 1444, stack, "en");
    expect(html).toContain("Royal line — Kings of England");
    const line = E.royalLineOf("england")!;
    for (const r of line.reigns) expect(html).toContain(r.style.en);
    const livedRows = (html.match(/class="ryrow lived/g) ?? []).length;
    expect(livedRows).toBe(line.reigns.filter((r) => r.from <= bio.death.year && r.to >= bio.birth).length);
    expect(livedRows).toBeGreaterThan(0);
  });

  // § nobility routes: the fief vitals and the sovereign vital are links —
  // the lord and sovereign to their OWN pages, not just the line views.
  it("links the manor/honour vitals to the house view, and the lord/sovereign vitals to their person pages", () => {
    const html = buildRecordHTML(E, 1444, stack, "en");
    const bio = E.decodePerson(env, person.id, "en")!;
    expect(html).toContain('data-goto="house:england:0"');
    const lordIdx = E.tenureIndexAt(E.manorLineOf(1444, "england", 0).heads, E.ANCHOR_YEAR);
    expect(html).toContain(`data-goto="lord:england:0:${lordIdx}"`);
    expect(html).toContain(`data-goto="king:england:${E.reignIndexAt("england", bio.birth)}"`);
  });

  it("renders no breadcrumb trail bar for a single-node stack, and one for a multi-node stack", () => {
    const one = buildRecordHTML(E, 1444, stack, "en");
    expect(one).not.toContain('data-jump="0"');

    const sibling = env.persons.find((p) => p.id !== person.id && p.father === person.father && p.father >= 0);
    const twoStack: StackNode[] = sibling ? [...stack, { regionKey: "england", villageIdx: 0, personId: sibling.id }] : stack;
    if (sibling) {
      const two = buildRecordHTML(E, 1444, twoStack, "en");
      expect(two).toContain("data-jump=");
    }
  });
});

// § family tree — unlegitimated natural children: a child born out of
// wedlock whose parents never later married belongs to no Couple/union at
// all (succession.ts's childrenOf direct father/mother scan is the only
// place she's found), so the tree diagram — which otherwise only walks
// bio.unions[].children — must surface her separately or she'd silently
// vanish from the diagram while still counting in the vitals tally and the
// Marriage & Issue list on the very same page.
describe("renderFamilyTree — unlegitimated natural children", () => {
  it("shows a natural child, not covered by any union, in her own branch off self", () => {
    const regionKeys = Object.keys(E.REGIONS);
    let found: { regionKey: string; villageIdx: number; parentId: number; childId: number } | null = null;
    for (const regionKey of regionKeys) {
      for (let v = 0; v < 12 && !found; v++) {
        const env = E.resolveVillage(1444, regionKey, v);
        for (const child of env.persons) {
          if (!child.illegitimate || child.legitimated) continue;
          const parentId = child.father >= 0 ? child.father : child.mother;
          if (parentId < 0) continue;
          const parent = env.persons[parentId];
          if (parent.emigrated || parent.marriedOut) continue;
          found = { regionKey, villageIdx: v, parentId, childId: child.id };
          break;
        }
      }
      if (found) break;
    }
    expect(found).not.toBeNull();
    const { regionKey, villageIdx, parentId, childId } = found!;
    const stack: StackNode[] = [{ regionKey, villageIdx, personId: parentId }];
    const html = buildRecordHTML(E, 1444, stack, "en");
    const goto = `data-goto="${regionKey}:${villageIdx}:${childId}"`;

    const treeStart = html.indexOf('class="fam-tree');
    expect(treeStart).toBeGreaterThan(-1);
    const treeHtml = html.slice(treeStart);
    expect(treeHtml).toContain("Born out of wedlock");
    expect(treeHtml).toContain(goto);
  });
});

// § nobility routes: the two standalone views, dispatched via buildViewHTML.
describe("nobility views", () => {
  it("renders the royal-line view with every reign and its accession stories", () => {
    const html = buildViewHTML(E, 1444, [{ kind: "royal", regionKey: "england" }], "en");
    const line = E.royalLineOf("england")!;
    // the h1 renders its first letter in a drop-cap span, so match the rest
    expect(html).toContain("ings of England");
    for (const r of line.reigns) expect(html).toContain(r.style.en);
    // at least one hand-written accession story is on the page
    expect(html).toContain("Bosworth");
  });

  it("renders the noble-house view with the manor's full lord line and the honour's baronial house", () => {
    const html = buildViewHTML(E, 1444, [{ kind: "house", regionKey: "england", villageIdx: 0 }], "en");
    const manorLine = E.manorLineOf(1444, "england", 0);
    const honourLine = E.honourLineOf(1444, "england", 0);
    expect(html).toContain(`The house of ${manorLine.surname}`);
    for (const h of manorLine.heads) expect(html).toContain(h.name);
    for (const h of honourLine.heads) expect(html).toContain(h.name);
    // and it links onward to the royal line
    expect(html).toContain('data-goto="royal:england"');
  });

  it("the views resolve deterministic locator URLs", () => {
    const royal = buildViewHTML(E, 1444, [{ kind: "royal", regionKey: "england" }], "en");
    expect(royal).toContain("1444:england:royal");
    const house = buildViewHTML(E, 1444, [{ kind: "house", regionKey: "england", villageIdx: 0 }], "en");
    expect(house).toContain("1444:england:0:house");
    const king = buildViewHTML(E, 1444, [{ kind: "king", regionKey: "england", reignIdx: 6 }], "en");
    expect(king).toContain("1444:england:royal:6");
    const lord = buildViewHTML(E, 1444, [{ kind: "lord", regionKey: "england", villageIdx: 0, headIdx: 1 }], "en");
    expect(lord).toContain("1444:england:0:lord:1");
  });

  // § nobility person pages
  it("a sovereign's own page shows his reign, house, neighbours, and the reign's chronicle", () => {
    // reign 6 of England is Henry V (1413–1422)
    const html = buildViewHTML(E, 1444, [{ kind: "king", regionKey: "england", reignIdx: 6 }], "en");
    expect(html).toContain("1413–1422");
    expect(html).toContain("Lancaster");
    expect(html).toContain('data-goto="king:england:5"'); // predecessor Henry IV
    expect(html).toContain('data-goto="king:england:7"'); // successor Henry VI
    expect(html).toContain("the plague of 1420"); // a plague that fell in the reign
  });

  it("a lord's own page shows tenure, succession, cause of death, and the sovereigns of his time", () => {
    const line = E.manorLineOf(1444, "england", 0);
    const html = buildViewHTML(E, 1444, [{ kind: "lord", regionKey: "england", villageIdx: 0, headIdx: 1 }], "en");
    const h = line.heads[1];
    expect(html).toContain(h.name);
    expect(html).toContain(`${h.acceded}–${h.died}`);
    expect(html).toContain('data-goto="lord:england:0:0"'); // predecessor
    // every sovereign whose reign overlapped the tenure links to his page
    const overlapping = E.royalLineOf("england")!.reigns.filter((r) => r.from <= h.died && r.to >= h.acceded);
    expect(overlapping.length).toBeGreaterThan(0);
    for (const r of overlapping) expect(html).toContain(r.style.en);
    expect(html).toContain('data-goto="house:england:0"');
  });

  it("a baron's page reads from the honour line, not the manor line", () => {
    const honour = E.honourLineOf(1444, "england", 0);
    const html = buildViewHTML(E, 1444, [{ kind: "baron", regionKey: "england", villageIdx: 0, headIdx: 2 }], "en");
    expect(html).toContain(honour.heads[2].name);
    expect(html).toContain("1444:england:0:baron:2");
  });

  it("an out-of-range king or lord index renders empty rather than crashing", () => {
    expect(buildViewHTML(E, 1444, [{ kind: "king", regionKey: "england", reignIdx: 999 }], "en")).toBe("");
    expect(buildViewHTML(E, 1444, [{ kind: "lord", regionKey: "england", villageIdx: 0, headIdx: 999 }], "en")).toBe("");
  });
});

describe("renderVillageBody", () => {
  const env = E.resolveVillage(1444, "england", 0);
  const person = env.persons.find((p) => !p.founder) ?? env.persons[0];

  it("renders household cards for a year the village is populated", () => {
    const year = defaultVillageYear(person.birth);
    const html = renderVillageBody(E, env, year, "en", person.id);
    expect(html).toContain('data-goto="england:0:');
  });

  it("renders an empty state for a year before the register begins", () => {
    const html = renderVillageBody(E, env, VILLAGE_YEAR_MIN, "en", person.id);
    expect(html.length).toBeGreaterThan(0); // never blank/crashes even with nobody alive yet
  });
});
