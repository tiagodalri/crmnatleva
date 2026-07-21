/**
 * Local, synchronous, zero-latency spell/formatting fix applied at send-time.
 * Only mechanical, unambiguous corrections. Anything requiring context stays
 * with the AI suggestion layer (useSpellSuggestion).
 *
 * Rules applied:
 *  · Collapse repeated spaces (preserves newlines).
 *  · Remove space before , . ! ? ; :
 *  · Ensure a single space after , . ! ? ; : when followed by a letter/digit.
 *  · Capitalize first letter of the message and after sentence terminators (. ! ?).
 *  · Replace unambiguous chat abbreviations with their accented/full form,
 *    matching whole words only and preserving the original casing.
 *
 * Explicitly NOT included:
 *  · Ambiguous words like "esta"/"está", "e"/"é", "so"/"só" · left to the AI layer.
 *  · Adding "?" to questions · requires context, AI layer only.
 */

// [regex, replacement]. Replacement callback preserves original casing.
type Rule = { pattern: RegExp; to: string };

const UNAMBIGUOUS_WORDS: Rule[] = [
  { pattern: /\bnao\b/gi, to: "não" },
  { pattern: /\bvoce\b/gi, to: "você" },
  { pattern: /\bvc\b/gi, to: "você" },
  { pattern: /\bja\b/gi, to: "já" },
  { pattern: /\btambem\b/gi, to: "também" },
  { pattern: /\btb\b/gi, to: "também" },
  { pattern: /\bobg\b/gi, to: "obrigado" },
  { pattern: /\bblz\b/gi, to: "beleza" },
  { pattern: /\bmsg\b/gi, to: "mensagem" },
  { pattern: /\bqto\b/gi, to: "quanto" },
  { pattern: /\bqdo\b/gi, to: "quando" },
  { pattern: /\btd\b/gi, to: "tudo" },
];

/** Preserve casing of original match: ALL CAPS · Title Case · lower. */
function matchCase(original: string, replacement: string): string {
  if (!original) return replacement;
  if (original === original.toUpperCase() && original.length > 1) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function applyWordReplacements(text: string): string {
  let out = text;
  for (const rule of UNAMBIGUOUS_WORDS) {
    out = out.replace(rule.pattern, (m) => matchCase(m, rule.to));
  }
  return out;
}

function normalizeSpacing(text: string): string {
  // Split on newlines to preserve intentional line breaks.
  return text
    .split("\n")
    .map((line) => {
      let l = line;
      // Collapse repeated spaces/tabs within a line.
      l = l.replace(/[ \t]{2,}/g, " ");
      // Remove space(s) before punctuation.
      l = l.replace(/[ \t]+([,.!?;:])/g, "$1");
      // Ensure a space after punctuation when directly followed by a word char.
      // Only for , . ! ? ; : and only when followed by a letter/digit (not another punct or end).
      l = l.replace(/([,.!?;:])([A-Za-zÀ-ÿ0-9])/g, "$1 $2");
      // Trim trailing spaces on each line.
      l = l.replace(/[ \t]+$/g, "");
      return l;
    })
    .join("\n");
}

function capitalizeSentences(text: string): string {
  // Capitalize first letter of the whole text (skipping leading whitespace/punct).
  let out = text.replace(/^(\s*)([a-zà-ÿ])/, (_m, ws, ch) => ws + ch.toUpperCase());
  // Capitalize after sentence terminators followed by a space.
  out = out.replace(/([.!?])\s+([a-zà-ÿ])/g, (_m, p, ch) => `${p} ${ch.toUpperCase()}`);
  return out;
}

/**
 * Applies the full local fix pipeline. Safe to call on every send.
 * Returns the corrected text · falls back to the original on any unexpected error.
 */
export function localSpellFix(input: string): string {
  if (!input) return input;
  try {
    let out = input;
    out = applyWordReplacements(out);
    out = normalizeSpacing(out);
    out = capitalizeSentences(out);
    return out;
  } catch {
    return input;
  }
}
