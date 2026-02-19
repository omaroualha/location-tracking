import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootTabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigateToMap() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Map');
  }
}

export function navigateToProfile() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Profile');
  }
}

export function navigateToMonitor() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Monitor');
  }
}
