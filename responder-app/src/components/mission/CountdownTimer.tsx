import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface Props {
  seconds: number;
}

export function CountdownTimer({ seconds }: Props) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${minutes}:${secs.toString().padStart(2, '0')}`;

  const isUrgent = seconds <= 10;
  const isCritical = seconds <= 5;

  const getGradientColors = (): readonly [string, string] => {
    if (isCritical) return ['#dc2626', '#b91c1c'] as const;
    if (isUrgent) return ['#ea580c', '#c2410c'] as const;
    return [colors.background.tertiary, colors.background.elevated] as const;
  };

  const getTextColor = () => {
    if (isCritical) return '#fecaca';
    if (isUrgent) return '#fed7aa';
    return colors.text.primary;
  };

  return (
    <View style={styles.wrapper}>
      {/* Progress ring background */}
      <View style={styles.ringContainer}>
        <View style={[styles.ring, isUrgent && styles.ringUrgent]} />
        <LinearGradient
          colors={getGradientColors()}
          style={styles.timerContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.time, { color: getTextColor() }]}>{display}</Text>
          <Text style={styles.label}>REMAINING</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: colors.ui.border,
  },
  ringUrgent: {
    borderColor: colors.priority.critical,
    ...shadows.glow(colors.priority.critical),
  },
  timerContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  time: {
    fontSize: 36,
    fontWeight: typography.weight.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: typography.letterSpacing.wide,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wider,
    marginTop: spacing.xs,
  },
});
