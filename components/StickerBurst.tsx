/**
 * StickerBurst — ekranda stickerlar sochilishi animatsiyasi.
 * `type="success"` — ijobiy (yulduzlar, medallar, quvnoq emojlar)
 * `type="fail"`    — salbiy (og'riqli, qayta urinish emojlar)
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Easing, StyleSheet, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const SUCCESS_EMOJIS = ['⭐', '🌟', '🎉', '🥳', '🏆', '👏', '💪', '🎊', '✨', '🌈', '🦄', '💖', '🎁', '🍭', '🎈'];
const FAIL_EMOJIS = ['😅', '🤔', '💭', '🔄', '💪', '🙈', '😬', '🫣', '🤗', '🌀'];

const STICKER_COUNT = 18;

interface StickerBurstProps {
  visible: boolean;
  type: 'success' | 'fail';
}

interface StickerData {
  emoji: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotation: number;
  size: number;
  delay: number;
}

export default function StickerBurst({ visible, type }: StickerBurstProps) {
  const anims = useRef(
    Array.from({ length: STICKER_COUNT }, () => ({
      progress: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const stickers = useMemo<StickerData[]>(() => {
    const pool = type === 'success' ? SUCCESS_EMOJIS : FAIL_EMOJIS;
    return Array.from({ length: STICKER_COUNT }, (_, i) => {
      const angle = (i / STICKER_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 120 + Math.random() * (SW * 0.45);
      return {
        emoji: pool[Math.floor(Math.random() * pool.length)],
        startX: SW / 2,
        startY: SH / 2,
        endX: SW / 2 + Math.cos(angle) * dist,
        endY: SH / 2 + Math.sin(angle) * dist - 100,
        rotation: (Math.random() - 0.5) * 720,
        size: 28 + Math.random() * 28,
        delay: Math.random() * 250,
      };
    });
  }, [type, visible]);

  useEffect(() => {
    if (!visible) {
      anims.forEach((a) => {
        a.progress.setValue(0);
        a.opacity.setValue(0);
      });
      return;
    }

    const animations = anims.map((a, i) =>
      Animated.sequence([
        Animated.delay(stickers[i].delay),
        Animated.parallel([
          Animated.timing(a.progress, {
            toValue: 1,
            duration: type === 'success' ? 1100 : 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.delay(type === 'success' ? 600 : 350),
            Animated.timing(a.opacity, {
              toValue: 0,
              duration: type === 'success' ? 350 : 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );

    Animated.parallel(animations).start();
  }, [visible, type]);

  if (!visible) return null;

  return (
    <>
      {anims.map((a, i) => {
        const st = stickers[i];
        const translateX = a.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [st.startX, st.endX],
        });
        const translateY = a.progress.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [st.startY, st.endY - 60, st.endY],
        });
        const rotate = a.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${st.rotation}deg`],
        });
        const scale = a.progress.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0.2, 1.3, 1.1, 0.6],
        });

        return (
          <Animated.Text
            key={i}
            pointerEvents="none"
            style={[
              styles.sticker,
              {
                fontSize: st.size,
                opacity: a.opacity,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate },
                  { scale },
                ],
              },
            ]}
          >
            {st.emoji}
          </Animated.Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  sticker: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
});
