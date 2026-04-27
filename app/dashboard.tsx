import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGrad,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { playSound } from '../utils/soundProvider';
import { startBackgroundMusic, stopBackgroundMusic } from '../utils/backgroundMusic';
import { t } from '../utils/translations';
import { API } from '../utils/api';
import Backdrop, { BackdropVariant } from '../components/dashboard/Backdrop';
import Mascot, { BOSS_MASCOT, LESSON_MASCOTS } from '../components/dashboard/Mascot';
import Locomotive from '../components/dashboard/Locomotive';
import Wagon from '../components/dashboard/Wagon';
import { levelVibe, palette, radius, shadowFx, spacing } from '../utils/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CAR_HEIGHT = SCREEN_H * 0.34;
const LOCO_HEIGHT = SCREEN_H * 0.34;
// Match the wagon's intrinsic aspect ratio (viewBox 240x200 => 1.2)
// so neighbouring wagons touch at their couplings instead of having
// visible pillar-box gaps around each SVG.
const CAR_WIDTH = CAR_HEIGHT * 1.2;
const TOTAL_LESSONS = 12;

type UserData = { age: number; name: string; level: string; progress: number };

// ═══════════════════════════════════════════════
// RAILROAD TRACK — polished metal rails + wooden sleepers
// ═══════════════════════════════════════════════
function RailroadTrack() {
  const w = SCREEN_W * 5;
  return (
    <View style={trackStyles.container} pointerEvents="none">
      <Svg width={w} height={56}>
        <Defs>
          <SvgGrad id="ballast" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7A6A4F" />
            <Stop offset="1" stopColor="#3B3024" />
          </SvgGrad>
          <SvgGrad id="rail" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9A9A9A" />
            <Stop offset="0.5" stopColor="#EDEDED" />
            <Stop offset="1" stopColor="#4A4A4A" />
          </SvgGrad>
        </Defs>
        {/* Ballast (gravel bed) */}
        <Rect x={0} y={36} width={w} height={20} fill="url(#ballast)" />
        {/* Gravel speckle */}
        {[...Array(Math.ceil(w / 18))].map((_, i) => (
          <Circle key={i} cx={i * 18 + (i % 3) * 3} cy={46 + (i % 3) * 2} r={1.2} fill="rgba(0,0,0,0.25)" />
        ))}
        {/* Sleepers */}
        {[...Array(Math.ceil(w / 44))].map((_, i) => (
          <Rect
            key={`tie-${i}`}
            x={i * 44 + 2}
            y={22}
            width={36}
            height={14}
            rx={2}
            fill="#5A3A1E"
            stroke="#2C1B0D"
            strokeWidth={0.6}
          />
        ))}
        {/* Two metal rails */}
        <Rect x={0} y={14} width={w} height={6} fill="url(#rail)" />
        <Rect x={0} y={28} width={w} height={6} fill="url(#rail)" />
        {/* Rail highlight */}
        <Rect x={0} y={14} width={w} height={1.2} fill="rgba(255,255,255,0.55)" />
        <Rect x={0} y={28} width={w} height={1.2} fill="rgba(255,255,255,0.55)" />
      </Svg>
    </View>
  );
}

const trackStyles = StyleSheet.create({
  container: { position: 'absolute', bottom: 4, left: 0, height: 56 },
});

// ═══════════════════════════════════════════════
// LESSON CAR — wraps Wagon with mascot, halo/sparkle, press scale
// ═══════════════════════════════════════════════
type LessonCarProps = {
  index: number;
  isUnlocked: boolean;
  isNewlyUnlocked?: boolean;
  wheelSpin: Animated.AnimatedInterpolation<string>;
  carColors: [string, string, string];
  level: string;
  mascot: string;
  onLayoutX?: (index: number, x: number) => void;
};

function LessonCar({
  index,
  isUnlocked,
  isNewlyUnlocked,
  wheelSpin,
  carColors,
  level,
  mascot,
  onLayoutX,
}: LessonCarProps) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const unlockScale = useRef(new Animated.Value(isNewlyUnlocked ? 0 : 1)).current;
  const revealGlow = useRef(new Animated.Value(0)).current;
  const sparkleProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isNewlyUnlocked) return;
    const timer = setTimeout(() => {
      playSound('train');
      Animated.sequence([
        Animated.spring(unlockScale, { toValue: 1.08, friction: 4, tension: 28, useNativeDriver: true }),
        Animated.spring(unlockScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.loop(
          Animated.sequence([
            Animated.timing(revealGlow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(revealGlow, { toValue: 0.25, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          { iterations: 3 },
        ),
        Animated.timing(revealGlow, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
      Animated.timing(sparkleProgress, { toValue: 1, duration: 900, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, 900);
    return () => clearTimeout(timer);
  }, [isNewlyUnlocked]);

  const handlePress = async () => {
    if (!isUnlocked) return;
    playSound('click');

    if (level === 'beginner' && index === 1) {
      const watched = await AsyncStorage.getItem('intro_video_watched');
      if (!watched) await AsyncStorage.setItem('intro_video_watched', 'true');
      router.push({
        pathname: '/intro-video',
        params: { nextRoute: `/lesson/${index}`, canSkip: watched ? 'true' : 'false' },
      });
      return;
    }

    if (level === 'a1' || level === 'a2') {
      router.push({
        pathname: '/word-lesson',
        params: { level: level.toUpperCase(), lesson: index.toString() },
      });
      return;
    }

    router.push(`/lesson/${index}`);
  };

  const sparkles = Array.from({ length: 8 }, (_, i) => i);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={!isUnlocked}
      onPressIn={() => {
        if (!isUnlocked) return;
        Animated.spring(pressScale, { toValue: 0.95, friction: 5, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      }}
      onPress={handlePress}
      onLayout={(e) => onLayoutX && onLayoutX(index, e.nativeEvent.layout.x)}
    >
      <Animated.View
        style={[
          carStyles.wrapper,
          { transform: [{ scale: pressScale }, { scale: unlockScale }] },
        ]}
      >
        {isNewlyUnlocked && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                carStyles.revealHalo,
                {
                  opacity: revealGlow,
                  transform: [
                    {
                      scale: revealGlow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,215,0,0.65)', 'rgba(255,215,0,0.15)', 'transparent']}
                style={[StyleSheet.absoluteFill, { borderRadius: 200 }]}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>
            {sparkles.map((i) => {
              const angle = (i / sparkles.length) * Math.PI * 2;
              const dx = Math.cos(angle);
              const dy = Math.sin(angle);
              return (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: '35%',
                    left: '50%',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#FFE48A',
                    shadowColor: '#FFD700',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius: 8,
                    elevation: 6,
                    opacity: sparkleProgress.interpolate({
                      inputRange: [0, 0.2, 1],
                      outputRange: [0, 1, 0],
                    }),
                    transform: [
                      { translateX: sparkleProgress.interpolate({ inputRange: [0, 1], outputRange: [0, dx * 120] }) },
                      { translateY: sparkleProgress.interpolate({ inputRange: [0, 1], outputRange: [0, dy * 120] }) },
                      { scale: sparkleProgress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.1, 0.3] }) },
                    ],
                  }}
                />
              );
            })}
          </>
        )}

        {/* Mascot perched on top */}
        <View style={carStyles.mascotSlot}>
          <Mascot emoji={mascot} size={60} delay={index * 120} locked={!isUnlocked} />
        </View>

        {/* Realistic SVG wagon */}
        <Wagon
          width={CAR_WIDTH}
          height={CAR_HEIGHT}
          wheelSpin={wheelSpin}
          colors={carColors}
          index={index}
          locked={!isUnlocked}
        />

        {/* Lesson label below the wagon */}
        <View style={[carStyles.label, !isUnlocked && { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
          <Text style={carStyles.labelText}>
            {isUnlocked ? t('lessonLabel').toUpperCase() : '—'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const carStyles = StyleSheet.create({
  wrapper: {
    width: CAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: CAR_HEIGHT + 110,
    marginHorizontal: 0,
  },
  mascotSlot: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  labelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  revealHalo: {
    position: 'absolute',
    top: CAR_HEIGHT * 0.05,
    left: CAR_WIDTH * 0.05,
    right: CAR_WIDTH * 0.05,
    bottom: 40,
    borderRadius: 200,
    zIndex: 0,
  },
});

// ═══════════════════════════════════════════════
// BOSS CAR — same wagon silhouette but bigger, crown mascot
// ═══════════════════════════════════════════════
function BossCar({
  wheelSpin,
  isUnlocked,
  level,
  onLayoutX,
}: {
  wheelSpin: Animated.AnimatedInterpolation<string>;
  isUnlocked: boolean;
  level: string;
  onLayoutX?: (x: number) => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!isUnlocked) return;
    playSound('click');
    router.push({ pathname: '/exam', params: { level } });
  };

  const bossColors: [string, string, string] = ['#FFE066', '#E39E2E', '#8B5A00'];
  const bossW = CAR_WIDTH * 1.25;
  const bossH = CAR_HEIGHT * 1.05;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={!isUnlocked}
      onPressIn={() => isUnlocked && Animated.spring(pressScale, { toValue: 0.95, friction: 5, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
      onPress={handlePress}
      onLayout={(e) => onLayoutX && onLayoutX(e.nativeEvent.layout.x)}
    >
      <Animated.View
        style={[
          bossStyles.wrapper,
          { transform: [{ scale: pressScale }], width: bossW, height: bossH + 130 },
        ]}
      >
        {/* Crown + boss mascot */}
        <View style={bossStyles.crownSlot}>
          <Text style={{ fontSize: 26 }}>{isUnlocked ? '👑' : '🔒'}</Text>
        </View>
        <View style={bossStyles.mascotSlot}>
          <Mascot emoji={BOSS_MASCOT} size={68} delay={0} locked={!isUnlocked} />
        </View>

        <Wagon
          width={bossW}
          height={bossH}
          wheelSpin={wheelSpin}
          colors={bossColors}
          index={99}
          locked={!isUnlocked}
          boss
        />

        <View style={[bossStyles.label, !isUnlocked && { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
          <Text style={bossStyles.labelTitle}>{t('bossTitle')}</Text>
          <Text style={bossStyles.labelSub}>
            {isUnlocked ? t('bossSubtitle') : t('bossLocked')}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const bossStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 0,
  },
  crownSlot: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 6,
  },
  mascotSlot: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.55)',
    alignItems: 'center',
  },
  labelTitle: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
  labelSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '700',
  },
});

// ═══════════════════════════════════════════════
// MAIN DASHBOARD SCREEN
// ═══════════════════════════════════════════════
export default function DashboardScreen() {
  const params = useLocalSearchParams();
  const newlyUnlockedLesson = params.unlockedLesson ? parseInt(params.unlockedLesson as string, 10) : null;
  const levelUp = (params.levelUp as string) || null;

  const [userData, setUserData] = useState<UserData | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const wagonXRef = useRef<Record<number, number>>({});
  const bossXRef = useRef<number | null>(null);
  const didAutoScrollRef = useRef(false);

  const trainEntry = useRef(new Animated.Value(SCREEN_W + 200)).current;
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-60)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const settingsRotate = useRef(new Animated.Value(0)).current;

  const scrollToTarget = () => {
    if (didAutoScrollRef.current) return;
    if (newlyUnlockedLesson == null) return;

    let targetX: number | undefined;
    if (newlyUnlockedLesson > TOTAL_LESSONS) {
      if (bossXRef.current != null) targetX = bossXRef.current;
    } else if (wagonXRef.current[newlyUnlockedLesson] != null) {
      targetX = wagonXRef.current[newlyUnlockedLesson];
    }

    if (targetX == null) return;
    didAutoScrollRef.current = true;

    // trainRow sits inside a ScrollView whose contentContainerStyle has
    // paddingLeft, so onLayout x is relative to the row, not the scroll content.
    const centered = Math.max(0, targetX + 40 - (SCREEN_W - CAR_WIDTH) / 2);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: centered, y: 0, animated: true });
    }, 650);
  };

  const onWagonLayout = (index: number, x: number) => {
    wagonXRef.current[index] = x;
    scrollToTarget();
  };
  const onBossLayout = (x: number) => {
    bossXRef.current = x;
    scrollToTarget();
  };

  const vibes: Record<string, { backdrop: BackdropVariant; carColors: [string, string, string]; text: string }> = {
    beginner: {
      backdrop: 'forest',
      carColors: [levelVibe.beginner.car[0], levelVibe.beginner.car[1], levelVibe.beginner.car[2]],
      text: t('vibeTextBeginner'),
    },
    a1: {
      backdrop: 'sky',
      carColors: [levelVibe.a1.car[0], levelVibe.a1.car[1], levelVibe.a1.car[2]],
      text: t('vibeTextA1'),
    },
    a2: {
      backdrop: 'space',
      carColors: [levelVibe.a2.car[0], levelVibe.a2.car[1], levelVibe.a2.car[2]],
      text: t('vibeTextA2'),
    },
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await API.getUser();
        if (user) setUserData(user);
      } catch (e) {
        console.warn('Failed to load user data', e);
      }
    };
    loadData();

    playSound('train');
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(trainEntry, { toValue: 0, friction: 6, tension: 18, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(wheelRotation, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const level = userData?.level || 'beginner';

  useFocusEffect(
    useCallback(() => {
      // Start music when dashboard comes into focus
      if (userData) {
        startBackgroundMusic(level);
      }
      return () => {
        // Stop music when navigating away from dashboard
        stopBackgroundMusic();
      };
    }, [level, userData])
  );

  const vibe = vibes[level] || vibes.beginner;
  const wheelSpin = wheelRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const settingsGearRotation = settingsRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const handleSettingsPress = () => {
    playSound('click');
    Animated.sequence([
      Animated.timing(settingsRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(settingsRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => router.push('/settings' as any), 250);
  };

  return (
    <View style={styles.container}>
      {/* Parallax world backdrop */}
      <Backdrop variant={vibe.backdrop} />

      {/* Header — glassy greeting card + settings gear */}
      <Animated.View
        style={[
          styles.header,
          { transform: [{ translateY: headerSlide }], opacity: headerFade },
        ]}
      >
        <Image
          source={require('../assets/images/login_page_loading.jpg')}
          style={styles.headerLogo}
          resizeMode="cover"
        />
        <View style={styles.greetingCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)']}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          {userData && (
            <>
              <Text style={styles.greeting}>{t('greeting', { name: userData.name })}</Text>
              <View style={styles.levelBadge}>
                <LinearGradient
                  colors={[palette.gold, palette.goldDeep]}
                  style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.levelText}>
                  {userData.level.toUpperCase()} · {vibe.text}
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsBtn}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)']}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
          <Animated.Text
            style={[styles.settingsIcon, { transform: [{ rotate: settingsGearRotation }] }]}
          >
            ⚙️
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Train area */}
      <View style={styles.trainArea}>
        <RailroadTrack />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={CAR_WIDTH}
          decelerationRate="fast"
        >
          <Animated.View
            style={[styles.trainRow, { transform: [{ translateX: trainEntry }] }]}
          >
            <Locomotive wheelSpin={wheelSpin} height={LOCO_HEIGHT} />
            {Array.from({ length: TOTAL_LESSONS }, (_, i) => {
              const lessonNum = i + 1;
              const progress = userData?.progress || 1;
              const isUnlocked = lessonNum <= progress;
              const isNewlyUnlocked = lessonNum === newlyUnlockedLesson;
              const mascot = LESSON_MASCOTS[i % LESSON_MASCOTS.length];

              return (
                <LessonCar
                  key={i}
                  index={lessonNum}
                  isUnlocked={isUnlocked}
                  isNewlyUnlocked={isNewlyUnlocked}
                  wheelSpin={wheelSpin}
                  carColors={vibe.carColors}
                  level={level}
                  mascot={mascot}
                  onLayoutX={onWagonLayout}
                />
              );
            })}
            <BossCar
              wheelSpin={wheelSpin}
              isUnlocked={(userData?.progress || 1) > TOTAL_LESSONS}
              level={level}
              onLayoutX={onBossLayout}
            />
          </Animated.View>
        </ScrollView>
      </View>

      {/* Level-up banner */}
      {levelUp ? <LevelUpBanner targetLevel={levelUp} /> : null}
    </View>
  );
}

// ═══════════════════════════════════════════════
// LEVEL-UP BANNER (shown after exam transitions)
// ═══════════════════════════════════════════════
function LevelUpBanner({ targetLevel }: { targetLevel: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setHidden(true));
  }, []);

  if (hidden) return null;

  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 220] });
  const label = targetLevel.toUpperCase();

  return (
    <Animated.View pointerEvents="none" style={[bannerStyles.overlay, { opacity }]}>
      <Animated.View style={[bannerStyles.card, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={[palette.gold, '#FFA500', palette.gold]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Animated.View
          style={[bannerStyles.shine, { transform: [{ translateX: shimmerX }, { rotate: '18deg' }] }]}
        />
        <Text style={bannerStyles.kicker}>{t('newLevel')}</Text>
        <Text style={bannerStyles.title}>{label}</Text>
        <Text style={bannerStyles.subtitle}>{t('unlocked')}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    paddingHorizontal: 44,
    paddingVertical: 22,
    borderRadius: radius.xl,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    ...shadowFx.glow(palette.gold),
  },
  shine: {
    position: 'absolute',
    top: -30,
    left: 0,
    width: 80,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  kicker: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
    letterSpacing: 4,
    fontWeight: '800',
  },
  title: {
    fontSize: 46,
    fontWeight: '900',
    color: palette.ink,
    letterSpacing: 6,
    marginTop: 4,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: spacing.md,
  },
  greetingCard: {
    flex: 1,
    marginRight: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
    ...shadowFx.cardLg,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    ...shadowFx.card,
  },
  levelText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  settingsBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
    ...shadowFx.cardLg,
  },
  settingsIcon: { fontSize: 24 },
  trainArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.7,
  },
  scrollContent: {
    paddingLeft: 40,
    paddingRight: SCREEN_W * 0.3,
    alignItems: 'flex-end',
    paddingBottom: 16,
  },
  trainRow: { flexDirection: 'row', alignItems: 'flex-end' },
});
