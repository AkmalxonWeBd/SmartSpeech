import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { API } from '../utils/api';
import { getAssetModule } from '../utils/assetManager';
import { playSound } from '../utils/soundProvider';
import { t } from '../utils/translations';
import { loadSettings } from '../utils/settingsManager';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ==================== DECORATIVE COMPONENTS ====================

function AnimatedBubble({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  const translateY = useRef(new Animated.Value(SCREEN_H + 50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -size * 2,
            duration: 6000 + Math.random() * 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
            Animated.delay(3000),
            Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(translateX, { toValue: 30, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(translateX, { toValue: -30, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.3, duration: 3000, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.5, duration: 3000, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x,
      bottom: 0,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity,
      transform: [{ translateY }, { translateX }, { scale }],
    }} />
  );
}

function SparkleEffect({ x, y, delay }: { x: number; y: number; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.delay(1500),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.delay(1500),
          ]),
          Animated.timing(rotation, { toValue: 1, duration: 2300, easing: Easing.linear, useNativeDriver: true }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.Text style={{
      position: 'absolute',
      left: x,
      top: y,
      fontSize: 16,
      opacity,
      transform: [
        { scale },
        { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
      ],
    }}>
      ✨
    </Animated.Text>
  );
}

// ==================== AGE WHEEL COMPONENT ====================

function AgeSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ages = Array.from({ length: 15 }, (_, i) => i + 3); // 3-17

  return (
    <View style={ageStyles.container}>
      <Text style={ageStyles.label}>{t('ageTitle')}</Text>

      <View style={ageStyles.wheelsRow}>
        {/* Cute character decorations */}
        <View style={ageStyles.decoLeft}>
          <Text style={{ fontSize: 40 }}>🦉</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ageStyles.scrollContent}
          snapToInterval={80}
          decelerationRate="fast"
        >
          {ages.map((age) => {
            const isSelected = age === value;
            return (
              <TouchableOpacity
                key={age}
                onPress={() => {
                  playSound('pop');
                  onChange(age);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  ageStyles.ageButton,
                  isSelected && ageStyles.ageButtonSelected,
                ]}>
                  <LinearGradient
                    colors={isSelected ? ['#FF6B6B', '#FF9FF3'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={[ageStyles.ageText, isSelected && ageStyles.ageTextSelected]}>
                    {age}
                  </Text>
                  {isSelected && <Text style={ageStyles.selectedEmoji}>⭐</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={ageStyles.decoRight}>
          <Text style={{ fontSize: 40 }}>🌟</Text>
        </View>
      </View>

      <Text style={ageStyles.hint}>
        {value < 7 ? t('ageHintYoung') : value < 12 ? t('ageHintMid') : t('ageHintOld')}
      </Text>
    </View>
  );
}

const ageStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFD93D',
    marginBottom: 20,
    textShadowColor: 'rgba(255, 217, 61, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 1,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  decoLeft: {
    marginRight: 10,
  },
  decoRight: {
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 10,
    gap: 10,
    alignItems: 'center',
  },
  ageButton: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ageButtonSelected: {
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  ageText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
  },
  ageTextSelected: {
    color: '#fff',
    fontSize: 28,
  },
  selectedEmoji: {
    fontSize: 12,
    position: 'absolute',
    top: 2,
    right: 5,
  },
  hint: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 15,
    fontWeight: '600',
  },
});

// ==================== NAME INPUT COMPONENT ====================

function NameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const inputGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(inputGlow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(inputGlow, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const borderColor = inputGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(78, 205, 196, 0.5)', 'rgba(255, 107, 107, 0.8)'],
  });

  return (
    <View style={nameStyles.container}>
      <Text style={nameStyles.label}>{t('nameTitle')}</Text>

      <View style={nameStyles.inputRow}>
        <Text style={{ fontSize: 36, marginRight: 12 }}>🐻</Text>

        <Animated.View style={[nameStyles.inputWrapper, { borderColor }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            style={StyleSheet.absoluteFill}
          />
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={t('namePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={nameStyles.input}
            maxLength={20}
            autoCapitalize="words"
          />
        </Animated.View>

        <Text style={{ fontSize: 36, marginLeft: 12 }}>🎈</Text>
      </View>

      {value.length > 0 && (
        <Text style={nameStyles.greeting}>
          {t('nameGreeting', { name: value })}
        </Text>
      )}
    </View>
  );
}

const nameStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4ECDC4',
    marginBottom: 20,
    textShadowColor: 'rgba(78, 205, 196, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  inputWrapper: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 24,
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#FFD93D',
    marginTop: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// ==================== LEVEL SELECTOR ====================

function LevelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const levels = [
    {
      id: 'beginner',
      title: t('levelBeginner'),
      emoji: '🌱',
      desc: t('levelBeginnerDesc'),
      colors: ['#6BCB77', '#2ECC71'] as [string, string],
      icon: '🐣',
    },
    {
      id: 'a1',
      title: t('levelA1'),
      emoji: '🌟',
      desc: t('levelA1Desc'),
      colors: ['#45B7D1', '#2196F3'] as [string, string],
      icon: '🐥',
    },
    {
      id: 'a2',
      title: t('levelA2'),
      emoji: '🚀',
      desc: t('levelA2Desc'),
      colors: ['#C77DFF', '#9B59B6'] as [string, string],
      icon: '🦅',
    },
  ];

  return (
    <View style={levelStyles.container}>
      <Text style={levelStyles.label}>{t('levelTitle')}</Text>

      <View style={levelStyles.cardsRow}>
        {levels.map((level) => {
          const isSelected = level.id === value;
          return (
            <LevelCard
              key={level.id}
              level={level}
              isSelected={isSelected}
              onPress={() => {
                playSound('pop');
                onChange(level.id);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function LevelCard({ level, isSelected, onPress }: {
  level: { id: string; title: string; emoji: string; desc: string; colors: [string, string]; icon: string };
  isSelected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.08, friction: 3, tension: 100, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, { toValue: -6, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(bounceAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
          ])
        ),
      ]).start();
    } else {
      scaleAnim.setValue(1);
      bounceAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [isSelected]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[
        levelStyles.card,
        isSelected && {
          shadowColor: level.colors[0],
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 12,
        },
        {
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
          ],
        },
      ]}>
        <LinearGradient
          colors={isSelected ? level.colors : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {isSelected && (
          <View style={levelStyles.selectedBadge}>
            <Text style={{ fontSize: 14 }}>✅</Text>
          </View>
        )}

        <Text style={levelStyles.icon}>{level.icon}</Text>
        <Text style={levelStyles.emoji}>{level.emoji}</Text>
        <Text style={[levelStyles.title, isSelected && { color: '#fff' }]}>{level.title}</Text>
        <Text style={[levelStyles.desc, isSelected && { color: 'rgba(255,255,255,0.9)' }]}>{level.desc}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const levelStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: 22,
    fontWeight: '800',
    color: '#C77DFF',
    marginBottom: 20,
    textShadowColor: 'rgba(199, 125, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 1,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_W * 0.22,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  desc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

// ==================== MAIN ONBOARDING SCREEN ====================

export default function OnboardingScreen() {
  const [step, setStep] = useState(0); // 0: age, 1: name, 2: level
  const [age, setAge] = useState(7);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');

  // Transition animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Mascot animation
  const mascotBounce = useRef(new Animated.Value(0)).current;
  const mascotRotate = useRef(new Animated.Value(0)).current;

  // Next button
  const buttonGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ensure settings are loaded
    loadSettings();

    // Initial entrance
    Animated.parallel([
      Animated.spring(contentScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Mascot bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, { toValue: -8, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(mascotBounce, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Button glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonGlow, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(buttonGlow, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Update progress bar
    Animated.spring(progressAnim, {
      toValue: (step + 1) / 3,
      friction: 6,
      tension: 40,
      useNativeDriver: false,
    }).start();

    // Fun mascot wiggle on step change
    Animated.sequence([
      Animated.timing(mascotRotate, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(mascotRotate, { toValue: -1, duration: 150, useNativeDriver: true }),
      Animated.timing(mascotRotate, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(mascotRotate, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const animateToNextStep = useCallback((nextStep: number) => {
    // Slide out current
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(SCREEN_W);
      // Slide in new
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const handleNext = useCallback(async () => {
    playSound('click');
    if (step === 0) {
      animateToNextStep(1);
    } else if (step === 1) {
      if (name.trim().length === 0) return;
      animateToNextStep(2);
    } else if (step === 2) {
      if (!level) return;
      // Save data locally and sync with backend
      try {
        playSound('success');
        const userDataObj = { age, name: name.trim(), level };
        const userDataStr = JSON.stringify(userDataObj);
        await AsyncStorage.setItem('user_data', userDataStr);
        
        // Backend Sync
        await API.syncUser(userDataObj);
        
        router.replace('/dashboard');
      } catch (e) {
        console.error('Save or Sync failed', e);
        // Fallback: navigate anyway if local save worked
        router.replace('/dashboard');
      }
    }
  }, [step, age, name, level]);

  const isNextDisabled = (step === 1 && name.trim().length === 0) || (step === 2 && !level);

  const buttonBorderColor = buttonGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(107, 203, 119, 0.5)', 'rgba(255, 217, 61, 0.8)'],
  });

  const mascotRotation = mascotRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const bubbles = [
    { delay: 0, x: SCREEN_W * 0.05, size: 20, color: 'rgba(255,107,107,0.4)' },
    { delay: 800, x: SCREEN_W * 0.15, size: 14, color: 'rgba(78,205,196,0.4)' },
    { delay: 1200, x: SCREEN_W * 0.3, size: 18, color: 'rgba(255,217,61,0.35)' },
    { delay: 400, x: SCREEN_W * 0.5, size: 22, color: 'rgba(107,203,119,0.4)' },
    { delay: 1600, x: SCREEN_W * 0.65, size: 16, color: 'rgba(199,125,255,0.4)' },
    { delay: 600, x: SCREEN_W * 0.8, size: 20, color: 'rgba(255,159,243,0.4)' },
    { delay: 2000, x: SCREEN_W * 0.9, size: 15, color: 'rgba(69,183,209,0.4)' },
  ];

  const sparkles = [
    { x: SCREEN_W * 0.08, y: SCREEN_H * 0.12, delay: 0 },
    { x: SCREEN_W * 0.92, y: SCREEN_H * 0.08, delay: 700 },
    { x: SCREEN_W * 0.85, y: SCREEN_H * 0.75, delay: 1400 },
    { x: SCREEN_W * 0.05, y: SCREEN_H * 0.8, delay: 2100 },
    { x: SCREEN_W * 0.5, y: SCREEN_H * 0.05, delay: 500 },
  ];

  const stepTitles = [
    t('stepAge'),
    t('stepName'),
    t('stepLevel'),
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          step === 0
            ? ['#1a0a2e', '#2d1b69', '#0f3460']
            : step === 1
            ? ['#0a2e1a', '#1b6945', '#0f6034']
            : ['#2e0a2e', '#691b69', '#600f60']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating bubbles */}
      {bubbles.map((b, i) => (
        <AnimatedBubble key={i} delay={b.delay} x={b.x} size={b.size} color={b.color} />
      ))}

      {/* Sparkle effects */}
      {sparkles.map((s, i) => (
        <SparkleEffect key={i} x={s.x} y={s.y} delay={s.delay} />
      ))}

      {/* Background glow orbs */}
      <View style={[styles.glowOrb, { left: -60, top: -40, backgroundColor: step === 0 ? '#FF6B6B' : step === 1 ? '#4ECDC4' : '#C77DFF' }]} />
      <View style={[styles.glowOrb, { right: -50, bottom: -30, backgroundColor: step === 0 ? '#FFD93D' : step === 1 ? '#6BCB77' : '#FF9FF3' }]} />

      <Animated.View style={[styles.mainContent, {
        opacity: contentOpacity,
        transform: [{ scale: contentScale }],
      }]}>
        {/* Left side: Mascot + progress */}
        <View style={styles.leftPanel}>
          {/* Mascot */}
          <Animated.View style={{
            transform: [
              { translateY: mascotBounce },
              { rotate: mascotRotation },
            ],
          }}>
            <Image
              source={getAssetModule('images', 'login_page_loading.jpg')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[
                styles.stepDot,
                i === step && styles.stepDotActive,
                i < step && styles.stepDotDone,
              ]}>
                {i < step ? (
                  <Text style={{ fontSize: 10, color: '#fff' }}>✓</Text>
                ) : (
                  <Text style={{ fontSize: 10, color: i === step ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {i + 1}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarOuter}>
            <Animated.View style={[styles.progressBarInner, {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }]}>
              <LinearGradient
                colors={['#FF6B6B', '#FFD93D', '#6BCB77']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          <Text style={styles.stepTitle}>{stepTitles[step]}</Text>
        </View>

        {/* Right side: Content area */}
        <View style={styles.rightPanel}>
          <Animated.View style={[styles.contentCard, {
            transform: [{ translateX: slideAnim }],
            opacity: fadeAnim,
          }]}>
            {step === 0 && <AgeSelector value={age} onChange={setAge} />}
            {step === 1 && <NameInput value={name} onChange={setName} />}
            {step === 2 && <LevelSelector value={level} onChange={setLevel} />}
          </Animated.View>

          {/* Next button */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={isNextDisabled}
            activeOpacity={0.8}
            style={{ alignSelf: 'center', marginTop: 16 }}
          >
            <Animated.View style={[
              styles.nextButton,
              isNextDisabled && styles.nextButtonDisabled,
              !isNextDisabled && { borderColor: buttonBorderColor },
            ]}>
              <LinearGradient
                colors={isNextDisabled
                  ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
                  : step === 2 ? ['#6BCB77', '#2ECC71'] : ['#FF6B6B', '#FF9FF3']
                }
                style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={[styles.nextButtonText, isNextDisabled && { opacity: 0.3 }]}>
                {step === 2 ? t('startButton') : t('nextButton')}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  leftPanel: {
    width: SCREEN_W * 0.25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  mascotGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 217, 61, 0.2)',
    alignSelf: 'center',
    top: 5,
    left: 5,
  },
  mascotImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: '#FFD93D',
    backgroundColor: 'rgba(255, 217, 61, 0.3)',
    shadowColor: '#FFD93D',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  stepDotDone: {
    borderColor: '#6BCB77',
    backgroundColor: '#6BCB77',
  },
  progressBarOuter: {
    width: '90%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stepTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 1,
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
  },
  contentCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nextButton: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,107,107,0.5)',
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
