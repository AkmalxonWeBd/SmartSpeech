/**
 * Background music manager for dashboard.
 * Plays level-specific ambient music with volume control.
 * Uses expo-audio's createAudioPlayer.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { getSettings } from './settingsManager';

// Static requires for Metro bundler
/* eslint-disable @typescript-eslint/no-require-imports */
const MUSIC_TRACKS: Record<string, number> = {
  beginner: require('../assets/sounds/backgroud_music/1.mp3'),
  a1: require('../assets/sounds/backgroud_music/2.mp3'),
  a2: require('../assets/sounds/backgroud_music/3.mp3'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

let currentPlayer: AudioPlayer | null = null;
let currentLevel: string = '';

/**
 * Start playing background music for the given level.
 * If already playing the same level, does nothing.
 * If playing a different level, switches tracks.
 */
export function startBackgroundMusic(level: string) {
  const settings = getSettings();
  if (!settings.backgroundMusicEnabled) {
    stopBackgroundMusic();
    return;
  }

  const normalizedLevel = level.toLowerCase();
  const trackKey = MUSIC_TRACKS[normalizedLevel] ? normalizedLevel : 'beginner';

  // Already playing same track
  if (currentPlayer && currentLevel === trackKey) {
    currentPlayer.volume = settings.backgroundMusicVolume;
    if (currentPlayer.playing !== true) {
      currentPlayer.play();
    }
    return;
  }

  // Stop previous track
  stopBackgroundMusic();

  try {
    const source = MUSIC_TRACKS[trackKey];
    if (!source) return;

    currentPlayer = createAudioPlayer(source);
    currentPlayer.loop = true;
    currentPlayer.volume = settings.backgroundMusicVolume;
    currentLevel = trackKey;
    currentPlayer.play();
  } catch (e) {
    console.warn('[backgroundMusic] Failed to start:', e);
  }
}

/**
 * Stop and release the current background music player.
 */
export function stopBackgroundMusic() {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.release();
    } catch {}
    currentPlayer = null;
    currentLevel = '';
  }
}

/**
 * Update volume of the currently playing track.
 */
export function setBackgroundMusicVolume(volume: number) {
  if (currentPlayer) {
    try {
      currentPlayer.volume = Math.max(0, Math.min(1, volume));
    } catch {}
  }
}

/**
 * Pause the background music without releasing it.
 */
export function pauseBackgroundMusic() {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
    } catch {}
  }
}

/**
 * Resume the background music if enabled.
 */
export function resumeBackgroundMusic() {
  const settings = getSettings();
  if (!settings.backgroundMusicEnabled) return;
  if (currentPlayer) {
    try {
      currentPlayer.volume = settings.backgroundMusicVolume;
      currentPlayer.play();
    } catch {}
  }
}
