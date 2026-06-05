import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { playSound } from '../utils/soundProvider';
import { palette, radius, shadowFx, spacing } from '../utils/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tracksData: Track[] = require('../assets/soundtracks/tracks.json');

type Track = {
  id: string;
  title: string;
  artist: string;
  type: 'audio' | 'video';
  duration: string;
  file: string;
  cover: string;
};

export default function SoundtracksScreen() {
  const { width: SW, height: SH } = useWindowDimensions();
  const headerSlide = useRef(new Animated.Value(-80)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(listFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBack = () => {
    playSound('click');
    router.replace('/dashboard');
  };

  const handleTrackPress = (track: Track) => {
    playSound('click');
    router.push({
      pathname: '/player',
      params: { trackId: track.id },
    });
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#0A0A2E', '#1A1A4E', '#2D1B69']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* ── Decorative background circles ── */}
      <View pointerEvents="none" style={s.bgCircle1} />
      <View pointerEvents="none" style={s.bgCircle2} />

      {/* ── Header ── */}
      <Animated.View
        style={[
          s.header,
          { transform: [{ translateY: headerSlide }], opacity: headerFade },
        ]}
      >
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>🎵</Text>
          <Text style={s.headerTitle}>Soundtracks</Text>
          <Text style={s.headerSub}>{tracksData.length} ta trek</Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* ── Track list ── */}
      <Animated.View style={[s.listWrap, { opacity: listFade }]}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tracksData.map((track, index) => (
            <TrackCard key={track.id} track={track} index={index} onPress={handleTrackPress} />
          ))}

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── Individual track card ────────────────────────────────────
function TrackCard({
  track,
  index,
  onPress,
}: {
  track: Track;
  index: number;
  onPress: (t: Track) => void;
}) {
  const slideX = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, {
        toValue: 0,
        friction: 7,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isVideo = track.type === 'video';
  const typeColors: [string, string] = isVideo
    ? ['#E040FB', '#AA00FF']
    : ['#00E5FF', '#0091EA'];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={() =>
        Animated.spring(pressScale, { toValue: 0.96, friction: 5, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()
      }
      onPress={() => onPress(track)}
    >
      <Animated.View
        style={[
          s.card,
          {
            transform: [{ translateX: slideX }, { scale: pressScale }],
            opacity,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        />

        {/* Cover */}
        <View style={s.coverWrap}>
          <LinearGradient
            colors={typeColors}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={s.coverEmoji}>{track.cover}</Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={s.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={s.trackArtist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>

        {/* Type badge + duration */}
        <View style={s.cardRight}>
          <View style={[s.typeBadge, { backgroundColor: isVideo ? 'rgba(224,64,251,0.2)' : 'rgba(0,229,255,0.2)' }]}>
            <Text style={[s.typeText, { color: isVideo ? '#E040FB' : '#00E5FF' }]}>
              {isVideo ? '🎬 Video' : '🎧 Audio'}
            </Text>
          </View>
          <Text style={s.duration}>{track.duration}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0,229,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowFx.soft,
  },
  backIcon: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: -2 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerEmoji: { fontSize: 28 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(124,58,237,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1,
    marginTop: 2,
  },
  listWrap: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    ...shadowFx.soft,
  },
  coverWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadowFx.card,
  },
  coverEmoji: { fontSize: 30 },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  trackArtist: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    marginTop: 3,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  duration: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
  },
});
