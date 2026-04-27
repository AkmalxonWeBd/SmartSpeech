/**
 * Letter → phonetic variants mapping.
 * Speech engines transcribe single letters in many ways ("B" → "bee",
 * "C" → "see", etc.). This lookup covers the most common alternatives
 * so we can reliably match what the user said.
 */

import { normalize, similarity } from './textUtils';

export const LETTER_PHONETICS: Record<string, string[]> = {
  a: ['a', 'ay', 'hey', 'eh', 'aye', 'aa', 'ah'],
  b: ['b', 'be', 'bee', 'bees', 'beef', 'beat'],
  c: ['c', 'see', 'sea', 'si', 'seed', 'seen', 'she'],
  d: ['d', 'de', 'dee', 'did', 'the', 'deep', 'deal'],
  e: ['e', 'ee', 'he', 'each', 'eat', 'ease', 'east'],
  f: ['f', 'ef', 'eff', 'if', 'of', 'off', 'half'],
  g: ['g', 'ge', 'gee', 'ji', 'jee', 'jeep', 'gene'],
  h: ['h', 'age', 'ache', 'aitch', 'each', 'hey', 'hate', 'eight', 'ate'],
  i: ['i', 'eye', 'ai', 'aye', 'hi', 'ice'],
  j: ['j', 'jay', 'je', 'jae', 'day', 'jade', 'jail', 'jane'],
  k: ['k', 'kay', 'ke', 'key', 'ok', 'okay', 'cake', 'kate'],
  l: ['l', 'el', 'ell', 'ale', 'all', 'ill', 'elle'],
  m: ['m', 'em', 'am', 'him', 'mm', 'hmm', 'them'],
  n: ['n', 'en', 'in', 'an', 'and', 'end'],
  o: ['o', 'oh', 'oo', 'ooh', 'owe', 'own'],
  p: ['p', 'pe', 'pee', 'pea', 'pi', 'peace', 'piece', 'peak'],
  q: ['q', 'queue', 'cue', 'cu', 'que', 'cute', 'few'],
  r: ['r', 'are', 'ar', 'our', 'or', 'err', 'her'],
  s: ['s', 'es', 'yes', 'as', 'is', 'us', 'ace'],
  t: ['t', 'te', 'tea', 'tee', 'ti', 'the', 'tree', 'teeth'],
  u: ['u', 'you', 'yu', 'yew', 'hue', 'who', 'ooh', 'ew'],
  v: ['v', 've', 'vee', 'vi', 'we', 'fee', 'free', 'vie'],
  w: ['w', 'double you', 'double u', 'doubleyou', 'dub', 'double'],
  x: ['x', 'ex', 'ax', 'eggs', 'acts', 'axe'],
  y: ['y', 'why', 'wie', 'wi', 'wye', 'wise'],
  z: ['z', 'zee', 'zed', 'ze', 'said', 'set', 'sit'],
};

/** Check if a recognised transcript matches a single letter via phonetics. */
export const matchesLetter = (recognized: string, letter: string): boolean => {
  const nr = normalize(recognized);
  const ll = letter.toLowerCase();
  const phonetics = LETTER_PHONETICS[ll] || [ll];
  for (const v of phonetics) {
    if (nr === v || nr.includes(v)) return true;
    if (nr.split(' ').some((w) => w === v)) return true;
  }
  if (nr.includes(ll)) return true;
  return false;
};

/** Check if a recognised transcript matches a word (inclusion or similarity). */
export const matchesWord = (recognized: string, expected: string): boolean => {
  const nr = normalize(recognized);
  const ne = normalize(expected);
  if (!nr) return false;
  if (nr === ne) return true;
  if (nr.includes(ne) || ne.includes(nr)) return true;
  return false;
};

/**
 * From a list of speech-engine alternatives, pick the one that best
 * matches the expected text.
 */
export const pickBestMatch = (
  candidates: string[],
  expected: string,
  isLetter: boolean,
): string => {
  if (!candidates.length) return '';
  const ne = normalize(expected);
  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const nc = normalize(c);
    let score: number;
    if (isLetter) {
      score = matchesLetter(c, expected) ? 1 : 0;
    } else {
      score =
        nc.includes(ne) || ne.includes(nc)
          ? 1
          : similarity(c, expected);
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
};
