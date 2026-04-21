/**
 * Offline data layer — serverga ulanmasdan, app ichida bundle qilingan
 * words.json va AsyncStorage orqali ishlaydi. Interfeys avvalgi `API`
 * obyektining sanoat bo'yicha mos keladi, shuning uchun ekranlar deyarli
 * o'zgarmasdan ishlaydi.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wordsDB: WordsEntry[] = require('../assets/data/words.json');

type Word = { en: string; uz: string };
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

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const API = {
  /**
   * Offline-only: foydalanuvchi ma'lumotini AsyncStorage'ga saqlaydi va qaytaradi.
   */
  async syncUser(userData: { name: string; age: number; level: string; progress?: number }) {
    const existing = await readUser();
    const next: UserData = {
      ...existing,
      name: userData.name,
      age: userData.age,
      level: userData.level,
      progress: userData.progress ?? existing?.progress ?? 0,
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

  async getLessons() {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      title: `Lesson ${i + 1}`,
      type: 'dars',
    }));
  },

  async getLessonWords(level: string, lesson: number): Promise<Word[]> {
    const entry = wordsDB.find(
      (e) => e.level.toUpperCase() === String(level).toUpperCase() && e.lesson === Number(lesson),
    );
    return entry ? entry.words : [];
  },

  async getWords(letters: string[], count = 4): Promise<Record<string, Word[]>> {
    const all: Word[] = wordsDB.reduce<Word[]>((acc, e) => acc.concat(e.words), []);
    const result: Record<string, Word[]> = {};
    for (const raw of letters) {
      const letter = String(raw).trim().toLowerCase();
      const matches = all.filter((w) => w.en.toLowerCase().startsWith(letter));
      const unique = Array.from(new Map(matches.map((w) => [w.en, w])).values());
      result[letter.toUpperCase()] = shuffle(unique).slice(0, count);
    }
    return result;
  },

  /**
   * Offline mock — haqiqiy STT yo'q. Chaqiruvchi ekranlarda allaqachon
   * lokal `expo-speech-recognition` transcripti taqqoslanayapti; bu faqat
   * eski chaqirishlar (agar bo'lsa) uchun backward-compatibility uchun.
   */
  async checkPronunciation(_audioUri: string, _expectedText: string) {
    const success = Math.random() > 0.2;
    const score = success ? 80 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 30);
    return { success, score };
  },
};
