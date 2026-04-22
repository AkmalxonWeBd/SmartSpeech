import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgGrad,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Wheel from './Wheel';

/**
 * Hi-fidelity SVG locomotive used on the dashboard train.
 * Uses layered gradients for cylindrical boiler shading, brass bands, spoked
 * drive wheels, headlight glow, and a soft cast shadow. Smoke is rendered as
 * stacked expanding circles animated via native driver transforms.
 */

type SmokePuffProps = { delay: number; size: number; offsetX: number };
function SmokePuff({ delay, size, offsetX }: SmokePuffProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      translateY.setValue(0);
      scale.setValue(0.3);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -size * 1.4,
          duration: 2200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.4,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.75,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished && !cancelled) run();
      });
    };
    const t = setTimeout(run, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
      translateY.stopAnimation();
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: offsetX,
        width: size,
        height: size,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="smoke" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F5F1EC" stopOpacity="0.95" />
            <Stop offset="60%" stopColor="#D8D2CC" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#D8D2CC" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#smoke)" />
      </Svg>
    </Animated.View>
  );
}

type Props = {
  wheelSpin: Animated.AnimatedInterpolation<string>;
  height: number;
};

export default function Locomotive({ wheelSpin, height }: Props) {
  const VB_W = 360;
  const VB_H = 200;
  const width = (height / VB_H) * VB_W;

  // Pixel scale for positioning Wheel overlays on top of the SVG.
  const s = height / VB_H;

  // Wheel coordinates (in SVG viewBox units). Converted to px for overlay.
  const wheelCenters = [
    { cx: 170, cy: 152, rVB: 28 },
    { cx: 230, cy: 152, rVB: 28 },
    { cx: 280, cy: 152, rVB: 28 },
    { cx: 100, cy: 164, rVB: 16 },
  ];

  return (
    <View style={{ width, height, marginBottom: 4 }}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        pointerEvents="none"
      >
        <Defs>
          <SvgGrad id="boiler" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7A1C14" />
            <Stop offset="25%" stopColor="#D64333" />
            <Stop offset="55%" stopColor="#F26A55" />
            <Stop offset="80%" stopColor="#B02A1F" />
            <Stop offset="100%" stopColor="#4A0F09" />
          </SvgGrad>
          <RadialGradient id="smokebox" cx="50%" cy="45%" r="65%">
            <Stop offset="0%" stopColor="#3A3A3A" />
            <Stop offset="70%" stopColor="#181818" />
            <Stop offset="100%" stopColor="#050505" />
          </RadialGradient>
          <SvgGrad id="chimney" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#101010" />
            <Stop offset="45%" stopColor="#3C3C3C" />
            <Stop offset="100%" stopColor="#0A0A0A" />
          </SvgGrad>
          <SvgGrad id="dome" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFE9A8" />
            <Stop offset="40%" stopColor="#F2C94C" />
            <Stop offset="100%" stopColor="#8B6A00" />
          </SvgGrad>
          <SvgGrad id="cab" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#5A150E" />
            <Stop offset="45%" stopColor="#B52D1E" />
            <Stop offset="85%" stopColor="#7C1A0F" />
            <Stop offset="100%" stopColor="#3A0A05" />
          </SvgGrad>
          <SvgGrad id="window" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#F7FBFF" />
            <Stop offset="40%" stopColor="#B7DCF5" />
            <Stop offset="100%" stopColor="#4685B8" />
          </SvgGrad>
          <SvgGrad id="frame" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#2B2B2B" />
            <Stop offset="50%" stopColor="#111" />
            <Stop offset="100%" stopColor="#000" />
          </SvgGrad>
          <SvgGrad id="brass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFF2BD" />
            <Stop offset="45%" stopColor="#F2C94C" />
            <Stop offset="100%" stopColor="#8B6A00" />
          </SvgGrad>
          <SvgGrad id="catcher" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6A6A6A" />
            <Stop offset="60%" stopColor="#2C2C2C" />
            <Stop offset="100%" stopColor="#0D0D0D" />
          </SvgGrad>
          <RadialGradient id="head" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFF9C4" />
            <Stop offset="70%" stopColor="#FFD24C" />
            <Stop offset="100%" stopColor="#B8860B" />
          </RadialGradient>
        </Defs>

        {/* Cast shadow */}
        <Ellipse cx={200} cy={188} rx={160} ry={8} fill="rgba(0,0,0,0.35)" />

        {/* Cow catcher */}
        <G>
          <Path
            d="M30 168 L50 140 L108 140 L100 168 Z"
            fill="url(#catcher)"
            stroke="#0A0A0A"
            strokeWidth={1}
          />
          {[36, 46, 56, 66, 76, 86, 96].map((x, i) => (
            <Line
              key={i}
              x1={x + 4}
              y1={140}
              x2={x + 12}
              y2={168}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.4}
            />
          ))}
          <Rect x={24} y={158} width={10} height={6} fill="#222" rx={1.5} />
        </G>

        {/* Running board */}
        <Rect x={48} y={140} width={266} height={14} fill="url(#frame)" rx={1.5} />
        <Rect x={48} y={151} width={266} height={3} fill="rgba(255,255,255,0.12)" rx={1} />

        {/* Boiler */}
        <G>
          <Rect x={56} y={80} width={210} height={62} rx={12} fill="url(#boiler)" />
          <Path
            d="M60 86 Q165 74 262 86"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          {[90, 140, 200, 250].map((x, i) => (
            <Rect key={i} x={x} y={80} width={4.5} height={62} fill="url(#brass)" />
          ))}
          {[...Array(14)].map((_, i) => (
            <Circle key={`rt-${i}`} cx={62 + i * 15} cy={86} r={1.6} fill="rgba(255,255,255,0.5)" />
          ))}
          {[...Array(14)].map((_, i) => (
            <Circle key={`rb-${i}`} cx={62 + i * 15} cy={136} r={1.6} fill="rgba(0,0,0,0.5)" />
          ))}
          <Rect x={56} y={130} width={210} height={12} fill="rgba(0,0,0,0.25)" rx={4} />
        </G>

        {/* Front smokebox */}
        <G>
          <Circle cx={72} cy={111} r={32} fill="url(#smokebox)" />
          <Circle cx={72} cy={111} r={22} fill="#0B0B0B" stroke="#2A2A2A" strokeWidth={1.2} />
          {[...Array(10)].map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <Circle
                key={i}
                cx={72 + Math.cos(a) * 18}
                cy={111 + Math.sin(a) * 18}
                r={1.6}
                fill="#606060"
              />
            );
          })}
          <Circle cx={72} cy={108} r={8} fill="url(#head)" />
          <Circle cx={72} cy={108} r={11} fill="rgba(255,215,100,0.22)" />
          <Circle cx={72} cy={118} r={4} fill="#F2C94C" stroke="#8B6A00" strokeWidth={0.8} />
        </G>

        {/* Chimney */}
        <G>
          <Rect x={104} y={52} width={14} height={32} rx={2} fill="url(#chimney)" />
          <Rect x={100} y={48} width={22} height={6} rx={2} fill="#1A1A1A" />
          <Path d="M100 80 L122 80 L120 86 L102 86 Z" fill="#0A0A0A" />
        </G>

        {/* Steam dome */}
        <G>
          <Path d="M142 80 Q160 50 178 80 Z" fill="url(#dome)" />
          <Path d="M146 80 Q160 58 174 80" stroke="rgba(255,255,255,0.6)" strokeWidth={1.2} fill="none" />
        </G>

        {/* Sand dome */}
        <G>
          <Path d="M200 80 Q214 58 228 80 Z" fill="url(#dome)" />
        </G>

        {/* Cab */}
        <G>
          <Path d="M258 70 L322 70 L324 142 L256 142 Z" fill="url(#cab)" stroke="#1B0A05" strokeWidth={1} />
          <Path d="M256 74 L324 74" stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
          <Rect x={266} y={84} width={22} height={22} rx={3} fill="url(#window)" stroke="#2A0B06" strokeWidth={1.2} />
          <Rect x={294} y={84} width={22} height={22} rx={3} fill="url(#window)" stroke="#2A0B06" strokeWidth={1.2} />
          <Path d="M268 86 L286 86 L284 96 L268 96 Z" fill="rgba(255,255,255,0.4)" />
          <Path d="M296 86 L314 86 L312 96 L296 96 Z" fill="rgba(255,255,255,0.4)" />
          <Rect x={278} y={112} width={28} height={26} rx={2} fill="rgba(0,0,0,0.25)" />
          {[76, 92, 108, 124, 140].map((y, i) => (
            <Circle key={`cl-${i}`} cx={262} cy={y} r={1.4} fill="rgba(255,255,255,0.35)" />
          ))}
          {[76, 92, 108, 124, 140].map((y, i) => (
            <Circle key={`cr-${i}`} cx={320} cy={y} r={1.4} fill="rgba(0,0,0,0.35)" />
          ))}
        </G>

        {/* Rear coupler */}
        <Rect x={324} y={148} width={10} height={8} fill="#222" rx={1} />

        {/* Side rod (brass connecting rod) */}
        <Rect x={166} y={150} width={118} height={5} rx={2} fill="url(#brass)" />
        <Circle cx={170} cy={152.5} r={2.5} fill="#4A2E00" />
        <Circle cx={230} cy={152.5} r={2.5} fill="#4A2E00" />
        <Circle cx={280} cy={152.5} r={2.5} fill="#4A2E00" />

        {/* Ground rail highlight */}
        <Rect x={0} y={182} width={VB_W} height={2} fill="rgba(255,255,255,0.15)" />
      </Svg>

      {/* Animated wheels overlayed on the SVG body */}
      {wheelCenters.map((w, idx) => {
        const size = w.rVB * 2 * s;
        return (
          <Wheel
            key={idx}
            size={size}
            spin={wheelSpin}
            left={w.cx * s - size / 2}
            top={w.cy * s - size / 2}
          />
        );
      })}

      {/* Smoke layer above the chimney. Clipped so puffs never escape
          into the sky/clouds layer behind the train. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 96 * s,
          top: 0,
          width: 40 * s,
          height: 60 * s,
          overflow: 'hidden',
        }}
      >
        {[0, 600, 1200, 1800].map((d, i) => (
          <SmokePuff key={i} delay={d} size={26 * s} offsetX={(i % 2) * 4 - 2} />
        ))}
      </View>
    </View>
  );
}
