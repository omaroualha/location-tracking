import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import * as Location from "expo-location";
import {
  Coordinates,
  calculateDistanceMeters,
  calculateDistanceKm,
} from "@/utils/geo";

interface LocationContextValue {
  /** Current user location */
  userLocation: Coordinates | null;
  /** Whether location is being watched */
  isWatching: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Last update timestamp */
  lastUpdateAt: number | null;
  /** Start watching location */
  startWatching: () => Promise<void>;
  /** Stop watching location */
  stopWatching: () => void;
  /** Calculate distance to a target in meters */
  getDistanceMetersTo: (target: Coordinates) => number | null;
  /** Calculate distance to a target in kilometers */
  getDistanceKmTo: (target: Coordinates) => number | null;
  /** Check if within threshold meters of target */
  isWithinThreshold: (target: Coordinates, thresholdMeters: number) => boolean;
}

const LocationContext = createContext<LocationContextValue | null>(null);

interface LocationProviderProps {
  children: ReactNode;
  /** Location accuracy (default: High) */
  accuracy?: Location.Accuracy;
  /** Update interval in milliseconds (default: 3000) */
  timeInterval?: number;
  /** Distance interval in meters (default: 5) */
  distanceInterval?: number;
  /** Auto-start watching on mount (default: true) */
  autoStart?: boolean;
}

export function LocationProvider({
  children,
  accuracy = Location.Accuracy.High,
  timeInterval = 3000,
  distanceInterval = 5,
  autoStart = true,
}: LocationProviderProps): React.ReactElement {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<number | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isMountedRef = useRef(true);

  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (isMountedRef.current) {
      setIsWatching(false);
    }
  }, []);

  const startWatching = useCallback(async () => {
    // Already watching, don't start again
    if (subscriptionRef.current) {
      return;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== "granted") {
        const { status: requestedStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (requestedStatus !== "granted") {
          setError("Location permission denied");
          return;
        }
      }

      if (!isMountedRef.current) return;

      setIsWatching(true);
      setError(null);

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval,
          distanceInterval,
        },
        (location) => {
          if (!isMountedRef.current) return;

          const coords: Coordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(coords);
          setLastUpdateAt(Date.now());
        },
      );
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start location watching",
        );
        setIsWatching(false);
      }
    }
  }, [accuracy, timeInterval, distanceInterval]);

  // Auto-start on mount if enabled
  useEffect(() => {
    isMountedRef.current = true;

    if (autoStart) {
      startWatching();
    }

    return () => {
      isMountedRef.current = false;
      stopWatching();
    };
  }, [autoStart, startWatching, stopWatching]);

  const getDistanceMetersTo = useCallback(
    (target: Coordinates): number | null => {
      if (!userLocation) return null;
      return calculateDistanceMeters(userLocation, target);
    },
    [userLocation],
  );

  const getDistanceKmTo = useCallback(
    (target: Coordinates): number | null => {
      if (!userLocation) return null;
      return calculateDistanceKm(userLocation, target);
    },
    [userLocation],
  );

  const isWithinThreshold = useCallback(
    (target: Coordinates, thresholdMeters: number): boolean => {
      const distance = getDistanceMetersTo(target);
      if (distance === null) return false;
      return distance <= thresholdMeters;
    },
    [getDistanceMetersTo],
  );

  const value = useMemo<LocationContextValue>(
    () => ({
      userLocation,
      isWatching,
      error,
      lastUpdateAt,
      startWatching,
      stopWatching,
      getDistanceMetersTo,
      getDistanceKmTo,
      isWithinThreshold,
    }),
    [
      userLocation,
      isWatching,
      error,
      lastUpdateAt,
      startWatching,
      stopWatching,
      getDistanceMetersTo,
      getDistanceKmTo,
      isWithinThreshold,
    ],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

/**
 * Hook to access location context
 * @throws Error if used outside of LocationProvider
 */
export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

/**
 * Hook for distance tracking to a specific target
 * Uses the shared location context instead of creating a new subscription
 */
// export function useDistanceToTargetFromContext(target: Coordinates | null) {
//   const { userLocation, getDistanceMetersTo, getDistanceKmTo, isWithinThreshold } = useLocation();

//   const distanceMeters = useMemo(() => {
//     if (!target) return null;
//     return getDistanceMetersTo(target);
//   }, [target, getDistanceMetersTo]);

//   const distanceKm = useMemo(() => {
//     if (!target) return null;
//     return getDistanceKmTo(target);
//   }, [target, getDistanceKmTo]);

//   const checkWithinThreshold = useCallback(
//     (thresholdMeters: number): boolean => {
//       if (!target) return false;
//       return isWithinThreshold(target, thresholdMeters);
//     },
//     [target, isWithinThreshold]
//   );

//   return {
//     distanceMeters,
//     distanceKm,
//     userLocation,
//     isWithinThreshold: checkWithinThreshold,
//   };
// }
