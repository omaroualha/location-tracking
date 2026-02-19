import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { LocationData, toLocationData } from './types';
import { enqueue } from '@features/queue/locationQueue';

export const LOCATION_TASK_NAME = 'RESPONDER_LOCATION_TASK';

let onLocationReceived: ((locations: LocationData[]) => void) | null = null;

export function setLocationHandler(handler: (locations: LocationData[]) => void) {
  onLocationReceived = handler;
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[LocationTask] Error:', error.message);
    return;
  }

  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const mapped = locations.map(toLocationData);

  console.log('[LocationTask] Received', mapped.length, 'location(s)');

  try {
    await enqueue(mapped);
  } catch (err) {
    console.error('[LocationTask] Enqueue failed:', err);
  }

  onLocationReceived?.(mapped);
});
