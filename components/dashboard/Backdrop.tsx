import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type BackdropVariant = 'forest' | 'sky' | 'space';

type Palette = {
  sky: string[];
  mountainBack: string;
  mountainFront: string;
  ground: string[];
  cloud: string;
  orb: { color: string; glow: string };
};

const PALETTES: Record<BackdropVariant, Palette> = {
  forest: {
    sky: ['#1B4F72', '#2874A6', '#5DADE2', '#AED6F1', '#F7DC6F'],
    mountainBack: '#145A32',
    mountainFront: '#0B3D24',
    ground: ['#229954', '#27AE60', '#145A32'],
    cloud: 'rgba(255,255,255,0.85)',
    orb: { color: '#F9E79F', glow: 'rgba(249,231,159,0.55)' },
  },
  sky: {
    sky: ['#0E4C75', '#2874A6', '#3498DB', '#85C1E9', '#F5B7B1'],
    mountainBack: '#2E4053',
    mountainFront: '#1B2631',
    ground: ['#2874A6', '#3498DB', '#1B4F72'],
    cloud: 'rgba(255,255,255,0.92)',
    orb: { color: '#FAD7A0', glow: 'rgba(250,215,160,0.55)' },
  },
  space: {
    sky: ['#0B0B2B', '#1A0A3A', '#3E1A6B', '#7D3C98', '#C39BD3'],
    mountainBack: '#1C1147',
    mountainFront: '#0B0625',
    ground: ['#4A148C', '#6C3483', '#1A0A2E'],
    cloud: 'rgba(220,210,255,0.3)',
    orb: { color: '#F4ECF7', glow: 'rgba(244,236,247,0.6)' },
  },
};

function Cloud({
  top,
  size,
  duration,
  delay,
  color,
}: {
  top: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}) {
  const x = useRef(new Animated.Value(-size * 2)).current;

  useEffect(() => {
    let cancelled = false;
    const animate = () => {
      if (cancelled) return;
      x.setValue(-size * 2);
      Animated.timing(x, {
        toValue: SCREEN_W + size,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) animate();
      });
    };
    // `delay` only staggers the initial traversal; subsequent cycles restart immediately.
    const timer = setTimeout(animate, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      x.stopAnimation();
    };
  }, [duration, delay, size, x]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left: 0,
        transform: [{ translateX: x }],
      }}
      pointerEvents="none"
    >
      <Svg width={size * 1.6} height={size * 0.8}>
        <Circle cx={size * 0.35} cy={size * 0.5} r={size * 0.28} fill={color} />
        <Circle cx={size * 0.6} cy={size * 0.4} r={size * 0.36} fill={color} />
        <Circle cx={size * 0.9} cy={size * 0.5} r={size * 0.3} fill={color} />
        <Circle cx={size * 1.15} cy={size * 0.55} r={size * 0.22} fill={color} />
      </Svg>
    </Animated.View>
  );
}

function Stars() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    x: (i * 73) % SCREEN_W,
    y: (i * 41) % (SCREEN_H * 0.55),
    r: 0.8 + ((i * 7) % 5) * 0.3,
    o: 0.4 + ((i * 11) % 6) * 0.1,
  }));
  return (
    <Svg
      width={SCREEN_W}
      height={SCREEN_H * 0.6}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={`rgba(255,255,255,${s.o})`} />
      ))}
    </Svg>
  );
}

function Mountains({ backColor, frontColor }: { backColor: string; frontColor: string }) {
  const w = SCREEN_W;
  const h = SCREEN_H * 0.35;
  return (
    <Svg
      width={w}
      height={h}
      style={{ position: 'absolute', bottom: SCREEN_H * 0.18, left: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <SvgGradient id="backMtn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={backColor} stopOpacity="0.9" />
          <Stop offset="1" stopColor={backColor} stopOpacity="1" />
        </SvgGradient>
        <SvgGradient id="frontMtn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={frontColor} stopOpacity="0.95" />
          <Stop offset="1" stopColor={frontColor} stopOpacity="1" />
        </SvgGradient>
      </Defs>
      {/* Back range */}
      <Path
        d={`M0 ${h * 0.85} L${w * 0.1} ${h * 0.55} L${w * 0.2} ${h * 0.7} L${w * 0.32} ${h * 0.4} L${w * 0.45} ${h * 0.6} L${w * 0.58} ${h * 0.35} L${w * 0.7} ${h * 0.55} L${w * 0.82} ${h * 0.4} L${w * 0.95} ${h * 0.55} L${w} ${h * 0.45} L${w} ${h} L0 ${h} Z`}
        fill="url(#backMtn)"
      />
      {/* Front range */}
      <Path
        d={`M0 ${h * 0.95} L${w * 0.08} ${h * 0.7} L${w * 0.18} ${h * 0.85} L${w * 0.28} ${h * 0.6} L${w * 0.4} ${h * 0.8} L${w * 0.52} ${h * 0.55} L${w * 0.65} ${h * 0.75} L${w * 0.78} ${h * 0.5} L${w * 0.9} ${h * 0.75} L${w} ${h * 0.65} L${w} ${h} L0 ${h} Z`}
        fill="url(#frontMtn)"
      />
    </Svg>
  );
}

export default function Backdrop({ variant }: { variant: BackdropVariant }) {
  const p = PALETTES[variant];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sky gradient */}
      <LinearGradient
        colors={p.sky as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Stars only in space variant */}
      {variant === 'space' && <Stars />}

      {/* Sun / moon */}
      <View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.08,
          right: SCREEN_W * 0.12,
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: p.orb.color,
          shadowColor: p.orb.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 40,
          elevation: 8,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.065,
          right: SCREEN_W * 0.105,
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: p.orb.glow,
          opacity: 0.45,
        }}
      />

      {/* Drifting clouds (hidden in space variant) */}
      {variant !== 'space' && (
        <>
          <Cloud top={SCREEN_H * 0.12} size={90} duration={42000} delay={0} color={p.cloud} />
          <Cloud top={SCREEN_H * 0.22} size={60} duration={55000} delay={6000} color={p.cloud} />
          <Cloud top={SCREEN_H * 0.06} size={75} duration={60000} delay={18000} color={p.cloud} />
          <Cloud top={SCREEN_H * 0.3} size={50} duration={48000} delay={30000} color={p.cloud} />
        </>
      )}

      {/* Mountains */}
      <Mountains backColor={p.mountainBack} frontColor={p.mountainFront} />

      {/* Ground band behind the track */}
      <LinearGradient
        colors={p.ground as [string, string, ...string[]]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SCREEN_H * 0.18,
        }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </View>
  );
}
