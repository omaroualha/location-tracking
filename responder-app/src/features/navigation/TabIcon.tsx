import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@features/theme';
import { typography, spacing } from '@/theme';
import type { TabIconProps } from './types';

export const TabIcon = memo(function TabIcon({ focused, icon, label }: TabIconProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {focused ? (
        <LinearGradient
          colors={colors.gradients.primary}
          style={styles.activeBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.iconText}>{icon}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.inactiveBackground, { backgroundColor: colors.background.tertiary }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
      )}
      <Text style={[styles.label, { color: colors.text.tertiary }, focused && { color: colors.brand.primary, fontWeight: typography.weight.semibold }]}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    marginTop: spacing.xs,
  },
});
