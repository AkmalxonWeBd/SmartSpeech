import { Audio } from 'expo-av';
import { getSettings } from './settingsManager';
import { getAssetModule } from './assetManager';

let sounds: { [key: string]: Audio.Sound } = {};

const SOUND_FILES: Record<string, string> = {
  pop: 'pop.mp3',
  click: 'click.mp3',
  magic: 'magic.mp3',
  train: 'train.mp3',
  success: 'success.mp3',
  // Reuse existing assets for semantic aliases the UI calls with.
  error: 'pop.mp3',
  victory: 'magic.mp3',
};

export async function preloadSounds() {
  try {
    for (const [key, fileName] of Object.entries(SOUND_FILES)) {
      const mod = getAssetModule('sounds', fileName);
      if (mod == null) continue;
      const sound = new Audio.Sound();
      await sound.loadAsync(mod);
      sounds[key] = sound;
    }
  } catch (error) {
    console.warn('Could not load bundled sounds', error);
  }
}

export async function playSound(name: string) {
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
  sounds = {};
}
