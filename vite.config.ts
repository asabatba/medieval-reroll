import { defineConfig } from "vitest/config";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    // Many tests loop over every REGIONS key (§ Adding a region) doing a full
    // resolveVillage()/decodePerson() scan — cost grows with the region
    // count, so the vitest default (5000ms) needs headroom past today's set.
    testTimeout: 10000,
  },
});
