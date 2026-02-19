import * as Network from 'expo-network';

export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkState {
  status: NetworkStatus;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: Network.NetworkStateType | null;
}
