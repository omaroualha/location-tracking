import * as Location from 'expo-location';
import {
  startLocationTracking,
  stopLocationTracking,
  forceLocationUpdate,
  requestLocationPermissions,
} from '@features/location/locationService';
import { useLocationStore } from '@features/location/locationStore';

// Mock the queue
jest.mock('@features/queue/locationQueue', () => ({
  enqueue: jest.fn(() => Promise.resolve()),
}));

// Mock isExpoGo
jest.mock('@/utils/environment', () => ({
  isExpoGo: jest.fn(() => true), // Default to Expo Go for foreground-only tests
}));

// Mock locationTask
jest.mock('@features/location/locationTask', () => ({
  LOCATION_TASK_NAME: 'test-location-task',
  setLocationHandler: jest.fn(),
}));

describe('locationService', () => {
  const mockConfig = {
    intervalMs: 5000,
    distanceMeters: 3,
    accuracy: 'high' as const,
  };

  const mockLocation = {
    coords: {
      latitude: 37.785834,
      longitude: -122.406417,
      accuracy: 5.0,
      altitude: 10.5,
      altitudeAccuracy: 3.0,
      heading: 90,
      speed: 0,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset location store
    useLocationStore.setState({
      lastLocation: null,
      lastUpdateAt: null,
      totalReceived: 0,
      isTracking: false,
      trackingMode: 'none',
      events: [],
    });

    // Default permission mocks - simulate already granted foreground
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
  });

  afterEach(async () => {
    await stopLocationTracking();
    jest.useRealTimers();
  });

  describe('requestLocationPermissions', () => {
    it('returns foreground: false when permission denied', async () => {
      // Not yet granted, so it will request
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await requestLocationPermissions();

      expect(result).toEqual({ foreground: false, background: false });
    });

    it('returns foreground: true, background: false in Expo Go', async () => {
      const result = await requestLocationPermissions();

      expect(result.foreground).toBe(true);
      expect(result.background).toBe(false);
    });

    it('does not re-request foreground permission if already granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      await requestLocationPermissions();

      // Should NOT call request since already granted
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('startLocationTracking', () => {
    it('starts tracking when foreground permission granted', async () => {
      const result = await startLocationTracking(mockConfig);

      expect(result).toBe(true);
      expect(useLocationStore.getState().isTracking).toBe(true);
      expect(useLocationStore.getState().trackingMode).toBe('foreground');
    });

    it('returns false when permission denied', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await startLocationTracking(mockConfig);

      expect(result).toBe(false);
      expect(useLocationStore.getState().isTracking).toBe(false);
    });

    it('returns false when config has no intervalMs', async () => {
      const disabledConfig = {
        intervalMs: null,
        distanceMeters: null,
        accuracy: 'balanced' as const,
      };

      const result = await startLocationTracking(disabledConfig);

      expect(result).toBe(false);
    });

    it('fetches initial location immediately', async () => {
      await startLocationTracking(mockConfig);

      // Initial fetch happens synchronously after start
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });
  });

  describe('stopLocationTracking', () => {
    it('stops tracking and resets state', async () => {
      await startLocationTracking(mockConfig);
      expect(useLocationStore.getState().isTracking).toBe(true);

      await stopLocationTracking();

      expect(useLocationStore.getState().isTracking).toBe(false);
      expect(useLocationStore.getState().trackingMode).toBe('none');
    });
  });

  describe('forceLocationUpdate', () => {
    it('fetches a location when permission granted', async () => {
      const result = await forceLocationUpdate();

      expect(result).not.toBeNull();
      expect(result?.latitude).toBe(mockLocation.coords.latitude);
    });

    it('returns null when permission not granted', async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await forceLocationUpdate();

      expect(result).toBeNull();
    });

    it('returns null when getCurrentPositionAsync fails', async () => {
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error('Location unavailable')
      );

      const result = await forceLocationUpdate();

      expect(result).toBeNull();
    });
  });
});
