import React from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGrad,
  Path,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';
import Wheel from './Wheel';

type Props = {
  width: number;
  height: number;
  wheelSpin: Animated.AnimatedInterpolation<string>;
  colors: [string, string, string];
  index: number;
  locked?: boolean;
  boss?: boolean;
};

/**
 * High-fidelity SVG wagon. Mirrors the Locomotive rendering style (metallic
 * highlights, brass bands, spoked wheels, cast shadow, reflective window
 * glass) so the whole train reads as one realistic 3D vehicle.
 */
export default function Wagon({
  width,
  height,
  wheelSpin,
  colors,
  index,
  locked,
  boss,
}: Props) {
  const VB_W = 260;
  const VB_H = 200;
  const s = height / VB_H;

  const [light, base, dark] = locked ? ['#8A8A8A', '#6A6A6A', '#3E3E3E'] : colors;

  const wheels = [
    { cx: 66, cy: 152, rVB: 26 },
    { cx: 194, cy: 152, rVB: 26 },
  ];

  return (
    <View style={{ width, height }}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        pointerEvents="none"
      >
        <Defs>
          <SvgGrad id={`body-${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={light} />
            <Stop offset="35%" stopColor={base} />
            <Stop offset="80%" stopColor={dark} />
            <Stop offset="100%" stopColor={dark} />
          </SvgGrad>
          <SvgGrad id={`roof-${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <Stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
            <Stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
          </SvgGrad>
          <SvgGrad id="glass" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#F7FBFF" />
            <Stop offset="45%" stopColor="#A7CEEF" />
            <Stop offset="100%" stopColor="#2F6DA3" />
          </SvgGrad>
          <SvgGrad id="brass2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFF2BD" />
            <Stop offset="45%" stopColor="#F2C94C" />
            <Stop offset="100%" stopColor="#8B6A00" />
          </SvgGrad>
          <SvgGrad id="crown" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFF4C4" />
            <Stop offset="50%" stopColor="#F2C94C" />
            <Stop offset="100%" stopColor="#8B6A00" />
          </SvgGrad>
        </Defs>

        <Ellipse cx={130} cy={188} rx={110} ry={7} fill="rgba(0,0,0,0.35)" />

        <Rect x={-2} y={148} width={12} height={8} fill="#222" rx={1.5} />
        <Rect x={250} y={148} width={12} height={8} fill="#222" rx={1.5} />

        <Rect x={12} y={140} width={236} height={16} fill="#111" rx={2} />
        <Rect x={12} y={151} width={236} height={3} fill="rgba(255,255,255,0.12)" rx={1} />

        <G>
          <Path
            d={`M18 72 Q18 60 30 60 L230 60 Q242 60 242 72 L242 140 L18 140 Z`}
            fill={`url(#body-${index})`}
            stroke={locked ? '#2F2F2F' : 'rgba(0,0,0,0.35)'}
            strokeWidth={1.5}
          />
          <Path d="M24 66 Q130 55 236 66" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Rect x={18} y={58} width={224} height={20} rx={12} fill={`url(#roof-${index})`} opacity={0.6} />

          <Rect x={22} y={90} width={216} height={3} fill="url(#brass2)" />
          <Rect x={22} y={118} width={216} height={3} fill="url(#brass2)" />

          {boss ? (
            <G>
              <Rect x={70} y={76} width={120} height={38} rx={5} fill="url(#glass)" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
              <Path d="M74 78 L150 78 L148 92 L74 92 Z" fill="rgba(255,255,255,0.4)" />
              <Rect x={108} y={82} width={44} height={26} rx={4} fill="url(#crown)" stroke="#5F4800" strokeWidth={1} />
            </G>
          ) : (
            <G>
              <Rect x={36} y={76} width={52} height={38} rx={4} fill="url(#glass)" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
              <Rect x={104} y={76} width={52} height={38} rx={4} fill="url(#glass)" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
              <Rect x={172} y={76} width={52} height={38} rx={4} fill="url(#glass)" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
              <Path d="M38 78 L82 78 L78 96 L38 96 Z" fill="rgba(255,255,255,0.38)" />
              <Path d="M106 78 L150 78 L146 96 L106 96 Z" fill="rgba(255,255,255,0.38)" />
              <Path d="M174 78 L218 78 L214 96 L174 96 Z" fill="rgba(255,255,255,0.38)" />
            </G>
          )}

          <G>
            <Rect
              x={110}
              y={120}
              width={40}
              height={18}
              rx={4}
              fill={locked ? '#3a3a3a' : '#FFFFFF'}
              stroke={locked ? '#222' : '#B8860B'}
              strokeWidth={1.2}
            />
            <SvgText
              x={130}
              y={133}
              fontSize={13}
              fontWeight="900"
              fill={locked ? '#888' : '#1B1B1B'}
              textAnchor="middle"
            >
              <TSpan>{locked ? '🔒' : (boss ? '★' : String(index))}</TSpan>
            </SvgText>
          </G>

          {[...Array(10)].map((_, i) => (
            <Circle key={`wt-${i}`} cx={30 + i * 22} cy={70} r={1.4} fill="rgba(255,255,255,0.45)" />
          ))}
          {[...Array(10)].map((_, i) => (
            <Circle key={`wb-${i}`} cx={30 + i * 22} cy={138} r={1.4} fill="rgba(0,0,0,0.35)" />
          ))}

          <Rect x={18} y={60} width={6} height={80} fill="rgba(0,0,0,0.28)" />
          <Rect x={236} y={60} width={6} height={80} fill="rgba(0,0,0,0.18)" />
        </G>

        <Rect x={0} y={182} width={VB_W} height={2} fill="rgba(255,255,255,0.15)" />
      </Svg>

      {wheels.map((w, i) => {
        const size = w.rVB * 2 * s;
        return (
          <Wheel
            key={i}
            size={size}
            spin={wheelSpin}
            left={w.cx * s - size / 2}
            top={w.cy * s - size / 2}
          />
        );
      })}
    </View>
  );
}
