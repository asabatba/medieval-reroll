// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appMarkup = `
  <div class="wrap"><header><div class="controls">
    <div id="langsw"></div><div id="themesw"></div><div id="worldseed"></div>
    <input id="seedbox"><button id="replay"></button><button id="roll"></button><button id="new-world"></button>
  </div><p id="locator-error"></p></header><p id="intro"></p><p id="status"></p><main id="out"></main></div>`;

async function start(hash = ""): Promise<void> {
  history.replaceState(null, "", hash || "/");
  document.body.innerHTML = appMarkup;
  vi.resetModules();
  const { initApp } = await import("./app.js");
  initApp();
}

describe("app navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rolls a first record without showing a locator error", async () => {
    await start();
    expect(document.getElementById("locator-error")?.textContent).toBe("");
    expect(document.getElementById("seedbox")?.getAttribute("aria-invalid")).toBeNull();
    expect(location.hash).toMatch(/^#1444:/);
  });

  it("recovers a malformed shared link with a valid fallback record", async () => {
    await start("#not-a-locator");
    expect(document.getElementById("locator-error")?.textContent).not.toBe("");
    expect(location.hash).toMatch(/^#1444:/);
  });

  it("rejects an out-of-range person ID instead of substituting a record", async () => {
    await start("#1444:england:0:999999");
    expect(document.getElementById("locator-error")?.textContent).not.toBe("");
    expect(location.hash).not.toBe("#1444:england:0:999999");
  });

  it("opens a valid pasted locator", async () => {
    await start();
    const input = document.getElementById("seedbox") as HTMLInputElement;
    input.value = "1444:england:0:0";
    (document.getElementById("replay") as HTMLButtonElement).click();
    expect(input.value).toBe("1444:england:0:0");
    expect(document.getElementById("locator-error")?.textContent).toBe("");
  });

  it("keeps the world for another-life rolls and changes it for new-world rolls", async () => {
    await start();
    const world = document.getElementById("worldseed") as HTMLElement;
    const initial = world.textContent;
    (document.getElementById("roll") as HTMLButtonElement).click();
    expect(world.textContent).toBe(initial);
    (document.getElementById("new-world") as HTMLButtonElement).click();
    expect(world.textContent).not.toBe(initial);
  });

  it("updates language controls and their pressed state", async () => {
    await start();
    const catalan = document.querySelector<HTMLButtonElement>('[data-lang="ca"]')!;
    catalan.click();
    expect(document.documentElement.lang).toBe("ca");
    expect(catalan.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[data-lang="en"]')?.getAttribute("aria-pressed")).toBe("false");
  });

  it("a locator segment that resolves through Object.prototype (e.g. __proto__) is rejected, not treated as a valid region", async () => {
    await start("#1444:__proto__:0:0");
    expect(document.getElementById("locator-error")?.textContent).not.toBe("");
    expect(location.hash).toMatch(/^#1444:/);
    expect(location.hash).not.toContain("__proto__");
  });

  it("clicking another record in the parish register navigates there and pushes a new history entry carrying the visited trail", async () => {
    await start();
    const before = location.hash;
    const other = document.querySelector<HTMLButtonElement>(".regrow:not(.current)");
    expect(other).not.toBeNull();
    other!.click();
    expect(location.hash).not.toBe(before);
    // history state now carries the full stack (not null) so native
    // back/forward can restore the breadcrumb trail, not just the node
    expect(Array.isArray(history.state)).toBe(true);
    expect(history.state).toHaveLength(2);
  });

  it("clicking the currently-viewed record's own row in the register is a no-op (no duplicate breadcrumb entry)", async () => {
    await start();
    const before = location.hash;
    const self = document.querySelector<HTMLButtonElement>(".regrow.current");
    expect(self).not.toBeNull();
    self!.click();
    expect(location.hash).toBe(before);
    // a real second stack entry would render a (possibly duplicate-looking)
    // breadcrumb trail bar; a no-op must never show one from a single click
    expect(document.querySelectorAll(".crumb[data-jump]")).toHaveLength(0);
  });

  // § nobility routes: royal-line and noble-house views are first-class
  // navigation targets with fixed URLs of their own.
  it("clicking the sovereign vital opens that sovereign's own page at its own URL, on the breadcrumb trail", async () => {
    await start();
    const kingBtn = document.querySelector<HTMLButtonElement>('[data-goto^="king:"]');
    expect(kingBtn).not.toBeNull();
    kingBtn!.click();
    expect(location.hash).toMatch(/^#1444:[a-z]+:royal:\d+$/);
    expect(document.querySelectorAll(".crumb[data-jump]").length).toBe(2);
  });

  it("clicking the lord vital opens that lord's own page at its own URL", async () => {
    await start();
    const lordBtn = document.querySelector<HTMLButtonElement>('[data-goto^="lord:"]');
    expect(lordBtn).not.toBeNull();
    lordBtn!.click();
    expect(location.hash).toMatch(/^#1444:[a-z]+:\d+:lord:\d+$/);
  });

  it("clicking a lord/manor vital opens the manor's noble-house view at its own URL", async () => {
    await start();
    const houseBtn = document.querySelector<HTMLButtonElement>('[data-goto^="house:"]');
    expect(houseBtn).not.toBeNull();
    houseBtn!.click();
    expect(location.hash).toMatch(/^#1444:[a-z]+:\d+:house$/);
  });

  it("opens a pasted royal-line locator, and a noble-house locator", async () => {
    await start();
    const input = document.getElementById("seedbox") as HTMLInputElement;
    input.value = "1444:england:royal";
    (document.getElementById("replay") as HTMLButtonElement).click();
    expect(document.getElementById("locator-error")?.textContent).toBe("");
    expect(location.hash).toBe("#1444:england:royal");

    input.value = "1444:england:0:house";
    (document.getElementById("replay") as HTMLButtonElement).click();
    expect(document.getElementById("locator-error")?.textContent).toBe("");
    expect(location.hash).toBe("#1444:england:0:house");
  });

  it("opens pasted king, lord, and baron person-page locators", async () => {
    await start();
    const input = document.getElementById("seedbox") as HTMLInputElement;
    for (const loc of ["1444:england:royal:6", "1444:england:0:lord:0", "1444:england:0:baron:0"]) {
      input.value = loc;
      (document.getElementById("replay") as HTMLButtonElement).click();
      expect(document.getElementById("locator-error")?.textContent, loc).toBe("");
      expect(location.hash).toBe(`#${loc}`);
    }
  });

  it("rejects malformed nobility locators (bad region, bad tail, out-of-range person index)", async () => {
    await start();
    const input = document.getElementById("seedbox") as HTMLInputElement;
    for (const bad of [
      "1444:atlantis:royal",
      "1444:england:notaword",
      "1444:england:x:house",
      "1444:england:royal:999",
      "1444:england:0:lord:999",
      "1444:england:0:duke:0",
    ]) {
      input.value = bad;
      (document.getElementById("replay") as HTMLButtonElement).click();
      expect(document.getElementById("locator-error")?.textContent, bad).not.toBe("");
    }
  });

  // § the village route: the place itself, at the shortest locator in the app.
  it("clicking the place name on a record opens the village's own page at #seed:region:village", async () => {
    await start();
    const placeBtn = document.querySelector<HTMLButtonElement>('.dates [data-goto^="village:"]');
    expect(placeBtn).not.toBeNull();
    placeBtn!.click();
    expect(location.hash).toMatch(/^#1444:[a-z]+:\d+$/);
    expect(document.querySelectorAll(".crumb[data-jump]").length).toBe(2);
    // the village page IS the register and the year view — both present, and
    // the household section open rather than folded shut on its own subject
    expect(document.querySelector("details.village")?.hasAttribute("open")).toBe(true);
    expect(document.querySelector("#vyear")).not.toBeNull();
    expect(document.querySelectorAll(".regrow").length).toBeGreaterThan(0);
    // and nobody is the "current" record on a page that is about no one
    expect(document.querySelectorAll(".regrow.current")).toHaveLength(0);
  });

  it("the year slider works on the village's own page, where there is no subject to highlight", async () => {
    await start("#1444:england:0");
    const slider = document.getElementById("vyear") as HTMLInputElement;
    expect(slider).not.toBeNull();
    slider.value = "1400";
    slider.dispatchEvent(new Event("input"));
    expect(document.getElementById("vyearout")?.textContent).toBe("1400");
    expect(document.querySelectorAll("#vbody .member").length).toBeGreaterThan(0);
  });

  it("a village locator round-trips, and truncating a person's locator walks up to their place", async () => {
    await start("#1444:england:0:12");
    const input = document.getElementById("seedbox") as HTMLInputElement;
    expect(input.value).toBe("1444:england:0:12");
    input.value = "1444:england:0";
    (document.getElementById("replay") as HTMLButtonElement).click();
    expect(document.getElementById("locator-error")?.textContent).toBe("");
    expect(location.hash).toBe("#1444:england:0");
  });

  // § the parish route: the ecclesiastical tree, which the record used to
  // print as dead text while every other jurisdiction opened a page.
  it("parish, deanery and diocese vitals each open their own page", async () => {
    for (const level of ["parish", "deanery", "diocese"]) {
      await start();
      const btn = document.querySelector<HTMLButtonElement>(`[data-goto^="${level}:"]`);
      expect(btn, level).not.toBeNull();
      btn!.click();
      expect(location.hash, level).toMatch(new RegExp(`^#1444:[a-z]+:\\d+:${level}$`));
      expect(document.querySelector(".card .name")?.textContent, level).toBeTruthy();
    }
  });

  it("a parish page lists its villages, and each row opens that village", async () => {
    await start("#1444:england:0:parish");
    const rows = document.querySelectorAll<HTMLButtonElement>('.reigns [data-goto^="village:"]');
    expect(rows.length).toBeGreaterThan(0);
    rows[0].click();
    expect(location.hash).toMatch(/^#1444:england:\d+$/);
  });

  it("the ecclesiastical tree walks upward too: a parish page links its deanery, a deanery its diocese", async () => {
    await start("#1444:england:0:parish");
    document.querySelector<HTMLButtonElement>('.vitals [data-goto^="deanery:"]')!.click();
    expect(location.hash).toMatch(/^#1444:england:\d+:deanery$/);
    document.querySelector<HTMLButtonElement>('.vitals [data-goto^="diocese:"]')!.click();
    expect(location.hash).toMatch(/^#1444:england:\d+:diocese$/);
  });

  it("somewhere in a run of villages, several really do share one mother church", async () => {
    // § the parish route: the shared-parish case is the whole reason this
    // view exists — roughly a third of blocks (engine/hierarchy.ts) put
    // several villages under one font. Scan until one turns up rather than
    // assuming village 0 is it.
    let sharedSeen = 0;
    for (let v = 0; v < 12 && !sharedSeen; v++) {
      await start(`#1444:england:${v}:parish`);
      const rows = document.querySelectorAll('.reigns [data-goto^="village:"]');
      if (rows.length > 1) sharedSeen = rows.length;
    }
    expect(sharedSeen).toBeGreaterThan(1);
  });

  it("browser back restores the full breadcrumb trail, not just the single node being navigated to", async () => {
    await start();
    const firstHash = location.hash;
    const other = document.querySelector<HTMLButtonElement>(".regrow:not(.current)");
    other!.click();
    expect(location.hash).not.toBe(firstHash);
    expect(document.querySelectorAll(".crumb[data-jump]")).toHaveLength(2); // A, B

    history.back();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(location.hash).toBe(firstHash);
    // restored via the saved history state, so the trail bar for A alone
    // correctly shows nothing (stack length 1) rather than either crashing
    // or silently collapsing into some other inconsistent state
    expect(document.querySelectorAll(".crumb[data-jump]")).toHaveLength(0);
  });

  // ---- § the Schism: the papal route ----

  it("clicking the pontiff vital opens that pope's own page at its own URL", async () => {
    await start();
    const btn = document.querySelector<HTMLButtonElement>('[data-goto^="pontiff:"]');
    expect(btn).not.toBeNull();
    btn!.click();
    expect(location.hash).toMatch(/^#1444:[a-z]+:papacy:\d+$/);
    expect(document.querySelectorAll(".crumb[data-jump]").length).toBe(2);
  });

  it("opens the region's whole papal series from a pontiff's page, and back down again", async () => {
    await start("#1444:england:papacy");
    expect(document.getElementById("locator-error")?.textContent).toBe("");
    const rows = document.querySelectorAll<HTMLButtonElement>('.reigns [data-goto^="pontiff:"]');
    expect(rows.length).toBeGreaterThan(20);
    rows[0].click();
    expect(location.hash).toBe("#1444:england:papacy:0");
  });

  it("rejects a pontiff index past the end of the region's own series", async () => {
    await start("#1444:england:papacy:9999");
    expect(document.getElementById("locator-error")?.textContent).not.toBe("");
    expect(location.hash).not.toBe("#1444:england:papacy:9999");
  });

  // ---- § the church's own line: the parish incumbent route ----

  it("clicking the parson vital opens that incumbent's own page at its own URL", async () => {
    await start();
    const btn = document.querySelector<HTMLButtonElement>('[data-goto^="rector:"]');
    expect(btn).not.toBeNull();
    btn!.click();
    expect(location.hash).toMatch(/^#1444:[a-z]+:\d+:rector:\d+$/);
  });

  it("lists the incumbents on the parish page, each opening his own record", async () => {
    await start("#1444:england:0:parish");
    const rows = document.querySelectorAll<HTMLButtonElement>('.reigns [data-goto^="rector:"]');
    expect(rows.length).toBeGreaterThan(3);
    rows[1].click();
    expect(location.hash).toMatch(/^#1444:england:\d+:rector:\d+$/);
  });

  it("rejects an incumbent index past the end of the parish's line", async () => {
    await start("#1444:england:0:rector:9999");
    expect(document.getElementById("locator-error")?.textContent).not.toBe("");
  });

  // ---- U1 § finding a person ----

  it("filters the parish register by name, and says when nothing matches", async () => {
    await start();
    const box = document.getElementById("regq") as HTMLInputElement;
    const rows = [...document.querySelectorAll<HTMLButtonElement>(".regrow")];
    expect(box).not.toBeNull();
    expect(rows.length).toBeGreaterThan(10);

    const target = rows[3].querySelector(".rr-name")!.textContent!.trim().split(" ")[0];
    box.value = target;
    box.dispatchEvent(new Event("input"));
    const visible = rows.filter((r) => !r.hidden);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(rows.length);
    for (const r of visible) expect(r.dataset.q).toContain(target.toLowerCase());
    expect(document.getElementById("regempty")?.hidden).toBe(true);
    expect(document.getElementById("regcount")?.textContent).toContain(String(visible.length));

    box.value = "zzzznobody";
    box.dispatchEvent(new Event("input"));
    expect(rows.every((r) => r.hidden)).toBe(true);
    expect(document.getElementById("regempty")?.hidden).toBe(false);

    // Clearing the box restores every row and drops the count.
    box.value = "";
    box.dispatchEvent(new Event("input"));
    expect(rows.every((r) => !r.hidden)).toBe(true);
    expect(document.getElementById("regcount")?.textContent).toBe("");
  });

  it("filters by year as well as by name — 'who was on this register in 1400'", async () => {
    await start();
    const box = document.getElementById("regq") as HTMLInputElement;
    const rows = [...document.querySelectorAll<HTMLButtonElement>(".regrow")];
    box.value = "13";
    box.dispatchEvent(new Event("input"));
    const visible = rows.filter((r) => !r.hidden);
    expect(visible.length).toBeGreaterThan(0);
    for (const r of visible) expect(r.dataset.q).toContain("13");
  });

  // ---- U3 § keeping the keyboard's place ----

  it("moves focus to the heading of each newly opened record, instead of dropping it to <body>", async () => {
    await start();
    const first = document.querySelector("h1.name");
    expect(document.activeElement).toBe(first);
    document.querySelector<HTMLButtonElement>(".regrow:not(.current)")!.click();
    const next = document.querySelector("h1.name");
    expect(next).not.toBe(first);
    expect(document.activeElement).toBe(next);
    expect((next as HTMLElement).tabIndex).toBe(-1);
  });
});
