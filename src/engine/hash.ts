import type { Rng } from "./types.js";

// ---------- hashing & rng ----------
export function mix(h: number, v: number): number {
  h = Math.imul(h ^ v, 2654435761);
  return ((h << 13) | (h >>> 19)) >>> 0;
}

export function hashStr(h: number, s: string): number {
  for (let i = 0; i < s.length; i++) h = mix(h, s.charCodeAt(i));
  return h >>> 0;
}

// addr_hash: depends on parent hash + local segment (spec §2)
export function addrHash(worldSeed: number, segments: readonly (string | number)[]): number {
  let h = mix(0x9e3779b9, worldSeed >>> 0);
  for (const seg of segments) h = typeof seg === "number" ? mix(h, seg) : hashStr(h, String(seg));
  return h >>> 0;
}

// § RNG stream hygiene: village.ts seeds many independent per-person streams
// off the same vHash, namespaced by adding a constant to the person id
// (mix(vHash, 7001 + id)). That's an arithmetic collision waiting to happen —
// person 1000's death stream (7001+1000=8001) lands on the exact same seed
// as person 0's riskTrade stream (8001+0=8001) the moment a village crosses
// ~1000 persons, which the hardening tests allow. Mixing the namespace INTO
// the hash instead of adding it keeps every (namespace, id) pair on its own
// stream regardless of population size.
export function personStream(vHash: number, namespace: number, id: number): number {
  return mix(vHash, mix(namespace, id));
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const r = (() => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.weighted = (pairs) => {
    let total = 0;
    for (const p of pairs) total += p[1];
    let x = r() * total;
    for (const p of pairs) {
      x -= p[1];
      if (x <= 0) return p[0];
    }
    return pairs[pairs.length - 1][0];
  };
  return r;
}
