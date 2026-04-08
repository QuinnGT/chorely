export const colors = {
  primary: '#006571',
  'primary-container': '#58e7fb',
  'on-primary': '#d7f9ff',
  'on-primary-container': '#00515b',
  'primary-dim': '#005862',
  'primary-fixed': '#58e7fb',
  'primary-fixed-dim': '#45d8ed',

  secondary: '#912da3',
  'secondary-container': '#fbbdff',
  'on-secondary': '#ffeefb',
  'on-secondary-container': '#790f8d',
  'secondary-dim': '#831d96',
  'secondary-fixed': '#fbbdff',
  'secondary-fixed-dim': '#f7a8ff',

  tertiary: '#825000',
  'tertiary-container': '#f7a01e',
  'on-tertiary': '#fff0e3',
  'on-tertiary-container': '#4a2c00',
  'tertiary-dim': '#724600',
  'tertiary-fixed': '#f7a01e',
  'tertiary-fixed-dim': '#e79308',

  error: '#b31b25',
  'error-container': '#fb5151',
  'on-error': '#ffefee',
  'on-error-container': '#570008',
  'error-dim': '#9f0519',

  surface: '#f5f7fa',
  'surface-bright': '#f5f7fa',
  'surface-container': '#e5e8ec',
  'surface-container-low': '#eef1f4',
  'surface-container-lowest': '#ffffff',
  'surface-container-high': '#dfe3e7',
  'surface-container-highest': '#d9dde1',
  'surface-dim': '#d0d5d9',
  'surface-tint': '#006571',
  'surface-variant': '#d9dde1',

  onSurface: '#2c2f32',
  'on-surface-variant': '#595c5e',
  onBackground: '#2c2f32',

  inverseSurface: '#0b0f11',
  'inverse-on-surface': '#9a9da0',
  inversePrimary: '#58e7fb',

  outline: '#74777a',
  'outline-variant': '#abadb0',

  background: '#f5f7fa',
} as const;

export const fonts = {
  headline: '"Plus Jakarta Sans", sans-serif',
  body: '"Be Vietnam Pro", sans-serif',
  label: '"Be Vietnam Pro", sans-serif',
} as const;

export const borderRadius = {
  DEFAULT: '1rem',
  lg: '2rem',
  xl: '3rem',
  full: '9999px',
} as const;

export const shadows = {
  card: '0 8px 24px rgba(0, 0, 0, 0.06)',
  cardHover: '0 12px 32px rgba(0, 0, 0, 0.08)',
  floating: '0 8px 24px rgba(0, 0, 0, 0.06)',
  button: '0 4px 12px rgba(0, 0, 0, 0.15)',
} as const;

export const animations = {
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  pop: '300ms',
  shake: '400ms',
  slide: '250ms',
  confetti: '800ms',
} as const;

export const spacing = {
  touchMin: '60px',
  touchGap: '12px',
  cardPadding: '1.5rem',
  sectionGap: '1rem',
} as const;

export const glass = {
  bg: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(255, 255, 255, 0.2)',
  blur: '20px',
  shadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
} as const;

export const themePresets = {
  light: {
    surface: '#f5f7fa',
    'surface-container-lowest': '#ffffff',
    primary: '#006571',
  },
  dark: {
    surface: '#0b0f11',
    'surface-container-lowest': '#1a1f23',
    primary: '#58e7fb',
  },
} as const;

export type ColorKey = keyof typeof colors;
export type ThemePreset = keyof typeof themePresets;
