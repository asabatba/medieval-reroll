// decode_document(kind, ctx) -> citation string
//
// Documents follow whichever hierarchy generated them: a parish register
// entry is addressed under the ecclesiastical tree, a manor court roll or
// account under the feudal tree, a coroner's roll or tax record under the
// civil tree. All of them ultimately reference the same underlying
// person/village addresses — that's what lets biography() cite a specific
// register without the hierarchies needing to know about each other.
const FALLBACK = {
  reg: "Parish register", court: "Manor court roll", coroner: "Coroner's roll",
  will: "Register of wills", chron: "Town chronicle", account: "Manorial account"
};

export function citeDocument(kind, ctx) {
  const j = ctx && ctx.jurisdiction, f = ctx && ctx.fief, place = ctx && ctx.place;
  switch (kind) {
    case "reg": return j ? `Register of ${j.parish}` : FALLBACK.reg;
    case "court": return f ? `Court roll of ${f.manor}` : FALLBACK.court;
    case "account": return f ? `Account roll of ${f.manor}` : FALLBACK.account;
    case "will": return j ? `Register of wills, ${j.diocese}` : FALLBACK.will;
    case "chron": return j ? `Chronicle of ${j.province}` : FALLBACK.chron;
    case "coroner": return place ? `Coroner's roll, ${place}` : FALLBACK.coroner;
    default: return FALLBACK.reg;
  }
}
