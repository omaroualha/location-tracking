import React, { useCallback, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useThemeColors } from '@features/theme';
import { MapScreen } from '@features/map';
import { ProfileScreen } from '@features/profile';
import { MonitorScreen } from '@features/monitor';
import { spacing } from '@/theme';
import { TabIcon } from './TabIcon';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function MainTabNavigator() {
  const colors = useThemeColors();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.background.secondary,
      borderTopColor: colors.ui.border,
      borderTopWidth: 1,
      height: 80,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    }),
    [colors]
  );

  const renderMapIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon focused={focused} icon="🗺️" label="Map" />
    ),
    []
  );

  const renderProfileIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon focused={focused} icon="👤" label="Profile" />
    ),
    []
  );

  const renderMonitorIcon = useCallback(
    ({ focused }: { focused: boolean }) => (
      <TabIcon focused={focused} icon="📊" label="Monitor" />
    ),
    []
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: renderMapIcon }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: renderProfileIcon }}
      />
      <Tab.Screen
        name="Monitor"
        component={MonitorScreen}
        options={{ tabBarIcon: renderMonitorIcon }}
      />
    </Tab.Navigator>
  );
}
