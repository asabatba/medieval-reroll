import { describe, expect, it } from "vitest";
import { placeOf, placeShortOf } from "./placeNames.js";
import { REGIONS } from "./regions.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("placeOf / placeShortOf", () => {
  it("returns the curated hand-written entry verbatim for villageIdx below the curated count", () => {
    for (const regionKey of REGION_KEYS) {
      const region = REGIONS[regionKey];
      for (let villageIdx = 0; villageIdx < region.places.length; villageIdx++) {
        expect(placeOf(1444, regionKey, villageIdx)).toEqual(region.places[villageIdx]);
      }
    }
  });

  it("generates a stable, deterministic name past the curated range", () => {
    for (const regionKey of REGION_KEYS) {
      const region = REGIONS[regionKey];
      const idx = region.places.length + 7;
      const a = placeOf(1444, regionKey, idx);
      const b = placeOf(1444, regionKey, idx);
      expect(a).toEqual(b);
      expect(a.en.length).toBeGreaterThan(0);
      expect(a.ca.length).toBeGreaterThan(0);
    }
  });

  it("produces real variety past the curated range — not the same handful of names on repeat", () => {
    for (const regionKey of REGION_KEYS) {
      const region = REGIONS[regionKey];
      const names = new Set<string>();
      for (let villageIdx = region.places.length; villageIdx < region.places.length + 60; villageIdx++) {
        names.add(placeOf(1444, regionKey, villageIdx).en);
      }
      // 60 draws should turn up well over a dozen distinct combinations given the pool sizes.
      expect(names.size).toBeGreaterThan(15);
    }
  });

  it("different world seeds generate different names for the same generated address", () => {
    const region = REGIONS.england;
    const idx = region.places.length + 3;
    const a = placeOf(1, "england", idx);
    const b = placeOf(2, "england", idx);
    expect(a.en).not.toBe(b.en);
  });

  it("placeShortOf's bare name is a substring of placeOf's full sentence, for both curated and generated villages", () => {
    for (const regionKey of REGION_KEYS) {
      const region = REGIONS[regionKey];
      const idxs = [0, region.places.length, region.places.length + 12];
      for (const villageIdx of idxs) {
        const full = placeOf(1444, regionKey, villageIdx);
        const short = placeShortOf(1444, regionKey, villageIdx);
        expect(full.en).toContain(short);
      }
    }
  });
});
