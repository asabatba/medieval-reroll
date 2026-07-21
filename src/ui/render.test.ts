// § name links: linkifyEventText turns the exact substrings biography.ts
// names in EventRef.name into clickable goto buttons, escaping every other
// character of the surrounding (untrusted-looking, though actually
// internally-generated) text normally.
import { describe, expect, it } from "vitest";
import type { EventRef } from "../engine/index.js";
import * as E from "../engine/index.js";
import { buildRecordHTML, defaultVillageYear, linkifyEventText, renderVillageBody, type StackNode, VILLAGE_YEAR_MIN } from "./render.js";

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
