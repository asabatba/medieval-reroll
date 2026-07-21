// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appMarkup = `
  <div class="wrap"><header><div class="controls">
    <div id="langsw"></div><div id="worldseed"></div>
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
});
