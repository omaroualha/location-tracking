import { useAppStore } from './appStore';
import { NetworkState } from './types';

/**
 * Hook to get reactive network status from the app store
 */
export function useNetworkStatus(): NetworkState {
  return useAppStore((s) => s.network);
}

/**
 * Hook to check if app is in foreground
 */
export function useIsAppActive(): boolean {
  return useAppStore((s) => s.isAppActive);
}

/**
 * Hook to check if device is online
 */
export function useIsOnline(): boolean {
  return useAppStore((s) => s.network.isConnected);
}
