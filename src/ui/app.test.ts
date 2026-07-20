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
});
