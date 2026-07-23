export type Theme = "dark" | "light";

const KEY = "medieval-reroll-theme";

// Mirrors locale.ts's defensive localStorage handling (see its comment) —
// sandboxed/privacy-mode contexts can throw on access rather than just
// returning null, and that must not break initApp()'s first statement.
export function getTheme(): Theme {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // fall through to system preference
  }
  try {
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches) return "light";
  } catch {
    // no matchMedia available; default below
  }
  return "dark";
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // no persistence available; the in-memory theme for this session still works
  }
}
