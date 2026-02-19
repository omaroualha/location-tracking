import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors, useIsDarkMode } from '@features/theme';
import { useNetworkStatus } from '@features/app';
import { typography, spacing, shadows } from '@/theme';

import { useMapNavigation } from './hooks';
import {
  StatusBar,
  TurnBanner,
  NavigationCard,
  OffDutyOverlay,
  UserMarker,
  TargetMarker,
  RoutePolyline,
  DirectLine,
} from './components';
import { MAP_STYLE, MAP_LIGHT_STYLE } from './constants';

function MapScreenComponent() {
  const colors = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const network = useNetworkStatus();

  const {
    mapRef,
    permissions,
    isSimulator,
    userLocation,
    dutyState,
    canToggle,
    status,
    currentMission,
    targetLocation,
    isOnMission,
    navigationStarted,
    route,
    isLoadingRoute,
    currentStep,
    currentStepIndex,
    distanceMeters,
    initialRegion,
    handleStartNavigation,
    handleRecenter,
    handleComplete,
    handleToggleDuty,
  } = useMapNavigation();

  const mapStyle = isDarkMode ? MAP_STYLE : MAP_LIGHT_STYLE;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      {isSimulator && (
        <View style={[styles.simulatorBanner, { backgroundColor: colors.brand.accent + '20' }]}>
          <Text style={[styles.simulatorText, { color: colors.brand.accent }]}>📍 Simulator Mode - Düsseldorf</Text>
        </View>
      )}

      {!isOnMission && (
        <StatusBar
          dutyState={dutyState}
          isConnected={network.isConnected}
          canToggle={canToggle()}
          isLoading={permissions.isLoading}
          onToggleDuty={handleToggleDuty}
        />
      )}

      {navigationStarted && currentStep && <TurnBanner currentStep={currentStep} />}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation={!isSimulator}
          showsMyLocationButton={false}
          followsUserLocation={navigationStarted && !isSimulator}
          customMapStyle={mapStyle}
          showsCompass={false}
          showsScale={false}
          showsTraffic={navigationStarted}
        >
          {isSimulator && userLocation && <UserMarker coordinate={userLocation} />}
          {route && navigationStarted && <RoutePolyline route={route} />}
          {isOnMission && !navigationStarted && userLocation && targetLocation && (
            <DirectLine from={userLocation} to={targetLocation} />
          )}
          {isOnMission && targetLocation && <TargetMarker coordinate={targetLocation} />}
        </MapView>

        <Pressable
          style={[styles.recenterButton, { backgroundColor: colors.background.secondary, borderColor: colors.ui.border }]}
          onPress={handleRecenter}
        >
          <Text style={[styles.recenterIcon, { color: colors.text.primary }]}>◎</Text>
        </Pressable>

        {dutyState === 'OFF_DUTY' && <OffDutyOverlay />}
      </View>

      {isOnMission && currentMission && (
        <NavigationCard
          mission={currentMission}
          status={status}
          route={route}
          isLoadingRoute={isLoadingRoute}
          navigationStarted={navigationStarted}
          currentStepIndex={currentStepIndex}
          distanceMeters={distanceMeters}
          onStartNavigation={handleStartNavigation}
          onComplete={handleComplete}
        />
      )}
    </SafeAreaView>
  );
}

export const MapScreen = memo(MapScreenComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  simulatorBanner: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  simulatorText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    borderWidth: 1,
  },
  recenterIcon: {
    fontSize: 24,
  },
});
