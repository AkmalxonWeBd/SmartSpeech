import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'app_settings';

export type AppSettings = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  language: 'uz' | 'en' | 'ru';
  offlineRecognition: boolean;
  backgroundMusicEnabled: boolean;
  backgroundMusicVolume: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  language: 'uz',
  offlineRecognition: false,
  backgroundMusicEnabled: true,
  backgroundMusicVolume: 0.4,
};

let cachedSettings: AppSettings = { ...DEFAULT_SETTINGS };

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load settings', e);
  }
  return cachedSettings;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  cachedSettings = { ...cachedSettings, ...settings };
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings));
  } catch (e) {
    console.warn('Failed to save settings', e);
  }
  return cachedSettings;
}

export function getSettings(): AppSettings {
  return cachedSettings;
}
