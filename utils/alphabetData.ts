/**
 * Beginner-level lesson structure.
 *
 * Lesson 1  — Intro video (no letters).
 * Lessons 2-8 (7 wagons) — 2 letters each  → 14 letters (A–N).
 * Lessons 9-12 (4 wagons) — 3 letters each  → 12 letters (O–Z).
 * Lesson 13 — Beginner exam (boss wagon).
 *
 * Total: 1 intro + 11 letter wagons + 1 exam = 13 wagons.
 */

export type LessonType = 'intro' | 'letters' | 'exam';

export interface LessonMeta {
  type: LessonType;
  letters: string[];
}

export const BEGINNER_LESSONS: LessonMeta[] = [
  { type: 'intro', letters: [] },             // Lesson 1 — intro video
  { type: 'letters', letters: ['A', 'B'] },   // Lesson 2
  { type: 'letters', letters: ['C', 'D'] },   // Lesson 3
  { type: 'letters', letters: ['E', 'F'] },   // Lesson 4
  { type: 'letters', letters: ['G', 'H'] },   // Lesson 5
  { type: 'letters', letters: ['I', 'J'] },   // Lesson 6
  { type: 'letters', letters: ['K', 'L'] },   // Lesson 7
  { type: 'letters', letters: ['M', 'N'] },   // Lesson 8
  { type: 'letters', letters: ['O', 'P', 'Q'] },   // Lesson 9
  { type: 'letters', letters: ['R', 'S', 'T'] },   // Lesson 10
  { type: 'letters', letters: ['U', 'V', 'W'] },   // Lesson 11
  { type: 'letters', letters: ['X', 'Y', 'Z'] },   // Lesson 12
];

/** Back-compat wrapper used by the legacy API helper. */
export const ALPHABET_LESSONS = BEGINNER_LESSONS.filter(
  (l) => l.type === 'letters',
).map((l) => l.letters);

export function getLessonMeta(lessonId: number): LessonMeta | null {
  const idx = lessonId - 1;
  if (idx < 0 || idx >= BEGINNER_LESSONS.length) return null;
  return BEGINNER_LESSONS[idx];
}

export function getLettersForLesson(lessonId: number): string[] {
  const meta = getLessonMeta(lessonId);
  return meta?.letters ?? [];
}

/** Total number of beginner lessons (excluding exam). */
export const BEGINNER_LESSON_COUNT = BEGINNER_LESSONS.length;
