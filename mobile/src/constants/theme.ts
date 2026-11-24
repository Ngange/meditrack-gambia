/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// The same palette as the web app (web/src/components/layout/AppShell.css), so the two look like one product.
// Cards are a step lighter than the page and have a thin border; inner panels are one step lighter again.
export const Colors = {
  light: {
    // Template keys (kept, so existing components still work)
    text: '#111827',
    background: '#F6F8FC',
    backgroundElement: '#FFFFFF', // cards
    backgroundSelected: '#E8F0FB', // selected / tinted panels
    textSecondary: '#5B6475',

    // Surfaces and lines
    surface: '#FFFFFF',
    border: '#E3E8F0',
    inputBorder: '#7B8594',

    // Brand
    primary: '#1C5FB5',
    onPrimary: '#FFFFFF',
    primaryLight: '#E8F0FB',
    secondary: '#00796B',
    secondaryLight: '#E0F2F1',

    // Status
    success: '#1B7A3A',
    successLight: '#E6F4EA',
    warning: '#A24A05',
    warningLight: '#FDF0E1',
    error: '#C62828',
    errorLight: '#FDECEA',
    info: '#01579B',
    infoLight: '#E1F5FE',
  },
  dark: {
    text: '#E8EDF5',
    background: '#0B1220',
    backgroundElement: '#141D2E', // cards
    backgroundSelected: '#1B2638', // inner panels
    textSecondary: '#9AA8BD',

    surface: '#141D2E',
    border: '#2A374C',
    inputBorder: '#6B7A90',

    primary: '#6FB1F2',
    onPrimary: '#0B1220',
    primaryLight: '#1A2C47',
    secondary: '#4DB6AC',
    secondaryLight: '#0F3B37',

    success: '#6FCF8E',
    successLight: '#153322',
    warning: '#F0A560',
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