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
    //
    // Raised again with § the preventive check (engine/capacity.ts): villages
    // no longer dwindle away over the register era, so a single envelope now
    // holds roughly three times the people it used to (~600 against ~210),
    // and every test that scans one costs proportionally more.
    testTimeout: 60000,
  },
});
