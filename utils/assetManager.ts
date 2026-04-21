import * as FileSystem from 'expo-file-system/legacy';
import { API } from './api';

const ASSET_DIR = `${FileSystem.documentDirectory}assets/`;

export const CORE_ASSETS = {
  sounds: [
    'pop.mp3',
    'click.mp3',
    'magic.mp3',
    'train.mp3',
    'success.mp3',
  ],
  images: [
    'login_page_loading.jpg',
  ],
  videos: [
    'harflar.mp4',
  ],
};

export async function ensureAssetDirectory() {
  const dirInfo = await FileSystem.getInfoAsync(ASSET_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(ASSET_DIR, { intermediates: true });
    await FileSystem.makeDirectoryAsync(`${ASSET_DIR}sounds/`, { intermediates: true });
    await FileSystem.makeDirectoryAsync(`${ASSET_DIR}images/`, { intermediates: true });
    await FileSystem.makeDirectoryAsync(`${ASSET_DIR}videos/`, { intermediates: true });
  }
}

export async function getLocalAssetUri(type: 'sounds' | 'images' | 'videos', fileName: string): Promise<string> {
  const localUri = `${ASSET_DIR}${type}/${fileName}`;
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  
  if (fileInfo.exists) {
    return localUri;
  }
  
  // If not exists, download it
  const remoteUrl = API.getAssetUrl(type, fileName);
  console.log(`Downloading asset: ${fileName} from ${remoteUrl}`);
  
  const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
  return downloadRes.uri;
}

export async function downloadCoreAssets(onProgress?: (progress: number) => void) {
  await ensureAssetDirectory();
  
  const totalAssets = CORE_ASSETS.sounds.length + CORE_ASSETS.images.length;
  let downloadedCount = 0;
  
  // Download sounds
  for (const sound of CORE_ASSETS.sounds) {
    await getLocalAssetUri('sounds', sound);
    downloadedCount++;
    if (onProgress) onProgress(downloadedCount / totalAssets);
  }
  
  // Download images
  for (const image of CORE_ASSETS.images) {
    await getLocalAssetUri('images', image);
    downloadedCount++;
    if (onProgress) onProgress(downloadedCount / totalAssets);
  }

  // Download videos
  for (const video of CORE_ASSETS.videos) {
    await getLocalAssetUri('videos', video);
    downloadedCount++;
    if (onProgress) onProgress(downloadedCount / totalAssets);
  }
  
  return true;
}

export function getCachedUri(type: 'sounds' | 'images' | 'videos', fileName: string) {
  return `${ASSET_DIR}${type}/${fileName}`;
}
