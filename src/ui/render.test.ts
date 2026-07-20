// § name links: linkifyEventText turns the exact substrings biography.ts
// names in EventRef.name into clickable goto buttons, escaping every other
// character of the surrounding (untrusted-looking, though actually
// internally-generated) text normally.
import { describe, expect, it } from "vitest";
import type { EventRef } from "../engine/index.js";
import { linkifyEventText } from "./render.js";

const ADDR = { regionKey: "england", villageIdx: 3 };
function ref(id: number, name: string): EventRef {
  return { id, name, addr: ADDR };
}

describe("linkifyEventText", () => {
  it("with no refs, just escapes the text (matching dom.ts's esc: & and < only)", () => {
    expect(linkifyEventText("Married Agnes & <friends>.", undefined)).toBe("Married Agnes &amp; &lt;friends>.");
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

  it("escapes HTML-significant characters in both the linked name and the surrounding text", () => {
    const out = linkifyEventText("A & B married C <D>.", [ref(1, "C <D>")]);
    expect(out).toBe('A &amp; B married <button class="namelink" data-goto="england:3:1">C &lt;D></button>.');
  });
});
