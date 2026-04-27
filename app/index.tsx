import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Backdrop from '../components/dashboard/Backdrop';
import Locomotive from '../components/dashboard/Locomotive';
import { downloadCoreAssets } from '../utils/assetManager';
import { loadSettings } from '../utils/settingsManager';
import { playSound, preloadSounds } from '../utils/soundProvider';
import { palette, radius, shadowFx, spacing } from '../utils/theme';
import { t } from '../utils/translations';
import { downloadAllMissingVideos, requestStoragePermission } from '../utils/videoDownloader';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SPLASH_DURATION = 5500;

/** Twinkling star. */
function TwinkleStar({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
          ]),
          Animated.delay(900),
          Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.6, duration: 700, useNativeDriver: true }),
          ]),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: size,
        opacity,
        transform: [{ scale }],
        textShadowColor: 'rgba(255,223,100,0.85)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      }}
    >
      ✨
    </Animated.Text>
  );
}

export default function SplashScreen() {
  const [percent, setPercent] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  const loadingProgress = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.85)).current;
  const trainEntry = useRef(new Animated.Value(-SCREEN_W * 0.6)).current;
  const trainHover = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const initDoneRef = useRef(false);
  const splashElapsedRef = useRef(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        setDownloadStatus(t('splashLoading'));
        await loadSettings();
        await downloadCoreAssets(() => {});
        await preloadSounds();

        // Download missing videos if user is beginner
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.level === 'beginner') {
            await requestStoragePermission();
            await downloadAllMissingVideos((current, total) => {
              setDownloadStatus(`Downloading assets... ${current}/${total}`);
              loadingProgress.setValue(current / total);
            });
          }
        }

        playSound('magic');
      } catch (e) {
        console.warn('Initialization failed', e);
      } finally {
        initDoneRef.current = true;
        maybeNavigate();
      }
    };
    initialize();

    const listenerId = loadingProgress.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });

    // Header fade + scale in
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(headerScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();

    // Train rolls in from left
    Animated.sequence([
      Animated.delay(400),
      Animated.spring(trainEntry, { toValue: 0, friction: 7, tension: 22, useNativeDriver: true }),
    ]).start();

    // Continuous train hover bob
    Animated.loop(
      Animated.sequence([
        Animated.timing(trainHover, { toValue: -4, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(trainHover, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    // Progress card slide up
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.spring(cardSlide, { toValue: 0, friction: 7, tension: 38, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    // Loading bar will be controlled by download progress instead of time
    // If videos are already downloaded, we just jump to 100% quickly.
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: SPLASH_DURATION - 500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Bouncing dots
    Animated.loop(
      Animated.stagger(180, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: -8, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: -8, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: -8, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    ).start();

    const timer = setTimeout(() => {
      splashElapsedRef.current = true;
      maybeNavigate();
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(timer);
      loadingProgress.removeListener(listenerId);
    };
  }, []);

  async function maybeNavigate() {
    if (navigatedRef.current) return;
    if (!initDoneRef.current || !splashElapsedRef.current) return;
    navigatedRef.current = true;
    try {
      const userData = await AsyncStorage.getItem('user_data');
      router.replace(userData ? '/dashboard' : '/onboarding');
    } catch {
      router.replace('/onboarding');
    }
  }

  const loadingWidth = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const stars = [
    { delay: 300, x: SCREEN_W * 0.06, y: SCREEN_H * 0.12, size: 18 },
    { delay: 1200, x: SCREEN_W * 0.92, y: SCREEN_H * 0.08, size: 16 },
    { delay: 700, x: SCREEN_W * 0.04, y: SCREEN_H * 0.55, size: 14 },
    { delay: 1600, x: SCREEN_W * 0.9, y: SCREEN_H * 0.52, size: 17 },
    { delay: 2000, x: SCREEN_W * 0.22, y: SCREEN_H * 0.32, size: 15 },
    { delay: 1400, x: SCREEN_W * 0.78, y: SCREEN_H * 0.32, size: 13 },
    { delay: 500, x: SCREEN_W * 0.5, y: SCREEN_H * 0.06, size: 16 },
  ];

  const trainHeight = SCREEN_H * 0.28;

  return (
    <View style={styles.container}>
      {/* Parallax world (sky + sun + clouds + mountains + ground) */}
      <Backdrop variant="forest" />

      {/* Twinkling stars */}
      {stars.map((s, i) => (
        <TwinkleStar key={i} {...s} />
      ))}

      {/* Title block */}
      <Animated.View
        style={[
          styles.titleBlock,
          { opacity: headerOpacity, transform: [{ scale: headerScale }] },
        ]}
      >
        <View style={styles.titleCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.06)']}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.brand}>SmartSpeech</Text>
          <View style={styles.brandUnderline}>
            <LinearGradient
              colors={[palette.gold, '#FFB347']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.tagline}>{t('splashSubtitle')}</Text>
        </View>
      </Animated.View>

      {/* Hero train rolling across the horizon */}
      <Animated.View
        style={[
          styles.trainLayer,
          { transform: [{ translateX: trainEntry }, { translateY: trainHover }] },
        ]}
      >
        <LocoPlaceholder height={trainHeight} />
      </Animated.View>

      {/* Progress card at bottom */}
      <Animated.View
        style={[
          styles.progressCard,
          { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,248,225,0.9)']}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text style={styles.loadLabel}>{downloadStatus || t('splashLoading')}</Text>

        <View style={styles.barOuter}>
          <View style={styles.barTrack} />
          <Animated.View style={[styles.barFill, { width: loadingWidth }]}>
            <LinearGradient
              colors={['#FF9A8B', palette.gold, palette.mint, palette.sky, palette.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.percent}>{percent}%</Text>
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, { backgroundColor: palette.coral, transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.dot, { backgroundColor: palette.gold, transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.dot, { backgroundColor: palette.mint, transform: [{ translateY: dot3 }] }]} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/** Wraps Locomotive with a looping wheel spin value local to the splash. */
function LocoPlaceholder({ height }: { height: number }) {
  const wheel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(wheel, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const spin = wheel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return <Locomotive wheelSpin={spin} height={height} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleBlock: {
    position: 'absolute',
    top: SCREEN_H * 0.1,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  titleCard: {
    paddingHorizontal: spacing.xl + 8,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadowFx.lifted,
  },
  brand: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandUnderline: {
    width: 120,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  tagline: {
    marginTop: 10,
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  trainLayer: {
    position: 'absolute',
    bottom: SCREEN_H * 0.22,
    left: SCREEN_W * 0.15,
    zIndex: 5,
  },
  progressCard: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    ...shadowFx.lifted,
    zIndex: 20,
  },
  loadLabel: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
    color: palette.inkSoft,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  barOuter: {
    width: '100%',
    height: 16,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  barTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.04)' },
  barFill: { height: '100%', borderRadius: 10, overflow: 'hidden' },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  percent: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.ink,
    letterSpacing: 2,
  },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
