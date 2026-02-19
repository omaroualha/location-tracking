import distance from '@turf/distance';
import { point } from '@turf/helpers';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
  const fromPoint = point([from.longitude, from.latitude]);
  const toPoint = point([to.longitude, to.latitude]);
  return distance(fromPoint, toPoint, { units: 'kilometers' });
}

export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number {
  return calculateDistanceKm(from, to) * 1000;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function estimateEtaMinutes(
  distanceKm: number,
  averageSpeedKmh: number = 40
): number {
  return Math.ceil((distanceKm / averageSpeedKmh) * 60);
}

export function formatEta(distanceKm: number): string {
  const minutes = estimateEtaMinutes(distanceKm);
  if (minutes < 1) {
    return '< 1 min';
  }
  if (minutes === 1) {
    return '~1 min';
  }
  return `~${minutes} min`;
}
