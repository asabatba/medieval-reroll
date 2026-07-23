// =====================================================================
// § nobility links: see the call site in decodePerson (biography.ts). Kept
// as a plain module function — it reads only ROYAL_LINES data, never the
// rng — so it carries no determinism risk regardless of which file it
// lives in, only its call order relative to decodePerson's other rng-
// bearing steps (unchanged by this split).
//
// Every sovereign named ANYWHERE in the chronicle — accession news, war
// names, whatever prose mentions a king — links to the region's royal
// line. Candidates are the reigns' styles, names, and akas; all of them
// lead to the same royal-line view, so an ambiguous "King Henry" can
// never link wrongly. Longest-match-first in the UI's linkify keeps a
// person ref ("Lorenzo di Nardo") beating a shorter royal candidate at
// the same position.
// =====================================================================
import type { Locale } from "../i18n/locale.js";
import { royalLineOf } from "./nobility.js";
import type { Address, BioEvent, EventRef } from "./types.js";

export function addRoyalRefs(events: BioEvent[], regionKey: string, locale: Locale, addr: Address): void {
  const line = royalLineOf(regionKey);
  if (!line) return;
  const owners = new Map<string, number[]>();
  const claim = (s: string, i: number) => {
    const list = owners.get(s) ?? [];
    list.push(i);
    owners.set(s, list);
  };
  line.reigns.forEach((r, i) => {
    claim(r.style[locale], i);
    claim(r.name[locale], i);
    for (const aka of r.aka ?? []) claim(aka[locale], i);
  });
  const answersTo = (i: number, s: string) =>
    line.reigns[i].style[locale].includes(s) || line.reigns[i].name[locale].includes(s) || (line.reigns[i].aka ?? []).some((a) => a[locale] === s);
  for (const e of events) {
    const extra: EventRef[] = [];
    for (const [name, claimants] of owners) {
      if (!e.text.includes(name)) continue;
      let idx = -1;
      // Last match wins, so on a transition year the incoming reign takes
      // the alias — the same tie-break as sovereignAt.
      for (let i = 0; i < line.reigns.length; i++) if (line.reigns[i].from <= e.year && e.year <= line.reigns[i].to && answersTo(i, name)) idx = i;
      if (idx < 0) idx = claimants.find((i) => line.reigns[i].from <= e.year && e.year <= line.reigns[i].to) ?? -1;
      if (idx < 0)
        idx = claimants.reduce((best, i) => (Math.abs(line.reigns[i].from - e.year) < Math.abs(line.reigns[best].from - e.year) ? i : best), claimants[0]);
      extra.push({ id: -1, name, addr, route: "royal", routeIdx: idx });
    }
    if (extra.length) e.refs = [...(e.refs ?? []), ...extra];
  }
}
