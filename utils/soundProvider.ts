import { Audio } from 'expo-av';
import { getSettings } from './settingsManager';
import { getCachedUri } from './assetManager';

let sounds: { [key: string]: Audio.Sound } = {};

const SOUND_FILES = {
  pop: 'pop.mp3',
  click: 'click.mp3',
  magic: 'magic.mp3',
  train: 'train.mp3',
  success: 'success.mp3',
};

export async function preloadSounds() {
  try {
    for (const [key, fileName] of Object.entries(SOUND_FILES)) {
      const sound = new Audio.Sound();
      const localUri = getCachedUri('sounds', fileName);
      console.log(`Preloading cached sound: ${key} from ${localUri}`);
      await sound.loadAsync({ uri: localUri });
      sounds[key] = sound;
    }
  } catch (error) {
    console.warn("Could not load cached sounds", error);
  }
}

export async function playSound(name: keyof typeof SOUND_FILES) {
  try {
    const settings = getSettings();
    if (!settings.soundEnabled) return;
    
    const sound = sounds[name];
    if (sound) {
      await sound.replayAsync();
    }
  } catch (error) {
    console.warn(`Could not play sound: ${name}`, error);
  }
}

export async function unloadSounds() {
  for (const key in sounds) {
    try {
      await sounds[key].unloadAsync();
    } catch {}
  }
}
