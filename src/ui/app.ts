import * as E from "../engine/index.js";
import { buildRecordHTML, locator, type StackNode } from "./render.js";

export function initApp(): void {
  const out = document.getElementById("out") as HTMLElement;
  const seedbox = document.getElementById("seedbox") as HTMLInputElement;

  let worldSeed = 1444;
  let stack: StackNode[] = [];

  function render(): void {
    const html = buildRecordHTML(E, worldSeed, stack);
    const node = stack[stack.length - 1];
    seedbox.value = locator(worldSeed, node);

    out.innerHTML = html;
    window.scrollTo(0, 0);

    out.querySelectorAll<HTMLButtonElement>("[data-goto]").forEach(b => b.addEventListener("click", () => {
      const [rk, vi, pid] = b.dataset.goto!.split(":");
      const addr: StackNode = { regionKey: rk, villageIdx: +vi, personId: +pid };
      // walking back to the previous crumb pops instead of pushing
      const prev = stack[stack.length - 2];
      if (prev && prev.regionKey === addr.regionKey && prev.villageIdx === addr.villageIdx && prev.personId === addr.personId) stack.pop();
      else stack.push(addr);
      render();
    }));
    out.querySelectorAll<HTMLButtonElement>(".crumb[data-jump]").forEach(b => b.addEventListener("click", () => {
      stack = stack.slice(0, +b.dataset.jump! + 1);
      render();
    }));
  }

  function roll(): void {
    const a = E.randomCitizen(worldSeed, Math.random);
    stack = [a];
    render();
  }

  document.getElementById("roll")!.addEventListener("click", roll);
  document.getElementById("replay")!.addEventListener("click", () => {
    const parts = seedbox.value.trim().split(":");
    if (parts.length === 4) {
      const ws = parseInt(parts[0], 10), vi = parseInt(parts[2], 10), pid = parseInt(parts[3], 10);
      if (!isNaN(ws) && E.REGIONS[parts[1]] && !isNaN(vi) && !isNaN(pid)) {
        worldSeed = ws;
        const env = E.resolveVillage(worldSeed, parts[1], vi);
        stack = [{ regionKey: parts[1], villageIdx: vi, personId: Math.min(pid, env.persons.length - 1) }];
        render();
      }
    }
  });
  seedbox.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("replay")!.click(); });

  roll();
}
