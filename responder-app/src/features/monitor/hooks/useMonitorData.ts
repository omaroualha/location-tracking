import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDutyStore } from '@features/duty/dutyStore';
import { useSyncStore } from '@features/sync/syncService';
import { useMissionStore } from '@features/mission/missionStore';
import { useLocationStore } from '@features/location/locationStore';
import { checkBackgroundTaskStatus } from '@features/location/locationService';
import { getStats, peek } from '@features/queue/locationQueue';
import { useNetworkStatus } from '@features/app';
import type { QueueStats, LocationEntry } from '@features/queue/types';
import { REFRESH_INTERVAL_MS } from '../constants';
import { calculateBackoff, getStatusColor, getTrackingModeDisplay } from '../utils';

export function useMonitorData() {
  const [refreshing, setRefreshing] = useState(false);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    count: 0,
    oldestTimestamp: null,
    newestTimestamp: null,
  });
  const [recentEntries, setRecentEntries] = useState<LocationEntry[]>([]);
  const [isBackgroundTaskActive, setIsBackgroundTaskActive] = useState(false);
  const [sessionStartTime] = useState(Date.now());

  // Store subscriptions
  const dutyState = useDutyStore((s) => s.dutyState);
  const config = useDutyStore((s) => s.getConfig());
  const syncState = useSyncStore();
  const missionStatus = useMissionStore((s) => s.status);
  const networkStatus = useNetworkStatus();

  // Location store selectors
  const lastLocation = useLocationStore((s) => s.lastLocation);
  const lastUpdateAt = useLocationStore((s) => s.lastUpdateAt);
  const totalReceived = useLocationStore((s) => s.totalReceived);
  const isTracking = useLocationStore((s) => s.isTracking);

  // Computed values
  const isOnline = useMemo(
    () => networkStatus.isConnected && networkStatus.isInternetReachable !== false,
    [networkStatus.isConnected, networkStatus.isInternetReachable]
  );

  const displayTrackingMode = useMemo(
    () => getTrackingModeDisplay(isBackgroundTaskActive, isTracking),
    [isBackgroundTaskActive, isTracking]
  );

  const backoffDelay = useMemo(
    () => (syncState.consecutiveFailures > 0 ? calculateBackoff(syncState.consecutiveFailures) : 0),
    [syncState.consecutiveFailures]
  );

  const statusColor = useMemo(() => getStatusColor(syncState.status), [syncState.status]);


  // Actions
  const checkTask = useCallback(async () => {
    const active = await checkBackgroundTaskStatus();
    setIsBackgroundTaskActive(active);
  }, []);

  const fetchQueueStats = useCallback(async () => {
    const stats = await getStats();
    setQueueStats(stats);
    const entries = await peek(5);
    setRecentEntries(entries);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchQueueStats();
    await checkTask();
    setRefreshing(false);
  }, [fetchQueueStats, checkTask]);

  // Periodic refresh
  useEffect(() => {
    fetchQueueStats();
    checkTask();

    const interval = setInterval(() => {
      fetchQueueStats();
      checkTask();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchQueueStats, checkTask]);

  return {
    // State
    refreshing,
    queueStats,
    recentEntries,
    isBackgroundTaskActive,
    sessionStartTime,

    // Duty
    dutyState,
    config,

    // Sync
    syncStatus: syncState.status,
    lastSyncAt: syncState.lastSyncAt,
    lastError: syncState.lastError,
    pendingCount: syncState.pendingCount,
    consecutiveFailures: syncState.consecutiveFailures,

    // Location
    lastLocation,
    lastUpdateAt,
    totalReceived,
    isTracking,

    // Network
    networkStatus,
    isOnline,

    // Mission
    missionStatus,

    // Computed
    displayTrackingMode,
    backoffDelay,
    statusColor,

    // Actions
    onRefresh,
    fetchQueueStats,
  };
}
