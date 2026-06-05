/**
 * Video Downloader — serverdan videolarni yuklab oladi va lokal saqlaydi.
 *
 * Birinchi ochilishda videolar serverdan birma-bir yuklab olinadi va
 * FileSystem ga saqlanadi. Keyin ilova to'liq offline ishlaydi.
 *
 * Videolar saqlash joyi: FileSystem.documentDirectory + 'videos/'
 */

// IMPORTANT: expo-file-system v19+ da `documentDirectory`, `getInfoAsync`,
// `createDownloadResumable` va boshqa eski API'lar `expo-file-system/legacy`
// submodulega ko'chirilgan. Asosiy moduldan import qilsa, ular runtime'da
// throw qiladi va yuklab olish ishlamay qoladi.
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getServerUrl } from './serverStatus';

// Web'da expo-file-system mavjud emas (brauzerda fayl tizimi yo'q). Web
// platformasida video yuklab olishni butunlay o'tkazib yuboramiz, shunda
// splash ekrani to'xtab qolmaydi.
const IS_WEB = Platform.OS === 'web';

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const ALL_VIDEOS = [...ALPHABET, 'harflar'];

// Lokal papkalar
const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;
const ALPHABET_DIR = `${VIDEOS_DIR}alphabet/`;
const DOWNLOAD_MARKER = `${VIDEOS_DIR}.downloaded`;

/**
 * Videolar papkalarini yaratadi (agar mavjud bo'lmasa).
 */
export async function initVideoDirectory(): Promise<void> {
  if (IS_WEB) return;
  const videosInfo = await FileSystem.getInfoAsync(VIDEOS_DIR);
  if (!videosInfo.exists) {
    await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
  }
  const alphaInfo = await FileSystem.getInfoAsync(ALPHABET_DIR);
  if (!alphaInfo.exists) {
    await FileSystem.makeDirectoryAsync(ALPHABET_DIR, { intermediates: true });
  }
}

/**
 * Video faylning lokal yo'lini qaytaradi.
 */
function getLocalPath(videoName: string): string {
  if (videoName === 'harflar') {
    return `${VIDEOS_DIR}harflar.mp4`;
  }
  return `${ALPHABET_DIR}${videoName}.mp4`;
}

/**
 * Video fayl nomini server URL ga aylantiradi.
 */
function getVideoUrl(videoName: string): string {
  const base = getServerUrl();
  if (videoName === 'harflar') {
    return `${base}/media/videos/harflar.mp4`;
  }
  return `${base}/media/videos/alphabet/${videoName}.mp4`;
}

/**
 * Bitta video yuklab olinganmi tekshiradi.
 */
export async function isVideoDownloaded(videoName: string): Promise<boolean> {
  if (IS_WEB) return true; // Web'da yuklab olish kerak emas
  const path = getLocalPath(videoName);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && (info.size ?? 0) > 0;
}

/**
 * Barcha videolar yuklab olinganmi tekshiradi.
 */
export async function areAllVideosDownloaded(): Promise<boolean> {
  if (IS_WEB) return true; // Web'da yuklab olish bosqichi yo'q
  // Marker fayl mavjudligini tekshiramiz (tezroq)
  const marker = await FileSystem.getInfoAsync(DOWNLOAD_MARKER);
  if (marker.exists) return true;

  // Marker yo'q — har birini tekshiramiz
  for (const name of ALL_VIDEOS) {
    const exists = await isVideoDownloaded(name);
    if (!exists) return false;
  }
  // Hammasi bor — marker yaratamiz
  await FileSystem.writeAsStringAsync(DOWNLOAD_MARKER, new Date().toISOString());
  return true;
}

/**
 * Lokal video URI ni qaytaradi.
 * expo-video uchun string URI sifatida.
 */
export function getLocalVideoSource(videoName: string): string | null {
  return getLocalPath(videoName.toLowerCase());
}

/**
 * Asinxron versiya — fayl mavjudligini tekshiradi.
 * Web'da to'g'ridan-to'g'ri server URL'ini qaytaradi (lokal fayl yo'q).
 */
export async function getLocalVideoUri(videoName: string): Promise<string | null> {
  if (IS_WEB) {
    // Web'da fayl tizimi yo'q — to'g'ridan-to'g'ri serverdan oqim qilamiz.
    const base = getServerUrl();
    return videoName.toLowerCase() === 'harflar'
      ? `${base}/media/videos/harflar.mp4`
      : `${base}/media/videos/alphabet/${videoName.toLowerCase()}.mp4`;
  }
  const path = getLocalPath(videoName.toLowerCase());
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && (info.size ?? 0) > 0) {
    return path;
  }
  return null;
}

/**
 * Bitta videoni serverdan yuklab oladi.
 */
export async function downloadVideo(
  videoName: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> {
  if (IS_WEB) {
    // Web'da fayl yuklab olishning ma'nosi yo'q — server URL'ini qaytaramiz.
    onProgress?.(1);
    const base = getServerUrl();
    return videoName === 'harflar'
      ? `${base}/media/videos/harflar.mp4`
      : `${base}/media/videos/alphabet/${videoName}.mp4`;
  }
  await initVideoDirectory();

  const localPath = getLocalPath(videoName);

  // Agar allaqachon yuklab olingan bo'lsa
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists && (info.size ?? 0) > 0) {
    onProgress?.(1);
    return localPath;
  }

  try {
    const url = getVideoUrl(videoName);

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      (dp) => {
        const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
        onProgress?.(progress);
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (result?.uri) {
      return result.uri;
    }
    return null;
  } catch (e) {
    console.warn(`[VideoDownloader] ${videoName} yuklab olishda xatolik:`, e);
    // Yarim yuklangan faylni o'chiramiz
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch {}
    return null;
  }
}

/**
 * Yuklanmagan barcha videolarni serverdan birma-bir yuklab oladi.
 * Splash screen uchun progress callback beradi.
 */
export async function downloadAllMissingVideos(
  onOverallProgress?: (current: number, total: number) => void,
  onFileProgress?: (progress: number) => void,
): Promise<boolean> {
  // Web'da yuklab olish bosqichi yo'q — splashga 100% holatni darhol bildiramiz.
  if (IS_WEB) {
    onOverallProgress?.(ALL_VIDEOS.length, ALL_VIDEOS.length);
    onFileProgress?.(1);
    return true;
  }
  // Allaqachon yuklab olinganmi?
  const alreadyDone = await areAllVideosDownloaded();
  if (alreadyDone) {
    onOverallProgress?.(ALL_VIDEOS.length, ALL_VIDEOS.length);
    return true;
  }

  await initVideoDirectory();

  // Qaysilari yuklanmagan — ularni aniqlaymiz
  const missing: string[] = [];
  for (const name of ALL_VIDEOS) {
    const exists = await isVideoDownloaded(name);
    if (!exists) missing.push(name);
  }

  if (missing.length === 0) {
    onOverallProgress?.(ALL_VIDEOS.length, ALL_VIDEOS.length);
    await FileSystem.writeAsStringAsync(DOWNLOAD_MARKER, new Date().toISOString());
    return true;
  }

  const total = missing.length;
  let completed = 0;
  let allOk = true;

  // UI uchun boshlang'ich (0/total) holatni darhol bildirib qo'yamiz, shunda
  // splash ekranida birinchi fayl yuklab olinayotganda ham to'g'ri "X/Y"
  // matnini ko'rish mumkin.
  onOverallProgress?.(0, total);

  for (const name of missing) {
    const result = await downloadVideo(name, onFileProgress);
    if (!result) allOk = false;
    completed++;
    onOverallProgress?.(completed, total);
  }

  if (allOk) {
    await FileSystem.writeAsStringAsync(DOWNLOAD_MARKER, new Date().toISOString());
  }

  return allOk;
}

// Legacy export
export const SERVER_BASE_URL = '';
