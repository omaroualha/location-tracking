import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import { useThemeColors } from '@features/theme';
import { triggerImmediateSync } from '@features/sync/syncService';
import { clear, enqueue } from '@features/queue/locationQueue';
import { useLocationStore } from '@features/location/locationStore';
import { restartLocationTracking, getTrackingDiagnostics } from '@features/location/locationService';
import type { LocationData } from '@features/location/types';
import { typography, spacing, radius, shadows } from '@/theme';

// Match the threshold in locationService
const STALE_THRESHOLD_MS = 120_000; // 2 minutes

import { useMonitorData } from './hooks';
import { SectionHeader, DataRow } from './components';
import { formatTime, formatAge, formatCoord, formatDuration } from './utils';

export function MonitorScreen() {
  const colors = useThemeColors();
  const {
    refreshing,
    queueStats,
    recentEntries,
    sessionStartTime,
    dutyState,
    config,
    syncStatus,
    lastSyncAt,
    lastError,
    pendingCount,
    consecutiveFailures,
    lastLocation,
    lastUpdateAt,
    totalReceived,
    isTracking,
    isOnline,
    networkStatus,
    missionStatus,
    displayTrackingMode,
    backoffDelay,
    statusColor,
    isBackgroundTaskActive,
    onRefresh,
    fetchQueueStats,
  } = useMonitorData();

  const handleClearQueue = useCallback(async () => {
    await clear();
    await fetchQueueStats();
  }, [fetchQueueStats]);

  const handleTriggerSync = useCallback(() => {
    triggerImmediateSync();
  }, []);


  const handleGetLocation = useCallback(async () => {
    try {
      const { status: permStatus } = await Location.getForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is not granted');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? null,
        altitude: location.coords.altitude ?? null,
        timestamp: location.timestamp,
      };

      useLocationStore.getState().recordLocation(locationData);
      await enqueue([locationData]);
      await fetchQueueStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to get location: ${message}`);
    }
  }, [fetchQueueStats]);

  const handleRestartTracking = useCallback(async () => {
    Alert.alert(
      'Restart Location Tracking',
      'This will stop and restart the location subscription. Use this if updates have stopped.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: async () => {
            try {
              const success = await restartLocationTracking();
              if (success) {
                Alert.alert('Success', 'Location tracking restarted');
              } else {
                Alert.alert('Note', 'No active tracking config found. Toggle duty state to start tracking.');
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to restart: ${message}`);
            }
          },
        },
      ]
    );
  }, []);

  const handleDiagnostics = useCallback(async () => {
    try {
      const diag = await getTrackingDiagnostics();

      const statusEmoji = diag.permissions.background ? '✅' : '❌';
      const modeEmoji = diag.trackingMode === 'background' ? '✅' : diag.trackingMode === 'foreground' ? '⚠️' : '❌';

      const message = [
        `Build Type: ${diag.isExpoGo ? '❌ Expo Go (no background!)' : '✅ Dev Build'}`,
        '',
        'PERMISSIONS:',
        `  Foreground: ${diag.permissions.foreground ? '✅ Granted' : '❌ Denied'}`,
        `  Background: ${statusEmoji} ${diag.permissions.background ? 'Always' : 'While Using Only'}`,
        '',
        'TRACKING STATUS:',
        `  Active: ${diag.isTracking ? '✅ YES' : '❌ NO'}`,
        `  Mode: ${modeEmoji} ${diag.trackingMode.toUpperCase()}`,
        `  BG Task: ${diag.hasBackgroundTask ? '✅ Running' : '❌ Not Running'}`,
        '',
        '─────────────────────',
        diag.trackingMode === 'background'
          ? '✅ GOOD: Tracking continues in background'
          : diag.trackingMode === 'foreground'
            ? '⚠️ WARNING: Tracking STOPS when app is backgrounded!\n\nFix: Settings > Privacy > Location > App > "Always"'
            : 'ℹ️ Tracking is not active',
      ].join('\n');

      Alert.alert(
        'Location Diagnostics',
        message,
        diag.trackingMode === 'foreground'
          ? [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'OK', style: 'cancel' },
            ]
          : [{ text: 'OK' }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Diagnostics failed: ${message}`);
    }
  }, []);

  // Check if subscription might be stale
  const isStale = isTracking && lastUpdateAt && (Date.now() - lastUpdateAt) > STALE_THRESHOLD_MS;

  const sessionDuration = formatDuration(Date.now() - sessionStartTime);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text.primary }]}>System Monitor</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Session: {sessionDuration}</Text>

        {/* Location Tracking Section */}
        <View style={[styles.section, styles.sectionHighlight, { backgroundColor: colors.background.secondary, borderColor: colors.brand.primary + '40' }]}>
          <SectionHeader
            icon="📍"
            title="Location Tracking"
            trailing={
              <View
                style={[
                  styles.liveIndicator,
                  { backgroundColor: isTracking ? colors.status.success + '30' : colors.background.tertiary },
                ]}
              >
                <Text style={[styles.liveIndicatorText, { color: colors.text.primary }]}>
                  {isTracking ? 'LIVE' : 'OFF'}
                </Text>
              </View>
            }
          />

          <DataRow label="Duty State">
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.ui.border },
                dutyState === 'OFF_DUTY' && { backgroundColor: colors.background.tertiary },
                dutyState === 'ON_DUTY' && { backgroundColor: colors.status.successLight },
                dutyState === 'ON_MISSION' && { backgroundColor: colors.priority.criticalBg },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.text.primary }]}>{dutyState}</Text>
            </View>
          </DataRow>

          <DataRow label="Mode">
            <Text
              style={[
                styles.value,
                { color: colors.text.primary },
                displayTrackingMode === 'Inactive' && { color: colors.text.tertiary },
                displayTrackingMode === 'Background' && { color: colors.status.success },
              ]}
            >
              {displayTrackingMode}
            </Text>
          </DataRow>

          {config.intervalMs && (
            <DataRow label="Config">
              <Text style={[styles.value, { color: colors.text.primary }]}>
                Every {config.intervalMs / 1000}s or {config.distanceMeters}m
              </Text>
            </DataRow>
          )}

          <View style={[styles.divider, { backgroundColor: colors.ui.divider }]} />

          <DataRow label="Total Received">
            <Text style={[styles.valueNumber, { color: totalReceived > 0 ? colors.status.success : colors.text.primary }]}>
              {totalReceived}
            </Text>
          </DataRow>

          <DataRow label="Last Update">
            <Text style={[styles.value, { color: lastUpdateAt ? colors.status.success : colors.text.primary }]}>
              {lastUpdateAt ? formatAge(lastUpdateAt) : 'Never'}
            </Text>
          </DataRow>

          {lastLocation && (
            <View style={[styles.locationBox, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.locationLabel, { color: colors.text.tertiary }]}>Last Position</Text>
              <Text style={[styles.locationCoord, { color: colors.status.success }]}>
                {formatCoord(lastLocation.latitude)}, {formatCoord(lastLocation.longitude)}
              </Text>
              <Text style={[styles.locationAccuracy, { color: colors.text.secondary }]}>
                Accuracy: {lastLocation.accuracy?.toFixed(1) ?? 'N/A'}m
              </Text>
            </View>
          )}

          {isStale && (
            <View style={[styles.staleWarning, { backgroundColor: colors.status.warning + '20' }]}>
              <Text style={[styles.staleWarningText, { color: colors.status.warning }]}>
                ⚠️ No updates in 2+ minutes. Subscription may be stale.
              </Text>
              <Pressable
                style={[styles.staleRestartButton, { backgroundColor: colors.status.warning }]}
                onPress={handleRestartTracking}
              >
                <Text style={[styles.staleRestartText, { color: '#ffffff' }]}>Restart</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* SQLite Queue Section */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <SectionHeader icon="💾" title="SQLite Queue" />

          <DataRow label="Entries">
            <Text style={[styles.valueNumber, { color: queueStats.count > 0 ? colors.status.warning : colors.text.primary }]}>
              {queueStats.count}
            </Text>
          </DataRow>

          <DataRow label="Oldest">
            <Text style={[styles.value, { color: colors.text.primary }]}>
              {queueStats.oldestTimestamp ? formatAge(queueStats.oldestTimestamp) : 'Empty'}
            </Text>
          </DataRow>

          <DataRow label="Newest">
            <Text style={[styles.value, { color: colors.text.primary }]}>{formatTime(queueStats.newestTimestamp)}</Text>
          </DataRow>

          {recentEntries.length > 0 && (
            <View style={[styles.entriesPreview, { borderTopColor: colors.ui.divider }]}>
              <Text style={[styles.entriesTitle, { color: colors.text.tertiary }]}>Recent (by sequence)</Text>
              <Text style={[styles.entriesText, { color: colors.text.secondary }]}>
                {recentEntries.map((e) => `#${e.sequence}`).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Sync Service Section */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <SectionHeader icon="🔄" title="Sync Service" />

          <DataRow label="Status">
            <>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.value, { color: statusColor }]}>
                {syncStatus.toUpperCase()}
              </Text>
            </>
          </DataRow>

          <DataRow label="Pending">
            <Text style={[styles.valueNumber, { color: pendingCount > 0 ? colors.status.warning : colors.text.primary }]}>
              {pendingCount}
            </Text>
          </DataRow>

          <DataRow label="Last Sync">
            <Text style={[styles.value, { color: colors.text.primary }]}>{formatTime(lastSyncAt)}</Text>
          </DataRow>

          {consecutiveFailures > 0 && (
            <>
              <DataRow label="Failures">
                <Text style={[styles.value, { color: colors.status.error }]}>{consecutiveFailures}</Text>
              </DataRow>
              <DataRow label="Backoff">
                <Text style={[styles.value, { color: colors.status.warning }]}>{backoffDelay / 1000}s</Text>
              </DataRow>
            </>
          )}

          {lastError && (
            <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
              <Text style={[styles.errorText, { color: colors.status.error }]}>{lastError}</Text>
            </View>
          )}
        </View>

        {/* Network Section */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <SectionHeader icon="📶" title="Network" />

          <DataRow label="Status">
            <>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? colors.status.success : colors.status.error },
                ]}
              />
              <Text style={[styles.value, { color: isOnline ? colors.status.success : colors.status.error }]}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </>
          </DataRow>

          <DataRow label="Type">
            <Text style={[styles.value, { color: colors.text.primary }]}>{networkStatus.type ?? 'Unknown'}</Text>
          </DataRow>
        </View>

        {/* Recovery Info */}
        <View style={[styles.section, { backgroundColor: colors.background.secondary }]}>
          <SectionHeader icon="🔒" title="Persistence" />

          <DataRow label="Queue Storage">
            <Text style={[styles.value, { color: colors.status.success }]}>SQLite (Durable)</Text>
          </DataRow>

          <DataRow label="Survives Crash">
            <Text style={[styles.value, { color: colors.status.success }]}>Yes</Text>
          </DataRow>

          <DataRow label="Background Task">
            <Text style={[styles.value, { color: isBackgroundTaskActive ? colors.status.success : colors.text.tertiary }]}>
              {isBackgroundTaskActive ? 'Registered' : 'Not Active'}
            </Text>
          </DataRow>

          <DataRow label="Mission">
            <Text style={[styles.value, { color: colors.text.primary }]}>{missionStatus}</Text>
          </DataRow>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={handleGetLocation}>
            <LinearGradient
              colors={colors.gradients.success}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Get Location</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleTriggerSync}>
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.actionButtonText, { color: colors.text.primary }]}>Trigger Sync</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.actionsSecondary}>
          <Pressable
            style={[styles.actionButtonSecondary, { backgroundColor: colors.background.tertiary, borderColor: colors.ui.border }]}
            onPress={handleRestartTracking}
          >
            <Text style={[styles.actionButtonSecondaryText, { color: colors.text.secondary }]}>Restart Tracking</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButtonSecondary, { backgroundColor: colors.background.tertiary, borderColor: colors.ui.border }]}
            onPress={handleClearQueue}
          >
            <Text style={[styles.actionButtonSecondaryText, { color: colors.text.secondary }]}>Clear Queue</Text>
          </Pressable>
        </View>

        <View style={styles.actionsSecondary}>
          <Pressable
            style={[styles.actionButtonSecondary, { backgroundColor: colors.status.info + '20', borderColor: colors.status.info }]}
            onPress={handleDiagnostics}
          >
            <Text style={[styles.actionButtonSecondaryText, { color: colors.status.info }]}>Run Diagnostics</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text.tertiary }]}>Pull to refresh</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    marginBottom: spacing.xl,
  },
  section: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionHighlight: {
    borderWidth: 1,
  },
  liveIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  liveIndicatorText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  value: {
    fontSize: typography.size.sm,
    fontFamily: 'monospace',
  },
  valueNumber: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    fontFamily: 'monospace',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  locationBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  locationLabel: {
    fontSize: typography.size.xs,
    marginBottom: spacing.xs,
  },
  locationCoord: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    fontFamily: 'monospace',
  },
  locationAccuracy: {
    fontSize: typography.size.xs,
    marginTop: spacing.xs,
  },
  staleWarning: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staleWarningText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  staleRestartButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  staleRestartText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  entriesPreview: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  entriesTitle: {
    fontSize: typography.size.xs,
    marginBottom: spacing.xs,
  },
  entriesText: {
    fontSize: typography.size.xs,
    fontFamily: 'monospace',
  },
  errorBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  errorText: {
    fontSize: typography.size.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionsSecondary: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actionButtonSecondaryText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.size.xs,
  },
});
