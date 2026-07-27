import * as E from "../engine/index.js";
import { getLocale, type Locale, setLocale } from "../i18n/locale.js";
import { getTheme, setTheme, type Theme } from "../i18n/theme.js";
import { UI } from "../i18n/ui.js";
import {
  buildViewHTML,
  chartYearAt,
  type HouseNode,
  isPersonNode,
  type KingNode,
  type LordNode,
  locator,
  type PedigreeNode,
  type PersonNode,
  type PontiffNode,
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
// § the village route / § the parish route add two more:
// #worldseed:region:village (the place itself — a person's locator with the
// person taken off the end, so truncating any record URL walks up to it), and
// #worldseed:region:village:parish|deanery|diocese (the ecclesiastical tree,
// addressed by a village that belongs to it since it does not nest inside the
// civil one — see engine/hierarchy.ts).
const PARISH_LEVELS = ["parish", "deanery", "diocese"] as const;
type ParishLevel = (typeof PARISH_LEVELS)[number];
function isParishLevel(s: string): s is ParishLevel {
  return (PARISH_LEVELS as readonly string[]).includes(s);
}

function parseLocator(s: string): { worldSeed: number; node: StackNode } | null {
  // § the year in the locator: an optional `@year` on the END of the whole
  // locator, split off before anything else so every branch below sees the
  // address it always saw. Only the two node kinds that HAVE a
  // village-in-year section carry it; anywhere else it is simply ignored
  // rather than rejected, since it qualifies a view and not an address.
  const raw = s.trim().replace(/^#/, "");
  const at = raw.lastIndexOf("@");
  const yearPart = at >= 0 ? Number(raw.slice(at + 1)) : Number.NaN;
  const year = Number.isSafeInteger(yearPart) ? yearPart : undefined;
  const parts = (at >= 0 ? raw.slice(0, at) : raw).split(":");
  // § the region route: two segments is now valid — the shortest locator in
  // the app, and the top of the tree. Everything below still needs at least
  // a village.
  if (parts.length < 2 || parts.length > 5) return null;
  const worldSeed = Number(parts[0]);
  // Object.hasOwn (not a bracket-truthy check): REGIONS is a plain object
  // literal, so a region segment of "__proto__"/"constructor"/"toString"
  // etc. would otherwise resolve through the prototype chain to a truthy
  // built-in and pass validation, then crash deep inside resolveVillage
  // once something tries to read a region-shaped property off it.
  if (!Number.isSafeInteger(worldSeed) || worldSeed < 0 || !Object.hasOwn(E.REGIONS, parts[1])) return null;
  if (parts.length === 2) return { worldSeed, node: { kind: "region", regionKey: parts[1] } };
  if (parts[2] === "royal") {
    if (parts.length === 3) return { worldSeed, node: { kind: "royal", regionKey: parts[1] } };
    if (parts.length !== 4) return null;
    const reignIdx = Number(parts[3]);
    if (!Number.isSafeInteger(reignIdx) || reignIdx < 0) return null;
    return { worldSeed, node: { kind: "king", regionKey: parts[1], reignIdx } };
  }
  // § the Schism: the papal route sits where the royal one does — on the
  // REGION, not on a village — because which popes there were is shared
  // data but which of them this region obeyed is not.
  if (parts[2] === "papacy") {
    if (parts.length === 3) return { worldSeed, node: { kind: "papacy", regionKey: parts[1] } };
    if (parts.length !== 4) return null;
    const termIdx = Number(parts[3]);
    if (!Number.isSafeInteger(termIdx) || termIdx < 0) return null;
    return { worldSeed, node: { kind: "pontiff", regionKey: parts[1], termIdx } };
  }
  const villageIdx = Number(parts[2]);
  if (!Number.isSafeInteger(villageIdx) || villageIdx < 0) return null;
  // § the village route: three segments and no more is the place itself.
  if (parts.length === 3) return { worldSeed, node: { kind: "village", regionKey: parts[1], villageIdx, year } };
  if (parts.length === 5) {
    // § the pedigree: the one five-segment form whose LAST segment is the
    // word and whose fourth is the index — because it is a view of a
    // person's own record, not an index into a succession.
    if (parts[4] === "pedigree") {
      const personId = Number(parts[3]);
      if (!Number.isSafeInteger(personId) || personId < 0) return null;
      return { worldSeed, node: { kind: "pedigree", regionKey: parts[1], villageIdx, personId } };
    }
    // § the church's own line joins the two feudal lines on this form: an
    // address, a kind of succession, and an index into it.
    if (parts[3] !== "lord" && parts[3] !== "baron" && parts[3] !== "rector" && parts[3] !== "tenement") return null;
    const headIdx = Number(parts[4]);
    if (!Number.isSafeInteger(headIdx) || headIdx < 0) return null;
    return { worldSeed, node: { kind: parts[3], regionKey: parts[1], villageIdx, headIdx } };
  }
  if (parts.length !== 4) return null;
  if (parts[3] === "house") return { worldSeed, node: { kind: "house", regionKey: parts[1], villageIdx } };
  if (isParishLevel(parts[3])) return { worldSeed, node: { kind: parts[3], regionKey: parts[1], villageIdx } };
  const personId = Number(parts[3]);
  if (!Number.isSafeInteger(personId) || personId < 0) return null;
  return { worldSeed, node: { regionKey: parts[1], villageIdx, personId, year } };
}

export function initApp(): void {
  const out = document.getElementById("out") as HTMLElement;
  const seedbox = document.getElementById("seedbox") as HTMLInputElement;
  const intro = document.getElementById("intro") as HTMLElement;
  const worldseed = document.getElementById("worldseed") as HTMLElement;
  const locatorError = document.getElementById("locator-error") as HTMLElement;
  const status = document.getElementById("status") as HTMLElement;
  const replayBtn = document.getElementById("replay") as HTMLButtonElement;
  const copyBtn = document.getElementById("copylink") as HTMLButtonElement | null;
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
    if (copyBtn) {
      copyBtn.textContent = t.copyLocator;
      copyBtn.title = t.copyLocator;
    }
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
      // Region, royal line and papacy are each one page per region, and the
      // region has already been compared above.
      case "region":
      case "royal":
      case "papacy":
        return true;
      case "king":
        return (a as KingNode).reignIdx === (b as KingNode).reignIdx;
      case "pontiff":
        return (a as PontiffNode).termIdx === (b as PontiffNode).termIdx;
      case "village":
      case "parish":
      case "deanery":
      case "diocese":
      case "house":
        return (a as HouseNode).villageIdx === (b as HouseNode).villageIdx;
      case "lord":
      case "baron":
      case "rector":
      case "tenement": {
        const la = a as LordNode;
        const lb = b as LordNode;
        return la.villageIdx === lb.villageIdx && la.headIdx === lb.headIdx;
      }
      case "pedigree": {
        const pa = a as PedigreeNode;
        const pb = b as PedigreeNode;
        return pa.villageIdx === pb.villageIdx && pa.personId === pb.personId;
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
  // "papacy:region" (the popes this region obeyed), "pontiff:region:term"
  // (one of them), "house:region:village" (a manor's noble house),
  // "lord|baron:region:village:head" (a lord's page), and
  // "rector:region:village:head" (a parish incumbent's).
  function gotoNode(goto: string): StackNode {
    const parts = goto.split(":");
    if (parts[0] === "region") return { kind: "region", regionKey: parts[1] };
    if (parts[0] === "pedigree") return { kind: "pedigree", regionKey: parts[1], villageIdx: +parts[2], personId: +parts[3] };
    if (parts[0] === "royal") return { kind: "royal", regionKey: parts[1] };
    if (parts[0] === "king") return { kind: "king", regionKey: parts[1], reignIdx: +parts[2] };
    if (parts[0] === "papacy") return { kind: "papacy", regionKey: parts[1] };
    if (parts[0] === "pontiff") return { kind: "pontiff", regionKey: parts[1], termIdx: +parts[2] };
    if (parts[0] === "rector") return { kind: "rector", regionKey: parts[1], villageIdx: +parts[2], headIdx: +parts[3] };
    if (parts[0] === "tenement") return { kind: "tenement", regionKey: parts[1], villageIdx: +parts[2], headIdx: +parts[3] };
    if (parts[0] === "village") return { kind: "village", regionKey: parts[1], villageIdx: +parts[2] };
    if (isParishLevel(parts[0])) return { kind: parts[0], regionKey: parts[1], villageIdx: +parts[2] };
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

  // U1 § finding a person. The register rows already carry everything the
  // query has to match (`data-q`), so this hides and shows rows rather than
  // rebuilding the list — no engine call, no re-render, and the current
  // record keeps its highlight. A bare year works as well as a name, which
  // is the other way people actually look: "who was here in 1349".
  function bindRegisterFilter(root: ParentNode): void {
    const box = root.querySelector<HTMLInputElement>("#regq");
    const list = root.querySelector<HTMLElement>("#reglist");
    const count = root.querySelector<HTMLElement>("#regcount");
    const empty = root.querySelector<HTMLElement>("#regempty");
    if (!box || !list || !count || !empty) return;
    const rows = [...list.querySelectorAll<HTMLButtonElement>(".regrow")];
    const total = rows.length;
    const apply = (): void => {
      const q = box.value.trim().toLowerCase();
      let shown = 0;
      for (const row of rows) {
        const hit = !q || (row.dataset.q ?? "").includes(q);
        row.hidden = !hit;
        if (hit) shown++;
      }
      count.textContent = q ? UI[locale].registerFilterCount(shown, total) : "";
      empty.hidden = !q || shown > 0;
    };
    box.addEventListener("input", apply);
    apply();
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

    // U3 § keeping the keyboard's place. Replacing the whole of `out` drops
    // whatever had focus back to <body>, so a keyboard or screen-reader user
    // who followed a link landed at the top of the document and had to tab
    // through the entire chrome again to reach the record they had just
    // opened — every single time. The status announcement said the name; it
    // could not say where you now were. Moving focus to the new record's own
    // heading puts the caret where the eye already is.
    const heading = out.querySelector<HTMLElement>("h1.name");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }

    bindGoto(out);
    bindRegisterFilter(out);
    out.querySelectorAll<HTMLButtonElement>(".crumb[data-jump]").forEach((b) => {
      b.addEventListener("click", () => {
        stack = stack.slice(0, +b.dataset.jump! + 1);
        render();
      });
    });

    // village-in-year slider: re-render only the household body on input.
    // § the village route: the section now appears on two kinds of page — a
    // person's record and the village's own — so the highlighted member is
    // whoever the page is about, and on the village's page that is nobody.
    const slider = out.querySelector<HTMLInputElement>("#vyear");
    const yearOut = out.querySelector<HTMLOutputElement>("#vyearout");
    const vbody = out.querySelector<HTMLElement>("#vbody");
    const villageOf = isPersonNode(node) ? node : node.kind === "village" ? node : null;
    if (slider && yearOut && vbody && villageOf) {
      const currentId = isPersonNode(villageOf) ? villageOf.personId : -1;
      const env = E.resolveVillage(worldSeed, villageOf.regionKey, villageOf.villageIdx);
      // § population curve: the chart's own now-marker. Moved by setting two
      // attributes rather than re-rendering the figure — the curve itself
      // never changes, only where you are standing on it.
      const chart = out.querySelector<SVGSVGElement>(".popsvg");
      const nowLine = out.querySelector<SVGLineElement>("#vnow");
      let frame: number | null = null;
      const show = (year: number): void => {
        yearOut.textContent = String(year);
        // § the year in the locator: the slider IS part of the address, so
        // moving it moves the URL. replaceState rather than pushState —
        // dragging across two centuries would otherwise leave two hundred
        // history entries between you and the page you came from.
        villageOf.year = year;
        const loc = locator(worldSeed, node);
        seedbox.value = loc;
        history.replaceState(stack, "", `#${loc}`);
        if (nowLine && chart) {
          const w = chart.viewBox.baseVal.width;
          const x = String(((year - +slider.min) / (+slider.max - +slider.min)) * w);
          nowLine.setAttribute("x1", x);
          nowLine.setAttribute("x2", x);
        }
        if (frame != null) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = null;
          vbody.innerHTML = renderVillageBody(E, env, year, locale, currentId);
          bindGoto(vbody);
        });
      };
      slider.addEventListener("input", () => show(+slider.value));
      // § population curve: the curve is also the control. Dragging along it
      // reads far better than hunting for the year the trough sits in, and it
      // is how anyone who sees a graph expects to interrogate one. The slider
      // stays the keyboard-accessible path and the two are kept in step.
      if (chart) {
        const seek = (e: PointerEvent): void => {
          const r = chart.getBoundingClientRect();
          if (!r.width) return;
          const year = chartYearAt((e.clientX - r.left) / r.width);
          slider.value = String(year);
          show(year);
        };
        chart.addEventListener("pointerdown", (e) => {
          chart.setPointerCapture(e.pointerId);
          seek(e);
        });
        chart.addEventListener("pointermove", (e) => {
          if (chart.hasPointerCapture(e.pointerId)) seek(e);
        });
        chart.addEventListener("pointerup", (e) => chart.releasePointerCapture(e.pointerId));
      }
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
    if (isPersonNode(parsed.node) || parsed.node.kind === "pedigree") {
      const env = E.resolveVillage(parsed.worldSeed, parsed.node.regionKey, parsed.node.villageIdx);
      if (!env.persons[parsed.node.personId]) return invalid();
    } else if (parsed.node.kind === "king") {
      if (!E.royalLineOf(parsed.node.regionKey)?.reigns[parsed.node.reignIdx]) return invalid();
    } else if (parsed.node.kind === "pontiff") {
      if (!E.papalSeriesOf(parsed.node.regionKey)[parsed.node.termIdx]) return invalid();
    } else if (parsed.node.kind === "tenement") {
      if (!E.tenementsOf(parsed.worldSeed, parsed.node.regionKey, parsed.node.villageIdx)[parsed.node.headIdx]) return invalid();
    } else if (parsed.node.kind === "rector") {
      if (!E.parishClergyOf(parsed.worldSeed, parsed.node.regionKey, parsed.node.villageIdx).heads[parsed.node.headIdx]) return invalid();
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

  // U4 § the locator is the record. The box has always held the permanent
  // URL of whatever you are looking at, and there was no way to take it
  // except selecting the text by hand — which is a poor showing for an app
  // whose central promise is that the address IS the life.
  copyBtn?.addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}#${seedbox.value}`;
    void navigator.clipboard?.writeText(url).then(
      () => {
        copyBtn.textContent = UI[locale].copyLocatorDone;
        status.textContent = UI[locale].copyLocatorDone;
        setTimeout(() => {
          copyBtn.textContent = UI[locale].copyLocator;
        }, 1600);
      },
      () => {
        // No clipboard permission (or no clipboard at all): fall back to
        // selecting the locator so it can still be copied by hand.
        seedbox.focus();
        seedbox.select();
      },
    );
  });

  // U5 § the roll can block. randomCitizen may solve up to twenty villages
  // before it finds a native-born person, and a cold solve is ~30ms — so a
  // roll is usually instant and occasionally takes half a second of blocked
  // main thread with nothing on screen to say so. Disabling the button for
  // the duration is honest and costs nothing; the yield before the work lets
  // the disabled state actually paint first.
  function rollWithFeedback(fn: () => void): void {
    rollBtn.disabled = true;
    newWorldBtn.disabled = true;
    requestAnimationFrame(() => {
      try {
        fn();
      } finally {
        rollBtn.disabled = false;
        newWorldBtn.disabled = false;
      }
    });
  }

  rollBtn.addEventListener("click", () => rollWithFeedback(() => roll()));
  newWorldBtn.addEventListener("click", () => rollWithFeedback(newWorld));
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
