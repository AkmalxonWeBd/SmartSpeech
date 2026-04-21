import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { playSound } from '../utils/soundProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { t } from '../utils/translations';
import { API } from '../utils/api';
import Backdrop, { BackdropVariant } from '../components/dashboard/Backdrop';
import Mascot, { LESSON_MASCOTS, BOSS_MASCOT } from '../components/dashboard/Mascot';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CAR_WIDTH = SCREEN_W / 2.5;
const CAR_HEIGHT = SCREEN_H * 0.32;
const TOTAL_LESSONS = 12;

type UserData = { age: number; name: string; level: string; progress: number };

// ═══════════════════════════════════════════════
// 3D WHEEL COMPONENT
// ═══════════════════════════════════════════════
function TrainWheel({ size, spin }: { size: number; spin: Animated.AnimatedInterpolation<string> }) {
  const r = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      {/* Outer rim with metallic look */}
      <View style={{
        width: size, height: size, borderRadius: r,
        backgroundColor: '#1a1a1a',
        borderWidth: 3, borderColor: '#666',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6, shadowRadius: 6, elevation: 8,
      }}>
        {/* Inner hub */}
        <Animated.View style={{
          width: size * 0.85, height: size * 0.85, borderRadius: (size * 0.85) / 2,
          backgroundColor: '#333',
          borderWidth: 2, borderColor: '#555',
          justifyContent: 'center', alignItems: 'center',
          transform: [{ rotate: spin }],
        }}>
          {/* Spokes */}
          <View style={{ position: 'absolute', width: '100%', height: 3, backgroundColor: '#777' }} />
          <View style={{ position: 'absolute', width: 3, height: '100%', backgroundColor: '#777' }} />
          <View style={{ position: 'absolute', width: '100%', height: 3, backgroundColor: '#666', transform: [{ rotate: '45deg' }] }} />
          <View style={{ position: 'absolute', width: 3, height: '100%', backgroundColor: '#666', transform: [{ rotate: '45deg' }] }} />
          {/* Center bolt */}
          <View style={{
            width: size * 0.22, height: size * 0.22, borderRadius: (size * 0.22) / 2,
            backgroundColor: '#C0C0C0',
            borderWidth: 1.5, borderColor: '#888',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.5, shadowRadius: 2, elevation: 3,
          }} />
        </Animated.View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════
// SMOKE PUFF COMPONENT
// ═══════════════════════════════════════════════
function SmokePuff({ delay, offsetX }: { delay: number; offsetX: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(translateY, { toValue: -80, duration: 2500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -40 + offsetX, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 2.5, duration: 2500, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: 400, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 2100, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', top: -10, left: 8 + offsetX,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: 'rgba(220,220,220,0.8)',
      transform: [{ translateY }, { translateX }, { scale }],
      opacity,
    }} />
  );
}

// ═══════════════════════════════════════════════
// LOCOMOTIVE COMPONENT (3D REALISTIC)
// ═══════════════════════════════════════════════
function Locomotive({ wheelSpin }: { wheelSpin: Animated.AnimatedInterpolation<string> }) {
  return (
    <View style={locoStyles.container}>
      {/* Smoke */}
      <View style={locoStyles.smokeArea}>
        <SmokePuff delay={0} offsetX={0} />
        <SmokePuff delay={600} offsetX={10} />
        <SmokePuff delay={1200} offsetX={-5} />
        <SmokePuff delay={1800} offsetX={15} />
      </View>

      {/* Chimney */}
      <View style={locoStyles.chimney}>
        <LinearGradient colors={['#2c2c2c', '#444', '#2c2c2c']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
        <View style={locoStyles.chimneyTop} />
      </View>

      {/* Steam dome */}
      <View style={locoStyles.steamDome}>
        <LinearGradient colors={['#c0392b', '#e74c3c', '#c0392b']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      </View>

      {/* Main boiler */}
      <View style={locoStyles.boiler}>
        <LinearGradient colors={['#a93226', '#c0392b', '#e74c3c', '#c0392b', '#a93226']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        {/* Boiler bands */}
        <View style={[locoStyles.boilerBand, { left: '20%' }]} />
        <View style={[locoStyles.boilerBand, { left: '50%' }]} />
        <View style={[locoStyles.boilerBand, { left: '80%' }]} />
        {/* Headlight */}
        <View style={locoStyles.headlight}>
          <View style={locoStyles.headlightGlow} />
        </View>
      </View>

      {/* Cab */}
      <View style={locoStyles.cab}>
        <LinearGradient colors={['#922b21', '#c0392b', '#e74c3c']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} />
        {/* Cab roof */}
        <View style={locoStyles.cabRoof} />
        {/* Windows */}
        <View style={locoStyles.cabWindowRow}>
          <View style={locoStyles.cabWindow}>
            <LinearGradient colors={['#85C1E9', '#AED6F1', '#D4E6F1']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={{ fontSize: 18 }}>🦉</Text>
          </View>
        </View>
        {/* Rivets */}
        <View style={locoStyles.rivetRow}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={locoStyles.rivet} />
          ))}
        </View>
      </View>

      {/* Cow catcher (front) */}
      <View style={locoStyles.cowCatcher}>
        <LinearGradient colors={['#444', '#666', '#444']} style={StyleSheet.absoluteFill} />
      </View>

      {/* Wheels */}
      <View style={locoStyles.wheelRow}>
        <TrainWheel size={40} spin={wheelSpin} />
        <TrainWheel size={50} spin={wheelSpin} />
        <TrainWheel size={50} spin={wheelSpin} />
      </View>

      {/* Under frame */}
      <View style={locoStyles.frame}>
        <LinearGradient colors={['#1a1a1a', '#333', '#1a1a1a']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      </View>
    </View>
  );
}

const WHEEL_PROTRUDE = 18; // how much wheels stick out below car body

const locoStyles = StyleSheet.create({
  container: { width: 180, height: CAR_HEIGHT + 50, justifyContent: 'flex-end', marginRight: -5, marginBottom: WHEEL_PROTRUDE },
  smokeArea: { position: 'absolute', bottom: WHEEL_PROTRUDE + 18 + CAR_HEIGHT * 0.48, left: 20, width: 40, height: 40 },
  chimney: { position: 'absolute', bottom: WHEEL_PROTRUDE + 18 + CAR_HEIGHT * 0.48 - 5, left: 25, width: 22, height: 35, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' },
  chimneyTop: { position: 'absolute', top: -3, left: -4, right: -4, height: 8, backgroundColor: '#333', borderRadius: 3 },
  steamDome: { position: 'absolute', bottom: WHEEL_PROTRUDE + 18 + CAR_HEIGHT * 0.48 - 5, left: 60, width: 26, height: 20, borderTopLeftRadius: 13, borderTopRightRadius: 13, overflow: 'hidden' },
  boiler: {
    position: 'absolute', bottom: WHEEL_PROTRUDE + 18, left: 10, width: 120, height: CAR_HEIGHT * 0.48,
    borderRadius: 14, borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 12,
  },
  boilerBand: { position: 'absolute', top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(255,215,0,0.5)', borderRadius: 2 },
  headlight: { position: 'absolute', left: -6, top: '35%', width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFD700', borderWidth: 2, borderColor: '#B8860B' },
  headlightGlow: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFACD', alignSelf: 'center', marginTop: 2 },
  cab: {
    position: 'absolute', bottom: WHEEL_PROTRUDE + 18, right: 0, width: 65, height: CAR_HEIGHT * 0.58,
    borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 3, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 10,
  },
  cabRoof: { position: 'absolute', top: -4, left: -6, right: -6, height: 10, backgroundColor: '#7B241C', borderRadius: 3 },
  cabWindowRow: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 14 },
  cabWindow: {
    width: 40, height: 35, borderRadius: 6,
    borderWidth: 2, borderColor: '#B8860B',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  rivetRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 6 },
  rivet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#AAA', borderWidth: 0.5, borderColor: '#666' },
  cowCatcher: { position: 'absolute', bottom: WHEEL_PROTRUDE + 6, left: -12, width: 20, height: 20, borderBottomLeftRadius: 6, overflow: 'hidden' },
  wheelRow: { position: 'absolute', bottom: 0, left: 5, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  frame: {
    position: 'absolute', bottom: WHEEL_PROTRUDE, left: -5, right: -5, height: 18,
    borderRadius: 3, overflow: 'hidden',
  },
});

// ═══════════════════════════════════════════════
// LESSON CAR COMPONENT (3D REALISTIC)
// ═══════════════════════════════════════════════
function LessonCar({ index, isUnlocked, isNewlyUnlocked, wheelSpin, levelColors, level, mascot, onLayoutX }: {
  index: number; isUnlocked: boolean; isNewlyUnlocked?: boolean; wheelSpin: Animated.AnimatedInterpolation<string>; levelColors: string[]; level: string; mascot: string;
  onLayoutX?: (index: number, x: number) => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const unlockScale = useRef(new Animated.Value(isNewlyUnlocked ? 0 : 1)).current;
  const revealGlow = useRef(new Animated.Value(0)).current;
  const sparkleProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isNewlyUnlocked) {
      const t = setTimeout(() => {
        playSound('train');
        Animated.sequence([
          Animated.spring(unlockScale, {
            toValue: 1.08,
            friction: 4,
            tension: 28,
            useNativeDriver: true,
          }),
          Animated.spring(unlockScale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        // Pulsing golden halo around the newly revealed wagon.
        Animated.sequence([
          Animated.loop(
            Animated.sequence([
              Animated.timing(revealGlow, {
                toValue: 1,
                duration: 700,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(revealGlow, {
                toValue: 0.25,
                duration: 700,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ]),
            { iterations: 3 },
          ),
          Animated.timing(revealGlow, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();

        // Radial sparkle burst once wagon hits peak scale.
        Animated.timing(sparkleProgress, {
          toValue: 1,
          duration: 900,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }, 900);
      return () => clearTimeout(t);
    }
  }, [isNewlyUnlocked]);

  const onPressIn = () => {
    if (!isUnlocked) return;
    Animated.spring(pressScale, { toValue: 0.95, friction: 5, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const carColors = isUnlocked ? levelColors : ['#6B6B6B', '#888', '#6B6B6B'];

  const handlePress = async () => {
    if (!isUnlocked) return;
    playSound('click');
    
    if (level === 'beginner' && index === 1) {
      const watched = await AsyncStorage.getItem('intro_video_watched');
      if (!watched) {
        await AsyncStorage.setItem('intro_video_watched', 'true');
      }
      
      router.push({
        pathname: '/intro-video',
        params: { nextRoute: `/lesson/${index}`, canSkip: watched ? 'true' : 'false' }
      });
      return;
    }
    
    if (level === 'a1' || level === 'a2') {
      router.push({
        pathname: '/word-lesson',
        params: { level: level.toUpperCase(), lesson: index.toString() }
      });
      return;
    }

    router.push(`/lesson/${index}`);
  };

  const sparkles = Array.from({ length: 8 }, (_, i) => i);

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      disabled={!isUnlocked}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      onLayout={(e) => onLayoutX && onLayoutX(index, e.nativeEvent.layout.x)}
    >
      <Animated.View style={[carStyles.wrapper, { transform: [{ scale: pressScale }, { scale: unlockScale }] }]}>
        {/* Reveal halo + sparkles when newly unlocked */}
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
                      scale: revealGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1.25],
                      }),
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
                      {
                        translateX: sparkleProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dx * 120],
                        }),
                      },
                      {
                        translateY: sparkleProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, dy * 120],
                        }),
                      },
                      {
                        scale: sparkleProgress.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0.4, 1.1, 0.3],
                        }),
                      },
                    ],
                  }}
                />
              );
            })}
          </>
        )}

        {/* Mascot sitting on top of the wagon */}
        <View style={carStyles.mascotSlot}>
          <Mascot emoji={mascot} size={56} delay={index * 120} locked={!isUnlocked} />
        </View>

        {/* Coupler */}
        <View style={carStyles.coupler}>
          <View style={carStyles.couplerBolt} />
        </View>

        {/* Main car body */}
        <View style={carStyles.body}>
          <LinearGradient 
            colors={carColors as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />

          {/* Top trim */}
          <View style={carStyles.topTrim}>
            <LinearGradient colors={['rgba(0,0,0,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
          </View>

          {/* Windows */}
          <View style={carStyles.windowRow}>
            <View style={carStyles.window}>
              <LinearGradient colors={isUnlocked ? ['#85C1E9', '#AED6F1'] : ['#999', '#AAA']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            </View>
            <View style={carStyles.window}>
              <LinearGradient colors={isUnlocked ? ['#85C1E9', '#AED6F1'] : ['#999', '#AAA']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            </View>
          </View>

          {/* Lesson number plate */}
          <View style={[carStyles.numberPlate, !isUnlocked && { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Text style={carStyles.lessonNumber}>{isUnlocked ? `${index}` : '🔒'}</Text>
            {isUnlocked && <Text style={carStyles.lessonLabel}>{t('lessonLabel')}</Text>}
          </View>

          {/* Bottom rivets */}
          <View style={carStyles.rivetStrip}>
            {[...Array(6)].map((_, i) => <View key={i} style={carStyles.rivet} />)}
          </View>

          {/* Shadows for 3D depth */}
          <View style={carStyles.topShadow} />
          <View style={carStyles.bottomHighlight} />
        </View>

        {/* Under frame */}
        <View style={carStyles.frame} />

        {/* Wheels */}
        <View style={carStyles.wheelRow}>
          <TrainWheel size={36} spin={wheelSpin} />
          <TrainWheel size={36} spin={wheelSpin} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const carStyles = StyleSheet.create({
  wrapper: { width: CAR_WIDTH, alignItems: 'center', justifyContent: 'flex-end', height: CAR_HEIGHT + 90, marginBottom: WHEEL_PROTRUDE },
  mascotSlot: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  coupler: { position: 'absolute', left: -12, bottom: WHEEL_PROTRUDE + 30, width: 15, height: 10, backgroundColor: '#444', borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  couplerBolt: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#888' },
  body: {
    width: CAR_WIDTH - 20, height: CAR_HEIGHT * 0.6,
    borderRadius: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 14,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.2)',
    marginBottom: WHEEL_PROTRUDE,
  },
  topTrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 8 },
  windowRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingTop: 14 },
  window: { width: '35%', height: CAR_HEIGHT * 0.18, borderRadius: 5, borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)', overflow: 'hidden' },
  numberPlate: {
    alignSelf: 'center', marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  lessonNumber: { fontSize: 22, fontWeight: '900', color: '#FFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 2 } },
  lessonLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textAlign: 'center', letterSpacing: 2 },
  rivetStrip: { position: 'absolute', bottom: 6, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  rivet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(200,200,200,0.4)' },
  topShadow: { position: 'absolute', top: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(255,255,255,0.08)' },
  bottomHighlight: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%', backgroundColor: 'rgba(0,0,0,0.15)' },
  frame: { width: CAR_WIDTH - 10, height: 14, backgroundColor: '#222', borderRadius: 3, position: 'absolute', bottom: WHEEL_PROTRUDE - 2 },
  wheelRow: { position: 'absolute', bottom: 0, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' },
  revealHalo: {
    position: 'absolute',
    top: CAR_HEIGHT * 0.05,
    left: CAR_WIDTH * 0.05,
    right: CAR_WIDTH * 0.05,
    bottom: WHEEL_PROTRUDE,
    borderRadius: 200,
    zIndex: 0,
  },
});

// ═══════════════════════════════════════════════
// BOSS CAR COMPONENT (BIGGER, SPECIAL)
// ═══════════════════════════════════════════════
function BossCar({ wheelSpin, isUnlocked, level, onLayoutX }: {
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

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!isUnlocked}
      onPressIn={() => isUnlocked && Animated.spring(pressScale, { toValue: 0.95, friction: 5, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
      onPress={handlePress}
      onLayout={(e) => onLayoutX && onLayoutX(e.nativeEvent.layout.x)}
    >
      <Animated.View style={[bossStyles.wrapper, { transform: [{ scale: pressScale }] }]}>
        {/* Mascot sitting on top (boss mascot) */}
        <View style={bossStyles.mascotSlot}>
          <Mascot emoji={BOSS_MASCOT} size={64} delay={0} locked={!isUnlocked} />
        </View>

        {/* Coupler */}
        <View style={bossStyles.coupler}><View style={bossStyles.couplerBolt} /></View>

        <View style={[bossStyles.body, !isUnlocked && { borderColor: '#666', shadowColor: '#666' }]}>
          <LinearGradient
            colors={isUnlocked ? ['#6C3483', '#8E44AD', '#A569BD', '#8E44AD', '#6C3483'] : ['#4a4a4a', '#666', '#4a4a4a']}
            style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />

          {/* Crown on top */}
          <View style={bossStyles.crown}>
            <Text style={{ fontSize: 28 }}>{isUnlocked ? '👑' : '🔒'}</Text>
          </View>

          {/* Decorative shield */}
          <View style={bossStyles.shield}>
            <LinearGradient colors={isUnlocked ? ['#FFD700', '#FFA500'] : ['#888', '#666']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <Text style={bossStyles.shieldText}>{isUnlocked ? '🏆' : '🔒'}</Text>
          </View>

          <Text style={[bossStyles.title, !isUnlocked && { color: '#888' }]}>{t('bossTitle')}</Text>
          <Text style={bossStyles.subtitle}>{isUnlocked ? t('bossSubtitle') : 'Barcha darslarni tugating'}</Text>

          {/* Ornamental bottom */}
          <View style={bossStyles.ornament}>
            <LinearGradient colors={['rgba(255,215,0,0.3)', 'transparent']} style={StyleSheet.absoluteFill} />
          </View>

          {/* 3D depth */}
          <View style={bossStyles.topGlow} />
        </View>

        {/* Frame */}
        <View style={bossStyles.frame} />

        {/* Wheels */}
        <View style={bossStyles.wheelRow}>
          <TrainWheel size={40} spin={wheelSpin} />
          <TrainWheel size={40} spin={wheelSpin} />
          <TrainWheel size={40} spin={wheelSpin} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const bossStyles = StyleSheet.create({
  wrapper: { width: CAR_WIDTH * 1.3, alignItems: 'center', justifyContent: 'flex-end', height: CAR_HEIGHT + 110, marginBottom: WHEEL_PROTRUDE },
  mascotSlot: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  coupler: { position: 'absolute', left: -12, bottom: WHEEL_PROTRUDE + 40, width: 15, height: 10, backgroundColor: '#444', borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  couplerBolt: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#888' },
  body: {
    width: CAR_WIDTH * 1.3 - 20, height: CAR_HEIGHT * 0.75,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 3, borderColor: '#FFD700',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: WHEEL_PROTRUDE,
  },
  crown: { position: 'absolute', top: -8, alignSelf: 'center' },
  shield: {
    width: 55, height: 55, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#B8860B', overflow: 'hidden',
    marginTop: 12,
  },
  shieldText: { fontSize: 26 },
  title: { fontSize: 18, fontWeight: '900', color: '#FFD700', marginTop: 6, letterSpacing: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  subtitle: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '600' },
  ornament: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, overflow: 'hidden' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '25%', backgroundColor: 'rgba(255,255,255,0.1)' },
  frame: { width: CAR_WIDTH * 1.3 - 10, height: 14, backgroundColor: '#222', borderRadius: 3, position: 'absolute', bottom: WHEEL_PROTRUDE - 2 },
  wheelRow: { position: 'absolute', bottom: 0, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between' },
});

// ═══════════════════════════════════════════════
// RAILROAD TRACK
// ═══════════════════════════════════════════════
function RailroadTrack() {
  const ties = Array.from({ length: 80 });
  return (
    <View style={trackStyles.container}>
      {/* Ties (sleepers) */}
      <View style={trackStyles.tiesRow}>
        {ties.map((_, i) => (
          <View key={i} style={trackStyles.tie} />
        ))}
      </View>
      {/* Rails */}
      <View style={trackStyles.rail1}>
        <LinearGradient colors={['#AAA', '#DDD', '#AAA']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      </View>
      <View style={trackStyles.rail2}>
        <LinearGradient colors={['#AAA', '#DDD', '#AAA']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      </View>
      {/* Ballast (gravel) */}
      <View style={trackStyles.ballast}>
        <LinearGradient colors={['#5D4E37', '#8B7355', '#5D4E37']} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

const trackStyles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, width: SCREEN_W * 5, height: 45 },
  tiesRow: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', gap: 30 },
  tie: { width: 50, height: 10, backgroundColor: '#654321', borderRadius: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2 },
  rail1: { position: 'absolute', bottom: 16, left: 0, right: 0, height: 6, overflow: 'hidden' },
  rail2: { position: 'absolute', bottom: 6, left: 0, right: 0, height: 6, overflow: 'hidden' },
  ballast: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, overflow: 'hidden' },
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

  // Animation values
  const trainEntry = useRef(new Animated.Value(SCREEN_W + 200)).current;
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-60)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const settingsRotate = useRef(new Animated.Value(0)).current;

  /**
   * Called from each wagon once its layout is measured. As soon as
   * we know the target wagon's x-offset, we animate the scroll view
   * so the newly unlocked wagon is centered on screen. Runs exactly
   * once per mount.
   */
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

    const centered = Math.max(0, targetX - (SCREEN_W - CAR_WIDTH) / 2);
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

  const vibes: Record<string, { backdrop: BackdropVariant; carColors: string[]; text: string }> = {
    beginner: {
      backdrop: 'forest',
      carColors: ['#117A65', '#1ABC9C', '#48C9B0'],
      text: t('vibeTextBeginner'),
    },
    a1: {
      backdrop: 'sky',
      carColors: ['#1B4F72', '#2874A6', '#3498DB'],
      text: t('vibeTextA1'),
    },
    a2: {
      backdrop: 'space',
      carColors: ['#6C3483', '#8E44AD', '#A569BD'],
      text: t('vibeTextA2'),
    },
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // First, check local storage
        const localData = await AsyncStorage.getItem('user_data');
        if (localData) {
          setUserData(JSON.parse(localData));
        }
        
        // Then, sync with backend for latest profile/progress
        const backendUser = await API.getUser();
        if (backendUser) {
          setUserData(backendUser);
          // Update local cache
          await AsyncStorage.setItem('user_data', JSON.stringify(backendUser));
        }
      } catch (e) {
        console.warn('Failed to load user data from backend', e);
      }
    };
    loadData();

    // Train entry
    playSound('train');
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(trainEntry, { toValue: 0, friction: 6, tension: 18, useNativeDriver: true }),
    ]).start();

    // Wheels rolling
    Animated.timing(wheelRotation, {
      toValue: 20,
      duration: 8000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Header slide in
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const level = userData?.level || 'beginner';
  const vibe = vibes[level] || vibes.beginner;
  const wheelSpin = wheelRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const settingsGearRotation = settingsRotate.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '90deg'],
  });

  const handleSettingsPress = () => {
    playSound('click');
    Animated.sequence([
      Animated.timing(settingsRotate, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(settingsRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      router.push('/settings' as any);
    }, 250);
  };

  return (
    <View style={styles.container}>
      {/* Parallax backdrop: sky + sun + clouds + mountains + ground */}
      <Backdrop variant={vibe.backdrop} />

      {/* ═══ HEADER ═══ */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerSlide }], opacity: headerFade }]}>
        <View style={styles.headerLeft}>
          {userData && (
            <>
              <Text style={styles.greeting}>{t('greeting', { name: userData.name })}</Text>
              <View style={styles.levelBadge}>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
                <Text style={styles.levelText}>{userData.level.toUpperCase()} • {vibe.text}</Text>
              </View>
            </>
          )}
        </View>

        {/* Settings button */}
        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsBtn}>
          <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
          <Animated.Text style={[styles.settingsIcon, { transform: [{ rotate: settingsGearRotation }] }]}>⚙️</Animated.Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ═══ TRAIN AREA ═══ */}
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
          <Animated.View style={[styles.trainRow, { transform: [{ translateX: trainEntry }] }]}>
            <Locomotive wheelSpin={wheelSpin} />
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
                  levelColors={vibe.carColors}
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

      {/* Level-up banner overlay (shown briefly when exam promotes the user) */}
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
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
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
          colors={['#FFD700', '#FFA500', '#FFD700']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Animated.View
          style={[
            bannerStyles.shine,
            { transform: [{ translateX: shimmerX }, { rotate: '18deg' }] },
          ]}
        />
        <Text style={bannerStyles.kicker}>YANGI BOSQICH</Text>
        <Text style={bannerStyles.title}>{label}</Text>
        <Text style={bannerStyles.subtitle}>ochildi!</Text>
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
    paddingHorizontal: 40,
    paddingVertical: 22,
    borderRadius: 22,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
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
    color: '#1B1B1B',
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
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    zIndex: 100,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 22, fontWeight: '900', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
    letterSpacing: 0.5,
  },
  levelBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  levelText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  settingsBtn: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  settingsIcon: { fontSize: 24 },
  trainArea: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SCREEN_H * 0.65,
  },
  scrollContent: { paddingLeft: 40, paddingRight: SCREEN_W * 0.3, alignItems: 'flex-end', paddingBottom: 8 },
  trainRow: { flexDirection: 'row', alignItems: 'flex-end' },
});
