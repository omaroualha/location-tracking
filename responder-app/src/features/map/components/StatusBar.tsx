import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@features/theme';
import { DutyState } from '@features/duty/types';
import { typography, spacing, radius, shadows } from '@/theme';

interface StatusBarProps {
  dutyState: DutyState;
  isConnected: boolean;
  canToggle: boolean;
  isLoading: boolean;
  onToggleDuty: () => void;
}

function StatusBarComponent({
  dutyState,
  isConnected,
  canToggle,
  isLoading,
  onToggleDuty,
}: StatusBarProps) {
  const colors = useThemeColors();

  const getStatusConfig = () => {
    if (dutyState === 'OFF_DUTY') {
      return { color: colors.text.tertiary, label: 'Off Duty' };
    }
    if (dutyState === 'ON_MISSION') {
      return { color: colors.brand.primary, label: 'On Mission' };
    }
    return { color: colors.status.success, label: 'On Duty' };
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary, borderBottomColor: colors.ui.border }]}>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
        <Text style={[styles.statusText, { color: colors.text.primary }]}>{statusConfig.label}</Text>
        {!isConnected && (
          <View style={[styles.offlineBadge, { backgroundColor: colors.status.warning + '30' }]}>
            <Text style={[styles.offlineText, { color: colors.status.warning }]}>OFFLINE</Text>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.toggleButton,
          pressed && styles.toggleButtonPressed,
          !canToggle && styles.toggleButtonDisabled,
        ]}
        onPress={onToggleDuty}
        disabled={!canToggle || isLoading}
      >
        <LinearGradient
          colors={
            dutyState === 'ON_DUTY'
              ? colors.gradients.success
              : [colors.background.tertiary, colors.background.elevated]
          }
          style={styles.toggleGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text
            style={[
              styles.toggleText,
              { color: colors.text.primary },
              dutyState === 'OFF_DUTY' && { color: colors.text.secondary },
            ]}
          >
            {dutyState === 'OFF_DUTY' ? 'GO ON DUTY' : 'GO OFF DUTY'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export const StatusBar = memo(StatusBarComponent);

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  offlineBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  offlineText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  toggleButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  toggleButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  toggleText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
});
