import * as Location from 'expo-location';
import { DutyConfig } from '@features/duty/types';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
}

/** Convert expo location to our simplified format */
export function toLocationData(loc: Location.LocationObject): LocationData {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    altitude: loc.coords.altitude ?? null,
    timestamp: loc.timestamp,
  };
}

/** Map config accuracy string to expo accuracy enum */
export function getAccuracy(config: DutyConfig): Location.Accuracy {
  return config.accuracy === 'high'
    ? Location.Accuracy.High
    : Location.Accuracy.Balanced;
}
