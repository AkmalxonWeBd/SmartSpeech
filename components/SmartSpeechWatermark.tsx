import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';

export default function SmartSpeechWatermark() {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entry animation: Slide down with a bounce
    Animated.spring(enterAnim, {
      toValue: 1,
      tension: 30,
      friction: 5,
      delay: 300, // delay slightly for dramatic effect
      useNativeDriver: true,
    }).start(() => {
      // 2. Continuous breathing/floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [enterAnim, floatAnim]);

  const translateY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0], // slide in from top
  });

  const opacity = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5], // float up slightly
  });
  
  const scale = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03], // slight pulse
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [
            { translateY },
            { translateY: floatTranslateY },
            { scale }
          ],
        },
      ]}
      pointerEvents="none" // don't block clicks underneath
    >
      <View style={styles.glassBackground}>
        {/* SVG to draw gradient colored text, which gives it a very professional and vibrant look */}
        <Svg height="32" width="160" viewBox="0 0 160 32">
          <Defs>
            <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFE066" stopOpacity="1" />
              <Stop offset="0.25" stopColor="#FF9F43" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#EE5253" stopOpacity="1" />
              <Stop offset="0.75" stopColor="#0ABDE3" stopOpacity="1" />
              <Stop offset="1" stopColor="#5F27CD" stopOpacity="1" />
            </SvgGradient>
          </Defs>
          
          {/* Shadow Text */}
          <SvgText
            fill="rgba(0,0,0,0.5)"
            fontSize="18"
            fontWeight="900"
            fontFamily="System"
            x="80"
            y="24"
            textAnchor="middle"
            letterSpacing="1.8"
          >
            SmartSpeech
          </SvgText>

          {/* Main Text */}
          <SvgText
            fill="url(#grad)"
            fontSize="18"
            fontWeight="900"
            fontFamily="System"
            x="80"
            y="22"
            textAnchor="middle"
              letterSpacing="1.8"
          >
            SmartSpeech
          </SvgText>
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 40,
    zIndex: 999, // Ensure it's always on top of the video
  },
  glassBackground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
