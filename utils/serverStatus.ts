/**
 * Server Status Manager
 * =====================
 * Serverdan ilovaning ishlash holatini tekshiradi.
 * 
 * Logika:
 * 1. Internet mavjud bo'lsa → serverga so'rov yuboradi → statusni oladi → xotiraga saqlaydi
 * 2. Internet yo'q bo'lsa → xotiradagi oxirgi saqlangan statusni ishlatadi
 * 3. Hech narsa yo'q bo'lsa (birinchi marta, internet ham yo'q) → default: true
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ⚠️ MUHIM: Bu URLni o'z serveringiz manziliga o'zgartiring!
// Agar lokal test qilmoqchi bo'lsangiz, kompyuteringizning IP manzilini yozing.
// Masalan: http://192.168.1.100:5000
const SERVER_URL = 'https://smartspeech.109.205.180.84.nip.io';

const STATUS_KEY = 'app_server_status';
const STATUS_TIMESTAMP_KEY = 'app_server_status_timestamp';

export type ServerStatusResult = {
  status: boolean;
  fromCache: boolean;
  lastChecked: string | null;
};

/**
 * Xotiradan oxirgi saqlangan statusni o'qiydi.
 */
async function getCachedStatus(): Promise<{ status: boolean; timestamp: string | null }> {
  try {
    const statusStr = await AsyncStorage.getItem(STATUS_KEY);
    const timestamp = await AsyncStorage.getItem(STATUS_TIMESTAMP_KEY);
    
    if (statusStr !== null) {
      return { status: JSON.parse(statusStr), timestamp };
    }
  } catch (e) {
    console.warn('[ServerStatus] Xotiradan o\'qishda xatolik:', e);
  }
  // Default — ilova ishlaydi
  return { status: true, timestamp: null };
}

/**
 * Statusni xotiraga saqlaydi.
 */
async function cacheStatus(status: boolean): Promise<void> {
  try {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
    await AsyncStorage.setItem(STATUS_TIMESTAMP_KEY, now);
  } catch (e) {
    console.warn('[ServerStatus] Xotiraga yozishda xatolik:', e);
  }
}

/**
 * Serverdan statusni oladi.
 * Timeout: 5 soniya (sekin internet uchun ham yetarli).
 */
async function fetchServerStatus(): Promise<boolean | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${_serverUrl}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`[ServerStatus] Server javob berdi: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return Boolean(data.status);
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn('[ServerStatus] So\'rov vaqti tugadi (timeout)');
    } else {
      console.warn('[ServerStatus] Serverga ulanib bo\'lmadi:', e.message);
    }
    return null;
  }
}

/**
 * Asosiy funksiya — server statusini tekshiradi.
 * 
 * 1. Internet bormi tekshiradi
 * 2. Internet bo'lsa → serverga so'rov
 * 3. Serverdan javob kelsa → xotiraga saqlaydi
 * 4. Internet/server yo'q → xotiradagi oxirgi statusni qaytaradi
 */
export async function checkServerStatus(): Promise<ServerStatusResult> {
  // Internet holatini tekshirish
  // Web da isInternetReachable null qaytadi, shuning uchun null ni "reachable" deb hisoblaymiz
  const netState = await NetInfo.fetch();
  const isConnected = netState.isConnected && netState.isInternetReachable !== false;
  
  if (isConnected) {
    // Internet bor — serverga so'rov yuboramiz
    const serverStatus = await fetchServerStatus();
    
    if (serverStatus !== null) {
      // Server javob berdi — xotiraga saqlaymiz
      await cacheStatus(serverStatus);
      return {
        status: serverStatus,
        fromCache: false,
        lastChecked: new Date().toISOString(),
      };
    }
  }
  
  // Internet yo'q yoki server javob bermadi — xotiradagini qaytaramiz
  const cached = await getCachedStatus();
  return {
    status: cached.status,
    fromCache: true,
    lastChecked: cached.timestamp,
  };
}

/**
 * Server URL manzilini o'zgartirish uchun.
 * Bu funksiyani dastur boshida chaqirish mumkin agar URL dinamik bo'lsa.
 */
let _serverUrl = SERVER_URL;
export function setServerUrl(url: string) {
  _serverUrl = url;
}

export function getServerUrl(): string {
  return _serverUrl;
}
