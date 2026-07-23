import * as E from "../engine/index.js";
import { getLocale, type Locale, setLocale } from "../i18n/locale.js";
import { getTheme, setTheme, type Theme } from "../i18n/theme.js";
import { UI } from "../i18n/ui.js";
import {
  buildViewHTML,
  type HouseNode,
  isPersonNode,
  type KingNode,
  type LordNode,
  locator,
  type PersonNode,
  renderVillageBody,
  type StackNode,
} from "./render.js";

// A record's fixed URL is its locator in the hash: #worldseed:region:village:person.
// Pasting such a URL opens the exact same life; internal navigation pushes
// history entries so back/forward walk the visited records. The nobility
// views (§ nobility routes) have fixed URLs of the same shape:
// #worldseed:region:royal (the royal line),
// #worldseed:region:royal:reign (one sovereign's page),
// #worldseed:region:village:house (a manor's noble house), and
// #worldseed:region:village:lord|baron:head (one lord's page — the manor's
// line or the honour's baronial line respectively).
function parseLocator(s: string): { worldSeed: number; node: StackNode } | null {
  const parts = s.trim().replace(/^#/, "").split(":");
  if (parts.length < 3 || parts.length > 5) return null;
  const worldSeed = Number(parts[0]);
  // Object.hasOwn (not a bracket-truthy check): REGIONS is a plain object
  // literal, so a region segment of "__proto__"/"constructor"/"toString"
  // etc. would otherwise resolve through the prototype chain to a truthy
  // built-in and pass validation, then crash deep inside resolveVillage
  // once something tries to read a region-shaped property off it.
  if (!Number.isSafeInteger(worldSeed) || worldSeed < 0 || !Object.hasOwn(E.REGIONS, parts[1])) return null;
  if (parts[2] === "royal") {
    if (parts.length === 3) return { worldSeed, node: { kind: "royal", regionKey: parts[1] } };
    if (parts.length !== 4) return null;
    const reignIdx = Number(parts[3]);
    if (!Number.isSafeInteger(reignIdx) || reignIdx < 0) return null;
    return { worldSeed, node: { kind: "king", regionKey: parts[1], reignIdx } };
  }
  const villageIdx = Number(parts[2]);
  if (!Number.isSafeInteger(villageIdx) || villageIdx < 0) return null;
  if (parts.length === 5) {
    if (parts[3] !== "lord" && parts[3] !== "baron") return null;
    const headIdx = Number(parts[4]);
    if (!Number.isSafeInteger(headIdx) || headIdx < 0) return null;
    return { worldSeed, node: { kind: parts[3], regionKey: parts[1], villageIdx, headIdx } };
  }
  if (parts.length !== 4) return null;
  if (parts[3] === "house") return { worldSeed, node: { kind: "house", regionKey: parts[1], villageIdx } };
  const personId = Number(parts[3]);
  if (!Number.isSafeInteger(personId) || personId < 0) return null;
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
  const themesw = document.getElementById("themesw") as HTMLElement;

  let locale: Locale = getLocale();
  let theme: Theme = getTheme();
  let worldSeed = 1444;
  let stack: StackNode[] = [];

  function applyChrome(): void {
    const t = UI[locale];
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
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
    themesw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      const active = b.dataset.theme === theme;
      const label = b.dataset.theme === "dark" ? t.themeDark : t.themeLight;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
      b.title = label;
      b.setAttribute("aria-label", label);
    });
  }

  function sameNode(a: StackNode, b: StackNode): boolean {
    const kind = a.kind ?? "person";
    if (kind !== (b.kind ?? "person") || a.regionKey !== b.regionKey) return false;
    switch (kind) {
      case "royal":
        return true;
      case "king":
        return (a as KingNode).reignIdx === (b as KingNode).reignIdx;
      case "house":
        return (a as HouseNode).villageIdx === (b as HouseNode).villageIdx;
      case "lord":
      case "baron": {
        const la = a as LordNode;
        const lb = b as LordNode;
        return la.villageIdx === lb.villageIdx && la.headIdx === lb.headIdx;
      }
      default: {
        const pa = a as PersonNode;
        const pb = b as PersonNode;
        return pa.villageIdx === pb.villageIdx && pa.personId === pb.personId;
      }
    }
  }

  // data-goto forms: "region:village:person" (a record), "royal:region"
  // (the royal line), "king:region:reign" (a sovereign's page),
  // "house:region:village" (a manor's noble house), and
  // "lord|baron:region:village:head" (a lord's page).
  function gotoNode(goto: string): StackNode {
    const parts = goto.split(":");
    if (parts[0] === "royal") return { kind: "royal", regionKey: parts[1] };
    if (parts[0] === "king") return { kind: "king", regionKey: parts[1], reignIdx: +parts[2] };
    if (parts[0] === "house") return { kind: "house", regionKey: parts[1], villageIdx: +parts[2] };
    if (parts[0] === "lord" || parts[0] === "baron") return { kind: parts[0], regionKey: parts[1], villageIdx: +parts[2], headIdx: +parts[3] };
    return { regionKey: parts[0], villageIdx: +parts[1], personId: +parts[2] };
  }

  function bindGoto(root: ParentNode): void {
    root.querySelectorAll<HTMLButtonElement>("[data-goto]").forEach((b) => {
      b.addEventListener("click", () => {
        const addr = gotoNode(b.dataset.goto!);
        const current = stack[stack.length - 1];
        // a household/register row also renders the record you're already
        // viewing (styled `.current`, but still clickable) — clicking it
        // is a no-op, not a duplicate breadcrumb entry
        if (current && sameNode(current, addr)) return;
        // walking back to the previous crumb pops instead of pushing
        const prev = stack[stack.length - 2];
        if (prev && sameNode(prev, addr)) stack.pop();
        else stack.push(addr);
        render();
      });
    });
  }

  function render(pushUrl = true, announce = true): void {
    const node = stack[stack.length - 1];
    const html = buildViewHTML(E, worldSeed, stack, locale);
    const loc = locator(worldSeed, node);
    seedbox.value = loc;
    worldseed.textContent = UI[locale].worldSeed(worldSeed);

    // fixed URL for this life: push so back/forward retrace the trail.
    // The visited-record breadcrumb trail is carried in the history state
    // itself (not just the URL, which only ever encodes the CURRENT node)
    // so that native back/forward — which fires hashchange, not our own
    // in-app pushState — can restore the full trail instead of collapsing
    // it to a single node.
    if (location.hash.slice(1) !== loc) {
      if (pushUrl) history.pushState(stack, "", `#${loc}`);
      else history.replaceState(stack, "", `#${loc}`);
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
    // (person records only — the nobility views have no village section)
    const slider = out.querySelector<HTMLInputElement>("#vyear");
    const yearOut = out.querySelector<HTMLOutputElement>("#vyearout");
    const vbody = out.querySelector<HTMLElement>("#vbody");
    if (slider && yearOut && vbody && isPersonNode(node)) {
      const env = E.resolveVillage(worldSeed, node.regionKey, node.villageIdx);
      let frame: number | null = null;
      slider.addEventListener("input", () => {
        const year = +slider.value;
        yearOut.textContent = String(year);
        if (frame != null) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = null;
          vbody.innerHTML = renderVillageBody(E, env, year, locale, node.personId);
          bindGoto(vbody);
        });
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
    // Existence checks per node kind: a person must be on the register, a
    // king/lord index must fall inside its line. The line/house views are
    // total functions of any valid (region, village) address.
    const invalid = (): boolean => {
      locatorError.textContent = UI[locale].locatorError;
      seedbox.setAttribute("aria-invalid", "true");
      seedbox.focus();
      return false;
    };
    if (isPersonNode(parsed.node)) {
      const env = E.resolveVillage(parsed.worldSeed, parsed.node.regionKey, parsed.node.villageIdx);
      if (!env.persons[parsed.node.personId]) return invalid();
    } else if (parsed.node.kind === "king") {
      if (!E.royalLineOf(parsed.node.regionKey)?.reigns[parsed.node.reignIdx]) return invalid();
    } else if (parsed.node.kind === "lord" || parsed.node.kind === "baron") {
      const line =
        parsed.node.kind === "lord"
          ? E.manorLineOf(parsed.worldSeed, parsed.node.regionKey, parsed.node.villageIdx)
          : E.honourLineOf(parsed.worldSeed, parsed.node.regionKey, parsed.node.villageIdx);
      if (!line.heads[parsed.node.headIdx]) return invalid();
    }
    locatorError.textContent = "";
    seedbox.removeAttribute("aria-invalid");
    worldSeed = parsed.worldSeed;
    stack = [parsed.node];
    render(pushUrl);
    return true;
  }

  function roll(pushUrl = true): void {
    const a = E.randomCitizen(worldSeed, Math.random);
    stack = [a];
    render(pushUrl);
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

  themesw.innerHTML = '<button type="button" data-theme="dark">☾</button><button type="button" data-theme="light">☀</button>';
  themesw.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.theme as Theme;
      if (next === theme) return;
      theme = next;
      setTheme(theme);
      applyChrome();
    });
  });

  rollBtn.addEventListener("click", () => roll());
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
    // Native back/forward restores `history.state` for us — if it's a
    // trail we ourselves pushed (its own tail locator matches the hash we
    // just navigated to), restore the full breadcrumb rather than falling
    // through to openLocator's fresh single-node stack. A hand-edited or
    // externally-pasted hash has no such state (or a stale/mismatched one)
    // and correctly falls through.
    const savedStack = history.state as StackNode[] | null;
    const savedTail = Array.isArray(savedStack) ? savedStack[savedStack.length - 1] : null;
    if (savedTail && locator(worldSeed, savedTail) === location.hash.slice(1)) {
      stack = savedStack!;
      render(false, false);
      return;
    }
    if (!openLocator(location.hash, false) && stack.length) render(false, false);
  });

  applyChrome();
  if (location.hash) {
    if (!openLocator(location.hash, false)) roll(false);
  } else {
    roll(false);
  }
}
