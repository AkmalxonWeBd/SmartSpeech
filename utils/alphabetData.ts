export const ALPHABET_LESSONS = [
  ['A', 'B'], // Lesson 1
  ['C', 'D'], // Lesson 2
  ['E', 'F'], // Lesson 3
  ['G', 'H'], // Lesson 4
  ['I', 'J'], // Lesson 5
  ['K', 'L'], // Lesson 6
  ['M', 'N'], // Lesson 7
  ['O', 'P'], // Lesson 8
  ['Q', 'R'], // Lesson 9
  ['S', 'T'], // Lesson 10
  ['U', 'V', 'W'], // Lesson 11
  ['X', 'Y', 'Z'], // Lesson 12
];

export function getLettersForLesson(lessonId: number) {
  if (lessonId < 1 || lessonId > 12) return [];
  return ALPHABET_LESSONS[lessonId - 1];
}
