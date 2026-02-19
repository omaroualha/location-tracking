import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useDutyStore, restoreDutyState } from '@features/duty/dutyStore';
import { restoreMissionState } from '@features/mission/missionStore';
import { restoreThemeState, useThemeColors } from '@features/theme';
import {
  startLocationTracking,
  stopLocationTracking,
} from '@features/location/locationService';
import { initializeSequence } from '@features/queue/locationQueue';
import {
  startSync,
  stopSync,
  subscribeToNetworkChanges,
} from '@features/sync/syncService';
import {
  setupNotificationResponseListener,
  setupNotificationReceivedListener,
  requestNotificationPermissions,
} from '@features/notifications/notificationService';
import { AppNavigation } from '@features/navigation';
import { AlertModal } from '@components/mission/AlertModal';
import { LocationProvider, useLocation } from '@/context';
import { typography, spacing } from '@/theme';
import { initAppStateListeners } from '@features/app';

function LoadingScreen() {
  const colors = useThemeColors();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Restoring session...</Text>
    </View>
  );
}

function AppContent() {
  const { userLocation } = useLocation();
  const dutyState = useDutyStore((s) => s.dutyState);
  const getConfig = useDutyStore((s) => s.getConfig);

  useEffect(() => {
    async function updateTracking() {
      const config = getConfig();
      if (dutyState === 'OFF_DUTY') {
        await stopLocationTracking();
      } else {
        await startLocationTracking(config);
      }
    }
    updateTracking();
  }, [dutyState, getConfig]);

  return (
    <>
      <AppNavigation />
      <AlertModal userLocation={userLocation} />
    </>
  );
}

export default function App() {
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    async function initialize() {
      console.log('[App] Initializing...');

      initAppStateListeners();
      await initializeSequence();

      const restoredDuty = await restoreDutyState();
      const restoredMission = await restoreMissionState();
      const restoredTheme = await restoreThemeState();

      console.log('[App] Restored duty:', restoredDuty, 'mission:', restoredMission, 'theme:', restoredTheme);

      startSync();

      if (restoredDuty !== 'OFF_DUTY') {
        const config = useDutyStore.getState().getConfig();
        console.log('[App] Resuming location tracking with config:', config);
        await startLocationTracking(config);
      }

      setIsRestoring(false);
      console.log('[App] Initialization complete');
    }

    initialize();

    const unsubscribeNetwork = subscribeToNetworkChanges();
    const unsubscribeResponse = setupNotificationResponseListener();
    const unsubscribeReceived = setupNotificationReceivedListener();
    requestNotificationPermissions();

    return () => {
      stopSync();
      unsubscribeNetwork();
      unsubscribeResponse();
      unsubscribeReceived();
    };
  }, []);

  if (isRestoring) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.size.md,
  },
});
