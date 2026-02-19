// Duty feature
export { useDutyStore, restoreDutyState } from './duty/dutyStore';
export { DUTY_CONFIGS } from './duty/dutyConfig';
export type { DutyState, DutyConfig, DutyStore } from './duty/types';

// Mission feature
export { useMissionStore, restoreMissionState } from './mission/missionStore';
export {
  DEFAULT_LOCATION,
  SIMULATOR_LOCATION,
  getRandomMockMission,
  triggerMockMission,
  createMissionNearLocation,
} from './mission/mockMissions';
export type { Mission, MissionStatus, MissionPriority, MissionStore } from './mission/types';
export { ARRIVAL_THRESHOLD_METERS } from './mission/types';

// Location feature
export {
  startLocationTracking,
  stopLocationTracking,
  forceLocationUpdate,
  restartLocationTracking,
  checkBackgroundTaskStatus,
  getTrackingDiagnostics,
  getPermissionStatus,
} from './location/locationService';
export { useLocationStore } from './location/locationStore';
export type { LocationData } from './location/types';

// Queue feature
export {
  initializeSequence,
  enqueue,
  peek,
  deleteByIds,
  peekAndDelete,
  getStats,
  clear,
} from './queue/locationQueue';
export { getDatabase, withTransaction, saveState, loadState, clearState } from './queue/database';
export type { LocationEntry, QueueStats } from './queue/types';

// Sync feature
export {
  useSyncStore,
  startSync,
  stopSync,
  triggerImmediateSync,
  subscribeToNetworkChanges,
} from './sync/syncService';
export { sendLocationBatch, configureMockApi, resetMockApi } from './sync/mockApi';
export type { SyncStatus, SyncState } from './sync/types';

// Notifications feature
export {
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  requestNotificationPermissions,
  scheduleTestMissionNotification,
  cancelAllNotifications,
  getPushToken,
} from './notifications/notificationService';

// Theme feature
export {
  useThemeStore,
  restoreThemeState,
  useThemeColors,
  useIsDarkMode,
  darkColors,
  lightColors,
} from './theme';
export type { ThemeMode, ThemeColors, ThemeStore } from './theme';

// Navigation feature
export {
  AppNavigation,
  MainTabNavigator,
  TabIcon,
  navigationRef,
  navigateToMap,
  navigateToProfile,
  navigateToMonitor,
} from './navigation';
export type {
  RootTabParamList,
  RootTabNavigationProp,
  AppNavigationProp,
  TabIconProps,
} from './navigation';

// Map feature
export { MapScreen, usePermissions, useMapNavigation } from './map';
export type { PermissionStatus } from './map';

// Monitor feature
export { MonitorScreen, useMonitorData } from './monitor';

// Profile feature
export { ProfileScreen } from './profile';
