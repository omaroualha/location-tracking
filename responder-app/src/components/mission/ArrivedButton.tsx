import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMissionStore } from '@features/mission/missionStore';
import { ARRIVAL_THRESHOLD_METERS, MissionStatus } from '@features/mission/types';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface Props {
  isWithinThreshold: boolean;
  distanceMeters: number | null;
  status: MissionStatus;
  onComplete: () => void;
}

export function ArrivedButton({
  isWithinThreshold,
  distanceMeters,
  status,
  onComplete,
}: Props) {
  const markArrived = useMissionStore((s) => s.markArrived);

  if (status === 'arrived') {
    return (
      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onComplete}
        >
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>COMPLETE MISSION</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  const canMarkArrived = isWithinThreshold;

  return (
    <View style={styles.container}>
      {!canMarkArrived && distanceMeters !== null && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {Math.round(distanceMeters - ARRIVAL_THRESHOLD_METERS)}m until arrival zone
          </Text>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && canMarkArrived && styles.buttonPressed,
          !canMarkArrived && styles.buttonDisabled,
        ]}
        onPress={markArrived}
        disabled={!canMarkArrived}
      >
        {canMarkArrived ? (
          <LinearGradient
            colors={colors.gradients.success}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>ARRIVED AT SCENE</Text>
          </LinearGradient>
        ) : (
          <View style={styles.disabledContent}>
            <Text style={styles.disabledText}>ARRIVED AT SCENE</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.ui.border,
  },
  hintContainer: {
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  hintText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
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
    opacity: 0.5,
  },
  gradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wider,
  },
  disabledContent: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
  },
  disabledText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wider,
  },
});
