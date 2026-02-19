import { Coordinates } from './geo';
import { logError } from './errorHandler';

const TAG = 'Routing';

// OSRM API response types
interface OSRMManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}

interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: OSRMManeuver;
}

interface OSRMLeg {
  distance: number;
  duration: number;
  steps: OSRMStep[];
}

interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs: OSRMLeg[];
}

interface OSRMResponse {
  code: string;
  routes?: OSRMRoute[];
  message?: string;
}

// Application types
export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: {
    type: string;
    modifier?: string;
  };
  name: string;
}

export interface RouteResult {
  coordinates: Coordinates[];
  distance: number; // total meters
  duration: number; // total seconds
  steps: RouteStep[];
}

// Maneuver icons mapping
const MANEUVER_ICONS: Record<string, string> = {
  'turn-left': '⬅️',
  'turn-right': '➡️',
  'turn-slight-left': '↖️',
  'turn-slight-right': '↗️',
  'turn-sharp-left': '⬅️',
  'turn-sharp-right': '➡️',
  uturn: '↩️',
  straight: '⬆️',
  continue: '⬆️',
  roundabout: '🔄',
  rotary: '🔄',
  arrive: '🏁',
  depart: '🚗',
  merge: '↗️',
  fork: '↗️',
};

/**
 * Decode polyline from OSRM (uses polyline5 encoding by default)
 */
function decodePolyline(encoded: string, precision = 5): Coordinates[] {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }

  return coordinates;
}

/**
 * Convert OSRM maneuver to human-readable instruction with icon
 */
function formatInstruction(step: OSRMStep): string {
  const type = step.maneuver?.type || 'continue';
  const modifier = step.maneuver?.modifier || '';
  const name = step.name || 'the road';

  const icon = MANEUVER_ICONS[type] || MANEUVER_ICONS[modifier] || '⬆️';

  switch (type) {
    case 'depart':
      return `${icon} Start on ${name}`;
    case 'arrive':
      return `${icon} Arrive at destination`;
    case 'turn':
      if (modifier.includes('left')) return `${MANEUVER_ICONS['turn-left']} Turn left onto ${name}`;
      if (modifier.includes('right')) return `${MANEUVER_ICONS['turn-right']} Turn right onto ${name}`;
      return `${icon} Turn onto ${name}`;
    case 'continue':
    case 'new name':
      return `${icon} Continue on ${name}`;
    case 'roundabout':
    case 'rotary':
      return `${icon} Enter roundabout, exit onto ${name}`;
    case 'merge':
      return `${icon} Merge onto ${name}`;
    case 'fork':
      if (modifier.includes('left')) return `↖️ Keep left onto ${name}`;
      if (modifier.includes('right')) return `↗️ Keep right onto ${name}`;
      return `${icon} Continue onto ${name}`;
    default:
      if (modifier.includes('left')) return `${MANEUVER_ICONS['turn-left']} Turn left onto ${name}`;
      if (modifier.includes('right')) return `${MANEUVER_ICONS['turn-right']} Turn right onto ${name}`;
      return `${icon} Continue on ${name}`;
  }
}

/**
 * Fetch route from OSRM (free, no API key needed)
 */
export async function fetchRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline&steps=true`;

    console.log(`[${TAG}] Fetching route...`);
    const response = await fetch(url);
    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error(`[${TAG}] No route found:`, data.message ?? data.code);
      return null;
    }

    const route = data.routes[0];
    const coordinates = decodePolyline(route.geometry, 5);

    const steps: RouteStep[] = route.legs[0].steps.map((step) => ({
      instruction: formatInstruction(step),
      distance: step.distance,
      duration: step.duration,
      maneuver: {
        type: step.maneuver?.type || 'continue',
        modifier: step.maneuver?.modifier,
      },
      name: step.name || '',
    }));

    console.log(`[${TAG}] Route found:`, {
      distance: route.distance,
      duration: route.duration,
      steps: steps.length,
      points: coordinates.length,
    });

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration,
      steps,
    };
  } catch (error) {
    logError(TAG, error, { origin, destination });
    return null;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return '<1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Format distance for display
 */
export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
