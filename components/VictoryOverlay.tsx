import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Reusable, professional victory overlay. Replaces the old
 * confetti-blizzard + spinning trophy applause with a calmer,
 * cinema-grade sequence:
 *  - radial light burst
 *  - spring-in golden trophy with pulsing halo
 *  - staggered title + subtitle fade/scale
 *  - optional level badge rising from below
 *  - slow drifting golden sparkles
 *
 * The component is purely presentational — it owns timing only.
 * Callers control when it appears and how long it stays, then
 * navigate onwards. It never blocks touches once `visible` flips
 * off (controlled via opacity/pointerEvents).
 */

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Short high-contrast label (e.g. "A1", "A2"). */
  badge?: string | null;
  /** Icon shown inside the spotlight. Defaults to a trophy. */
  icon?: string;
  /** Multiplier for overall palette — 'gold' | 'platinum' */
  tone?: 'gold' | 'platinum';
};

const GOLD = ['#FFE48A', '#FFD700', '#C89B00'];
const PLATINUM = ['#EFEFEF', '#B0B0B0', '#7A7A7A'];

function SparkleStream({
  delay,
  screenW,
  screenH,
  tone,
}: {
  delay: number;
  screenW: number;
  screenH: number;
  tone: 'gold' | 'platinum';
}) {
  const translateY = useRef(new Animated.Value(-40)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const startX = useRef(Math.random() * screenW).current;
  const drift = useRef((Math.random() - 0.5) * 80).current;
  const duration = useRef(3200 + Math.random() * 1800).current;
  const size = useRef(6 + Math.random() * 6).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenH + 40,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: drift,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration - 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(rotate, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
      translateY.setValue(-40);
      translateX.setValue(0);
      opacity.setValue(0);
      rotate.setValue(0);
    };
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const palette = tone === 'gold' ? GOLD : PLATINUM;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: startX,
        width: size,
        height: size,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
        opacity,
      }}
    >
      <LinearGradient
        colors={[palette[0], palette[1]]}
        style={[StyleSheet.absoluteFill, { borderRadius: size }]}
      />
    </Animated.View>
  );
}

export default function VictoryOverlay({
  visible,
  title,
  subtitle,
  badge,
  icon = '🏆',
  tone = 'gold',
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  const backdropOp = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOp = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.8)).current;
  const haloOp = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.85)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const subtitleOp = useRef(new Animated.Value(0)).current;
  const badgeY = useRef(new Animated.Value(80)).current;
  const badgeOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      // reset so it can replay cleanly next time
      backdropOp.setValue(0);
      burstScale.setValue(0);
      burstOp.setValue(0);
      trophyScale.setValue(0);
      haloScale.setValue(0.8);
      haloOp.setValue(0);
      titleScale.setValue(0.85);
      titleOp.setValue(0);
      subtitleOp.setValue(0);
      badgeY.setValue(80);
      badgeOp.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(backdropOp, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(burstScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(burstOp, {
            toValue: 0.9,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(burstOp, {
            toValue: 0.25,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(trophyScale, {
          toValue: 1,
          friction: 5,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOp, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOp, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(badgeY, {
          toValue: 0,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOp, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Slow breathing halo around the trophy.
    const halo = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 1.25,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(haloOp, {
            toValue: 0.55,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(haloScale, {
            toValue: 0.85,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(haloOp, {
            toValue: 0.2,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    halo.start();
    return () => halo.stop();
  }, [visible]);

  if (!visible) return null;

  const palette = tone === 'gold' ? GOLD : PLATINUM;
  const sparkles = Array.from({ length: 18 }, (_, i) => i);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, { opacity: backdropOp, zIndex: 1000 }]}
    >
      <LinearGradient
        colors={['#0A0A1E', '#11112B', '#1A0F2E']}
        style={StyleSheet.absoluteFill}
      />

      {/* Radial light burst behind trophy */}
      <Animated.View
        style={[
          styles.burst,
          {
            width: Math.max(screenW, screenH) * 1.4,
            height: Math.max(screenW, screenH) * 1.4,
            marginLeft: -(Math.max(screenW, screenH) * 0.7),
            marginTop: -(Math.max(screenW, screenH) * 0.7),
            opacity: burstOp,
            transform: [{ scale: burstScale }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            `${palette[0]}AA`,
            `${palette[1]}55`,
            'transparent',
          ]}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: Math.max(screenW, screenH) },
          ]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Sparkles */}
      {sparkles.map((i) => (
        <SparkleStream
          key={i}
          delay={i * 180}
          screenW={screenW}
          screenH={screenH}
          tone={tone}
        />
      ))}

      <View style={styles.center}>
        {/* Halo ring behind trophy */}
        <Animated.View
          style={[
            styles.halo,
            {
              opacity: haloOp,
              transform: [{ scale: haloScale }],
              shadowColor: palette[1],
            },
          ]}
        >
          <LinearGradient
            colors={[`${palette[0]}88`, `${palette[1]}22`, 'transparent']}
            style={[StyleSheet.absoluteFill, { borderRadius: 160 }]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <Animated.Text
          style={[styles.trophy, { transform: [{ scale: trophyScale }] }]}
        >
          {icon}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOp,
              transform: [{ scale: titleScale }],
            },
          ]}
        >
          {title}
        </Animated.Text>

        {subtitle ? (
          <Animated.Text style={[styles.subtitle, { opacity: subtitleOp }]}>
            {subtitle}
          </Animated.Text>
        ) : null}

        {badge ? (
          <Animated.View
            style={[
              styles.badge,
              {
                opacity: badgeOp,
                transform: [{ translateY: badgeY }],
              },
            ]}
          >
            <LinearGradient
              colors={[palette[0], palette[1], palette[2]]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.badgeLabel}>NEXT LEVEL</Text>
            <Text style={styles.badgeText}>{badge}</Text>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  burst: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  halo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  trophy: {
    fontSize: 130,
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
  },
  title: {
    marginTop: 18,
    fontSize: 38,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
  badge: {
    marginTop: 28,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.6)',
    letterSpacing: 3,
  },
  badgeText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1A1A2E',
    letterSpacing: 2,
    marginTop: 2,
  },
});
