import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { isExpoGo } from '@/utils/environment';

export interface PermissionStatus {
  foreground: Location.PermissionStatus | null;
  background: Location.PermissionStatus | null;
  isLoading: boolean;
  isExpoGo: boolean;
}

export function usePermissions() {
  const expoGo = isExpoGo();

  const [status, setStatus] = useState<PermissionStatus>({
    foreground: null,
    background: null,
    isLoading: true,
    isExpoGo: expoGo,
  });

  const checkPermissions = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isLoading: true }));

    const foreground = await Location.getForegroundPermissionsAsync();

    let background = { status: Location.PermissionStatus.UNDETERMINED };
    if (!expoGo) {
      try {
        background = await Location.getBackgroundPermissionsAsync();
      } catch {
        // Background permissions not available
      }
    }

    setStatus({
      foreground: foreground.status,
      background: background.status,
      isLoading: false,
      isExpoGo: expoGo,
    });
  }, [expoGo]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (fgStatus !== 'granted') {
      await checkPermissions();
      return false;
    }

    if (expoGo) {
      await checkPermissions();
      return true;
    }

    try {
      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      await checkPermissions();
      return bgStatus === 'granted';
    } catch {
      await checkPermissions();
      return true;
    }
  }, [checkPermissions, expoGo]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const hasAllPermissions = expoGo
    ? status.foreground === 'granted'
    : status.foreground === 'granted' && status.background === 'granted';

  return {
    ...status,
    hasAllPermissions,
    checkPermissions,
    requestPermissions,
  };
}
