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

    settingsTitle: '⚙️ Sozlamalar',
    settingsSubtitle: 'Ilovani sozlang',
    soundSection: '🔊 Ovoz va Tebranish',
    soundTitle: 'Ovoz effektlari',
    soundSubtitle: 'Tugmalar va animatsiyalar ovozi',
    vibrationTitle: 'Tebranish',
    vibrationSubtitle: 'Tugmalar bosilganda tebranish',
    languageSection: '🌍 Til sozlamalari',
    languageSubtitle: 'Ilova tilini tanlang',
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

    settingsTitle: '⚙️ Settings',
    settingsSubtitle: 'Customize your app',
    soundSection: '🔊 Sound & Haptics',
    soundTitle: 'Sound Effects',
    soundSubtitle: 'Button and animation sounds',
    vibrationTitle: 'Vibration',
    vibrationSubtitle: 'Vibrate on button press',
    languageSection: '🌍 Language Settings',
    languageSubtitle: 'Choose app language',
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

    settingsTitle: '⚙️ Настройки',
    settingsSubtitle: 'Настройте приложение',
    soundSection: '🔊 Звук и вибрация',
    soundTitle: 'Звуковые эффекты',
    soundSubtitle: 'Звуки кнопок и анимаций',
    vibrationTitle: 'Вибрация',
    vibrationSubtitle: 'Вибрация при нажатии',
    languageSection: '🌍 Настройки языка',
    languageSubtitle: 'Выберите язык приложения',
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
