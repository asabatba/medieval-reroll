export type Locale = "en" | "ca";

const KEY = "medieval-reroll-locale";

// Some browser contexts (sandboxed iframes, certain privacy modes) expose
// `localStorage` as an object but throw on actual access rather than just
// returning null — a thrown getLocale() would break initApp()'s very first
// statement, and a thrown setLocale() would break the language-switch
// click handler, so both degrade to "no persistence" instead of crashing.
export function getLocale(): Locale {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return saved === "ca" ? "ca" : "en";
  } catch {
    return "en";
  }
}

export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    // no persistence available; the in-memory locale for this session still works
  }
}
