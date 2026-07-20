import type { Locale } from "../i18n/locale.js";
import type { DocumentContext, DocumentKind } from "./types.js";

// decode_document(kind, ctx) -> citation string
//
// Documents follow whichever hierarchy generated them: a parish register
// entry is addressed under the ecclesiastical tree, a manor court roll or
// account under the feudal tree, a coroner's roll or tax record under the
// civil tree. All of them ultimately reference the same underlying
// person/village addresses — that's what lets biography() cite a specific
// register without the hierarchies needing to know about each other.
const FALLBACK: Record<Locale, Record<DocumentKind, string>> = {
  en: {
    reg: "Parish register",
    court: "Manor court roll",
    coroner: "Coroner's roll",
    will: "Register of wills",
    chron: "Town chronicle",
    account: "Manorial account",
  },
  ca: {
    reg: "Registre parroquial",
    court: "Rotlle de la cort del senyor",
    coroner: "Rotlle del forense",
    will: "Registre de testaments",
    chron: "Crònica de la vila",
    account: "Compte senyorial",
  },
};

export function citeDocument(kind: DocumentKind, ctx: DocumentContext, locale: Locale): string {
  const j = ctx.jurisdiction,
    f = ctx.fief,
    place = ctx.place;
  const fb = FALLBACK[locale];
  if (locale === "ca") {
    switch (kind) {
      case "reg":
        return j ? `Registre de ${j.parish}` : fb.reg;
      case "court":
        return f ? `Rotlle de la cort de ${f.manor}` : fb.court;
      case "account":
        return f ? `Compte de ${f.manor}` : fb.account;
      case "will":
        return j ? `Registre de testaments, ${j.diocese}` : fb.will;
      case "chron":
        return j ? `Crònica de ${j.province}` : fb.chron;
      case "coroner":
        return place ? `Rotlle del forense, ${place}` : fb.coroner;
      default:
        return fb.reg;
    }
  }
  switch (kind) {
    case "reg":
      return j ? `Register of ${j.parish}` : fb.reg;
    case "court":
      return f ? `Court roll of ${f.manor}` : fb.court;
    case "account":
      return f ? `Account roll of ${f.manor}` : fb.account;
    case "will":
      return j ? `Register of wills, ${j.diocese}` : fb.will;
    case "chron":
      return j ? `Chronicle of ${j.province}` : fb.chron;
    case "coroner":
      return place ? `Coroner's roll, ${place}` : fb.coroner;
    default:
      return fb.reg;
  }
}
