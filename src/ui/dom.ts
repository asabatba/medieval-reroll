import type { BioEventKind } from "../engine/types.js";
import type { Locale } from "../i18n/locale.js";

// Escapes for both text-node and quoted-attribute contexts (`"`/`'`
// included) — every generated string reaching innerHTML goes through this,
// and some call sites interpolate into a quoted attribute (e.g.
// aria-label="${esc(...)}"), so this can't only cover the text-node case
// without becoming an attribute-breakout risk the moment a future call
// site puts free-form text there.
export const esc = (t: unknown): string =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const KIND_LABEL: Record<Locale, Record<BioEventKind, string>> = {
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
    elsewhere: "Elsewhere",
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
    elsewhere: "Altre registre",
  },
};
