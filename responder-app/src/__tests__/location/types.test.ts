import { toLocationData, getAccuracy } from '@features/location/types';
import * as Location from 'expo-location';

describe('location/types', () => {
  describe('toLocationData', () => {
    it('converts expo location object to LocationData', () => {
      const expoLocation = {
        coords: {
          latitude: 37.785834,
          longitude: -122.406417,
          accuracy: 5.0,
          altitude: 10.5,
          altitudeAccuracy: 3.0,
          heading: 90,
          speed: 0,
        },
        timestamp: 1706200000000,
      } as Location.LocationObject;

      const result = toLocationData(expoLocation);

      expect(result).toEqual({
        latitude: 37.785834,
        longitude: -122.406417,
        accuracy: 5.0,
        altitude: 10.5,
        timestamp: 1706200000000,
      });
    });

    it('handles null accuracy and altitude', () => {
      const expoLocation = {
        coords: {
          latitude: 37.785834,
          longitude: -122.406417,
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 1706200000000,
      } as Location.LocationObject;

      const result = toLocationData(expoLocation);

      expect(result.accuracy).toBeNull();
      expect(result.altitude).toBeNull();
    });
  });

  describe('getAccuracy', () => {
    it('returns High accuracy when config.accuracy is "high"', () => {
      const config = {
        intervalMs: 5000,
        distanceMeters: 3,
        accuracy: 'high' as const,
      };

      expect(getAccuracy(config)).toBe(Location.Accuracy.High);
    });

    it('returns Balanced accuracy when config.accuracy is "balanced"', () => {
      const config = {
        intervalMs: 60000,
        distanceMeters: 50,
        accuracy: 'balanced' as const,
      };

      expect(getAccuracy(config)).toBe(Location.Accuracy.Balanced);
    });
  });
});
