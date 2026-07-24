// =====================================================================
// Noble-line LRU cache (§ hardening), same shape as villageCache.ts: a
// bounded cache, not an unbounded map. honourLineOf/manorLineOf each run a
// bounded but non-trivial growLine() simulation (up to 40 successive heads,
// several weighted rng draws per head), and a single record page calls the
// same (worldSeed, regionKey, villageIdx) line several times across
// biography.ts and render.ts. Eviction is safe because both functions are
// pure — nobility.test.ts's determinism check proves a re-solve reproduces
// the identical line.
// =====================================================================
import type { NobleLine } from "./types.js";

export const NOBLE_LINE_CACHE_LIMIT = 2048;
const _cache = new Map<string, NobleLine>();

export function nobleLineCacheGet(key: string): NobleLine | undefined {
  const cached = _cache.get(key);
  if (cached) {
    // refresh recency (Map iteration order is insertion order)
    _cache.delete(key);
    _cache.set(key, cached);
  }
  return cached;
}

export function nobleLineCacheSet(key: string, line: NobleLine): void {
  _cache.set(key, line);
  while (_cache.size > NOBLE_LINE_CACHE_LIMIT) {
    const oldest = _cache.keys().next().value;
    if (oldest === undefined) break;
    _cache.delete(oldest);
  }
}

export function nobleLineCacheClear(): void {
  _cache.clear();
}

export function nobleLineCacheSize(): number {
  return _cache.size;
}
