import { useMemo } from 'react';
import { useThemeStore } from './themeStore';
import { darkColors, lightColors } from './colors';
import type { ThemeColors } from './types';

export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);

  return useMemo(() => {
    return mode === 'dark' ? darkColors : lightColors;
  }, [mode]);
}

export function useIsDarkMode(): boolean {
  return useThemeStore((s) => s.mode === 'dark');
}
