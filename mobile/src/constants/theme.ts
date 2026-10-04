/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Template keys (kept, so existing components still work)
    text: '#1F2937',
    background: '#F7F9FC',
    backgroundElement: '#E3F2FD',
    backgroundSelected: '#BBDEFB',
    textSecondary: '#5F6B7A',

    // Surfaces and lines
    surface: '#FFFFFF',
    border: '#E5E7EB',
    inputBorder: '#7B8594',

    // Brand
    primary: '#1565C0',
    onPrimary: '#FFFFFF',
    primaryLight: '#E3F2FD',
    secondary: '#00796B',
    secondaryLight: '#E0F2F1',

    // Status
    success: '#2E7D32',
    successLight: '#E8F5E9',
    warning: '#92400E',
    warningLight: '#FEF3C7',
    error: '#C62828',
    errorLight: '#FDECEA',
    info: '#01579B',
    infoLight: '#E1F5FE',
  },
  dark: {
    text: '#F3F4F6',
    background: '#0B1220',
    backgroundElement: '#1E293B',
    backgroundSelected: '#273449',
    textSecondary: '#9CA3AF',

    surface: '#151E2E',
    border: '#2D3B50',
    inputBorder: '#6B7A90',

    primary: '#64B5F6',
    onPrimary: '#0B1220',
    primaryLight: '#12324F',
    secondary: '#4DB6AC',
    secondaryLight: '#0F3B37',

    success: '#81C784',
    successLight: '#12301A',
    warning: '#FBBF24',
    warningLight: '#3A2A06',
    error: '#F28B82',
    errorLight: '#3B1414',
    info: '#4FC3F7',
    infoLight: '#0C2F44',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Radius = {
  control: 10, // inputs and buttons
  card: 14,
  modal: 20,
  pill: 9999, // status badges
} as const;