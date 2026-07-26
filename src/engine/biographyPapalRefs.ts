// =====================================================================
// § the Schism, links: the same move biographyRoyalRefs.ts makes for
// kings, for popes — every pontiff named anywhere in the chronicle links
// to his own page in the region's papal series (papacy.ts).
//
// It differs from the royal case in one way that matters. A region's
// royal line is its own; a region's PAPAL line is a view of shared data
// through that region's obedience, so the same name resolves to a
// different index in England's series than in Castile's, and a pope one
// region obeyed may not appear in the other's series at all. Resolving
// against papalSeriesOf(regionKey) rather than against the pontificate
// data is what keeps a link from ever opening a page the region's own
// history does not contain.
//
// Reads only data, never the rng — so, like addRoyalRefs, it carries no
// determinism risk wherever it is called from.
// =====================================================================
import type { Locale } from "../i18n/locale.js";
import { papalSeriesOf } from "./papacy.js";
import type { Address, BioEvent, EventRef } from "./types.js";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function addPapalRefs(events: BioEvent[], regionKey: string, locale: Locale, addr: Address): void {
  const series = papalSeriesOf(regionKey);
  const owners = new Map<string, number[]>();
  const claim = (s: string, i: number) => {
    if (!s) return;
    const list = owners.get(s) ?? [];
    list.push(i);
    owners.set(s, list);
  };
  series.forEach((term, i) => {
    if (!term.pope) return;
    claim(term.pope.style[locale], i);
    claim(term.pope.name[locale], i);
  });
  const ownerNames = [...owners.keys()];
  if (!ownerNames.length) return;
  // Longest first, so "Pope Benedict XIII" is claimed whole rather than
  // matched as the bare "Benedict XIII" sitting inside it.
  ownerNames.sort((a, b) => b.length - a.length);
  const scanner = new RegExp(ownerNames.map(escapeRegExp).join("|"), "g");

  for (const e of events) {
    scanner.lastIndex = 0;
    const mentioned = new Set<string>();
    let m: RegExpExecArray | null = scanner.exec(e.text);
    while (m) {
      mentioned.add(m[0]);
      m = scanner.exec(e.text);
    }
    if (!mentioned.size) continue;
    const extra: EventRef[] = [];
    for (const name of mentioned) {
      const claimants = owners.get(name);
      if (!claimants) continue;
      // The term actually running in the event's year wins — which is what
      // makes a mention of "the pope" in a Schism year resolve to the one
      // THIS region was obeying.
      let idx = claimants.find((i) => series[i].from <= e.year && e.year <= series[i].to) ?? -1;
      if (idx < 0) idx = claimants.reduce((best, i) => (Math.abs(series[i].from - e.year) < Math.abs(series[best].from - e.year) ? i : best), claimants[0]);
      extra.push({ id: -1, name, addr, route: "pope", routeIdx: idx });
    }
    if (extra.length) e.refs = [...(e.refs ?? []), ...extra];
  }
}
