// =====================================================================
// Envelope LRU cache, split out of village.ts (§ hardening): a bounded
// cache, not an unbounded map — a long-running session that browses
// thousands of addresses stays flat in memory. Eviction is safe because
// solves are pure: a re-solve reproduces the identical envelope
// (village.test.ts proves it). Pure key/value bookkeeping, no RNG, so it
// carries no determinism risk regardless of which file it lives in.
// =====================================================================
import type { Envelope } from "./types.js";

export const ENVELOPE_CACHE_LIMIT = 1024;
const _cache = new Map<string, Envelope>();

export function cacheGet(key: string): Envelope | undefined {
  const cached = _cache.get(key);
  if (cached) {
    // refresh recency (Map iteration order is insertion order)
    _cache.delete(key);
    _cache.set(key, cached);
  }
  return cached;
}

export function cacheSet(key: string, env: Envelope): void {
  _cache.set(key, env);
  while (_cache.size > ENVELOPE_CACHE_LIMIT) {
    const oldest = _cache.keys().next().value;
    if (oldest === undefined) break;
    _cache.delete(oldest);
  }
}

export function cacheClear(): void {
  _cache.clear();
}

export function cacheSize(): number {
  return _cache.size;
}
