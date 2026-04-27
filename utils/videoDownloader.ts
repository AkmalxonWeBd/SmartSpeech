import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Live Nginx server URL configured for SmartSpeech videos
export const SERVER_BASE_URL = 'https://smartspeech.109.205.180.84.nip.io/videos';

// Total alphabet videos
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Add the intro video as well
export const ALL_VIDEOS = [...ALPHABET, 'harflar'];

const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;

/**
 * Initializes the video directory in local storage.
 */
export async function initVideoDirectory() {
  const dirInfo = await FileSystem.getInfoAsync(VIDEOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
  }
}

/**
 * Returns the local file URI for a video if it exists.
 * Returns null if the video has not been downloaded yet.
 */
export async function getLocalVideoUri(videoName: string): Promise<string | null> {
  const fileUri = `${VIDEOS_DIR}${videoName}.mp4`;
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists) {
    return fileUri;
  }
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
export async function downloadVideo(videoName: string, onProgress?: (progress: number) => void): Promise<string | null> {
  try {
    await initVideoDirectory();
    const fileUri = `${VIDEOS_DIR}${videoName}.mp4`;
    const remoteUrl = `${SERVER_BASE_URL}/${videoName}.mp4`;

    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(progress);
      }
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
  onFileProgress?: (progress: number) => void
): Promise<boolean> {
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
