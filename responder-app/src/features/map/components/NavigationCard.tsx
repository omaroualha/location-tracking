import React, { memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@features/theme';
import { Mission, MissionStatus } from '@features/mission/types';
import { RouteResult, formatDuration, formatRouteDistance } from '@/utils/routing';
import { typography, spacing, radius, shadows } from '@/theme';

interface NavigationCardProps {
  mission: Mission;
  status: MissionStatus;
  route: RouteResult | null;
  isLoadingRoute: boolean;
  navigationStarted: boolean;
  currentStepIndex: number;
  distanceMeters: number | null;
  onStartNavigation: () => void;
  onComplete: () => void;
}

function NavigationCardComponent({
  mission,
  status,
  route,
  isLoadingRoute,
  navigationStarted,
  currentStepIndex,
  distanceMeters,
  onStartNavigation,
  onComplete,
}: NavigationCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary, borderTopColor: colors.ui.border }]}>
      {isLoadingRoute && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Calculating route...</Text>
        </View>
      )}

      {route && (
        <View style={[styles.routeHeader, { borderBottomColor: colors.ui.divider }]}>
          <View style={styles.routeMetric}>
            <Text style={[styles.routeValue, { color: colors.text.primary }]}>
              {formatDuration(route.duration)}
            </Text>
            <Text style={[styles.routeLabel, { color: colors.text.tertiary }]}>ETA</Text>
          </View>
          <View style={[styles.routeDivider, { backgroundColor: colors.ui.divider }]} />
          <View style={styles.routeMetric}>
            <Text style={[styles.routeValue, { color: colors.text.primary }]}>
              {formatRouteDistance(route.distance)}
            </Text>
            <Text style={[styles.routeLabel, { color: colors.text.tertiary }]}>Distance</Text>
          </View>
          {status === 'arrived' && (
            <>
              <View style={[styles.routeDivider, { backgroundColor: colors.ui.divider }]} />
              <View style={[styles.arrivedBadge, { backgroundColor: colors.status.success + '20' }]}>
                <Text style={[styles.arrivedBadgeText, { color: colors.status.success }]}>ON SCENE</Text>
              </View>
            </>
          )}
        </View>
      )}

      {navigationStarted && route && route.steps.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stepsPreview}
          contentContainerStyle={styles.stepsContent}
        >
          {route.steps.slice(0, 5).map((step, index) => (
            <View
              key={index}
              style={[
                styles.stepCard,
                { backgroundColor: colors.background.tertiary, borderColor: colors.ui.border },
                index === currentStepIndex && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '10' },
              ]}
            >
              <Text style={styles.stepIcon}>
                {step.instruction.split(' ')[0]}
              </Text>
              <Text style={[styles.stepDistance, { color: colors.text.primary }]}>
                {formatRouteDistance(step.distance)}
              </Text>
              <Text style={[styles.stepName, { color: colors.text.tertiary }]} numberOfLines={1}>
                {step.name || 'Continue'}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.missionInfo}>
        <View style={styles.missionTypeRow}>
          <View style={[styles.priorityDot, { backgroundColor: colors.priority[mission.priority] }]} />
          <Text style={[styles.missionType, { color: colors.text.primary }]}>{mission.type}</Text>
        </View>
        <Text style={[styles.missionAddress, { color: colors.text.secondary }]} numberOfLines={1}>
          📍 {mission.location.address}
        </Text>
      </View>

      {!navigationStarted && status !== 'arrived' ? (
        <Pressable
          style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
          onPress={onStartNavigation}
        >
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.startButtonIcon}>🚗</Text>
            <Text style={[styles.startButtonText, { color: colors.text.primary }]}>START NAVIGATION</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.buttonPressed,
            status !== 'arrived' && styles.actionButtonDisabled,
          ]}
          onPress={onComplete}
          disabled={status !== 'arrived'}
        >
          <LinearGradient
            colors={status === 'arrived' ? colors.gradients.success : [colors.background.tertiary, colors.background.elevated]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.actionButtonText, { color: colors.text.primary }, status !== 'arrived' && { color: colors.text.tertiary }]}>
              {status === 'arrived' ? '✓ COMPLETE MISSION' : `NAVIGATING • ${formatRouteDistance(distanceMeters ?? 0)}`}
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

export const NavigationCard = memo(NavigationCardComponent);

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.lg,
    borderTopWidth: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: typography.size.sm,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  routeMetric: {
    flex: 1,
    alignItems: 'center',
  },
  routeValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
  },
  routeLabel: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  routeDivider: {
    width: 1,
    height: 36,
  },
  arrivedBadge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  arrivedBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  stepsPreview: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  stepsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  stepCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
  },
  stepIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  stepDistance: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  stepName: {
    fontSize: typography.size.xs,
    marginTop: 2,
    maxWidth: 70,
  },
  missionInfo: {
    marginBottom: spacing.md,
  },
  missionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  missionType: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  missionAddress: {
    fontSize: typography.size.sm,
  },
  startButton: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  startButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  actionButton: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.8,
  },
  actionButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
});
