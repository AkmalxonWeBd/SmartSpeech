import { getSettings } from './settingsManager';

export type TranslationKeys = {
  // Splash
  splashSubtitle: string;
  splashLoading: string;

  // Onboarding
  ageTitle: string;
  ageHintYoung: string;
  ageHintMid: string;
  ageHintOld: string;
  nameTitle: string;
  namePlaceholder: string;
  nameGreeting: string;
  levelTitle: string;
  levelBeginner: string;
  levelBeginnerDesc: string;
  levelA1: string;
  levelA1Desc: string;
  levelA2: string;
  levelA2Desc: string;
  nextButton: string;
  startButton: string;
  stepAge: string;
  stepName: string;
  stepLevel: string;

  // Dashboard
  greeting: string;
  vibeTextBeginner: string;
  vibeTextA1: string;
  vibeTextA2: string;
  lessonLabel: string;
  bossTitle: string;
  bossSubtitle: string;
  bossLocked: string;
  newLevel: string;
  unlocked: string;

  // Settings
  settingsTitle: string;
  settingsSubtitle: string;
  soundSection: string;
  soundTitle: string;
  soundSubtitle: string;
  vibrationTitle: string;
  vibrationSubtitle: string;
  languageSection: string;
  languageSubtitle: string;

  // Offline Recognition
  offlineSection: string;
  offlineTitle: string;
  offlineSubtitle: string;
  downloadModelBtn: string;
  modelAvailable: string;
  modelDownloading: string;
  modelError: string;
  modelNotDownloaded: string;

  // Background Music
  bgMusicSection: string;
  bgMusicTitle: string;
  bgMusicSubtitle: string;
  bgMusicVolume: string;

  // Lesson
  lessonNotFound: string;
  videoNotFound: string;
  videoComingSoon: string;
  continueBtn: string;
  skipBtn: string;
  sayThisLetter: string;
  sayThisWord: string;
  correct: string;
  tryAgain: string;
  checking: string;
  listening: string;
  holdToSpeak: string;
  greatJob: string;
  letterCompleted: string;
  nextLetter: string;
  finishLesson: string;
  amazing: string;
  lesson: string;
  completed: string;
  exitLessonTitle: string;
  exitLessonMsg: string;
  cancel: string;
  exitBtn: string;
  loading: string;

  // Word lesson
  learnPhase: string;
  matchPhase: string;
  speakPhase: string;
  dictPhase: string;
  recallPhase: string;
  nextWord: string;
  chooseCorrect: string;
  listenAndWrite: string;
  writeWord: string;
  checkBtn: string;
  sayInEnglish: string;
  attemptsLeft: string;
  correctAnswer: string;
  rememberIt: string;

  // Exam
  examTitle: string;
  sayEnglish: string;
  congratulations: string;
  beginnerDone: string;
  a1Done: string;
  a2Done: string;
};

const translations: Record<string, TranslationKeys> = {
  uz: {
    splashSubtitle: '✨ Sarguzashtga tayyormisiz? ✨',
    splashLoading: 'Yuklanmoqda...',

    ageTitle: '🎂 Yoshingiz nechida? 🎂',
    ageHintYoung: '🧒 Kichkintoy sarguzashtchi!',
    ageHintMid: '😎 Ajoyib yosh!',
    ageHintOld: "🚀 Super o'quvchi!",
    nameTitle: '✏️ Ismingiz nima? ✏️',
    namePlaceholder: 'Ismingizni yozing...',
    nameGreeting: 'Salom, {name}! 👋 Siz bilan tanishganimdan xursandman!',
    levelTitle: '🎯 Darajangizni tanlang! 🎯',
    levelBeginner: 'Beginner',
    levelBeginnerDesc: 'Men hali boshlayapman!',
    levelA1: 'A1',
    levelA1Desc: 'Bir oz bilaman!',
    levelA2: 'A2',
    levelA2Desc: 'Yaxshi bilaman!',
    nextButton: 'Keyingisi ➡️',
    startButton: '🚀 Boshlash!',
    stepAge: '1️⃣  Yoshingiz',
    stepName: '2️⃣  Ismingiz',
    stepLevel: '3️⃣  Darajangiz',

    greeting: 'Salom, {name}! 👋',
    vibeTextBeginner: '🌿 Tabiat Sarguzashti',
    vibeTextA1: '☁️ Osmon Safari',
    vibeTextA2: '🚀 Kosmik Safari',
    lessonLabel: 'DARS',
    bossTitle: 'IMTIHON',
    bossSubtitle: '🔒 Barcha darslarni tugatgandan keyin',
    bossLocked: 'Barcha darslarni tugating',
    newLevel: 'YANGI BOSQICH',
    unlocked: 'ochildi!',

    settingsTitle: '⚙️ Sozlamalar',
    settingsSubtitle: 'Ilovani sozlang',
    soundSection: '🔊 Ovoz va Tebranish',
    soundTitle: 'Ovoz effektlari',
    soundSubtitle: 'Tugmalar va animatsiyalar ovozi',
    vibrationTitle: 'Tebranish',
    vibrationSubtitle: 'Tugmalar bosilganda tebranish',
    languageSection: '🌍 Til sozlamalari',
    languageSubtitle: 'Ilova tilini tanlang',

    offlineSection: '📡 Oflayn rejim',
    offlineTitle: 'Oflayn tanib olish',
    offlineSubtitle: 'Internetsiz ishlashni afzal koʻrish',
    downloadModelBtn: 'Ingliz tili modelini yuklash',
    modelAvailable: 'Model yuklangan ✅',
    modelDownloading: 'Yuklanmoqda... ⏳',
    modelError: 'Xatolik yuz berdi ❌',
    modelNotDownloaded: 'Model yuklanmagan ⚠️',

    bgMusicSection: '🎵 Fon musiqasi',
    bgMusicTitle: 'Fon musiqasi',
    bgMusicSubtitle: 'Dashboardda musiqa yangraydi',
    bgMusicVolume: 'Ovoz balandligi',

    lessonNotFound: 'Dars topilmadi',
    videoNotFound: 'Video topilmadi',
    videoComingSoon: 'videosi tez orada',
    continueBtn: 'Davom etish',
    skipBtn: "O'tkazish",
    sayThisLetter: 'BU HARFNI AYTING',
    sayThisWord: "BU SO'ZNI AYTING",
    correct: "Zo'r!",
    tryAgain: "Yana urinib ko'ring!",
    checking: 'Tekshirilmoqda...',
    listening: 'Eshitilmoqda...',
    holdToSpeak: 'Bosib turib gapiring',
    greatJob: 'AJOYIB!',
    letterCompleted: 'harfi tugadi',
    nextLetter: 'Keyingi harf',
    finishLesson: 'Darsni tugatish',
    amazing: 'AJOYIB!',
    lesson: 'Dars',
    completed: 'tugatildi',
    exitLessonTitle: 'Chiqish',
    exitLessonMsg: "Darsdan chiqmoqchimisiz? Progress saqlanmaydi.",
    cancel: 'Bekor qilish',
    exitBtn: 'Chiqish',
    loading: 'Yuklanmoqda...',

    learnPhase: "O'rganish",
    matchPhase: 'Moslashtirish',
    speakPhase: 'Gapirish',
    dictPhase: 'Diktant',
    recallPhase: 'Eslash',
    nextWord: 'Keyingi',
    chooseCorrect: "To'g'ri inglizcha so'zni tanlang",
    listenAndWrite: 'Eshitib yozing',
    writeWord: "So'zni yozing...",
    checkBtn: 'Tekshirish',
    sayInEnglish: 'Inglizchada ayting',
    attemptsLeft: 'urinish qoldi',
    correctAnswer: "To'g'ri javob:",
    rememberIt: 'Esda saqlang — keyinroq yana keladi',

    examTitle: 'IMTIHON',
    sayEnglish: 'Inglizchasini ayting',
    congratulations: 'TABRIKLAYMIZ!',
    beginnerDone: 'Beginner darajasi tugadi — A1 boshlanmoqda',
    a1Done: 'A1 darajasi tugadi — A2 boshlanmoqda',
    a2Done: 'Siz A2 darajasini ham tugatdingiz',
  },

  en: {
    splashSubtitle: '✨ Ready for an adventure? ✨',
    splashLoading: 'Loading...',

    ageTitle: '🎂 How old are you? 🎂',
    ageHintYoung: '🧒 Little adventurer!',
    ageHintMid: '😎 Great age!',
    ageHintOld: '🚀 Super student!',
    nameTitle: '✏️ What is your name? ✏️',
    namePlaceholder: 'Type your name...',
    nameGreeting: 'Hello, {name}! 👋 Nice to meet you!',
    levelTitle: '🎯 Choose your level! 🎯',
    levelBeginner: 'Beginner',
    levelBeginnerDesc: "I'm just starting!",
    levelA1: 'A1',
    levelA1Desc: 'I know a little!',
    levelA2: 'A2',
    levelA2Desc: 'I know well!',
    nextButton: 'Next ➡️',
    startButton: '🚀 Start!',
    stepAge: '1️⃣  Your Age',
    stepName: '2️⃣  Your Name',
    stepLevel: '3️⃣  Your Level',

    greeting: 'Hello, {name}! 👋',
    vibeTextBeginner: '🌿 Nature Adventure',
    vibeTextA1: '☁️ Sky Safari',
    vibeTextA2: '🚀 Space Safari',
    lessonLabel: 'LESSON',
    bossTitle: 'EXAM',
    bossSubtitle: '🔒 After completing all lessons',
    bossLocked: 'Complete all lessons',
    newLevel: 'NEW LEVEL',
    unlocked: 'unlocked!',

    settingsTitle: '⚙️ Settings',
    settingsSubtitle: 'Customize your app',
    soundSection: '🔊 Sound & Haptics',
    soundTitle: 'Sound Effects',
    soundSubtitle: 'Button and animation sounds',
    vibrationTitle: 'Vibration',
    vibrationSubtitle: 'Vibrate on button press',
    languageSection: '🌍 Language Settings',
    languageSubtitle: 'Choose app language',

    offlineSection: '📡 Offline Mode',
    offlineTitle: 'Offline Recognition',
    offlineSubtitle: 'Prefer on-device processing',
    downloadModelBtn: 'Download English Model',
    modelAvailable: 'Model available ✅',
    modelDownloading: 'Downloading... ⏳',
    modelError: 'Download error ❌',
    modelNotDownloaded: 'Model not downloaded ⚠️',

    bgMusicSection: '🎵 Background Music',
    bgMusicTitle: 'Background Music',
    bgMusicSubtitle: 'Play music on dashboard',
    bgMusicVolume: 'Volume',

    lessonNotFound: 'Lesson not found',
    videoNotFound: 'Video not found',
    videoComingSoon: 'video coming soon',
    continueBtn: 'Continue',
    skipBtn: 'Skip',
    sayThisLetter: 'SAY THIS LETTER',
    sayThisWord: 'SAY THIS WORD',
    correct: 'Great!',
    tryAgain: 'Try again!',
    checking: 'Checking...',
    listening: 'Listening...',
    holdToSpeak: 'Hold to speak',
    greatJob: 'GREAT JOB!',
    letterCompleted: 'letter done',
    nextLetter: 'Next letter',
    finishLesson: 'Finish lesson',
    amazing: 'AMAZING!',
    lesson: 'Lesson',
    completed: 'completed',
    exitLessonTitle: 'Exit',
    exitLessonMsg: 'Leave this lesson? Progress will not be saved.',
    cancel: 'Cancel',
    exitBtn: 'Exit',
    loading: 'Loading...',

    learnPhase: 'Learn',
    matchPhase: 'Match',
    speakPhase: 'Speak',
    dictPhase: 'Dictation',
    recallPhase: 'Recall',
    nextWord: 'Next',
    chooseCorrect: 'Choose the correct English word',
    listenAndWrite: 'Listen and write',
    writeWord: 'Write the word...',
    checkBtn: 'Check',
    sayInEnglish: 'Say in English',
    attemptsLeft: 'attempts left',
    correctAnswer: 'Correct answer:',
    rememberIt: "Remember it \u2014 it'll come back later",

    examTitle: 'EXAM',
    sayEnglish: 'Say it in English',
    congratulations: 'CONGRATULATIONS!',
    beginnerDone: 'Beginner level done \u2014 A1 starts now',
    a1Done: 'A1 level done \u2014 A2 starts now',
    a2Done: "You've completed A2 as well",
  },

  ru: {
    splashSubtitle: '✨ Готовы к приключению? ✨',
    splashLoading: 'Загрузка...',

    ageTitle: '🎂 Сколько тебе лет? 🎂',
    ageHintYoung: '🧒 Маленький искатель!',
    ageHintMid: '😎 Отличный возраст!',
    ageHintOld: '🚀 Супер ученик!',
    nameTitle: '✏️ Как тебя зовут? ✏️',
    namePlaceholder: 'Напиши своё имя...',
    nameGreeting: 'Привет, {name}! 👋 Рад знакомству!',
    levelTitle: '🎯 Выбери свой уровень! 🎯',
    levelBeginner: 'Начальный',
    levelBeginnerDesc: 'Я только начинаю!',
    levelA1: 'A1',
    levelA1Desc: 'Я немного знаю!',
    levelA2: 'A2',
    levelA2Desc: 'Я знаю хорошо!',
    nextButton: 'Далее ➡️',
    startButton: '🚀 Начать!',
    stepAge: '1️⃣  Возраст',
    stepName: '2️⃣  Имя',
    stepLevel: '3️⃣  Уровень',

    greeting: 'Привет, {name}! 👋',
    vibeTextBeginner: '🌿 Приключение в природе',
    vibeTextA1: '☁️ Небесное сафари',
    vibeTextA2: '🚀 Космическое сафари',
    lessonLabel: 'УРОК',
    bossTitle: 'ЭКЗАМЕН',
    bossSubtitle: '🔒 После завершения всех уроков',
    bossLocked: 'Завершите все уроки',
    newLevel: 'НОВЫЙ УРОВЕНЬ',
    unlocked: 'открыт!',

    settingsTitle: '⚙️ Настройки',
    settingsSubtitle: 'Настройте приложение',
    soundSection: '🔊 Звук и вибрация',
    soundTitle: 'Звуковые эффекты',
    soundSubtitle: 'Звуки кнопок и анимаций',
    vibrationTitle: 'Вибрация',
    vibrationSubtitle: 'Вибрация при нажатии',
    languageSection: '🌍 Настройки языка',
    languageSubtitle: 'Выберите язык приложения',

    offlineSection: '📡 Оффлайн режим',
    offlineTitle: 'Оффлайн распознавание',
    offlineSubtitle: 'Предпочитать обработку на устройстве',
    downloadModelBtn: 'Скачать английскую модель',
    modelAvailable: 'Модель доступна ✅',
    modelDownloading: 'Загрузка... ⏳',
    modelError: 'Ошибка загрузки ❌',
    modelNotDownloaded: 'Модель не скачана ⚠️',

    bgMusicSection: '🎵 Фоновая музыка',
    bgMusicTitle: 'Фоновая музыка',
    bgMusicSubtitle: 'Играть музыку на главной',
    bgMusicVolume: 'Громкость',

    lessonNotFound: 'Урок не найден',
    videoNotFound: 'Видео не найдено',
    videoComingSoon: 'видео скоро',
    continueBtn: 'Продолжить',
    skipBtn: 'Пропустить',
    sayThisLetter: 'СКАЖИТЕ ЭТУ БУКВУ',
    sayThisWord: 'СКАЖИТЕ ЭТО СЛОВО',
    correct: 'Отлично!',
    tryAgain: 'Попробуйте ещё!',
    checking: 'Проверяем...',
    listening: 'Слушаем...',
    holdToSpeak: 'Нажмите и говорите',
    greatJob: 'СУПЕР!',
    letterCompleted: 'буква пройдена',
    nextLetter: 'Следующая буква',
    finishLesson: 'Закончить урок',
    amazing: 'ПОТРЯСАЮЩЕ!',
    lesson: 'Урок',
    completed: 'завершён',
    exitLessonTitle: 'Выход',
    exitLessonMsg: 'Покинуть урок? Прогресс не сохранится.',
    cancel: 'Отмена',
    exitBtn: 'Выйти',
    loading: 'Загрузка...',

    learnPhase: 'Учить',
    matchPhase: 'Сопоставить',
    speakPhase: 'Говорить',
    dictPhase: 'Диктант',
    recallPhase: 'Вспомнить',
    nextWord: 'Далее',
    chooseCorrect: 'Выберите правильное английское слово',
    listenAndWrite: 'Слушайте и пишите',
    writeWord: 'Напишите слово...',
    checkBtn: 'Проверить',
    sayInEnglish: 'Скажите по-английски',
    attemptsLeft: 'попыток осталось',
    correctAnswer: 'Правильный ответ:',
    rememberIt: 'Запомните — будет ещё раз',

    examTitle: 'ЭКЗАМЕН',
    sayEnglish: 'Скажите по-английски',
    congratulations: 'ПОЗДРАВЛЯЕМ!',
    beginnerDone: 'Начальный уровень пройден — начинается A1',
    a1Done: 'A1 пройден — начинается A2',
    a2Done: 'Вы прошли и уровень A2',
  },
};

export function t(key: keyof TranslationKeys, params?: Record<string, string>): string {
  const lang = getSettings().language || 'uz';
  let text = translations[lang]?.[key] || translations['uz'][key] || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }

  return text;
}
