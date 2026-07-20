// § pure decode: decodePerson must be a read-only function of
// (envelope, id, locale). These tests prove repeated decoding — in both
// locales, in different orders — leaves the envelope deeply unchanged and
// returns identical biographies every time.
import { describe, expect, it } from "vitest";
import { decodePerson } from "./biography.js";
import { REGIONS } from "./data/regions.js";
import { resolveVillage } from "./village.js";

const REGION_KEYS = Object.keys(REGIONS);

describe("decodePerson purity", () => {
  it("decoding every person, in every locale, forwards and backwards, leaves the envelope deeply unchanged", () => {
    for (const regionKey of REGION_KEYS) {
      const env = resolveVillage(777, regionKey, 4);
      const before = structuredClone(env);
      // forward in English, backward in Catalan, then forward in Catalan again
      for (const p of env.persons) decodePerson(env, p.id, "en");
      for (let i = env.persons.length - 1; i >= 0; i--) decodePerson(env, i, "ca");
      for (const p of env.persons) decodePerson(env, p.id, "ca");
      expect(env).toEqual(before);
    }
  });

  it("decoding is idempotent: the same (envelope, id, locale) yields deep-equal bios regardless of what was decoded before", () => {
    const env = resolveVillage(777, "england", 4);
    // first decode of everyone in en — this is the state an app reaches after browsing
    const first = env.persons.map((p) => decodePerson(env, p.id, "en"));
    // decode everyone in ca in between, then decode en again
    for (const p of env.persons) decodePerson(env, p.id, "ca");
    const second = env.persons.map((p) => decodePerson(env, p.id, "en"));
    expect(second).toEqual(first);
  });

  it("locale order does not leak into derived facts (literate/occupation live on the Bio, not the Person)", () => {
    const envA = resolveVillage(778, "germany", 2);
    for (const p of envA.persons) {
      const enFirst = decodePerson(envA, p.id, "en")!;
      const caAfter = decodePerson(envA, p.id, "ca")!;
      const enAgain = decodePerson(envA, p.id, "en")!;
      expect(enAgain.literate).toBe(enFirst.literate);
      expect(enAgain.occupation).toBe(enFirst.occupation);
      expect(caAfter.literate).toBe(enFirst.literate); // same underlying draw, only text differs
      expect((p as unknown as Record<string, unknown>).literate).toBeUndefined();
      expect((p as unknown as Record<string, unknown>).occupation).toBeUndefined();
    }
  });
});
