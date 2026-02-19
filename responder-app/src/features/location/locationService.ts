import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';
import { LOCATION_TASK_NAME, setLocationHandler } from './locationTask';
import { LocationData, toLocationData, getAccuracy } from './types';
import { DutyConfig } from '@features/duty/types';
import { isExpoGo } from '@/utils/environment';
import { enqueue } from '@features/queue/locationQueue';
import { useLocationStore } from './locationStore';

// State
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let currentConfig: DutyConfig | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let lastAppState: AppStateStatus = AppState.currentState;

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Check current permission status without prompting user
 */
export async function getPermissionStatus(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const { status: fg } = await Location.getForegroundPermissionsAsync();

  if (fg !== 'granted') {
    return { foreground: false, background: false };
  }

  if (isExpoGo()) {
    return { foreground: true, background: false };
  }

  const { status: bg } = await Location.getBackgroundPermissionsAsync();
  return { foreground: true, background: bg === 'granted' };
}

/**
 * Request permissions only if not already granted
 */
export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  // First check current status
  const current = await getPermissionStatus();

  // If foreground already granted, don't re-request
  if (current.foreground) {
    console.log('[Location] Foreground permission already granted');

    // If in Expo Go, can't get background
    if (isExpoGo()) {
      console.log('[Location] Expo Go detected - background not available');
      return { foreground: true, background: false };
    }

    // If background not granted, request it
    if (!current.background) {
      console.log('[Location] Requesting background permission...');
      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      return { foreground: true, background: bg === 'granted' };
    }

    return current;
  }

  // Request foreground permission
  console.log('[Location] Requesting foreground permission...');
  const { status: fg } = await Location.requestForegroundPermissionsAsync();

  if (fg !== 'granted') {
    console.log('[Location] Foreground permission denied');
    return { foreground: false, background: false };
  }

  if (isExpoGo()) {
    console.log('[Location] Expo Go detected - background not available');
    return { foreground: true, background: false };
  }

  // Request background permission
  console.log('[Location] Requesting background permission...');
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg === 'granted' };
}

// ---------------------------------------------------------------------------
// Core: Fetch single location + record + enqueue
// ---------------------------------------------------------------------------

async function fetchLocation(accuracy: Location.Accuracy): Promise<LocationData | null> {
  try {
    // Check permission first to avoid cryptic errors
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Location] Fetch skipped - permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({ accuracy });
    const data = toLocationData(location);

    useLocationStore.getState().recordLocation(data);
    await enqueue([data]);
    return data;
  } catch (error) {
    // Ignore simulator "no location" errors
    if (!String(error).includes('kCLErrorDomain error 0')) {
      console.error('[Location] Fetch failed:', error);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// AppState Handler - Resume tracking when app comes to foreground
// ---------------------------------------------------------------------------

async function handleAppStateChange(nextAppState: AppStateStatus) {
  const wasBackground = lastAppState.match(/inactive|background/);
  const isNowActive = nextAppState === 'active';

  console.log(`[Location] AppState: ${lastAppState} → ${nextAppState}`);

  if (wasBackground && isNowActive) {
    console.log('[Location] App returned to foreground');

    // Re-check permissions
    const perms = await getPermissionStatus();
    console.log('[Location] Permissions after resume:', perms);

    if (!perms.foreground) {
      console.warn('[Location] Foreground permission lost! Stopping tracking.');
      store().setTracking(false, 'none');
      return;
    }

    // If we were tracking with foreground polling, restart it
    const state = store();
    if (state.isTracking && state.trackingMode === 'foreground' && currentConfig) {
      console.log('[Location] Restarting foreground polling after resume');
      startPolling(currentConfig);
    }
  }

  lastAppState = nextAppState;
}

function setupAppStateListener() {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  console.log('[Location] AppState listener set up');
}

function removeAppStateListener() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

// ---------------------------------------------------------------------------
// Foreground Polling (only runs when app is in foreground)
// ---------------------------------------------------------------------------

function startPolling(config: DutyConfig) {
  stopPolling();
  if (!config.intervalMs) return;

  const accuracy = getAccuracy(config);
  console.log(`[Location] Polling started (every ${config.intervalMs}ms)`);

  // Only fetch if app is in foreground (use AppState directly - it's always current)
  const safeFetch = () => {
    if (AppState.currentState === 'active') {
      fetchLocation(accuracy);
    }
  };

  safeFetch(); // Initial fetch
  pollingTimer = setInterval(safeFetch, config.intervalMs);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Background Tracking
// ---------------------------------------------------------------------------

async function startBackgroundTracking(config: DutyConfig): Promise<boolean> {
  if (!config.intervalMs || !config.distanceMeters) return false;

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: getAccuracy(config),
      timeInterval: config.intervalMs,
      distanceInterval: config.distanceMeters,
      // Disable deferred updates for more immediate delivery
      deferredUpdatesInterval: 0,
      deferredUpdatesDistance: 0,
      // iOS: Show blue bar indicator
      showsBackgroundLocationIndicator: true,
      // iOS: Don't pause updates when stationary
      pausesUpdatesAutomatically: false,
      // iOS: Activity type - "other" is most permissive
      activityType: Location.ActivityType.Other,
      // Android: Foreground service notification
      foregroundService: {
        notificationTitle: 'Responder Active',
        notificationBody: 'Tracking location for dispatch',
        notificationColor: '#1E90FF',
      },
    });
    return true;
  } catch (error) {
    console.error('[Location] Background tracking failed:', error);
    return false;
  }
}

async function stopBackgroundTracking() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch {
    // Already stopped or unavailable
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const store = () => useLocationStore.getState();

export async function startLocationTracking(config: DutyConfig): Promise<boolean> {
  console.log('[Location] Starting tracking:', config);
  await stopLocationTracking();

  if (!config.intervalMs || !config.distanceMeters) {
    console.log('[Location] Tracking disabled (no config)');
    store().setTracking(false, 'none');
    return false;
  }

  const perms = await requestLocationPermissions();
  console.log('[Location] Permissions:', JSON.stringify(perms), 'isExpoGo:', isExpoGo());

  if (!perms.foreground) {
    console.warn('[Location] ❌ Foreground permission denied - cannot track');
    store().setTracking(false, 'none');
    return false;
  }

  // Set up AppState listener to handle foreground/background transitions
  setupAppStateListener();

  // Try background first (dev builds only)
  if (perms.background && !isExpoGo()) {
    setLocationHandler((locs) => store().recordLocations(locs));

    if (await startBackgroundTracking(config)) {
      currentConfig = config;
      store().setTracking(true, 'background');
      console.log('[Location] ✅ Background tracking active - will track even when app is backgrounded');
      return true;
    }
  }

  // Fallback: foreground polling (won't work in background!)
  if (!perms.background) {
    console.warn('[Location] ⚠️ Background permission NOT granted');
    console.warn('[Location] ⚠️ Tracking will STOP when app goes to background!');
    console.warn('[Location] ⚠️ To fix: iOS Settings > Privacy > Location > YourApp > "Always"');
  }

  currentConfig = config;
  startPolling(config);
  store().setTracking(true, 'foreground');
  console.log('[Location] Foreground polling active (pauses in background)');
  return true;
}

export async function stopLocationTracking() {
  console.log('[Location] Stopping tracking');
  stopPolling();
  await stopBackgroundTracking();
  removeAppStateListener();
  currentConfig = null;
  store().setTracking(false, 'none');
}

export async function restartLocationTracking(): Promise<boolean> {
  if (!currentConfig) {
    console.warn('[Location] Cannot restart - no config');
    return false;
  }
  return startLocationTracking(currentConfig);
}

export async function forceLocationUpdate(): Promise<LocationData | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  return fetchLocation(Location.Accuracy.High);
}

export async function checkBackgroundTaskStatus(): Promise<boolean> {
  if (isExpoGo()) return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}

export function getIsTracking(): boolean {
  return store().isTracking;
}

/**
 * Get diagnostic info about location tracking
 */
export async function getTrackingDiagnostics(): Promise<{
  isExpoGo: boolean;
  permissions: { foreground: boolean; background: boolean };
  isTracking: boolean;
  trackingMode: string;
  hasBackgroundTask: boolean;
}> {
  const perms = await getPermissionStatus();
  const state = store();
  const hasBgTask = await checkBackgroundTaskStatus();

  const diagnostics = {
    isExpoGo: isExpoGo(),
    permissions: perms,
    isTracking: state.isTracking,
    trackingMode: state.trackingMode,
    hasBackgroundTask: hasBgTask,
  };

  console.log('[Location] Diagnostics:', JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}
