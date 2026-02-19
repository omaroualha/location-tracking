import { StyleSheet } from 'react-native';

// Color Palette - Modern dark theme with vibrant accents
export const colors = {
  // Base colors
  background: {
    primary: '#0a0a12',
    secondary: '#12121f',
    tertiary: '#1a1a2e',
    elevated: '#22223a',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#b4b4c4',
    tertiary: '#6b6b7b',
    inverse: '#0a0a12',
  },

  // Brand colors
  brand: {
    primary: '#6366f1', // Indigo
    secondary: '#8b5cf6', // Purple
    accent: '#06b6d4', // Cyan
  },

  // Status colors
  status: {
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    error: '#ef4444',
    errorLight: '#f87171',
    info: '#3b82f6',
    infoLight: '#60a5fa',
  },

  // Priority colors
  priority: {
    critical: '#dc2626',
    criticalBg: 'rgba(220, 38, 38, 0.15)',
    high: '#ea580c',
    highBg: 'rgba(234, 88, 12, 0.15)',
    medium: '#d97706',
    mediumBg: 'rgba(217, 119, 6, 0.15)',
    low: '#16a34a',
    lowBg: 'rgba(22, 163, 74, 0.15)',
  },

  // UI colors
  ui: {
    border: '#2a2a3e',
    borderLight: '#3a3a4e',
    divider: '#1f1f2f',
    overlay: 'rgba(0, 0, 0, 0.75)',
    card: '#16162a',
    cardHover: '#1e1e36',
  },

  // Gradients (as tuples for LinearGradient)
  gradients: {
    primary: ['#6366f1', '#8b5cf6'] as const,
    success: ['#22c55e', '#16a34a'] as const,
    warning: ['#f59e0b', '#d97706'] as const,
    error: ['#ef4444', '#dc2626'] as const,
    dark: ['#1a1a2e', '#0a0a12'] as const,
    glass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] as const,
  },
} as const;

// Typography
export const typography = {
  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 32,
    '5xl': 40,
  },

  // Font weights
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

// Border radius
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
};

// Common component styles
export const commonStyles = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: colors.ui.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.ui.border,
    padding: spacing.lg,
  },
  cardElevated: {
    backgroundColor: colors.background.elevated,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },

  // Text styles
  heading1: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.tight,
  },
  heading2: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  heading3: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  body: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.normal,
    color: colors.text.secondary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.normal,
    color: colors.text.tertiary,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wider,
  },

  // Layout
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  // Badges
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
});

// Animation durations
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Theme object for easy import
const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  commonStyles,
  animation,
};

export default theme;
