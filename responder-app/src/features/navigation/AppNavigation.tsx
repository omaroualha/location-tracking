import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { useThemeColors, useIsDarkMode } from '@features/theme';
import { navigationRef } from './navigationRef';
import { MainTabNavigator } from './MainTabNavigator';

export function AppNavigation() {
  const colors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  const navigationTheme: Theme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDarkMode,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.brand.primary,
        background: colors.background.primary,
        card: colors.background.secondary,
        text: colors.text.primary,
        border: colors.ui.border,
        notification: colors.brand.accent,
      },
    }),
    [colors, isDarkMode]
  );

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <MainTabNavigator />
    </NavigationContainer>
  );
}
