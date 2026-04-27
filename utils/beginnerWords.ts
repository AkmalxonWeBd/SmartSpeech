/**
 * One simple word per letter for the beginner level.
 * These are common, concrete nouns that young children already know
 * and can visualise easily.
 */

export interface BeginnerWord {
  en: string;
  uz: string;
}

export const BEGINNER_WORDS: Record<string, BeginnerWord> = {
  A: { en: 'apple', uz: 'olma' },
  B: { en: 'ball', uz: "to'p" },
  C: { en: 'cat', uz: 'mushuk' },
  D: { en: 'dog', uz: 'it' },
  E: { en: 'egg', uz: 'tuxum' },
  F: { en: 'fish', uz: 'baliq' },
  G: { en: 'girl', uz: "qiz" },
  H: { en: 'hat', uz: 'shapka' },
  I: { en: 'ice', uz: 'muz' },
  J: { en: 'jam', uz: 'murabbo' },
  K: { en: 'key', uz: 'kalit' },
  L: { en: 'lion', uz: 'sher' },
  M: { en: 'moon', uz: 'oy' },
  N: { en: 'nose', uz: 'burun' },
  O: { en: 'orange', uz: 'apelsin' },
  P: { en: 'pen', uz: 'ruchka' },
  Q: { en: 'queen', uz: 'malika' },
  R: { en: 'rain', uz: "yomg'ir" },
  S: { en: 'sun', uz: 'quyosh' },
  T: { en: 'tree', uz: "daraxt" },
  U: { en: 'umbrella', uz: 'soyabon' },
  V: { en: 'van', uz: 'furgon' },
  W: { en: 'water', uz: 'suv' },
  X: { en: 'box', uz: 'quti' },
  Y: { en: 'yellow', uz: 'sariq' },
  Z: { en: 'zoo', uz: 'hayvonot bog\'i' },
};

export function getWordForLetter(letter: string): BeginnerWord | null {
  return BEGINNER_WORDS[letter.toUpperCase()] ?? null;
}
