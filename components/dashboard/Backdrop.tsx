import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type BackdropVariant = 'forest' | 'sky' | 'space';

type Palette = {
  sky: [string, string, string, string, string];
  horizonGlow: string;
  sun: { color: string; halo: string };
  mountainFar: string;
  mountainMid: string;
  mountainNear: string;
  hillFront: string;
  groundTop: string;
  groundBottom: string;
  cloudColor: string;
  cloudShade: string;
  treeTrunk: string;
  treeLeaf: string;
  grassTuft: string;
  showStars: boolean;
};

const PALETTES: Record<BackdropVariant, Palette> = {
  forest: {
    sky: ['#1B3A7A', '#2E67B8', '#5DADE2', '#AED6F1', '#FFE7A8'],
    horizonGlow: 'rgba(255,220,160,0.55)',
    sun: { color: '#FFD66B', halo: 'rgba(255,214,107,0.55)' },
    mountainFar: '#4A7FB3',
    mountainMid: '#355D80',
    mountainNear: '#213A54',
    hillFront: '#2E8B57',
    groundTop: '#8FD694',
    groundBottom: '#2E6E3F',
    cloudColor: '#FFFFFF',
    cloudShade: 'rgba(200,210,235,0.95)',
    treeTrunk: '#4A2F17',
    treeLeaf: '#1E6B3C',
    grassTuft: '#2F8B48',
    showStars: false,
  },
  sky: {
    sky: ['#0E2B5F', '#1E5AAF', '#3498DB', '#A5CBEC', '#FFD4A8'],
    horizonGlow: 'rgba(255,200,150,0.55)',
    sun: { color: '#FFB457', halo: 'rgba(255,180,87,0.5)' },
    mountainFar: '#3E5D8B',
    mountainMid: '#2D4368',
    mountainNear: '#18253F',
    hillFront: '#5A6EA6',
    groundTop: '#92A5D1',
    groundBottom: '#324C80',
    cloudColor: '#FFFFFF',
    cloudShade: 'rgba(180,210,245,0.95)',
    treeTrunk: '#3A2A1A',
    treeLeaf: '#2E4A7F',
    grassTuft: '#3E5C9A',
    showStars: false,
  },
  space: {
    sky: ['#05031A', '#140530', '#2E0A5E', '#6A23B0', '#C183E8'],
    horizonGlow: 'rgba(220,140,255,0.45)',
    sun: { color: '#F5E0FF', halo: 'rgba(245,224,255,0.55)' },
    mountainFar: '#3F1F6A',
    mountainMid: '#29134A',
    mountainNear: '#130722',
    hillFront: '#4F2B83',
    groundTop: '#6D3AA8',
    groundBottom: '#1A0832',
    cloudColor: 'rgba(220,210,255,0.35)',
    cloudShade: 'rgba(180,160,230,0.45)',
    treeTrunk: '#2A1742',
    treeLeaf: '#7A3FB8',
    grassTuft: '#6A3EAC',
    showStars: true,
  },
};

/** Drifting cloud with volumetric shading (light top, shadow underside). */
function Cloud({
  top,
  size,
  duration,
  delay,
  color,
  shade,
}: {
  top: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  shade: string;
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
    const timer = setTimeout(animate, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      x.stopAnimation();
    };
  }, [duration, delay, size, x]);

  const w = size * 1.9;
  const h = size * 0.95;

  return (
    <Animated.View
      style={{ position: 'absolute', top, left: 0, transform: [{ translateX: x }] }}
      pointerEvents="none"
    >
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={`cloud-${size}-${top}`} cx="50%" cy="45%" r="55%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="70%" stopColor={color} stopOpacity="0.92" />
            <Stop offset="100%" stopColor={shade} stopOpacity="0.9" />
          </RadialGradient>
        </Defs>
        {/* Underside shadow band */}
        <Ellipse cx={w * 0.5} cy={h * 0.72} rx={w * 0.45} ry={h * 0.18} fill={shade} opacity={0.75} />
        {/* Cloud puffs */}
        <Circle cx={size * 0.35} cy={size * 0.55} r={size * 0.32} fill={`url(#cloud-${size}-${top})`} />
        <Circle cx={size * 0.62} cy={size * 0.4} r={size * 0.42} fill={`url(#cloud-${size}-${top})`} />
        <Circle cx={size * 0.95} cy={size * 0.45} r={size * 0.38} fill={`url(#cloud-${size}-${top})`} />
        <Circle cx={size * 1.25} cy={size * 0.55} r={size * 0.3} fill={`url(#cloud-${size}-${top})`} />
        <Circle cx={size * 1.5} cy={size * 0.6} r={size * 0.24} fill={`url(#cloud-${size}-${top})`} />
        {/* Highlight on top */}
        <Ellipse cx={w * 0.45} cy={h * 0.28} rx={w * 0.2} ry={h * 0.08} fill="rgba(255,255,255,0.6)" />
      </Svg>
    </Animated.View>
  );
}

/** Twinkling star field for the space variant. */
function Stars() {
  const alpha = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(alpha, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(alpha, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const stars = Array.from({ length: 80 }, (_, i) => ({
    x: (i * 83) % SCREEN_W,
    y: (i * 47) % (SCREEN_H * 0.55),
    r: 0.6 + ((i * 7) % 5) * 0.35,
    o: 0.35 + ((i * 11) % 6) * 0.1,
  }));
  return (
    <Animated.View
      style={{ position: 'absolute', top: 0, left: 0, opacity: alpha }}
      pointerEvents="none"
    >
      <Svg width={SCREEN_W} height={SCREEN_H * 0.6}>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={`rgba(255,255,255,${s.o})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Three parallax mountain ranges — far, mid, near — with snowy caps. */
function Mountains({ palette }: { palette: Palette }) {
  const w = SCREEN_W;
  const h = SCREEN_H * 0.5;
  const bottom = SCREEN_H * 0.16;

  return (
    <Svg
      width={w}
      height={h}
      style={{ position: 'absolute', bottom, left: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <SvgGradient id="farMtn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.mountainFar} stopOpacity="0.9" />
          <Stop offset="1" stopColor={palette.mountainFar} stopOpacity="1" />
        </SvgGradient>
        <SvgGradient id="midMtn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.mountainMid} stopOpacity="0.95" />
          <Stop offset="1" stopColor={palette.mountainMid} stopOpacity="1" />
        </SvgGradient>
        <SvgGradient id="nearMtn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.mountainNear} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.mountainNear} stopOpacity="1" />
        </SvgGradient>
      </Defs>

      {/* Far range — highest, faded by atmospheric haze */}
      <Path
        d={`M0 ${h * 0.72} L${w * 0.08} ${h * 0.38} L${w * 0.14} ${h * 0.5} L${w * 0.24} ${h * 0.28} L${w * 0.34} ${h * 0.46} L${w * 0.44} ${h * 0.32} L${w * 0.52} ${h * 0.5} L${w * 0.62} ${h * 0.24} L${w * 0.72} ${h * 0.42} L${w * 0.82} ${h * 0.3} L${w * 0.92} ${h * 0.46} L${w} ${h * 0.38} L${w} ${h} L0 ${h} Z`}
        fill="url(#farMtn)"
      />

      {/* Snowy peaks on far range */}
      <Path
        d={`M${w * 0.22} ${h * 0.3} L${w * 0.26} ${h * 0.36} L${w * 0.28} ${h * 0.3} L${w * 0.24} ${h * 0.28} Z`}
        fill="rgba(255,255,255,0.7)"
      />
      <Path
        d={`M${w * 0.6} ${h * 0.26} L${w * 0.64} ${h * 0.32} L${w * 0.68} ${h * 0.28} L${w * 0.62} ${h * 0.24} Z`}
        fill="rgba(255,255,255,0.7)"
      />

      {/* Mid range */}
      <Path
        d={`M0 ${h * 0.82} L${w * 0.1} ${h * 0.56} L${w * 0.2} ${h * 0.66} L${w * 0.3} ${h * 0.48} L${w * 0.42} ${h * 0.62} L${w * 0.54} ${h * 0.42} L${w * 0.66} ${h * 0.58} L${w * 0.78} ${h * 0.46} L${w * 0.88} ${h * 0.6} L${w} ${h * 0.52} L${w} ${h} L0 ${h} Z`}
        fill="url(#midMtn)"
      />
      {/* Ridge highlight on mid */}
      <Path
        d={`M0 ${h * 0.82} L${w * 0.1} ${h * 0.56} L${w * 0.2} ${h * 0.66} L${w * 0.3} ${h * 0.48} L${w * 0.42} ${h * 0.62} L${w * 0.54} ${h * 0.42} L${w * 0.66} ${h * 0.58} L${w * 0.78} ${h * 0.46} L${w * 0.88} ${h * 0.6} L${w} ${h * 0.52}`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1.2}
        fill="none"
      />

      {/* Near range — darkest, strongest silhouette */}
      <Path
        d={`M0 ${h * 0.92} L${w * 0.06} ${h * 0.7} L${w * 0.14} ${h * 0.78} L${w * 0.24} ${h * 0.6} L${w * 0.34} ${h * 0.76} L${w * 0.46} ${h * 0.56} L${w * 0.58} ${h * 0.72} L${w * 0.7} ${h * 0.52} L${w * 0.8} ${h * 0.7} L${w * 0.9} ${h * 0.6} L${w} ${h * 0.74} L${w} ${h} L0 ${h} Z`}
        fill="url(#nearMtn)"
      />

      {/* Atmospheric haze at the base of mountains */}
      <Rect x={0} y={h * 0.85} width={w} height={h * 0.15} fill="rgba(255,255,255,0.08)" />
    </Svg>
  );
}

/** Rolling hills with trees/tufts for the near foreground (forest variant). */
function Hills({ palette }: { palette: Palette }) {
  const w = SCREEN_W;
  const h = SCREEN_H * 0.18;
  const bottom = SCREEN_H * 0.14;

  const trees: React.ReactElement[] = [];
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * w + ((i % 2) * 12 - 6);
    const y = h * (0.55 + ((i * 7) % 5) * 0.04);
    const scale = 0.6 + ((i * 3) % 5) * 0.12;
    trees.push(
      <Path
        key={`tree-${i}`}
        d={`M${x} ${y + 20 * scale} L${x} ${y + 10 * scale} M${x - 10 * scale} ${y} L${x} ${y - 18 * scale} L${x + 10 * scale} ${y} Z`}
        stroke={palette.treeTrunk}
        strokeWidth={2 * scale}
        fill={palette.treeLeaf}
      />,
    );
  }

  return (
    <Svg
      width={w}
      height={h}
      style={{ position: 'absolute', bottom, left: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <SvgGradient id="hill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.hillFront} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.hillFront} stopOpacity="0.85" />
        </SvgGradient>
      </Defs>
      <Path
        d={`M0 ${h * 0.6} Q${w * 0.15} ${h * 0.3} ${w * 0.3} ${h * 0.55} T${w * 0.6} ${h * 0.5} T${w} ${h * 0.55} L${w} ${h} L0 ${h} Z`}
        fill="url(#hill)"
      />
      <Path
        d={`M0 ${h * 0.6} Q${w * 0.15} ${h * 0.3} ${w * 0.3} ${h * 0.55} T${w * 0.6} ${h * 0.5} T${w} ${h * 0.55}`}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1.2}
        fill="none"
      />
      {trees}
    </Svg>
  );
}

export default function Backdrop({ variant }: { variant: BackdropVariant }) {
  const p = PALETTES[variant];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sky gradient with warm horizon */}
      <LinearGradient
        colors={p.sky}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Stars for the space variant */}
      {p.showStars && <Stars />}

      {/* Sun / moon with radial glow halo */}
      <View
        style={{
          position: 'absolute',
          top: SCREEN_H * 0.07,
          right: SCREEN_W * 0.1,
          width: 140,
          height: 140,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        pointerEvents="none"
      >
        <Svg width={140} height={140}>
          <Defs>
            <RadialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={p.sun.halo} stopOpacity="0.9" />
              <Stop offset="50%" stopColor={p.sun.halo} stopOpacity="0.35" />
              <Stop offset="100%" stopColor={p.sun.halo} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="sunCore" cx="50%" cy="45%" r="50%">
              <Stop offset="0%" stopColor="#FFFDF3" />
              <Stop offset="60%" stopColor={p.sun.color} />
              <Stop offset="100%" stopColor={p.sun.color} />
            </RadialGradient>
          </Defs>
          <Circle cx={70} cy={70} r={70} fill="url(#sunHalo)" />
          <Circle cx={70} cy={70} r={30} fill="url(#sunCore)" />
        </Svg>
      </View>

      {/* Horizon warm glow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: SCREEN_H * 0.16,
          height: SCREEN_H * 0.16,
        }}
      >
        <LinearGradient
          colors={['transparent', p.horizonGlow as any]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Drifting clouds (hidden in space) */}
      {!p.showStars && (
        <>
          <Cloud top={SCREEN_H * 0.08} size={110} duration={52000} delay={0} color={p.cloudColor} shade={p.cloudShade} />
          <Cloud top={SCREEN_H * 0.18} size={80} duration={68000} delay={8000} color={p.cloudColor} shade={p.cloudShade} />
          <Cloud top={SCREEN_H * 0.04} size={95} duration={75000} delay={22000} color={p.cloudColor} shade={p.cloudShade} />
          <Cloud top={SCREEN_H * 0.26} size={65} duration={60000} delay={36000} color={p.cloudColor} shade={p.cloudShade} />
          <Cloud top={SCREEN_H * 0.14} size={72} duration={64000} delay={48000} color={p.cloudColor} shade={p.cloudShade} />
        </>
      )}

      {/* Parallax mountains */}
      <Mountains palette={p} />

      {/* Near hills + trees */}
      <Hills palette={p} />

      {/* Ground band gradient behind the railway */}
      <LinearGradient
        colors={[p.groundTop, p.groundBottom]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SCREEN_H * 0.16,
        }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Grass detail strip at top of ground */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: SCREEN_H * 0.16 - 4,
          height: 8,
        }}
      >
        <Svg width={SCREEN_W} height={8}>
          {[...Array(Math.ceil(SCREEN_W / 14))].map((_, i) => (
            <Path
              key={i}
              d={`M${i * 14} 8 L${i * 14 + 4} 0 L${i * 14 + 8} 8 Z`}
              fill={p.grassTuft}
              opacity={0.85}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}
