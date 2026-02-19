import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mission, MissionPriority } from '@features/mission/types';
import { formatDistance, formatEta } from '@/utils/geo';
import { colors, typography, spacing, radius, shadows } from '@/theme';

interface Props {
  mission: Mission;
  distanceKm: number | null;
}

const PRIORITY_CONFIG: Record<MissionPriority, { gradient: readonly [string, string]; label: string }> = {
  critical: { gradient: ['#dc2626', '#b91c1c'] as const, label: 'CRITICAL' },
  high: { gradient: ['#ea580c', '#c2410c'] as const, label: 'HIGH' },
  medium: { gradient: ['#d97706', '#b45309'] as const, label: 'MEDIUM' },
  low: { gradient: ['#16a34a', '#15803d'] as const, label: 'LOW' },
};

export function MissionHeader({ mission, distanceKm }: Props) {
  const priorityConfig = PRIORITY_CONFIG[mission.priority];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <LinearGradient
          colors={priorityConfig.gradient}
          style={styles.priorityBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.priorityText}>{priorityConfig.label}</Text>
        </LinearGradient>
        <Text style={styles.title} numberOfLines={1}>
          {mission.type}
        </Text>
      </View>

      <View style={styles.infoRow}>
        {distanceKm !== null ? (
          <>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ETA</Text>
              <Text style={styles.infoValue}>{formatEta(distanceKm)}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DISTANCE</Text>
              <Text style={styles.infoValue}>{formatDistance(distanceKm)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.calculatingText}>Calculating route...</Text>
        )}
      </View>

      <View style={styles.addressRow}>
        <View style={styles.addressIcon}>
          <Text style={styles.addressIconText}>📍</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {mission.location.address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priorityBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  priorityText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wider,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  infoDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.ui.border,
    marginHorizontal: spacing.md,
  },
  calculatingText: {
    fontSize: typography.size.md,
    color: colors.text.tertiary,
    flex: 1,
    textAlign: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  addressIconText: {
    fontSize: 14,
  },
  address: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    flex: 1,
  },
});
