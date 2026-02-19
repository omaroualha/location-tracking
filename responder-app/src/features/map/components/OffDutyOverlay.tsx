import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@features/theme';
import { typography, spacing, radius, shadows } from '@/theme';

function OffDutyOverlayComponent() {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.ui.border }]}>
        <Text style={styles.emoji}>🌙</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>You're Off Duty</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>
          Go on duty to start receiving missions
        </Text>
      </View>
    </View>
  );
}

export const OffDutyOverlay = memo(OffDutyOverlayComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: spacing['3xl'],
    borderRadius: radius['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    ...shadows.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.md,
    textAlign: 'center',
  },
});
