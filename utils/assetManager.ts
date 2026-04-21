/**
 * Offline asset resolver — barcha fayllar app ichida bundle qilingan
 * (`assets/sounds/`, `assets/images/`, `assets/videos/`). `require()`
 * orqali Metro bundler fayllarni bundlega qo'shadi, ekranlar esa
 * `getAssetModule()` qaytargan raqamli asset ID bilan ishlaydi.
 *
 * Interfeys avvalgi tarmoqli versiyaga mos (`downloadCoreAssets`,
 * `getCachedUri`) — ekranlarda minimal o'zgarish bilan ishlaydi.
 */
import { Asset } from 'expo-asset';

/* eslint-disable @typescript-eslint/no-require-imports */
const ASSETS: Record<'sounds' | 'images' | 'videos', Record<string, number>> = {
  sounds: {
    'pop.mp3': require('../assets/sounds/pop.mp3'),
    'click.mp3': require('../assets/sounds/click.mp3'),
    'magic.mp3': require('../assets/sounds/magic.mp3'),
    'train.mp3': require('../assets/sounds/train.mp3'),
    'success.mp3': require('../assets/sounds/success.mp3'),
  },
  images: {
    'login_page_loading.jpg': require('../assets/images/login_page_loading.jpg'),
  },
  videos: {
    'harflar.mp4': require('../assets/videos/harflar.mp4'),
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */

type AssetType = keyof typeof ASSETS;

/**
 * Bundle qilingan asset'ning Metro modul ID'sini qaytaradi (`require(...)`
 * natijasi). `Image`, `expo-video` va `expo-av` shu raqamli ID'ni bevosita
 * qabul qiladi.
 */
export function getAssetModule(type: AssetType, fileName: string): number | undefined {
  return ASSETS[type]?.[fileName];
}

/**
 * Avvalgi kod bilan mos bo'lish uchun — lokal `asset://` URI ni qaytaradi.
 * `<Image source={{ uri }}>` kabi `uri` kutayotgan joylarda ishlatiladi.
 */
export function getCachedUri(type: AssetType, fileName: string): string {
  const mod = getAssetModule(type, fileName);
  if (mod == null) return '';
  const asset = Asset.fromModule(mod);
  return asset.localUri || asset.uri;
}

/**
 * Avvalgi download-dan keyingi kod strukturasiga mos bo'lish uchun —
 * bundle qilingan asset'larni xotiraga oldindan yuklaydi.
 * Tarmoq so'rovi amalga oshirilmaydi.
 */
export async function downloadCoreAssets(onProgress?: (progress: number) => void) {
  const flat: number[] = [];
  for (const type of Object.keys(ASSETS) as AssetType[]) {
    for (const name of Object.keys(ASSETS[type])) {
      const mod = ASSETS[type][name];
      if (mod != null) flat.push(mod);
    }
  }
  let done = 0;
  for (const mod of flat) {
    try {
      await Asset.fromModule(mod).downloadAsync();
    } catch (e) {
      console.warn('[assetManager] bundled asset load failed', e);
    }
    done += 1;
    onProgress?.(done / flat.length);
  }
  return true;
}
