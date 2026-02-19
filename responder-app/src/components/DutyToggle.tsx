import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDutyStore } from '@features/duty/dutyStore';
import { DutyState } from '@features/duty/types';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface DutyToggleProps {
  disabled?: boolean;
  onToggle?: (newState: DutyState) => void;
}

function DutyToggleComponent({ disabled, onToggle }: DutyToggleProps) {
  const dutyState = useDutyStore((s) => s.dutyState);
  const toggleDuty = useDutyStore((s) => s.toggleDuty);

  const isOnDuty = dutyState !== 'OFF_DUTY';
  const isOnMission = dutyState === 'ON_MISSION';

  const handlePress = useCallback(() => {
    if (disabled || isOnMission) return;

    toggleDuty();
    const newState: DutyState = isOnDuty ? 'OFF_DUTY' : 'ON_DUTY';
    onToggle?.(newState);
  }, [disabled, isOnMission, isOnDuty, toggleDuty, onToggle]);

  const gradientColors = isOnDuty
    ? colors.gradients.success
    : [colors.background.tertiary, colors.background.elevated] as const;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || isOnMission}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (disabled || isOnMission) && styles.buttonDisabled,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          <Text style={[styles.label, !isOnDuty && styles.labelInactive]}>
            {isOnMission ? 'ON MISSION' : isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
          </Text>
          <Text style={[styles.hint, !isOnDuty && styles.hintInactive]}>
            {isOnMission
              ? 'Complete mission to change status'
              : isOnDuty
                ? 'Tap to go off duty'
                : 'Tap to go on duty'}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export const DutyToggle = memo(DutyToggleComponent);

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['3xl'],
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wide,
  },
  labelInactive: {
    color: colors.text.secondary,
  },
  hint: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.sm,
  },
  hintInactive: {
    color: colors.text.tertiary,
  },
});
