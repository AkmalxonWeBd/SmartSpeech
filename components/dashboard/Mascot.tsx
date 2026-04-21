import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * 12 ta dars uchun 12 ta hayvon-qahramon. Emoji tanlovi har Android/iOS'da
 * rangli glyph bilan chiqadi, shuning uchun hech qanday litsenziyalangan
 * multfilm qahramonlariga tayanmaymiz.
 */
export const LESSON_MASCOTS = [
  '🦊', '🐻', '🐼', '🦁',
  '🐯', '🐵', '🐸', '🐨',
  '🐰', '🐱', '🐶', '🐧',
];

export const BOSS_MASCOT = '🦉';

type Props = {
  emoji: string;
  size?: number;
  delay?: number;
  /** Bounce amplitude — soyadan yuqoriga, xursandchilik uchun. */
  amplitude?: number;
  locked?: boolean;
};

/**
 * Vagon ustida o'tiradigan mini-platforma: oltin halqa + shaffof shisha
 * gumbaz + sekin sakraydigan qahramon. Agar `locked` bo'lsa kulrang.
 */
export default function Mascot({
  emoji,
  size = 58,
  delay = 0,
  amplitude = 6,
  locked = false,
}: Props) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (locked) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -amplitude,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [amplitude, bounce, delay, locked]);

  const platformWidth = size * 1.25;
  const platformHeight = size * 0.32;

  return (
    <View style={{ alignItems: 'center', width: platformWidth }} pointerEvents="none">
      {/* Character */}
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateY: bounce }],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Soft glow halo */}
        <View
          style={{
            position: 'absolute',
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: size,
            backgroundColor: locked ? 'rgba(120,120,120,0.25)' : 'rgba(255,223,140,0.35)',
          }}
        />
        <Text
          style={{
            fontSize: size * 0.82,
            textAlign: 'center',
            opacity: locked ? 0.4 : 1,
            textShadowColor: 'rgba(0,0,0,0.35)',
            textShadowRadius: 6,
            textShadowOffset: { width: 0, height: 2 },
          }}
        >
          {emoji}
        </Text>
      </Animated.View>

      {/* Platform (golden ring base the character stands on) */}
      <View
        style={[
          styles.platform,
          {
            width: platformWidth,
            height: platformHeight,
            borderRadius: platformWidth,
          },
        ]}
      >
        <LinearGradient
          colors={
            locked
              ? ['#7B7B7B', '#A6A6A6', '#7B7B7B']
              : ['#B8860B', '#FFD700', '#FFF8DC', '#FFD700', '#B8860B']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        {/* Inner dark ring for depth */}
        <View
          style={{
            position: 'absolute',
            top: platformHeight * 0.35,
            left: platformWidth * 0.08,
            right: platformWidth * 0.08,
            bottom: platformHeight * 0.15,
            borderRadius: platformWidth,
            backgroundColor: 'rgba(0,0,0,0.22)',
          }}
        />
        {/* Highlight stripe */}
        <View
          style={{
            position: 'absolute',
            top: 2,
            left: platformWidth * 0.1,
            right: platformWidth * 0.1,
            height: platformHeight * 0.25,
            borderRadius: platformWidth,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  platform: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
});
