// Rule-based query understanding for Hinglish shopping queries.
// Turns "office ke liye cotton kurti under 1500" into terms + structured filters.

export type ParsedQuery = {
  terms: string[];
  maxPrice?: number;
  minPrice?: number;
  attributes: Record<string, string[]>; // occasion/fabric/recipient/colour/...
};

const STOP = new Set([
  "ke", "liye", "ki", "ka", "ko", "me", "mein", "mai", "wala", "wali", "vala", "vali", "for", "the", "a", "an",
  "and", "with", "of", "in", "pehne", "pehnne", "chahiye", "dikhao", "show", "buy", "best", "new", "latest",
  "hai", "h", "se", "tak", "wear", "kapde", "kapda", "kapdey", "clothes", "clothing", "dress", "dresses", "wale", "wala",
  "comfortable", "achha", "accha", "sundar", "nice", "good",
]);

// term -> { attribute, value } or plain term expansions. Admin synonyms extend this at runtime.
export const BUILTIN_SYNONYMS: Record<string, string[]> = {
  shaadi: ["occasion:Wedding Guest", "occasion:Festive"],
  shadi: ["occasion:Wedding Guest", "occasion:Festive"],
  wedding: ["occasion:Wedding Guest"],
  byah: ["occasion:Wedding Guest"],
  office: ["occasion:Office"],
  work: ["occasion:Office"],
  daily: ["occasion:Daily"],
  roz: ["occasion:Daily"],
  festival: ["occasion:Festive"],
  festive: ["occasion:Festive"],
  tyohar: ["occasion:Festive"],
  diwali: ["occasion:Festive"],
  maa: ["recipient:Mother"],
  mummy: ["recipient:Mother"],
  mom: ["recipient:Mother"],
  papa: ["recipient:Father"],
  summer: ["fabric:Cotton", "fabric:Linen", "fabric:Mul"],
  garmi: ["fabric:Cotton", "fabric:Linen", "fabric:Mul"],
  sardi: ["fabric:Wool", "fabric:Fleece"],
  winter: ["fabric:Wool", "fabric:Fleece"],
  suit: ["suit set", "kurta set", "salwar", "gender:WOMEN"],
  saree: ["saree", "gender:WOMEN"],
  sari: ["saree", "gender:WOMEN"],
  women: ["gender:WOMEN"],
  womens: ["gender:WOMEN"],
  ladies: ["gender:WOMEN"],
  mahila: ["gender:WOMEN"],
  men: ["gender:MEN"],
  mens: ["gender:MEN"],
  gents: ["gender:MEN"],
  kids: ["gender:KIDS"],
  kurti: ["kurti", "kurta"],
  sasta: ["price:<=799"],
  cheap: ["price:<=799"],
  simple: ["pattern:Solid"],
  plain: ["pattern:Solid"],
  bacche: ["gender:KIDS"],
  baccho: ["gender:KIDS"],
  bachcha: ["gender:KIDS"],
  bachon: ["gender:KIDS"],
  baniyan: ["vest", "innerwear"],
  chaddi: ["brief", "innerwear"],
};

const COLOURS = [
  "red", "maroon", "pink", "blue", "navy", "green", "olive", "yellow", "mustard", "white", "black", "grey",
  "orange", "peach", "purple", "beige", "cream", "brown", "teal", "gold",
];
const HINDI_COLOURS: Record<string, string> = {
  laal: "red", lal: "red", neela: "blue", nila: "blue", hara: "green", peela: "yellow", pila: "yellow",
  safed: "white", kala: "black", gulabi: "pink", narangi: "orange", bhura: "brown",
};

export function parseQuery(raw: string, extraSynonyms: Record<string, string[]> = {}): ParsedQuery {
  const syn = { ...BUILTIN_SYNONYMS, ...extraSynonyms };
  let q = raw.toLowerCase().replace(/[₹,]/g, " ").replace(/rs\.?/g, " ").replace(/\s+/g, " ").trim();
  const out: ParsedQuery = { terms: [], attributes: {} };

  const under = q.match(/(?:under|below|less than|within|upto|up to|andar|se kam|ke andar)\s*(\d{2,6})/);
  if (under) {
    out.maxPrice = Number(under[1]);
    q = q.replace(under[0], " ");
  }
  const above = q.match(/(?:above|over|more than|se upar)\s*(\d{2,6})/);
  if (above) {
    out.minPrice = Number(above[1]);
    q = q.replace(above[0], " ");
  }
  const between = q.match(/(\d{2,6})\s*(?:-|to|se)\s*(\d{2,6})/);
  if (between) {
    out.minPrice = Number(between[1]);
    out.maxPrice = Number(between[2]);
    q = q.replace(between[0], " ");
  }
  // "1500 ke andar" / trailing "1500 tak"
  const trailing = q.match(/(\d{3,6})\s*(?:tak|ke andar|ke niche)/);
  if (trailing && out.maxPrice == null) {
    out.maxPrice = Number(trailing[1]);
    q = q.replace(trailing[0], " ");
  }

  const add = (k: string, v: string) => {
    out.attributes[k] ??= [];
    if (!out.attributes[k].includes(v)) out.attributes[k].push(v);
  };

  for (const tok of q.split(" ")) {
    if (!tok || STOP.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue;
    const colour = HINDI_COLOURS[tok] ?? (COLOURS.includes(tok) ? tok : null);
    if (colour) {
      add("colour", colour);
      continue;
    }
    const s = syn[tok];
    if (s) {
      for (const e of s) {
        if (e.startsWith("price:<=")) out.maxPrice = Math.min(out.maxPrice ?? Infinity, Number(e.slice(8)));
        else if (e.includes(":")) {
          const [k, v] = e.split(":");
          add(k, v);
        } else out.terms.push(e);
      }
      continue;
    }
    out.terms.push(tok);
  }
  out.terms = [...new Set(out.terms)];
  return out;
}
