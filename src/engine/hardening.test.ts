// § hardening: the envelope cache is bounded with an explicit clear API,
// truncation of the matching rounds is diagnosed rather than silent, and
// core invariants hold across many seeds and addresses (property-style).
import { describe, expect, it } from "vitest";
import { REGIONS } from "./data/regions.js";
import { makeRng } from "./hash.js";
import type { Person } from "./types.js";
import { clearEnvelopeCache, ENVELOPE_CACHE_LIMIT, envelopeCacheSize, MATCH_ROUND_LIMIT, resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("envelope cache", () => {
  it("never grows past ENVELOPE_CACHE_LIMIT, however many addresses are browsed", () => {
    clearEnvelopeCache();
    for (let i = 0; i < ENVELOPE_CACHE_LIMIT + 40; i++) {
      resolveVillage(99, "england", i * 7); // spread across clusters
      expect(envelopeCacheSize()).toBeLessThanOrEqual(ENVELOPE_CACHE_LIMIT);
    }
  });

  it("clearEnvelopeCache empties it, and a re-solve reproduces identical facts", () => {
    const before = resolveVillage(99, "france", 11);
    const strip = (p: Person) => ({ ...p, origin: p.origin ? { ...p.origin } : p.origin });
    const facts = before.persons.map(strip);
    clearEnvelopeCache();
    expect(envelopeCacheSize()).toBe(0);
    const after = resolveVillage(99, "france", 11);
    expect(after).not.toBe(before); // genuinely re-solved…
    expect(after.persons.map(strip)).toEqual(facts); // …to the same envelope
    expect(after.couples).toEqual(before.couples);
    expect(after.diagnostics).toEqual(before.diagnostics);
  });

  it("keeps recently used envelopes cached (LRU identity)", () => {
    clearEnvelopeCache();
    const a = resolveVillage(99, "england", 1);
    for (let i = 0; i < ENVELOPE_CACHE_LIMIT - 5; i++) {
      resolveVillage(99, "germany", i * 6); // fill, but not past a's slot
      resolveVillage(99, "england", 1); // keep touching a
    }
    expect(resolveVillage(99, "england", 1)).toBe(a);
  });
});

describe("generation diagnostics & property tests across many seeds/addresses", () => {
  // deterministic pseudo-random sample of (seed, region, villageIdx) triples
  const sampler = makeRng(0xc0ffee);
  const cases: [number, string, number][] = [];
  for (let i = 0; i < 60; i++) {
    cases.push([sampler.int(1, 1_000_000), REGION_KEYS[sampler.int(0, REGION_KEYS.length - 1)], sampler.int(0, 5000)]);
  }

  it("matching never truncates a lineage silently, and rounds stay well under the guard", () => {
    for (const [seed, regionKey, villageIdx] of cases) {
      const env = resolveVillage(seed, regionKey, villageIdx);
      expect(env.diagnostics.truncated).toBe(false);
      expect(env.diagnostics.unmatched).toBe(0);
      expect(env.diagnostics.matchingRounds).toBeGreaterThan(0);
      expect(env.diagnostics.matchingRounds).toBeLessThan(MATCH_ROUND_LIMIT);
    }
  });

  it("core envelope invariants hold for every sampled world", () => {
    for (const [seed, regionKey, villageIdx] of cases) {
      const env = resolveVillage(seed, regionKey, villageIdx);
      expect(env.persons.length).toBeGreaterThan(30); // a village, not a hamlet of ghosts
      expect(env.persons.length).toBeLessThan(4000); // and bounded
      env.persons.forEach((p, i) => {
        expect(p.id).toBe(i);
        expect(Number.isFinite(p.birth)).toBe(true);
        expect(p.death.age).toBe(p.death.year - p.birth);
        expect(p.death.year).toBeGreaterThanOrEqual(p.birth);
      });
      for (let ci = 0; ci < env.couples.length; ci++) {
        const c = env.couples[ci];
        expect(env.persons[c.husband].unions).toContain(ci);
        expect(env.persons[c.wife].unions).toContain(ci);
        for (const cid of c.children) {
          expect(env.persons[cid].father).toBe(c.husband);
          expect(env.persons[cid].mother).toBe(c.wife);
        }
      }
    }
  });
});
