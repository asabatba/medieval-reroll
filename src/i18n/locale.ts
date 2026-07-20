export type Locale = "en" | "ca";

const KEY = "medieval-reroll-locale";

export function getLocale(): Locale {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  return saved === "ca" ? "ca" : "en";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(KEY, locale);
}
