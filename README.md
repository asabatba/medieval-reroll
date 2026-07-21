# Medieval Reroll

A deterministic history engine: resolve a whole medieval village's genealogy from a single address, then browse any life in it. No simulation loop — every fact is computed directly from `(world seed, region, village index, person id)`, the same address always resolving to the same life, the same way a page of the Library of Babel always holds the same text.

Live behind a CapRover deploy (`Dockerfile` / `nginx.conf`); no public URL is checked into this repo.

## Running it

```
pnpm install
pnpm dev        # local dev server
pnpm build      # typecheck + production build to dist/
pnpm test       # vitest
pnpm typecheck  # tsc --noEmit
pnpm lint       # biome
pnpm check      # biome, writing fixes
```

## Architecture

See the header comment in [src/engine/index.ts](src/engine/index.ts) for the full picture. In short:

- **Tier 1 — `resolveVillage()`** ([src/engine/village.ts](src/engine/village.ts)): one pure constraint solve per village address. Fixes the entire genealogy — households, births, deaths (with causes), marriage matching, migration. All *relational* facts (who's whose spouse/sibling/parent) live here, so they're symmetric by construction. Cached, but the cache is an optimization, not a correctness requirement: re-solving an address always reproduces the identical envelope.
- **Tier 2 — `decodePerson()`** ([src/engine/biography.ts](src/engine/biography.ts)): O(1) per-person decode. Reads relational facts from the envelope and decorates them with narrative — occupation, texture events, world events — decoded from the person's own address hash. Never invents a relational fact; locale only changes which pre-written text is picked, never which template/roll.
- **`src/engine/data/`** holds the historical grounding: regions, demography (life tables, marriage ages, mobility rates), plagues, jurisdictions, place names, narrative templates, social classes, royal lines.
- **Nobility (§ nobility)** ([src/engine/nobility.ts](src/engine/nobility.ts)): kings are *data*, not dice — `sovereignAt(region, year)` looks up the real sovereign lines in [src/engine/data/nobility.ts](src/engine/data/nobility.ts) (Plantagenet→Tudor, Capet→Valois, the count-kings of Aragon with the 1410–12 Interregnum, the Emperors, Florence's republic and the Medici). Noble houses are *generated*: each honour has a baronial house and each manor a lord line (`lordOfManorAt`), pure functions of the address like `parishOf`/`manorOf`, with contiguous successions across the whole register era. The manor line is anchored so its 1360 head is exactly the static `fief.lord` name; biographies cite the lord holding *in the event's year* (wardship, merchet), narrate changes of lord, and pick up royal accession news derived from the reign data.
- **`src/ui/`** is a small hash-routed vanilla-TS front end; `src/i18n/` holds the (English/Catalan) UI strings and locale persistence. Besides person records (`#seed:region:village:person`), two nobility views have fixed URLs of their own: `#seed:region:royal` (the royal line) and `#seed:region:village:house` (a manor's noble house). Everything the UI names should be a link: kings and lords mentioned in chronicle prose link to those views through the same `EventRef` mechanism that links people.

## Adding a region

Regions are the main axis of expansion. To add one:

1. Add an entry to `REGIONS` in [src/engine/data/regions.ts](src/engine/data/regions.ts) — names, surnames, place-name components, marriage-age windows, famine/war years, inheritance custom (`impartible`/`partible`).
2. Add a matching entry to `DEMOGRAPHY` in [src/engine/data/demography.ts](src/engine/data/demography.ts) (or rely on `DEFAULT_DEMOGRAPHY`).
3. Add jurisdiction/fief naming data in [src/engine/data/jurisdictions.ts](src/engine/data/jurisdictions.ts).
4. Add the region's real royal line to `ROYAL_LINES` in [src/engine/data/nobility.ts](src/engine/data/nobility.ts) — reigns must cover 1235–1500 with no gaps (interregna are explicit entries); notable transitions can carry a hand-written `accession` text.
5. A handful of narrative templates in [src/engine/data/narrative.ts](src/engine/data/narrative.ts) are region-gated (`englandM`, region-name checks); add region-specific texture there if it's warranted, but most templates are shared across all regions by default.

`regionRank`/`REGION_ORDER` ([src/engine/rank.ts](src/engine/rank.ts)) is derived from `Object.keys(REGIONS)`, so a new region automatically slots in as the highest-ranked (only relevant to which regions can pull long-distance migrants from which).

## Testing conventions

Tests scan real `resolveVillage()` output for the scenario under test rather than hand-building `Envelope`/`Person` fixtures — see `succession.test.ts` or `lineage.test.ts` for the pattern. This keeps tests honest about what the engine can actually produce.
