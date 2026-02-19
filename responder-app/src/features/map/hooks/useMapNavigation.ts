import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MapView from 'react-native-maps';

import { useMissionStore } from '@features/mission/missionStore';
import { useDutyStore } from '@features/duty/dutyStore';
import { ARRIVAL_THRESHOLD_METERS } from '@features/mission/types';
import { DEFAULT_LOCATION, SIMULATOR_LOCATION } from '@features/mission/mockMissions';
import { useLocation } from '@/context';
import { fetchRoute, RouteResult } from '@/utils/routing';
import { Coordinates } from '@/utils/geo';
import { isSimulator } from '@/utils/environment';
import { MAP_PADDING, DEFAULT_DELTA } from '../constants';
import { usePermissions } from './usePermissions';

export function useMapNavigation() {
  const mapRef = useRef<MapView>(null);
  const permissions = usePermissions();
  const { userLocation: contextLocation, isWithinThreshold, getDistanceMetersTo } = useLocation();

  const runningInSimulator = isSimulator();

  const userLocation = useMemo<Coordinates | null>(
    () => (runningInSimulator ? SIMULATOR_LOCATION : contextLocation),
    [contextLocation, runningInSimulator]
  );

  // Duty store
  const dutyState = useDutyStore((s) => s.dutyState);
  const toggleDuty = useDutyStore((s) => s.toggleDuty);
  const canToggle = useDutyStore((s) => s.canToggle);

  // Mission store
  const status = useMissionStore((s) => s.status);
  const currentMission = useMissionStore((s) => s.currentMission);
  const completeMission = useMissionStore((s) => s.completeMission);
  const markArrived = useMissionStore((s) => s.markArrived);

  // Navigation state
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const targetLocation = currentMission?.location ?? null;
  const isOnMission = status === 'accepted' || status === 'arrived';
  const currentStep = route?.steps[currentStepIndex];

  const distanceMeters = useMemo(() => {
    if (!targetLocation) return null;
    return getDistanceMetersTo(targetLocation);
  }, [targetLocation, getDistanceMetersTo]);

  const isWithinArrivalThreshold = useCallback(() => {
    if (!targetLocation) return false;
    return isWithinThreshold(targetLocation, ARRIVAL_THRESHOLD_METERS);
  }, [targetLocation, isWithinThreshold]);

  const loadRoute = useCallback(async () => {
    if (!userLocation || !targetLocation) return;

    setIsLoadingRoute(true);
    const result = await fetchRoute(userLocation, targetLocation);
    setRoute(result);
    setIsLoadingRoute(false);
  }, [userLocation, targetLocation]);

  // Load route when mission starts
  useEffect(() => {
    if (isOnMission && userLocation && targetLocation && !route) {
      loadRoute();
    }
  }, [isOnMission, userLocation, targetLocation, route, loadRoute]);

  // Reset navigation when mission ends
  useEffect(() => {
    if (!isOnMission) {
      setNavigationStarted(false);
      setRoute(null);
      setCurrentStepIndex(0);
    }
  }, [isOnMission]);

  // Fit map to route
  useEffect(() => {
    if (!mapRef.current) return;

    if (route && navigationStarted) {
      mapRef.current.fitToCoordinates(route.coordinates, {
        edgePadding: MAP_PADDING.route,
        animated: true,
      });
    } else if (userLocation && targetLocation && isOnMission) {
      mapRef.current.fitToCoordinates([userLocation, targetLocation], {
        edgePadding: MAP_PADDING.overview,
        animated: true,
      });
    }
  }, [route, navigationStarted, userLocation, targetLocation, isOnMission]);

  // Auto-mark arrived
  useEffect(() => {
    if (status === 'accepted' && isWithinArrivalThreshold()) {
      markArrived();
    }
  }, [status, isWithinArrivalThreshold, markArrived]);

  const handleStartNavigation = useCallback(() => {
    setNavigationStarted(true);
    if (!route) {
      loadRoute();
    }
  }, [route, loadRoute]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;

    if (route) {
      mapRef.current.fitToCoordinates(route.coordinates, {
        edgePadding: MAP_PADDING.route,
        animated: true,
      });
    } else if (userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: DEFAULT_DELTA.latitude,
        longitudeDelta: DEFAULT_DELTA.longitude,
      });
    }
  }, [route, userLocation]);

  const handleComplete = useCallback(() => {
    completeMission();
  }, [completeMission]);

  const handleToggleDuty = useCallback(async () => {
    if (!permissions.hasAllPermissions && dutyState === 'OFF_DUTY') {
      await permissions.requestPermissions();
    }
    toggleDuty();
  }, [permissions.hasAllPermissions, permissions.requestPermissions, dutyState, toggleDuty]);

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: DEFAULT_DELTA.latitude,
        longitudeDelta: DEFAULT_DELTA.longitude,
      };
    }
    return {
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [userLocation]);

  return {
    mapRef,
    permissions,
    isSimulator: runningInSimulator,
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
  };
}
