import { REGIONS } from "./data/regions.js";
import { resolveVillage } from "./village.js";
import type { Envelope, PersonAddress, RosterRow } from "./types.js";

export function roster(env: Envelope): RosterRow[] {
  return env.persons.map(p => ({
    id: p.id, name: p.name, surname: p.surname, sex: p.sex, birth: p.birth, death: p.death, cls: p.cls,
    incomer: !!p.incomer, founder: !!p.founder,
    emigrated: !!p.emigrated, longDistance: !!p.longDistance
  }));
}

// pick region, village, then a person born 1300–1470 who is native-born
export function randomCitizen(worldSeed: number, rand: () => number): PersonAddress {
  const keys = Object.keys(REGIONS);
  for (let tries = 0; tries < 20; tries++) {
    const regionKey = keys[Math.floor(rand() * keys.length)];
    const villageIdx = Math.floor(rand() * 4096);
    const env = resolveVillage(worldSeed, regionKey, villageIdx);
    const pool = env.persons.filter(p => !p.founder && !p.incomer && p.birth >= 1300 && p.birth <= 1470);
    if (pool.length) return { regionKey, villageIdx, personId: pool[Math.floor(rand() * pool.length)].id };
  }
  return { regionKey: "england", villageIdx: 0, personId: 0 };
}
