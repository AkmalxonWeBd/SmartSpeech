import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { PermissionsAndroid, Platform } from 'react-native';

// Live Nginx server URL configured for SmartSpeech videos
export const SERVER_BASE_URL = 'https://smartspeech.109.205.180.84.nip.io/videos';

// Total alphabet videos
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Add the intro video as well
export const ALL_VIDEOS = [...ALPHABET, 'harflar'];

// ── Storage paths ──────────────────────────────────────────────
const EXTERNAL_DIR = 'file:///storage/emulated/0/SmartSpeech/';
const INTERNAL_DIR = `${FileSystem.documentDirectory}videos/`;

/**
 * Request storage permission for writing to external storage.
 * On Android 11+ (API 30+) requires MANAGE_EXTERNAL_STORAGE.
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 30) {
      const hasPermission = await PermissionsAndroid.check(
        'android.permission.MANAGE_EXTERNAL_STORAGE' as PermissionsAndroid.Permission,
      );
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        'android.permission.MANAGE_EXTERNAL_STORAGE' as PermissionsAndroid.Permission,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 10 and below
    const results = await PermissionsAndroid.requestMultiple([
      'android.permission.WRITE_EXTERNAL_STORAGE' as PermissionsAndroid.Permission,
      'android.permission.READ_EXTERNAL_STORAGE' as PermissionsAndroid.Permission,
    ]);
    return (
      results['android.permission.WRITE_EXTERNAL_STORAGE'] ===
      PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (e) {
    console.warn('Storage permission error:', e);
    return false;
  }
}

/**
 * Check if we can use external storage.
 */
async function canUseExternalStorage(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    if (Platform.Version >= 30) {
      return await PermissionsAndroid.check(
        'android.permission.MANAGE_EXTERNAL_STORAGE' as PermissionsAndroid.Permission,
      );
    }
    return await PermissionsAndroid.check(
      'android.permission.WRITE_EXTERNAL_STORAGE' as PermissionsAndroid.Permission,
    );
  } catch {
    return false;
  }
}

/**
 * Get the active videos directory based on permissions.
 */
async function getVideosDir(): Promise<string> {
  const external = await canUseExternalStorage();
  return external ? EXTERNAL_DIR : INTERNAL_DIR;
}

/**
 * Initializes the video directory in local storage.
 */
export async function initVideoDirectory() {
  const dir = await getVideosDir();
  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch (e) {
    // If external fails, fall back to internal
    if (dir === EXTERNAL_DIR) {
      console.warn('External dir failed, falling back to internal:', e);
      const intInfo = await FileSystem.getInfoAsync(INTERNAL_DIR);
      if (!intInfo.exists) {
        await FileSystem.makeDirectoryAsync(INTERNAL_DIR, { intermediates: true });
      }
    }
  }
}

/**
 * Returns the local file URI for a video if it exists.
 * Checks external directory first, then internal.
 * Returns null if the video has not been downloaded yet.
 */
export async function getLocalVideoUri(videoName: string): Promise<string | null> {
  const externalUri = `${EXTERNAL_DIR}${videoName}.mp4`;
  const internalUri = `${INTERNAL_DIR}${videoName}.mp4`;

  // Check external first
  try {
    const extInfo = await FileSystem.getInfoAsync(externalUri);
    if (extInfo.exists) return externalUri;
  } catch {}

  // Fallback to internal
  try {
    const intInfo = await FileSystem.getInfoAsync(internalUri);
    if (intInfo.exists) return internalUri;
  } catch {}

  return null;
}

/**
 * Checks if all videos are downloaded.
 */
export async function areAllVideosDownloaded(): Promise<boolean> {
  try {
    const isDownloaded = await AsyncStorage.getItem('all_videos_downloaded');
    if (isDownloaded === 'true') return true;

    // Verify all exist
    for (const v of ALL_VIDEOS) {
      const exists = await getLocalVideoUri(v);
      if (!exists) return false;
    }

    await AsyncStorage.setItem('all_videos_downloaded', 'true');
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a single video.
 */
export async function downloadVideo(
  videoName: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> {
  try {
    await initVideoDirectory();
    const dir = await getVideosDir();
    const fileUri = `${dir}${videoName}.mp4`;
    const remoteUrl = `${SERVER_BASE_URL}/${videoName}.mp4`;

    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(progress);
      },
    );

    const result = await downloadResumable.downloadAsync();
    return result?.uri || null;
  } catch (error) {
    console.warn(`Failed to download ${videoName}:`, error);
    return null;
  }
}

/**
 * Downloads all missing videos sequentially.
 */
export async function downloadAllMissingVideos(
  onOverallProgress?: (current: number, total: number) => void,
  onFileProgress?: (progress: number) => void,
): Promise<boolean> {
  // Request permission before downloading
  await requestStoragePermission();
  await initVideoDirectory();

  let downloadedCount = 0;

  for (let i = 0; i < ALL_VIDEOS.length; i++) {
    const video = ALL_VIDEOS[i];
    const exists = await getLocalVideoUri(video);

    if (exists) {
      downloadedCount++;
      if (onOverallProgress) onOverallProgress(downloadedCount, ALL_VIDEOS.length);
      continue;
    }

    const success = await downloadVideo(video, onFileProgress);
    if (success) {
      downloadedCount++;
      if (onOverallProgress) onOverallProgress(downloadedCount, ALL_VIDEOS.length);
    } else {
      return false; // Stop on first failure to save bandwidth / retry later
    }
  }

  if (downloadedCount === ALL_VIDEOS.length) {
    await AsyncStorage.setItem('all_videos_downloaded', 'true');
    return true;
  }
  return false;
}
