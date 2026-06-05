/**
 * AppDisabled — Ilova o'chirilgan holat uchun to'liq ekranli overlay.
 * Server status: false bo'lganda ko'rsatiladi.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, shadowFx, spacing } from '../utils/theme';
import { t } from '../utils/translations';

const { width: W, height: H } = Dimensions.get('window');

export default function AppDisabled() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Orqaga tugmasini bloklash
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    // Fade in
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Icon bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: -10,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F0C29', '#302B63', '#24243E']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Dekorativ yulduzchalar */}
      {Array.from({ length: 12 }).map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        {/* Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ translateY: iconBounce }, { scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,126,103,0.3)', 'rgba(255,126,103,0.05)']}
            style={[StyleSheet.absoluteFill, { borderRadius: 50 }]}
          />
          <Text style={styles.icon}>🔒</Text>
        </Animated.View>

        {/* Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.title}>{t('appDisabledTitle')}</Text>
          <View style={styles.divider}>
            <LinearGradient
              colors={[palette.coral, palette.rose, palette.violet]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.message}>{t('appDisabledMessage')}</Text>
          <Text style={styles.hint}>{t('appDisabledHint')}</Text>
        </View>

        {/* Bottom badge */}
        <View style={styles.badge}>
          <LinearGradient
            colors={['rgba(255,99,71,0.25)', 'rgba(255,99,71,0.08)']}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
          />
          <Text style={styles.badgeText}>⚠️ {t('appDisabledBadge')}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** Dekorativ floating particle */
function FloatingParticle({ index }: { index: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.15 + Math.random() * 0.3)).current;
  const x = (index / 12) * W + Math.random() * 40;
  const startY = Math.random() * H;
  const size = 4 + Math.random() * 6;
  const duration = 3000 + Math.random() * 4000;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: -30,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette.violet,
        opacity,
        transform: [{ translateY: y }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 500,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,126,103,0.3)',
    overflow: 'hidden',
  },
  icon: {
    fontSize: 48,
  },
  card: {
    width: '100%',
    paddingVertical: spacing.xl + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadowFx.lifted,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  divider: {
    width: 80,
    height: 3,
    borderRadius: 2,
    marginVertical: spacing.md,
    overflow: 'hidden',
  },
  message: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  badge: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,99,71,0.3)',
    overflow: 'hidden',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.coral,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
