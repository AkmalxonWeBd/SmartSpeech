import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { preloadSounds, playSound } from '../utils/soundProvider';
import { t } from '../utils/translations';
import { loadSettings } from '../utils/settingsManager';
import { API } from '../utils/api';
import { downloadCoreAssets, getAssetModule } from '../utils/assetManager';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SPLASH_DURATION = 5500; // 5.5 seconds total

// ========== FLOATING PARTICLE ==========
function FloatingParticle({ delay, startX, startY, color, size }: {
  delay: number; startX: number; startY: number; color: string; size: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 2200, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.timing(translateY, {
            toValue: -120 - Math.random() * 80,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: (Math.random() - 0.5) * 100,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(translateX, {
              toValue: (Math.random() - 0.5) * 60,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { scale }],
      }}
    />
  );
}

// ========== FLOATING STAR ==========
function FloatingStar({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.spring(scale, { toValue: 1, friction: 3, tension: 60, useNativeDriver: true }),
            Animated.delay(1200),
            Animated.timing(scale, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          Animated.timing(rotation, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -30,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: [{ scale }, { rotate: spin }, { translateY }],
      }}
    >
      <Text style={{ fontSize: size, textAlign: 'center' }}>⭐</Text>
    </Animated.View>
  );
}

// ========== MAIN SPLASH SCREEN ==========
export default function SplashScreen() {
  const [percent, setPercent] = useState(0);

  // Mascot animation
  const mascotScale = useRef(new Animated.Value(0)).current;
  const mascotBounce = useRef(new Animated.Value(0)).current;

  // Loading bar
  const loadingProgress = useRef(new Animated.Value(0)).current;

  // Loading dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Rainbow glow
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Subtitle text
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Background pulse
  const bgPulse = useRef(new Animated.Value(0)).current;

  // Percent text glow
  const percentGlow = useRef(new Animated.Value(0)).current;

  // Tracks whether `initialize()` (settings, asset download, sound preload) finished
  const initDoneRef = useRef(false);
  const splashElapsedRef = useRef(false);

  useEffect(() => {
    // Load settings, download assets, then preload sounds
    const initialize = async () => {
      try {
        await loadSettings();

        // Asset Download Phase — assetlar tushirilmaguncha videoga o'tish ekranni qoraytiradi
        await downloadCoreAssets(() => {});

        await preloadSounds();
        playSound('magic');
      } catch (e) {
        console.warn('Initialization failed', e);
      } finally {
        initDoneRef.current = true;
        maybeNavigate();
      }
    };
    initialize();

    // Track percentage from animated value
    const listenerId = loadingProgress.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });

    // Background pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgPulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Mascot entrance with bounce
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(mascotScale, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous mascot float
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, {
          toValue: -10,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mascotBounce, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtitle fade in
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    // Loading bar — 5 seconds from 0% to 100%
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: SPLASH_DURATION - 500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Percent glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(percentGlow, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(percentGlow, { toValue: 0.6, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Loading dots bounce
    Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(dot1, { toValue: -10, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot1, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, { toValue: -10, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, { toValue: -10, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    // Minimal splash duration has passed — now waiting (or ready) for initialize()
    const timer = setTimeout(() => {
      splashElapsedRef.current = true;
      maybeNavigate();
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(timer);
      loadingProgress.removeListener(listenerId);
    };
  }, []);

  // Splash ham tugagan va initialize() ham bitgan bo'lsa — navigatsiya
  const navigatedRef = useRef(false);
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

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [
      'rgba(255, 107, 107, 0.5)',
      'rgba(255, 217, 61, 0.5)',
      'rgba(107, 255, 107, 0.5)',
      'rgba(107, 197, 255, 0.5)',
      'rgba(199, 107, 255, 0.5)',
      'rgba(255, 107, 107, 0.5)',
    ],
  });

  const particles = [
    { delay: 0, startX: SCREEN_W * 0.1, startY: SCREEN_H * 0.7, color: '#FF6B6B', size: 8 },
    { delay: 400, startX: SCREEN_W * 0.2, startY: SCREEN_H * 0.8, color: '#4ECDC4', size: 6 },
    { delay: 800, startX: SCREEN_W * 0.35, startY: SCREEN_H * 0.75, color: '#FFD93D', size: 10 },
    { delay: 200, startX: SCREEN_W * 0.55, startY: SCREEN_H * 0.72, color: '#6BCB77', size: 7 },
    { delay: 600, startX: SCREEN_W * 0.7, startY: SCREEN_H * 0.78, color: '#C77DFF', size: 9 },
    { delay: 1000, startX: SCREEN_W * 0.85, startY: SCREEN_H * 0.7, color: '#FF6B6B', size: 6 },
    { delay: 300, startX: SCREEN_W * 0.15, startY: SCREEN_H * 0.5, color: '#45B7D1', size: 5 },
    { delay: 700, startX: SCREEN_W * 0.8, startY: SCREEN_H * 0.5, color: '#FFD93D', size: 7 },
    { delay: 500, startX: SCREEN_W * 0.45, startY: SCREEN_H * 0.85, color: '#FF9FF3', size: 8 },
    { delay: 900, startX: SCREEN_W * 0.6, startY: SCREEN_H * 0.6, color: '#54A0FF', size: 6 },
  ];

  const stars = [
    { delay: 300, x: SCREEN_W * 0.06, y: SCREEN_H * 0.12, size: 18 },
    { delay: 1200, x: SCREEN_W * 0.92, y: SCREEN_H * 0.08, size: 16 },
    { delay: 700, x: SCREEN_W * 0.04, y: SCREEN_H * 0.6, size: 14 },
    { delay: 1600, x: SCREEN_W * 0.9, y: SCREEN_H * 0.55, size: 17 },
    { delay: 2000, x: SCREEN_W * 0.15, y: SCREEN_H * 0.32, size: 15 },
    { delay: 1400, x: SCREEN_W * 0.85, y: SCREEN_H * 0.32, size: 13 },
    { delay: 500, x: SCREEN_W * 0.5, y: SCREEN_H * 0.06, size: 16 },
    { delay: 1800, x: SCREEN_W * 0.3, y: SCREEN_H * 0.08, size: 12 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0a2e', '#16213e', '#0f3460', '#1a0a2e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated background glow orbs */}
      <Animated.View style={[styles.glowOrb, styles.glowOrb1, {
        opacity: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
        transform: [{ scale: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
      }]} />
      <Animated.View style={[styles.glowOrb, styles.glowOrb2, {
        opacity: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }),
        transform: [{ scale: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.7] }) }],
      }]} />
      <Animated.View style={[styles.glowOrb, styles.glowOrb3, {
        opacity: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] }),
        transform: [{ scale: bgPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] }) }],
      }]} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <FloatingParticle key={`p-${i}`} {...p} />
      ))}

      {/* Floating stars */}
      {stars.map((s, i) => (
        <FloatingStar key={`s-${i}`} {...s} />
      ))}

      {/* ========== MAIN CONTENT ========== */}
      <View style={styles.content}>

        {/* Mascot image — centered at top */}
        <Animated.View style={[styles.mascotContainer, {
          transform: [
            { scale: mascotScale },
            { translateY: mascotBounce },
          ],
        }]}>
          <Image
            source={getAssetModule('images', 'login_page_loading.jpg')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Loading section — below mascot */}
        <Animated.View style={[styles.loadingSection, { opacity: subtitleOpacity }]}>

          {/* Subtitle text */}
          <Text style={styles.subtitleText}>
            {t('splashSubtitle')}
          </Text>

          {/* Loading bar container */}
          <View style={styles.loadingBarOuter}>
            <Animated.View style={[styles.loadingBarBg, { backgroundColor: glowColor }]} />
            <Animated.View style={[styles.loadingBarInner, { width: loadingWidth }]}>
              <LinearGradient
                colors={['#FF6B6B', '#FFD93D', '#6BCB77', '#45B7D1', '#C77DFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          {/* Percentage text */}
          <Animated.View style={[styles.percentRow, { opacity: percentGlow }]}>
            <Text style={styles.percentText}>{percent}%</Text>
          </Animated.View>

          {/* Bouncing dots */}
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.bounceDot, { backgroundColor: '#FF6B6B', transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.bounceDot, { backgroundColor: '#FFD93D', transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.bounceDot, { backgroundColor: '#6BCB77', transform: [{ translateY: dot3 }] }]} />
          </View>

          <Text style={styles.loadingText}>{t('splashLoading')}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 200,
  },
  glowOrb1: {
    width: 300,
    height: 300,
    backgroundColor: '#C77DFF',
    top: -50,
    left: -80,
  },
  glowOrb2: {
    width: 250,
    height: 250,
    backgroundColor: '#45B7D1',
    bottom: -60,
    right: -60,
  },
  glowOrb3: {
    width: 200,
    height: 200,
    backgroundColor: '#FFD93D',
    top: '40%',
    right: '20%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mascotGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.3,
  },
  mascotImage: {
    width: 160,
    height: 160,
    borderRadius: 24,
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 450,
  },
  subtitleText: {
    fontSize: 20,
    color: '#FFD93D',
    fontWeight: '700',
    marginBottom: 18,
    textShadowColor: 'rgba(255, 217, 61, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 2,
    textAlign: 'center',
  },
  loadingBarOuter: {
    width: '85%',
    height: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  loadingBarBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  loadingBarInner: {
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  percentRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  percentText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(255, 217, 61, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    letterSpacing: 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  bounceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
  },
});
