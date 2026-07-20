import type { Locale } from "../i18n/locale.js";

export const esc = (t: unknown): string => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const KIND_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    birth: "Birth",
    plague: "Pestilence",
    famine: "Famine",
    grief: "Loss",
    fortune: "Fortune",
    marriage: "Marriage",
    child: "Birth of a child",
    war: "War",
    revolt: "Revolt",
    hardship: "Hardship",
    death: "Obiit",
    life: "",
  },
  ca: {
    birth: "Naixement",
    plague: "Pestilència",
    famine: "Fam",
    grief: "Pèrdua",
    fortune: "Fortuna",
    marriage: "Casament",
    child: "Naixement d'un fill",
    war: "Guerra",
    revolt: "Revolta",
    hardship: "Penúria",
    death: "Òbit",
    life: "",
  },
};
