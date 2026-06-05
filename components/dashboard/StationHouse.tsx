import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgGrad,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * A realistic "3D" station house rendered with layered SVG gradients,
 * fake perspective, and depth shadows. Sits next to the train on the
 * dashboard and serves as the entry point to the Soundtracks screen.
 */

type Props = {
  width: number;
  height: number;
};

export default function StationHouse({ width, height }: Props) {
  // Gentle idle float animation
  const floatY = useRef(new Animated.Value(0)).current;
  const glowOp = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -4,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOp, {
          toValue: 0.7,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOp, {
          toValue: 0.3,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const VB_W = 280;
  const VB_H = 260;

  return (
    <View style={{ width, height, alignItems: 'center' }}>
      {/* Label */}
      <Animated.View
        style={[
          houseStyles.labelWrap,
          { transform: [{ translateY: floatY }] },
        ]}
      >
        <Text style={houseStyles.labelIcon}>🎵</Text>
        <Text style={houseStyles.labelText}>Soundtracks</Text>
      </Animated.View>

      {/* Warm glow behind house */}
      <Animated.View
        pointerEvents="none"
        style={[
          houseStyles.glow,
          {
            opacity: glowOp,
            width: width * 0.8,
            height: height * 0.6,
            top: height * 0.15,
          },
        ]}
      />

      <Svg
        width={width}
        height={height * 0.78}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        pointerEvents="none"
      >
        <Defs>
          {/* ── Wall gradients ──────────────────────────── */}
          <SvgGrad id="wallFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E8D5B8" />
            <Stop offset="30%" stopColor="#D4BC9A" />
            <Stop offset="100%" stopColor="#B89B6E" />
          </SvgGrad>
          <SvgGrad id="wallSide" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#B89B6E" />
            <Stop offset="100%" stopColor="#8A7550" />
          </SvgGrad>

          {/* ── Roof gradients ─────────────────────────── */}
          <SvgGrad id="roofFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#8B2500" />
            <Stop offset="40%" stopColor="#A03020" />
            <Stop offset="100%" stopColor="#5A1800" />
          </SvgGrad>
          <SvgGrad id="roofSide" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#5A1800" />
            <Stop offset="100%" stopColor="#3A0F00" />
          </SvgGrad>

          {/* ── Door gradient ──────────────────────────── */}
          <SvgGrad id="door" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#5C3317" />
            <Stop offset="50%" stopColor="#4A2510" />
            <Stop offset="100%" stopColor="#321608" />
          </SvgGrad>

          {/* ── Window glow ────────────────────────────── */}
          <RadialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFBE6" stopOpacity="0.95" />
            <Stop offset="40%" stopColor="#FFD54F" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#F9A825" stopOpacity="0.6" />
          </RadialGradient>

          {/* ── Chimney ────────────────────────────────── */}
          <SvgGrad id="chimney" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#8B4513" />
            <Stop offset="50%" stopColor="#A0522D" />
            <Stop offset="100%" stopColor="#6B3410" />
          </SvgGrad>

          {/* ── Ground shadow ──────────────────────────── */}
          <RadialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#000" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0" />
          </RadialGradient>

          {/* ── Foundation ─────────────────────────────── */}
          <SvgGrad id="foundation" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#888" />
            <Stop offset="100%" stopColor="#555" />
          </SvgGrad>
        </Defs>

        {/* ═══ GROUND SHADOW ═══ */}
        <Ellipse cx={140} cy={252} rx={120} ry={10} fill="url(#groundShadow)" />

        {/* ═══ FOUNDATION ═══ */}
        <Rect x={38} y={230} width={174} height={16} fill="url(#foundation)" />
        <Path d="M210 230 L248 218 L248 234 L210 246 Z" fill="#444" />

        {/* ═══ SIDE WALL (3D perspective) ═══ */}
        <Path d="M210 110 L248 90 L248 218 L210 230 Z" fill="url(#wallSide)" />
        {/* Mortar lines on side wall */}
        {[130, 150, 170, 190, 210].map((y, i) => (
          <Line key={`sm-${i}`} x1={210} y1={y} x2={248} y2={y - 16} stroke="rgba(0,0,0,0.08)" strokeWidth={0.8} />
        ))}

        {/* ═══ FRONT WALL ═══ */}
        <Rect x={38} y={110} width={174} height={120} fill="url(#wallFront)" />
        {/* Brick mortar lines */}
        {[125, 140, 155, 170, 185, 200, 215].map((y, i) => (
          <Line key={`fm-${i}`} x1={38} y1={y} x2={212} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={0.6} />
        ))}

        {/* ═══ DOOR ═══ */}
        <Rect x={100} y={168} width={50} height={62} rx={4} fill="url(#door)" />
        <Rect x={102} y={170} width={46} height={58} rx={3} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        {/* Door panels */}
        <Rect x={108} y={176} width={16} height={22} rx={2} fill="rgba(255,255,255,0.06)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.6} />
        <Rect x={128} y={176} width={16} height={22} rx={2} fill="rgba(255,255,255,0.06)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.6} />
        <Rect x={108} y={202} width={16} height={22} rx={2} fill="rgba(255,255,255,0.06)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.6} />
        <Rect x={128} y={202} width={16} height={22} rx={2} fill="rgba(255,255,255,0.06)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.6} />
        {/* Door knob */}
        <Circle cx={141} cy={200} r={3} fill="#D4A017" stroke="#8B6914" strokeWidth={0.8} />
        {/* Door arch */}
        <Path d="M100 168 Q125 156 150 168" fill="url(#door)" stroke="#3A1005" strokeWidth={0.8} />

        {/* ═══ WINDOWS ═══ */}
        {/* Left window */}
        <Rect x={54} y={140} width={32} height={36} rx={3} fill="url(#windowGlow)" stroke="#4A2510" strokeWidth={2} />
        <Line x1={70} y1={140} x2={70} y2={176} stroke="#4A2510" strokeWidth={1.5} />
        <Line x1={54} y1={158} x2={86} y2={158} stroke="#4A2510" strokeWidth={1.5} />
        {/* Window sill */}
        <Rect x={50} y={175} width={40} height={4} rx={1} fill="#A0522D" />

        {/* Right window */}
        <Rect x={164} y={140} width={32} height={36} rx={3} fill="url(#windowGlow)" stroke="#4A2510" strokeWidth={2} />
        <Line x1={180} y1={140} x2={180} y2={176} stroke="#4A2510" strokeWidth={1.5} />
        <Line x1={164} y1={158} x2={196} y2={158} stroke="#4A2510" strokeWidth={1.5} />
        {/* Window sill */}
        <Rect x={160} y={175} width={40} height={4} rx={1} fill="#A0522D" />

        {/* ═══ ROOF (front face) ═══ */}
        <Path d="M28 110 L125 50 L222 110 Z" fill="url(#roofFront)" />
        {/* Roof highlight */}
        <Path d="M50 110 L125 58 L200 110" stroke="rgba(255,255,255,0.2)" strokeWidth={1.2} fill="none" />
        {/* Roof tiles lines */}
        {[70, 80, 90, 100].map((y, i) => (
          <Line key={`rt-${i}`} x1={28 + (y - 50) * 1.61} y1={y} x2={222 - (y - 50) * 1.61} y2={y} stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
        ))}

        {/* ═══ ROOF (side face — 3D) ═══ */}
        <Path d="M222 110 L125 50 L165 32 L260 90 Z" fill="url(#roofSide)" />
        {/* Roof edge highlight */}
        <Line x1={125} y1={50} x2={165} y2={32} stroke="rgba(255,200,100,0.3)" strokeWidth={1} />

        {/* ═══ CHIMNEY ═══ */}
        <Rect x={155} y={36} width={18} height={30} rx={2} fill="url(#chimney)" />
        <Rect x={152} y={32} width={24} height={6} rx={2} fill="#8B4513" stroke="#5A2D0C" strokeWidth={0.5} />
        {/* Chimney mortar */}
        <Line x1={155} y1={46} x2={173} y2={46} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
        <Line x1={155} y1={54} x2={173} y2={54} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />

        {/* ═══ DECORATIVE DETAILS ═══ */}
        {/* Front wall cornice */}
        <Rect x={34} y={108} width={182} height={4} rx={1} fill="#A0522D" />

        {/* Address plate */}
        <Rect x={56} y={118} width={26} height={14} rx={3} fill="rgba(0,80,160,0.7)" stroke="#234" strokeWidth={0.6} />
        <Rect x={59} y={120} width={20} height={10} rx={2} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />

        {/* Lantern by door */}
        <Line x1={94} y1={148} x2={94} y2={160} stroke="#333" strokeWidth={1.2} />
        <Rect x={89} y={158} width={10} height={14} rx={2} fill="rgba(255,200,50,0.6)" stroke="#8B6914" strokeWidth={0.8} />
        <Circle cx={94} cy={165} r={3} fill="rgba(255,220,100,0.4)" />

        {/* Steps */}
        <Rect x={96} y={230} width={58} height={6} rx={1} fill="#999" />
        <Rect x={100} y={236} width={50} height={5} rx={1} fill="#888" />
        <Rect x={104} y={241} width={42} height={5} rx={1} fill="#777" />

        {/* ═══ FRONT WALL SHADOW ═══ */}
        <Rect x={38} y={110} width={174} height={120} fill="rgba(0,0,0,0.04)" />
      </Svg>
    </View>
  );
}

const houseStyles = StyleSheet.create({
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.45)',
    marginBottom: 6,
    gap: 6,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  labelIcon: {
    fontSize: 16,
  },
  labelText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  glow: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(255,200,50,0.15)',
  },
});
