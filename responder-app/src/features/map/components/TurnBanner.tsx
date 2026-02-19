import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@features/theme';
import { RouteStep, formatRouteDistance } from '@/utils/routing';
import { typography, spacing } from '@/theme';

interface TurnBannerProps {
  currentStep: RouteStep;
}

function TurnBannerComponent({ currentStep }: TurnBannerProps) {
  const colors = useThemeColors();
  const icon = currentStep.instruction.split(' ')[0];
  const instruction = currentStep.instruction.substring(2);

  return (
    <View style={[styles.container, { backgroundColor: colors.brand.primary }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.distance}>
          {formatRouteDistance(currentStep.distance)}
        </Text>
        <Text style={styles.instruction} numberOfLines={2}>
          {instruction}
        </Text>
      </View>
    </View>
  );
}

export const TurnBanner = memo(TurnBannerComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  distance: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: '#fff',
  },
  instruction: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});
