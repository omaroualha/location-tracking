import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Vibration,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMissionStore } from '@features/mission/missionStore';
import { ALERT_TIMEOUT_SECONDS, MissionPriority } from '@features/mission/types';
import { DEFAULT_LOCATION } from '@features/mission/mockMissions';
import { useCountdown } from '@hooks/useCountdown';
import { CountdownTimer } from './CountdownTimer';
import {
  calculateDistanceKm,
  formatDistance,
  formatEta,
  Coordinates,
} from '@/utils/geo';
import { colors, typography, spacing, radius, shadows } from '@/theme';
import { navigateToMap } from '@features/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  userLocation: Coordinates | null;
}

const PRIORITY_CONFIG: Record<
  MissionPriority,
  { color: string; bg: string; label: string; gradient: readonly [string, string] }
> = {
  critical: {
    color: colors.priority.critical,
    bg: colors.priority.criticalBg,
    label: 'CRITICAL',
    gradient: ['#dc2626', '#b91c1c'] as const,
  },
  high: {
    color: colors.priority.high,
    bg: colors.priority.highBg,
    label: 'HIGH PRIORITY',
    gradient: ['#ea580c', '#c2410c'] as const,
  },
  medium: {
    color: colors.priority.medium,
    bg: colors.priority.mediumBg,
    label: 'MEDIUM',
    gradient: ['#d97706', '#b45309'] as const,
  },
  low: {
    color: colors.priority.low,
    bg: colors.priority.lowBg,
    label: 'LOW',
    gradient: ['#16a34a', '#15803d'] as const,
  },
};

export function AlertModal({ userLocation }: Props) {
  const status = useMissionStore((s) => s.status);
  const pendingMission = useMissionStore((s) => s.pendingMission);
  const acceptMission = useMissionStore((s) => s.acceptMission);
  const declineMission = useMissionStore((s) => s.declineMission);
  const timeoutMission = useMissionStore((s) => s.timeoutMission);

  const handleAccept = () => {
    acceptMission();
    navigateToMap();
  };

  const { seconds, restart } = useCountdown({
    initialSeconds: ALERT_TIMEOUT_SECONDS,
    onTimeout: timeoutMission,
    autoStart: false,
  });

  const isVisible = status === 'pending' && pendingMission !== null;

  useEffect(() => {
    if (isVisible && pendingMission) {
      restart();
      Vibration.vibrate([0, 400, 100, 400, 100, 400]);
    }
  }, [isVisible, pendingMission?.id]);

  if (!isVisible || !pendingMission) {
    return null;
  }

  const priorityConfig = PRIORITY_CONFIG[pendingMission.priority];
  // Use user location or fall back to default Cologne location
  const effectiveLocation = userLocation ?? DEFAULT_LOCATION;
  const distanceKm = calculateDistanceKm(effectiveLocation, pendingMission.location);

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Glowing border effect */}
          <LinearGradient
            colors={priorityConfig.gradient}
            style={styles.glowBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          <View style={styles.content}>
            {/* Header with pulse animation */}
            <View style={styles.header}>
              <View style={[styles.pulseRing, { borderColor: priorityConfig.color }]} />
              <View style={[styles.alertIcon, { backgroundColor: priorityConfig.color }]}>
                <Text style={styles.alertIconText}>!</Text>
              </View>
            </View>

            <Text style={styles.headerText}>INCOMING MISSION</Text>

            {/* Priority Badge */}
            <LinearGradient
              colors={priorityConfig.gradient}
              style={styles.priorityBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.priorityText}>{priorityConfig.label}</Text>
            </LinearGradient>

            {/* Mission Type */}
            <Text style={styles.missionType}>{pendingMission.type}</Text>

            {/* Location Card */}
            <View style={styles.locationCard}>
              <View style={styles.locationIconContainer}>
                <Text style={styles.locationIcon}>📍</Text>
              </View>
              <Text style={styles.locationText} numberOfLines={2}>
                {pendingMission.location.address}
              </Text>
            </View>

            {/* Distance & ETA */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoValue}>{formatDistance(distanceKm)}</Text>
                <Text style={styles.infoLabel}>DISTANCE</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoValue}>{formatEta(distanceKm)}</Text>
                <Text style={styles.infoLabel}>ETA</Text>
              </View>
            </View>

            {/* Countdown Timer */}
            <View style={styles.timerContainer}>
              <CountdownTimer seconds={seconds} />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.declineButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={declineMission}
              >
                <Text style={styles.declineButtonText}>DECLINE</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.acceptButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleAccept}
              >
                <LinearGradient
                  colors={colors.gradients.success}
                  style={styles.acceptGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.acceptButtonText}>ACCEPT</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    ...shadows.lg,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 2,
  },
  content: {
    margin: 2,
    backgroundColor: colors.background.secondary,
    borderRadius: radius['2xl'] - 2,
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    opacity: 0.3,
  },
  alertIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow('#ef4444'),
  },
  alertIconText: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  headerText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.widest,
    marginBottom: spacing.lg,
  },
  priorityBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  priorityText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wider,
  },
  missionType: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  locationIcon: {
    fontSize: 20,
  },
  locationText: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.secondary,
    lineHeight: typography.size.md * typography.lineHeight.normal,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  infoItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  infoValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wide,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.ui.border,
  },
  timerContainer: {
    marginBottom: spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  declineButton: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.ui.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wide,
  },
  acceptButton: {
    overflow: 'hidden',
  },
  acceptGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: typography.letterSpacing.wide,
  },
});
