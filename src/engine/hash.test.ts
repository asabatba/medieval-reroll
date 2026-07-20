import { describe, expect, it } from "vitest";
import { addrHash, hashStr, makeRng, mix } from "./hash.js";

describe("hash primitives", () => {
  it("mix is deterministic for the same inputs", () => {
    expect(mix(123, 456)).toBe(mix(123, 456));
  });

  it("mix is sensitive to both operands", () => {
    expect(mix(123, 456)).not.toBe(mix(123, 457));
    expect(mix(123, 456)).not.toBe(mix(124, 456));
  });

  it("addrHash is deterministic and segment-order-sensitive", () => {
    expect(addrHash(7, ["england", "village", 3])).toBe(addrHash(7, ["england", "village", 3]));
    expect(addrHash(7, ["england", "village", 3])).not.toBe(addrHash(7, ["village", "england", 3]));
    expect(addrHash(7, ["england", "village", 3])).not.toBe(addrHash(8, ["england", "village", 3]));
  });

  it("hashStr differs for different strings", () => {
    expect(hashStr(0, "Elmleigh")).not.toBe(hashStr(0, "Elton"));
  });
});

describe("makeRng", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = makeRng(999);
    const b = makeRng(999);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("stays within documented ranges", () => {
    const rng = makeRng(42);
    for (let i = 0; i < 500; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = rng.int(5, 10);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(10);
    }
  });

  it("weighted respects zero-weight exclusion and always returns a listed value", () => {
    const rng = makeRng(1234);
    const pairs: [string, number][] = [
      ["a", 1],
      ["b", 0],
      ["c", 3],
    ];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(rng.weighted(pairs));
    expect(seen.has("b")).toBe(false);
    for (const v of seen) expect(["a", "c"]).toContain(v);
  });
});
