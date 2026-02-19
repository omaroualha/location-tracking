import { darkColors } from '@features/theme';
import { BASE_BACKOFF_MS, MAX_BACKOFF_MS } from '../constants';
import { isExpoGo } from '@/utils/environment';

export function calculateBackoff(failures: number): number {
  const backoff = BASE_BACKOFF_MS * Math.pow(2, failures);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'syncing':
      return darkColors.status.warning;
    case 'error':
      return darkColors.status.error;
    case 'offline':
      return darkColors.text.tertiary;
    default:
      return darkColors.status.success;
  }
}

export function getEventColor(type: string): string {
  switch (type) {
    case 'error':
      return darkColors.status.error;
    case 'received':
      return darkColors.status.success;
    default:
      return darkColors.text.tertiary;
  }
}

export function getTrackingModeDisplay(
  isBackgroundTaskActive: boolean,
  isTracking: boolean
): string {
  if (isExpoGo()) return 'Foreground (Expo Go)';
  if (isBackgroundTaskActive) return 'Background';
  if (isTracking) return 'Foreground';
  return 'Inactive';
}
