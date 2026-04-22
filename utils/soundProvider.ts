import { createAudioPlayer } from 'expo-audio';
import { getSettings } from './settingsManager';
import { getAssetModule } from './assetManager';

let players: { [key: string]: any } = {};

const SOUND_FILES: Record<string, string> = {
  pop: 'pop.mp3',
  click: 'click.mp3',
  magic: 'magic.mp3',
  train: 'train.mp3',
  success: 'success.mp3',
  error: 'pop.mp3',
  victory: 'magic.mp3',
};

export async function preloadSounds() {
  try {
    for (const [key, fileName] of Object.entries(SOUND_FILES)) {
      const mod = getAssetModule('sounds', fileName);
      if (mod == null) continue;
      
      // Release existing player if any
      if (players[key]) {
        players[key].release();
      }
      
      players[key] = createAudioPlayer(mod);
    }
  } catch (error) {
    console.warn('Could not preload sounds', error);
  }
}

export async function playSound(name: string) {
  try {
    const settings = getSettings();
    if (!settings.soundEnabled) return;

    const player = players[name];
    if (player) {
      // If already playing, seek to start (like replayAsync)
      if (player.status === 'playing') {
        player.seekTo(0);
      }
      player.play();
    }
  } catch (error) {
    console.warn(`Could not play sound: ${name}`, error);
  }
}

export async function unloadSounds() {
  for (const key in players) {
    try {
      players[key].release();
    } catch {}
  }
  players = {};
}


