import * as E from "../engine/index.js";
import { getLocale, type Locale, setLocale } from "../i18n/locale.js";
import { UI } from "../i18n/ui.js";
import { buildRecordHTML, locator, renderVillageBody, type StackNode } from "./render.js";

// A record's fixed URL is its locator in the hash: #worldseed:region:village:person.
// Pasting such a URL opens the exact same life; internal navigation pushes
// history entries so back/forward walk the visited records.
function parseLocator(s: string): { worldSeed: number; node: StackNode } | null {
  const parts = s.trim().replace(/^#/, "").split(":");
  if (parts.length !== 4) return null;
  const worldSeed = Number(parts[0]);
  const villageIdx = Number(parts[2]);
  const personId = Number(parts[3]);
  if (!Number.isSafeInteger(worldSeed) || !E.REGIONS[parts[1]] || !Number.isSafeInteger(villageIdx) || !Number.isSafeInteger(personId)) return null;
  if (worldSeed < 0 || villageIdx < 0 || personId < 0) return null;
  return { worldSeed, node: { regionKey: parts[1], villageIdx, personId } };
}

export function initApp(): void {
  const out = document.getElementById("out") as HTMLElement;
  const seedbox = document.getElementById("seedbox") as HTMLInputElement;
  const intro = document.getElementById("intro") as HTMLElement;
  const worldseed = document.getElementById("worldseed") as HTMLElement;
  const locatorError = document.getElementById("locator-error") as HTMLElement;
  const status = document.getElementById("status") as HTMLElement;
  const replayBtn = document.getElementById("replay") as HTMLButtonElement;
  const rollBtn = document.getElementById("roll") as HTMLButtonElement;
  const newWorldBtn = document.getElementById("new-world") as HTMLButtonElement;
  const langsw = document.getElementById("langsw") as HTMLElement;

  let locale: Locale = getLocale();
  let worldSeed = 1444;
  let stack: StackNode[] = [];

  function applyChrome(): void {
    const t = UI[locale];
    document.documentElement.lang = locale;
    seedbox.placeholder = t.seedboxPlaceholder;
    seedbox.setAttribute("aria-label", t.seedboxLabel);
    seedbox.title = t.seedboxTitle;
    replayBtn.textContent = t.openRecord;
    replayBtn.title = t.openRecordTitle;
    rollBtn.textContent = t.rollALife;
    rollBtn.title = t.rollALife;
    newWorldBtn.textContent = t.newWorld;
    newWorldBtn.title = t.newWorldTitle;
    worldseed.textContent = t.worldSeed(worldSeed);
    intro.innerHTML = t.intro;
    langsw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      const active = b.dataset.lang === locale;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }

  function bindGoto(root: ParentNode): void {
    root.querySelectorAll<HTMLButtonElement>("[data-goto]").forEach((b) => {
      b.addEventListener("click", () => {
        const [rk, vi, pid] = b.dataset.goto!.split(":");
        const addr: StackNode = { regionKey: rk, villageIdx: +vi, personId: +pid };
        // walking back to the previous crumb pops instead of pushing
        const prev = stack[stack.length - 2];
        if (prev && prev.regionKey === addr.regionKey && prev.villageIdx === addr.villageIdx && prev.personId === addr.personId) stack.pop();
        else stack.push(addr);
        render();
      });
    });
  }

  function render(pushUrl = true, announce = true): void {
    const node = stack[stack.length - 1];
    const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
    node.personId = Math.min(node.personId, env.persons.length - 1);
    const html = buildRecordHTML(E, worldSeed, stack, locale);
    const loc = locator(worldSeed, node);
    seedbox.value = loc;
    worldseed.textContent = UI[locale].worldSeed(worldSeed);

    // fixed URL for this life: push so back/forward retrace the trail
    if (location.hash.slice(1) !== loc) {
      if (pushUrl) history.pushState(null, "", `#${loc}`);
      else history.replaceState(null, "", `#${loc}`);
    }

    out.innerHTML = html;
    if (announce) status.textContent = UI[locale].recordOpened(node.crumb || "");
    window.scrollTo(0, 0);

    bindGoto(out);
    out.querySelectorAll<HTMLButtonElement>(".crumb[data-jump]").forEach((b) => {
      b.addEventListener("click", () => {
        stack = stack.slice(0, +b.dataset.jump! + 1);
        render();
      });
    });

    // village-in-year slider: re-render only the household body on input
    const slider = out.querySelector<HTMLInputElement>("#vyear");
    const yearOut = out.querySelector<HTMLOutputElement>("#vyearout");
    const vbody = out.querySelector<HTMLElement>("#vbody");
    if (slider && yearOut && vbody) {
      slider.addEventListener("input", () => {
        const year = +slider.value;
        yearOut.textContent = String(year);
        vbody.innerHTML = renderVillageBody(E, env, year, locale, node.personId);
        bindGoto(vbody);
      });
    }
  }

  function openLocator(raw: string, pushUrl = true): boolean {
    const parsed = parseLocator(raw);
    if (!parsed) {
      locatorError.textContent = UI[locale].locatorError;
      seedbox.setAttribute("aria-invalid", "true");
      seedbox.focus();
      return false;
    }
    locatorError.textContent = "";
    seedbox.removeAttribute("aria-invalid");
    worldSeed = parsed.worldSeed;
    stack = [parsed.node];
    render(pushUrl);
    return true;
  }

  function roll(): void {
    const a = E.randomCitizen(worldSeed, Math.random);
    stack = [a];
    render();
  }

  function newWorld(): void {
    worldSeed = Math.floor(Math.random() * 2_147_483_647) + 1;
    roll();
  }

  langsw.innerHTML = '<button type="button" data-lang="en">EN</button><button type="button" data-lang="ca">CA</button>';
  langsw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.lang as Locale;
      if (next === locale) return;
      locale = next;
      setLocale(locale);
      applyChrome();
      if (stack.length) render(false, false);
    });
  });

  rollBtn.addEventListener("click", roll);
  newWorldBtn.addEventListener("click", newWorld);
  replayBtn.addEventListener("click", () => {
    openLocator(seedbox.value);
  });
  seedbox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") replayBtn.click();
  });
  seedbox.addEventListener("input", () => {
    locatorError.textContent = "";
    seedbox.removeAttribute("aria-invalid");
  });

  // back/forward between visited records, and hand-edited/pasted hashes
  window.addEventListener("hashchange", () => {
    const cur = stack[stack.length - 1];
    if (cur && location.hash.slice(1) === locator(worldSeed, cur)) return; // our own push
    openLocator(location.hash, false);
  });

  applyChrome();
  if (!openLocator(location.hash, false)) roll();
}
