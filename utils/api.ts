import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In development, you might need to use your machine's local IP address
// Example: 'http://192.168.1.5:3000'
const BASE_URL = 'https://109.205.180.84.nip.io/smartspeech'; 

// Generate a simple UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  // Try to get from cache first
  const cached = await AsyncStorage.getItem('device_unique_id');
  if (cached) return cached;

  // Try native ID
  let nativeId: string | null = null;
  if (Platform.OS === 'android') {
    nativeId = Application.androidId ?? null;
  } else {
    nativeId = await Application.getIosIdForVendorAsync();
  }

  // Use native ID or generate a UUID
  const deviceId = nativeId || generateUUID();
  await AsyncStorage.setItem('device_unique_id', deviceId);
  return deviceId;
}

export const API = {
  baseUrl: BASE_URL,

  async syncUser(userData: { name: string; age: number; level: string }) {
    const deviceId = await getDeviceId();
    const response = await fetch(`${BASE_URL}/api/user/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, ...userData }),
    });
    return response.json();
  },

  async getUser() {
    const deviceId = await getDeviceId();
    const response = await fetch(`${BASE_URL}/api/user/${deviceId}`);
    if (!response.ok) return null;
    return response.json();
  },

  async updateProgress(progress: number) {
    const deviceId = await getDeviceId();
    const response = await fetch(`${BASE_URL}/api/user/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, progress }),
    });
    return response.json();
  },

  async getLessons() {
    const response = await fetch(`${BASE_URL}/api/lessons`);
    return response.json();
  },

  async getLessonWords(level: string, lesson: number): Promise<{ en: string; uz: string }[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/lesson-words?level=${level}&lesson=${lesson}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.words || [];
    } catch (e) {
      console.warn('Failed to fetch lesson words', e);
      return [];
    }
  },

  async getWords(letters: string[]) {
    try {
      const response = await fetch(`${BASE_URL}/api/words?letters=${letters.join(',')}`);
      if (!response.ok) return {};
      return response.json();
    } catch (e) {
      console.warn('Failed to fetch words', e);
      return {};
    }
  },

  async checkPronunciation(audioUri: string, expectedText: string) {
    try {
      // For a real app, you would upload the audio file using FormData.
      // Since this is a demo/mock, we just call the endpoint.
      const response = await fetch(`${BASE_URL}/api/check-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedText }),
      });
      if (!response.ok) return { success: false, score: 0 };
      return response.json();
    } catch (e) {
      console.warn('Voice check failed', e);
      return { success: false, score: 0 };
    }
  },

  getAssetUrl(type: 'sounds' | 'images' | 'videos', fileName: string) {
    return `${BASE_URL}/assets/${type}/${fileName}`;
  }
};
