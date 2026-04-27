/**
 * Shared text utilities — normalize, similarity, shuffle.
 * Single source of truth; imported by lesson, exam, and word-lesson screens.
 */

/** Lowercase, trim, strip non-alphanum, collapse whitespace. */
export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ');

/** Strip common filler words the speech engine picks up. */
export const cleanTranscript = (text: string): string =>
  text
    .replace(/\benglish\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Dice-coefficient similarity on character bigrams.
 * Returns 0..1 where 1 = identical after normalisation.
 */
export const similarity = (a: string, b: string): number => {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) {
    if (na.includes(nb) || nb.includes(na)) return 0.8;
    return 0;
  }
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bi = s.substring(i, i + 2);
      m.set(bi, (m.get(bi) || 0) + 1);
    }
    return m;
  };
  const b1 = bigrams(na);
  const b2 = bigrams(nb);
  let matches = 0;
  b1.forEach((count, bi) => {
    matches += Math.min(count, b2.get(bi) || 0);
  });
  return (2 * matches) / (na.length - 1 + nb.length - 1);
};

/** Fisher-Yates shuffle (unbiased). Returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
