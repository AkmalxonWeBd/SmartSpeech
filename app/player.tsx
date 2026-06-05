import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { playSound } from '../utils/soundProvider';
import { palette, shadowFx } from '../utils/theme';
import { getSubtitleAtTime, SubtitleCue } from '../utils/subtitleParser';
import { getSoundtrackUri, downloadSoundtrack } from '../utils/soundtrackDownloader';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tracksData: TrackEntry[] = require('../assets/soundtracks/tracks.json');

type TrackSubtitle = { start: number; end: number; text: string };
type TrackEntry = {
  id: string;
  file: string;
  subtitles?: TrackSubtitle[];
  [key: string]: any;
};

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const trackId = (params.trackId as string) || '';
  const { width: SW } = useWindowDimensions();

  // ── Resolve track from tracks.json by ID ──────────────────
  const track = tracksData.find((t) => t.id === trackId);
  const title = track?.title || 'Video';
  const file = track?.file || '';
  const cover = track?.cover || '🎬';

  // ── Video source — yuklab olingan lokal fayl ──────────────
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (!file) return;
    (async () => {
      // Avval lokal mavjudligini tekshiramiz
      const localUri = await getSoundtrackUri(file);
      if (localUri) {
        setVideoSource(localUri);
        return;
      }
      // Yuklab olish kerak
      setDownloading(true);
      const uri = await downloadSoundtrack(file, (p) => setDownloadProgress(p));
      setDownloading(false);
      if (uri) setVideoSource(uri);
    })();
  }, [file]);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = false;
  });

  // ── Subtitle state ────────────────────────────────────────
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const subtitleCuesRef = useRef<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // ── Player state ──────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // ── Refs ───────────────────────────────────────────────────
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const subtitleFade = useRef(new Animated.Value(1)).current;
  const controlsFade = useRef(new Animated.Value(1)).current;
  const progressGlow = useRef(new Animated.Value(0)).current;
  const prevSubRef = useRef('');

  // ── Load subtitles from tracks.json ───────────────────────
  useEffect(() => {
    if (track?.subtitles && track.subtitles.length > 0) {
      const cues: SubtitleCue[] = track.subtitles.map((s, i) => ({
        index: i + 1,
        startTime: s.start,
        endTime: s.end,
        text: s.text,
      }));
      subtitleCuesRef.current = cues;
      setSubtitleCues(cues);
    } else {
      subtitleCuesRef.current = [];
      setSubtitleCues([]);
    }
  }, [trackId]);

  // ── Animations ────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressGlow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progressGlow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // ── Video events ──────────────────────────────────────────
  const isPlayingRef = useRef(false);
  const showControlsRef = useRef(true);

  useEffect(() => {
    const playSub = player.addListener('playingChange', ({ isPlaying: playing }) => {
      isPlayingRef.current = playing;
      setIsPlaying(playing);
      if (playing) {
        startTimeUpdates();
        // Auto-hide controls after 3s when playing starts
        scheduleHide();
      } else {
        stopTimeUpdates();
        // When paused, show controls and keep them visible
        if (!showControlsRef.current) {
          showControlsRef.current = true;
          setShowControls(true);
          controlsFade.setValue(1);
        }
        cancelHide();
      }
    });

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setDuration(player.duration || 0);
        try { player.play(); } catch {}
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      // Show controls permanently when video ends
      showControlsRef.current = true;
      setShowControls(true);
      controlsFade.setValue(1);
      cancelHide();
    });

    return () => {
      playSub.remove();
      statusSub.remove();
      endSub.remove();
      stopTimeUpdates();
      cancelHide();
    };
  }, [player]);

  // ── Time tracking + subtitle sync ─────────────────────────
  const startTimeUpdates = useCallback(() => {
    stopTimeUpdates();
    timeUpdateInterval.current = setInterval(() => {
      try {
        const time = player.currentTime || 0;
        setCurrentTime(time);

        // Read from ref to avoid stale closure
        const cues = subtitleCuesRef.current;
        if (cues.length > 0) {
          const sub = getSubtitleAtTime(cues, time);
          if (sub !== prevSubRef.current) {
            prevSubRef.current = sub;
            setCurrentSubtitle(sub);
            if (sub) {
              subtitleFade.setValue(0);
              Animated.timing(subtitleFade, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start();
            }
          }
        }
      } catch {}
    }, 100);
  }, [player, subtitleFade]);

  const stopTimeUpdates = () => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current);
      timeUpdateInterval.current = null;
    }
  };

  // ── Controls visibility ───────────────────────────────────
  const cancelHide = () => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
  };

  const scheduleHide = () => {
    cancelHide();
    controlsTimer.current = setTimeout(() => {
      if (isPlayingRef.current && showControlsRef.current) {
        // Fade out
        Animated.timing(controlsFade, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          showControlsRef.current = false;
          setShowControls(false);
        });
      }
    }, 3000);
  };

  /** Tap screen — always toggle controls visibility */
  const toggleControls = () => {
    if (showControlsRef.current) {
      // Hide controls
      cancelHide();
      Animated.timing(controlsFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        showControlsRef.current = false;
        setShowControls(false);
      });
    } else {
      // Show controls
      showControlsRef.current = true;
      setShowControls(true);
      controlsFade.setValue(0);
      Animated.timing(controlsFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Auto-hide only if playing
      if (isPlayingRef.current) {
        scheduleHide();
      }
    }
  };

  // ── Playback controls ─────────────────────────────────────
  const togglePlay = () => {
    try {
      if (isPlayingRef.current) player.pause();
      else player.play();
    } catch {}
  };

  const seekBy = (seconds: number) => {
    try {
      const newTime = Math.max(0, Math.min((player.currentTime || 0) + seconds, duration));
      player.currentTime = newTime;
      setCurrentTime(newTime);
    } catch {}
    // Reset auto-hide timer if playing
    if (isPlayingRef.current) scheduleHide();
  };

  const seekTo = (fraction: number) => {
    try {
      const newTime = fraction * duration;
      player.currentTime = newTime;
      setCurrentTime(newTime);
    } catch {}
  };

  // ── Format time ───────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleBack = () => {
    try { player.pause(); } catch {}
    stopTimeUpdates();
    playSound('click');
    router.back();
  };

  // ── Downloading / Error state ──────────────────────────────
  if (downloading) {
    return (
      <View style={[s.container, s.center]}>
        <LinearGradient colors={['#0A0A2E', '#1A1A4E']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={palette.gold} />
        <Text style={[s.errorText, { marginTop: 16 }]}>
          Yuklanmoqda... {Math.round(downloadProgress * 100)}%
        </Text>
        <TouchableOpacity style={s.backBtnLarge} onPress={handleBack}>
          <Text style={s.backBtnText}>← Orqaga</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!videoSource) {
    return (
      <View style={[s.container, s.center]}>
        <LinearGradient colors={['#0A0A2E', '#1A1A4E']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 60 }}>🎬</Text>
        <Text style={s.errorText}>Video topilmadi</Text>
        <TouchableOpacity style={s.backBtnLarge} onPress={handleBack}>
          <Text style={s.backBtnText}>← Orqaga</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ── Video Layer ── */}
      <VideoView
        style={s.video}
        player={player}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />

      {/* ── Transparent touch layer (catches taps on Android + Web) ── */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={toggleControls}
      />

      {/* ── Subtitles Overlay ── */}
      {subtitlesEnabled && currentSubtitle ? (
        <Animated.View
          pointerEvents="none"
          style={[s.subtitleWrap, { opacity: subtitleFade }]}
        >
          <View style={s.subtitleBg}>
            <Text style={s.subtitleText}>{currentSubtitle}</Text>
          </View>
        </Animated.View>
      ) : null}

      {/* ── Controls Overlay ── */}
      {showControls && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: controlsFade }]}
        >
          {/* Top gradient + header */}
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent']}
            style={s.topGradient}
          >
            <TouchableOpacity style={s.headerBackBtn} onPress={handleBack}>
              <Text style={s.headerBackIcon}>←</Text>
            </TouchableOpacity>
            <View style={s.headerInfo}>
              <Text style={s.headerCover}>{cover}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
                <Text style={s.headerArtist}>SmartSpeech Kids</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.ccBtn, subtitlesEnabled && s.ccBtnActive]}
              onPress={() => setSubtitlesEnabled(!subtitlesEnabled)}
            >
              <Text style={[s.ccText, subtitlesEnabled && s.ccTextActive]}>CC</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Center playback controls */}
          <View style={s.centerControls}>
            <TouchableOpacity style={s.seekBtn} onPress={() => seekBy(-10)}>
              <Text style={s.seekIcon}>⏪</Text>
              <Text style={s.seekLabel}>10s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.playBtn} onPress={togglePlay}>
              <LinearGradient
                colors={isPlaying ? ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)'] : [palette.gold, palette.goldDeep]}
                style={[StyleSheet.absoluteFill, { borderRadius: 40 }]}
              />
              <Text style={s.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.seekBtn} onPress={() => seekBy(10)}>
              <Text style={s.seekIcon}>⏩</Text>
              <Text style={s.seekLabel}>10s</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom gradient + progress */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={s.bottomGradient}
          >
            {/* Time display */}
            <View style={s.timeRow}>
              <Text style={s.timeText}>{formatTime(currentTime)}</Text>
              <Text style={s.timeSep}>/</Text>
              <Text style={s.timeTextDim}>{formatTime(duration)}</Text>
            </View>

            {/* Progress bar */}
            <TouchableOpacity
              style={s.progressWrap}
              activeOpacity={1}
              onPress={(e) => {
                const x = e.nativeEvent.locationX;
                const barWidth = SW - 60;
                const fraction = Math.max(0, Math.min(1, x / barWidth));
                seekTo(fraction);
              }}
            >
              <View style={s.progressTrack}>
                <View style={[s.progressBuffered, { width: `${Math.min(progress + 10, 100)}%` }]} />
                <View style={[s.progressPlayed, { width: `${progress}%` }]}>
                  <LinearGradient
                    colors={[palette.gold, palette.coral]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <Animated.View
                  style={[
                    s.progressThumb,
                    {
                      left: `${progress}%`,
                      opacity: progressGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                      transform: [{
                        scale: progressGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.3],
                        }),
                      }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[palette.gold, '#FFF']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                  />
                </Animated.View>
              </View>
            </TouchableOpacity>

            {/* Subtitle status badge */}
            <View style={s.bottomInfoRow}>
              {subtitlesEnabled && subtitleCues.length > 0 && (
                <View style={s.ccBadge}>
                  <Text style={s.ccBadgeText}>CC</Text>
                  <Text style={s.ccBadgeLabel}>Subtitles ON</Text>
                </View>
              )}
              {subtitleCues.length === 0 && (
                <Text style={s.noSubsText}>Subtitle mavjud emas</Text>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  video: { flex: 1, width: '100%', height: '100%' },

  errorText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 16 },
  backBtnLarge: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Subtitles
  subtitleWrap: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  subtitleBg: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: '85%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  subtitleText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: 30,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Top gradient / header
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 100,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: -2 },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    gap: 12,
  },
  headerCover: { fontSize: 30 },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerArtist: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  ccBtn: {
    width: 44,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ccBtnActive: {
    borderColor: palette.gold,
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  ccText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ccTextActive: {
    color: palette.gold,
  },

  // Center controls
  centerControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50,
    zIndex: 90,
  },
  seekBtn: { alignItems: 'center', opacity: 0.85 },
  seekIcon: { fontSize: 32 },
  seekLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadowFx.lifted,
  },
  playIcon: { fontSize: 36 },

  // Bottom gradient / progress
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
    paddingHorizontal: 30,
    paddingBottom: 14,
    zIndex: 100,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timeSep: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  timeTextDim: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressWrap: { height: 28, justifyContent: 'center' },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'visible',
  },
  progressBuffered: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressPlayed: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
    ...shadowFx.card,
  },

  // Bottom info
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    height: 20,
  },
  ccBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    gap: 6,
  },
  ccBadgeText: {
    color: palette.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ccBadgeLabel: {
    color: 'rgba(255,215,0,0.7)',
    fontSize: 10,
    fontWeight: '700',
  },
  noSubsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
