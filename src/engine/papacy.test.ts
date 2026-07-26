// § the Schism. The papal series is the only lookup in the engine whose
// ANSWER depends on the region while its underlying data is shared, so the
// tests that matter are the ones that pin that down: the same year, two
// regions, two different popes — and no leakage of one realm's obedience
// into another's chronicle.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { OBEDIENCE, PAPAL_LINES } from "./data/papacy.js";
import { REGIONS } from "./data/regions.js";
import { JUBILEES, obedienceAt, PAPACY_FROM, PAPACY_TO, papalSeriesOf, papalWorldEvents, popeAt, popeIndexAt, popeTermAt } from "./papacy.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("§ the Schism: the papal series", () => {
  it("covers the whole register era with no gap and no overlap, in every region", () => {
    for (const rk of REGION_KEYS) {
      const series = papalSeriesOf(rk);
      expect(series.length, rk).toBeGreaterThan(20);
      expect(series[0].from, rk).toBe(PAPACY_FROM);
      expect(series[series.length - 1].to, rk).toBe(PAPACY_TO);
      for (let i = 1; i < series.length; i++) {
        expect(series[i].from, `${rk} term ${i}`).toBe(series[i - 1].to + 1);
        expect(series[i].to, `${rk} term ${i}`).toBeGreaterThanOrEqual(series[i].from);
      }
    }
  });

  it("resolves the real popes: a lookup, never a roll", () => {
    // Undivided line, before and after the Schism — every region agrees.
    for (const rk of REGION_KEYS) {
      expect(popeAt(rk, 1300)?.name.en, rk).toBe("Boniface VIII");
      expect(popeAt(rk, 1350)?.name.en, rk).toBe("Clement VI");
      expect(popeAt(rk, 1425)?.name.en, rk).toBe("Martin V");
      expect(popeAt(rk, 1490)?.name.en, rk).toBe("Innocent VIII");
    }
    // The Avignon RESIDENCE is not the Schism: one pope, sitting elsewhere.
    expect(popeAt("england", 1340)?.seat).toBe("avignon");
    expect(popeAt("england", 1340)?.line).toBe("roman");
  });

  it("splits the Church between 1378 and 1417, region by region", () => {
    expect(popeAt("england", 1400)?.name.en).toBe("Boniface IX");
    expect(popeAt("italy", 1400)?.name.en).toBe("Boniface IX");
    expect(popeAt("germany", 1400)?.name.en).toBe("Boniface IX");
    expect(popeAt("catalonia", 1400)?.name.en).toBe("Benedict XIII");
    expect(popeAt("castile", 1400)?.name.en).toBe("Benedict XIII");
    expect(popeAt("scotland", 1400)?.name.en).toBe("Benedict XIII");
    // Two realms, one year, two popes — each certain the other's was none.
    expect(popeAt("england", 1400)?.line).not.toBe(popeAt("scotland", 1400)?.line);
  });

  it("records the realms that obeyed nobody at all", () => {
    // France's subtraction of obedience, 1398–1402.
    expect(obedienceAt("france", 1400)).toBeNull();
    expect(popeAt("france", 1400)).toBeNull();
    expect(popeTermAt("france", 1400)?.kind).toBe("noObedience");
    // And it is a real term with a page, not a hole in the series.
    expect(popeIndexAt("france", 1400)).toBeGreaterThanOrEqual(0);
    // Aragon had not yet declared for either claimant in 1382.
    expect(popeTermAt("catalonia", 1382)?.kind).toBe("noObedience");
    // Castile had, by 1382.
    expect(popeAt("castile", 1382)?.name.en).toBe("Clement VII");
  });

  it("follows the Pisan line only where a realm actually went over to it", () => {
    expect(popeAt("england", 1412)?.name.en).toBe("John XXIII");
    expect(popeAt("england", 1412)?.line).toBe("pisan");
    // Scotland held to Benedict XIII past Constance; Aragon left him in 1416.
    expect(popeAt("scotland", 1412)?.name.en).toBe("Benedict XIII");
    expect(popeAt("scotland", 1417)?.name.en).toBe("Benedict XIII");
    expect(popeAt("catalonia", 1417)?.name.en).toBe("Martin V");
  });

  it("puts Portugal on the other side of Aljubarrota from where it started", () => {
    expect(popeAt("portugal", 1382)?.line).toBe("avignon");
    expect(popeAt("portugal", 1390)?.line).toBe("roman");
  });

  it("indexes each year to the term that contains it", () => {
    for (const rk of REGION_KEYS) {
      for (let y = PAPACY_FROM; y <= PAPACY_TO; y += 7) {
        const i = popeIndexAt(rk, y);
        expect(i, `${rk} ${y}`).toBeGreaterThanOrEqual(0);
        const term = papalSeriesOf(rk)[i];
        expect(term.from <= y && y <= term.to, `${rk} ${y}`).toBe(true);
      }
    }
  });

  it("only ever names pontificates that exist in the data", () => {
    const known = new Set(Object.values(PAPAL_LINES).flatMap((l) => l.map((p) => p.name.en)));
    for (const rk of REGION_KEYS) for (const term of papalSeriesOf(rk)) if (term.pope) expect(known, rk).toContain(term.pope.name.en);
  });

  it("keeps the obedience table pointed at real regions and inside the Schism years", () => {
    for (const [rk, spans] of Object.entries(OBEDIENCE)) {
      expect(REGION_KEYS, rk).toContain(rk);
      for (const [from, to] of spans) {
        expect(from, rk).toBeGreaterThanOrEqual(1378);
        expect(to, rk).toBeLessThanOrEqual(1418);
        expect(to, rk).toBeGreaterThanOrEqual(from);
      }
    }
  });
});

describe("§ the Schism: papal news", () => {
  it("gates every transition to its own region and to the register era", () => {
    for (const w of papalWorldEvents("en")) {
      expect(w[0]).toBeGreaterThanOrEqual(1292);
      expect(w[1]).toBeLessThanOrEqual(1495);
      if (w[2]) for (const rk of w[2]) expect(REGION_KEYS).toContain(rk);
    }
    // Jubilees are the ungated ones: Rome kept those for the whole Church.
    const ungated = papalWorldEvents("en").filter((w) => w[2] === null);
    expect(ungated.length).toBe(JUBILEES.filter((y) => y >= 1292 && y <= 1495).length);
  });

  it("narrates both locales for every transition", () => {
    const en = papalWorldEvents("en");
    const ca = papalWorldEvents("ca");
    expect(ca.length).toBe(en.length);
    for (let i = 0; i < en.length; i++) {
      expect(en[i][0]).toBe(ca[i][0]);
      expect(en[i][7]({} as never, "ca").length).toBeGreaterThan(20);
    }
  });

  it("never puts one realm's obedience in another realm's chronicle", () => {
    // An English parish obeyed Rome throughout the Schism, so its chronicle
    // may hear that there ARE two popes — it must never be told the realm
    // now obeys the Avignon claimant.
    for (let idx = 0; idx < 4; idx++) {
      const env = resolveVillage(1444, "england", idx);
      for (const p of env.persons) {
        const bio = decodePerson(env, p.id, "en");
        for (const e of bio?.events ?? []) {
          expect(e.text).not.toContain("would henceforth obey Pope Clement VII");
          expect(e.text).not.toContain("would henceforth obey Pope Benedict XIII");
        }
      }
    }
  });

  it("resolves a papal name link to a term the region's own series really holds", () => {
    let seen = 0;
    for (const rk of ["england", "catalonia", "scotland"]) {
      const env = resolveVillage(1444, rk, 1);
      const series = papalSeriesOf(rk);
      for (const p of env.persons.slice(0, 120)) {
        const bio = decodePerson(env, p.id, "en");
        for (const e of bio?.events ?? []) {
          for (const r of e.refs ?? []) {
            if (r.route !== "pope") continue;
            seen++;
            expect(e.text).toContain(r.name);
            expect(series[r.routeIdx!], `${rk}: ${r.name}`).toBeDefined();
            expect(series[r.routeIdx!].pope, `${rk}: ${r.name}`).not.toBeNull();
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
