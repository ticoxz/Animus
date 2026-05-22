/**
 * Post-filtro: MiniMax suele colar inglés/portugués/francés aunque el prompt diga español.
 */

const FOREIGN_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bgreat\b/gi, "bárbaro"],
  [/\bnice\b/gi, "bueno"],
  [/\bwhat\b/gi, "qué"],
  [/\bstarts?\b/gi, "arranca"],
  [/\bcelebrate\b/gi, "celebrar"],
  [/\bavec\b/gi, "con"],
  [/\bparab[eé]ns?\b/gi, "felicitaciones"],
  [/\bprofuso\b/gi, "re piola"],
  [/\balso\b/gi, "también"],
  [/\bhowever\b/gi, "pero"],
  [/\bso\b/gi, "entonces"],
  [/\bwell\b/gi, "bueno"],
  [/\bokay\b/gi, "dale"],
  [/\bok\b/gi, "dale"],
  [/\byes\b/gi, "sí"],
  [/\bno problem\b/gi, "sin problema"],
  [/\bsorry\b/gi, "perdón"],
  [/\bthanks?\b/gi, "gracias"],
  [/\bhello\b/gi, "hola"],
  [/\bhi\b/gi, "hola"],
  [/\bbye\b/gi, "chau"],
  [/\bplease\b/gi, "por favor"],
  [/\bwelcome\b/gi, "bienvenido"],
  [/\bcongratulations\b/gi, "felicitaciones"],
  [/\bcongrats\b/gi, "felicitaciones"],
];

/** Palabras sueltas muy comunes en respuestas contaminadas (no tocar subcadenas). */
const ENGLISH_STOPWORDS =
  /\b(the|and|or|for|with|from|this|that|your|you|are|was|were|have|has|will|can|should)\b/gi;

export function enforceSpanishOnly(text: string): string {
  let out = text;
  for (const [re, repl] of FOREIGN_WORD_REPLACEMENTS) {
    out = out.replace(re, repl);
  }
  out = out.replace(ENGLISH_STOPWORDS, "");
  out = out.replace(/\s{2,}/g, " ").replace(/ ,/g, ",").replace(/ \./g, ".");
  return out;
}
