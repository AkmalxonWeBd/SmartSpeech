/**
 * Soundtrack Downloader — soundtracklarni serverdan yuklab oladi.
 *
 * Soundtrack ochilganda yuklab olinadi va lokal saqlanadi.
 * Keyin ilova to'liq offline ishlaydi.
 */

// IMPORTANT: expo-file-system v19+ da `documentDirectory`, `getInfoAsync`,
// `createDownloadResumable` va boshqa eski API'lar `expo-file-system/legacy`
// submodulega ko'chirilgan. Asosiy moduldan import qilsa, ular runtime'da
// throw qiladi va yuklab olish ishlamay qoladi.
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getServerUrl } from './serverStatus';

// Web'da expo-file-system mavjud emas — soundtrack'larni serverdan
// to'g'ridan-to'g'ri oqim qilamiz.
const IS_WEB = Platform.OS === 'web';

const SOUNDTRACKS_DIR = `${FileSystem.documentDirectory}soundtracks/`;

/**
 * Soundtracks papkasini yaratadi.
 */
export async function initSoundtracksDirectory(): Promise<void> {
  if (IS_WEB) return;
  const info = await FileSystem.getInfoAsync(SOUNDTRACKS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SOUNDTRACKS_DIR, { intermediates: true });
  }
}

/**
 * Soundtrack fayl nomi asosida lokal yo'lni qaytaradi.
 */
function getLocalSoundtrackPath(fileName: string): string {
  return `${SOUNDTRACKS_DIR}${fileName}`;
}

/**
 * Soundtrack yuklab olinganmi tekshiradi.
 */
export async function isSoundtrackDownloaded(fileName: string): Promise<boolean> {
  if (IS_WEB) return true;
  const path = getLocalSoundtrackPath(fileName);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && (info.size ?? 0) > 0;
}

/**
 * Soundtrack faylning lokal URI sini qaytaradi.
 * Web'da to'g'ridan-to'g'ri server URL'i qaytariladi.
 */
export async function getSoundtrackUri(fileName: string): Promise<string | null> {
  if (IS_WEB) {
    const base = getServerUrl();
    return `${base}/media/soundtracks/${encodeURIComponent(fileName)}`;
  }
  const path = getLocalSoundtrackPath(fileName);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && (info.size ?? 0) > 0) {
    return path;
  }
  return null;
}

/**
 * Bitta soundtrackni serverdan yuklab oladi.
 */
export async function downloadSoundtrack(
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> {
  if (IS_WEB) {
    onProgress?.(1);
    const base = getServerUrl();
    return `${base}/media/soundtracks/${encodeURIComponent(fileName)}`;
  }
  await initSoundtracksDirectory();

  const localPath = getLocalSoundtrackPath(fileName);

  // Agar allaqachon yuklab olingan bo'lsa
  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists && (info.size ?? 0) > 0) {
    onProgress?.(1);
    return localPath;
  }

  try {
    const base = getServerUrl();
    const url = `${base}/media/soundtracks/${encodeURIComponent(fileName)}`;

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
    console.warn(`[SoundtrackDownloader] ${fileName} yuklab olishda xatolik:`, e);
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch {}
    return null;
  }
}
