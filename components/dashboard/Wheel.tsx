import React from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  size: number;
  spin: Animated.AnimatedInterpolation<string>;
  /** Optional absolute position (screen px from top-left of parent). */
  left?: number;
  top?: number;
};

/**
 * A metallic spoked wheel. The whole SVG spins via RN transform, which keeps
 * the rendering pipeline simple and reliable across platforms (SVG `G`
 * rotation prop doesn't accept string interpolations).
 */
export default function Wheel({ size, spin, left, top }: Props) {
  const r = size / 2;
  const spokes: React.ReactElement[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const x2 = r + Math.cos(ang) * (r - 4);
    const y2 = r + Math.sin(ang) * (r - 4);
    spokes.push(
      <Line
        key={i}
        x1={r}
        y1={r}
        x2={x2}
        y2={y2}
        stroke="#4A4A4A"
        strokeWidth={size * 0.06}
        strokeLinecap="round"
      />,
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: left != null ? 'absolute' : 'relative',
        left,
        top,
        width: size,
        height: size,
        transform: [{ rotate: spin }],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`rim-${size}`} cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor="#6E6E6E" />
            <Stop offset="60%" stopColor="#2B2B2B" />
            <Stop offset="100%" stopColor="#0A0A0A" />
          </RadialGradient>
        </Defs>
        {/* Outer tyre */}
        <Circle cx={r} cy={r} r={r} fill="#0D0D0D" />
        {/* Rim */}
        <Circle cx={r} cy={r} r={r - size * 0.1} fill={`url(#rim-${size})`} />
        {/* Spokes + hub */}
        {spokes}
        <Circle cx={r} cy={r} r={r * 0.28} fill="#C9C9C9" stroke="#6A6A6A" strokeWidth={1} />
        <Circle cx={r} cy={r} r={r * 0.12} fill="#4A4A4A" />
      </Svg>
    </Animated.View>
  );
}
