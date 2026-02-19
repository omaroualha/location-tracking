// Jest setup file - runs after test framework is set up

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      withTransactionAsync: jest.fn((fn) => fn()),
      closeAsync: jest.fn(),
    })
  ),
}));

// Mock expo-task-manager
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    isDevice: true,
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'WIFI',
    })
  ),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => ({
  default: 'MapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
  PROVIDER_GOOGLE: 'google',
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock react-native
jest.mock('react-native', () => {
  const listeners: Array<(state: string) => void> = [];
  return {
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn((event, callback) => {
        listeners.push(callback);
        return { remove: jest.fn(() => {
          const idx = listeners.indexOf(callback);
          if (idx > -1) listeners.splice(idx, 1);
        }) };
      }),
      // Helper for tests to simulate state change
      __simulateStateChange: (newState: string) => {
        listeners.forEach(cb => cb(newState));
      },
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Platform: {
      OS: 'ios',
      select: (obj: { ios?: unknown }) => obj.ios,
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
  };
});

// Silence console during tests (comment out for debugging)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
