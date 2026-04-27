import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BrandingIntroProps {
  onFinish: () => void;
  duration?: number;
}

export default function BrandingIntro({ onFinish, duration = 2800 }: BrandingIntroProps) {
  const { width: SW, height: SH } = useWindowDimensions();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const shimmerTranslateX = useRef(new Animated.Value(-SW)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stage 1: Logo fades in + scales up with glow
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.6,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 1.4,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2: Title slides up after logo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Stage 3: Subtitle fades in
    setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 700);

    // Stage 4: Shimmer sweep
    setTimeout(() => {
      Animated.timing(shimmerTranslateX, {
        toValue: SW,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 900);

    // Stage 5: Fade out everything
    setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onFinish());
    }, duration - 400);
  }, []);

  const imgSize = Math.min(SW * 0.22, SH * 0.45, 160);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <LinearGradient
        colors={['#0A0A2E', '#1A1A4E', '#0A0A2E']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Glow behind logo */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: imgSize * 2,
            height: imgSize * 2,
            borderRadius: imgSize,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Logo image */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <Image
          source={require('../assets/images/login_page_loading.jpg')}
          style={[
            styles.logo,
            {
              width: imgSize,
              height: imgSize,
              borderRadius: imgSize * 0.2,
            },
          ]}
          resizeMode="cover"
        />
      </Animated.View>

      {/* App name */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        SmartSpeech
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
        Learn English — Have Fun! 🎉
      </Animated.Text>

      {/* Shimmer sweep */}
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX: shimmerTranslateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.15)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  glow: {
    position: 'absolute',
    backgroundColor: '#6B3FA0',
  },
  logo: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#6B3FA0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(107,63,160,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
});
