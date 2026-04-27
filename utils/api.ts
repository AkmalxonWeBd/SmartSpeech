/**
 * Offline data layer — fully local, no server dependency.
 * Uses bundled words.json + AsyncStorage for persistence.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shuffle } from './textUtils';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wordsDB: WordsEntry[] = require('../assets/data/words.json');

export type Word = { en: string; uz: string };
type WordsEntry = { level: string; lesson: number; words: Word[] };

export type UserData = {
  name: string;
  age: number;
  level: string;
  progress: number;
  createdAt?: string;
};

const USER_KEY = 'user_data';

async function readUser(): Promise<UserData | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch {
    return null;
  }
}

async function writeUser(user: UserData): Promise<UserData> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export const API = {
  async syncUser(userData: {
    name: string;
    age: number;
    level: string;
    progress?: number;
  }) {
    const existing = await readUser();
    const next: UserData = {
      ...existing,
      name: userData.name,
      age: userData.age,
      level: userData.level,
      progress: userData.progress ?? existing?.progress ?? 1,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const saved = await writeUser(next);
    return { success: true, user: saved };
  },

  async getUser(): Promise<UserData | null> {
    return readUser();
  },

  async updateProgress(progress: number) {
    const user = await readUser();
    if (!user) return { success: false };
    user.progress = progress;
    await writeUser(user);
    return { success: true, progress };
  },

  async getLessonWords(level: string, lesson: number): Promise<Word[]> {
    const entry = wordsDB.find(
      (e) =>
        e.level.toUpperCase() === String(level).toUpperCase() &&
        e.lesson === Number(lesson),
    );
    return entry ? entry.words : [];
  },

  async getWords(
    letters: string[],
    count = 4,
  ): Promise<Record<string, Word[]>> {
    const all: Word[] = wordsDB.reduce<Word[]>(
      (acc, e) => acc.concat(e.words),
      [],
    );
    const result: Record<string, Word[]> = {};
    for (const raw of letters) {
      const letter = String(raw).trim().toLowerCase();
      const matches = all.filter((w) =>
        w.en.toLowerCase().startsWith(letter),
      );
      const unique = Array.from(
        new Map(matches.map((w) => [w.en, w])).values(),
      );
      result[letter.toUpperCase()] = shuffle(unique).slice(0, count);
    }
    return result;
  },
};
