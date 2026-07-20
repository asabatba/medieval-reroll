import * as E from "../engine/index.js";
import { getLocale, type Locale, setLocale } from "../i18n/locale.js";
import { UI } from "../i18n/ui.js";
import { buildRecordHTML, locator, type StackNode } from "./render.js";

export function initApp(): void {
  const out = document.getElementById("out") as HTMLElement;
  const seedbox = document.getElementById("seedbox") as HTMLInputElement;
  const intro = document.getElementById("intro") as HTMLElement;
  const replayBtn = document.getElementById("replay") as HTMLButtonElement;
  const rollBtn = document.getElementById("roll") as HTMLButtonElement;
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
    intro.innerHTML = t.intro;
    langsw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === locale);
    });
  }

  function render(): void {
    const html = buildRecordHTML(E, worldSeed, stack, locale);
    const node = stack[stack.length - 1];
    seedbox.value = locator(worldSeed, node);

    out.innerHTML = html;
    window.scrollTo(0, 0);

    out.querySelectorAll<HTMLButtonElement>("[data-goto]").forEach((b) => {
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
    out.querySelectorAll<HTMLButtonElement>(".crumb[data-jump]").forEach((b) => {
      b.addEventListener("click", () => {
        stack = stack.slice(0, +b.dataset.jump! + 1);
        render();
      });
    });
  }

  function roll(): void {
    const a = E.randomCitizen(worldSeed, Math.random);
    stack = [a];
    render();
  }

  langsw.innerHTML = '<button type="button" data-lang="en">EN</button><button type="button" data-lang="ca">CA</button>';
  langsw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.lang as Locale;
      if (next === locale) return;
      locale = next;
      setLocale(locale);
      applyChrome();
      if (stack.length) render();
    });
  });

  rollBtn.addEventListener("click", roll);
  replayBtn.addEventListener("click", () => {
    const parts = seedbox.value.trim().split(":");
    if (parts.length === 4) {
      const ws = Number.parseInt(parts[0], 10),
        vi = Number.parseInt(parts[2], 10),
        pid = Number.parseInt(parts[3], 10);
      if (!Number.isNaN(ws) && E.REGIONS[parts[1]] && !Number.isNaN(vi) && !Number.isNaN(pid)) {
        worldSeed = ws;
        const env = E.resolveVillage(worldSeed, parts[1], vi);
        stack = [{ regionKey: parts[1], villageIdx: vi, personId: Math.min(pid, env.persons.length - 1) }];
        render();
      }
    }
  });
  seedbox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") replayBtn.click();
  });

  applyChrome();
  roll();
}
