/**
 * Kids Vibe design tokens — SmartSpeech.
 * Keep all shared palette, typography, radius, shadow values here so screens stay
 * visually consistent and easy to retune in one place.
 */

export const palette = {
  // Playful but not harsh. Designed to stay readable on colourful backgrounds.
  sun: '#FFC837',
  sunDeep: '#F5A623',
  coral: '#FF7E67',
  coralDeep: '#E35D5B',
  mint: '#4FE0B0',
  mintDeep: '#1FBF8F',
  sky: '#6CB8FF',
  skyDeep: '#2F80ED',
  violet: '#B084F5',
  violetDeep: '#7C5CE6',
  rose: '#FF99C8',
  ink: '#1B2540',
  inkSoft: '#2F3B5C',
  cream: '#FFF6E6',
  creamDeep: '#FBE8C4',
  glass: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.32)',
  shadow: '#0B1228',
  gold: '#FFD24C',
  goldDeep: '#C28E00',
};

export const levelVibe = {
  beginner: {
    skyTop: '#1F3A7A',
    skyMid: '#5AA9FF',
    skyLow: '#FFE7A8',
    sun: '#FFC55A',
    haze: '#BCD9F5',
    mountainFar: '#4A7FB3',
    mountainMid: '#36527C',
    mountainNear: '#213652',
    hillFront: '#2E8B57',
    ground: '#8FD694',
    ground2: '#3FA35C',
    car: ['#0E8D6F', '#1EC9A4', '#4FE0B0'],
    carDark: ['#095E4B', '#0E8D6F', '#0E8D6F'],
  },
  a1: {
    skyTop: '#0E2B5F',
    skyMid: '#2F80ED',
    skyLow: '#FFD9A8',
    sun: '#FFB457',
    haze: '#A5C5EE',
    mountainFar: '#3E5D8B',
    mountainMid: '#2D4368',
    mountainNear: '#18253F',
    hillFront: '#5A6EA6',
    ground: '#8A9BCB',
    ground2: '#586FA8',
    car: ['#2F80ED', '#6CB8FF', '#A5C5EE'],
    carDark: ['#1B4F9E', '#2F80ED', '#2F80ED'],
  },
  a2: {
    skyTop: '#1A0842',
    skyMid: '#4B1082',
    skyLow: '#A55BD1',
    sun: '#F4D3FF',
    haze: '#826BB0',
    mountainFar: '#3F1F6A',
    mountainMid: '#29134A',
    mountainNear: '#140821',
    hillFront: '#4F2B83',
    ground: '#6A3A9F',
    ground2: '#3D1D66',
    car: ['#5B23A0', '#9B59DA', '#D7B0FA'],
    carDark: ['#30115B', '#5B23A0', '#5B23A0'],
  },
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const font = {
  // System stacks that render reliably on Android + iOS without needing an
  // embedded font. Weight drives the playful/bold feeling.
  display: 'System',
  body: 'System',
};

export const shadowFx = {
  soft: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  lifted: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 14,
  },
  // Aliases for common UI card shadows.
  card: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  cardLg: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 14,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 10,
  }),
};

export type LevelVibeKey = keyof typeof levelVibe;
