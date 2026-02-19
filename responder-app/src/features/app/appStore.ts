import { create } from 'zustand';
import { AppState as RNAppState, AppStateStatus as RNAppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import { AppStateStatus, NetworkState } from './types';

interface AppStore {
  // App state
  appState: AppStateStatus;
  isAppActive: boolean;

  // Network state
  network: NetworkState;

  // Internal actions
  _setAppState: (state: AppStateStatus) => void;
  _setNetwork: (state: Network.NetworkState) => void;
}

const initialNetwork: NetworkState = {
  status: 'unknown',
  isConnected: false,
  isInternetReachable: null,
  type: null,
};

export const useAppStore = create<AppStore>((set) => ({
  appState: RNAppState.currentState as AppStateStatus,
  isAppActive: RNAppState.currentState === 'active',
  network: initialNetwork,

  _setAppState: (appState) =>
    set({
      appState,
      isAppActive: appState === 'active',
    }),

  _setNetwork: (state) =>
    set({
      network: {
        status: state.isConnected ? 'online' : 'offline',
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type ?? null,
      },
    }),
}));

// ---------------------------------------------------------------------------
// Listeners (call once at app startup)
// ---------------------------------------------------------------------------

let initialized = false;

export function initAppStateListeners() {
  if (initialized) return;
  initialized = true;

  const { _setAppState, _setNetwork } = useAppStore.getState();

  // App state listener
  RNAppState.addEventListener('change', (state: RNAppStateStatus) => {
    console.log('[App] State changed:', state);
    _setAppState(state as AppStateStatus);
  });

  // Network listener
  const subscription = Network.addNetworkStateListener((state) => {
    console.log('[App] Network changed:', state.isConnected ? 'online' : 'offline');
    _setNetwork(state);
  });

  // Initial network check
  Network.getNetworkStateAsync().then((state) => {
    _setNetwork(state);
  });

  console.log('[App] State listeners initialized');

  // Return cleanup (not typically needed for app-level listeners)
  return () => subscription.remove();
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectIsAppActive = () => useAppStore.getState().isAppActive;
export const selectAppState = () => useAppStore.getState().appState;
export const selectNetwork = () => useAppStore.getState().network;
export const selectIsOnline = () => useAppStore.getState().network.isConnected;
