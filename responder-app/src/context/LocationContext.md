# LocationContext Documentation

## Overview

`LocationContext` is a React Context that provides centralized location tracking for the responder app. It uses Expo's Location API to watch the user's GPS position and provides utility functions for distance calculations.

## Architecture

```
LocationProvider (wraps app)
       │
       ▼
LocationContext.Provider
       │
       ▼
useLocation() hook → Components
```

## Exports

### 1. `LocationProvider`

The provider component that wraps your app to enable location tracking.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Child components |
| `accuracy` | `Location.Accuracy` | `High` | GPS accuracy level |
| `timeInterval` | `number` | `3000` | Update interval in milliseconds |
| `distanceInterval` | `number` | `5` | Minimum distance change in meters to trigger update |
| `autoStart` | `boolean` | `true` | Automatically start watching on mount |

**Usage:**

```tsx
import { LocationProvider } from "@/context/LocationContext";

function App() {
  return (
    <LocationProvider
      accuracy={Location.Accuracy.High}
      timeInterval={3000}
      distanceInterval={5}
      autoStart={true}
    >
      <YourApp />
    </LocationProvider>
  );
}
```

### 2. `useLocation()` Hook

Hook to access the location context values and functions.

**Returns: `LocationContextValue`**

| Property | Type | Description |
|----------|------|-------------|
| `userLocation` | `Coordinates \| null` | Current user coordinates `{ latitude, longitude }` |
| `isWatching` | `boolean` | Whether location tracking is active |
| `error` | `string \| null` | Error message if something went wrong |
| `lastUpdateAt` | `number \| null` | Timestamp of last location update |
| `startWatching` | `() => Promise<void>` | Start location tracking |
| `stopWatching` | `() => void` | Stop location tracking |
| `getDistanceMetersTo` | `(target: Coordinates) => number \| null` | Get distance to target in meters |
| `getDistanceKmTo` | `(target: Coordinates) => number \| null` | Get distance to target in kilometers |
| `isWithinThreshold` | `(target: Coordinates, thresholdMeters: number) => boolean` | Check if within distance of target |

**Usage:**

```tsx
import { useLocation } from "@/context/LocationContext";

function MyComponent() {
  const {
    userLocation,
    isWatching,
    error,
    getDistanceMetersTo,
    isWithinThreshold,
  } = useLocation();

  const targetLocation = { latitude: 36.8065, longitude: 10.1815 };

  // Get distance to target
  const distance = getDistanceMetersTo(targetLocation);

  // Check if within 100 meters
  const isNearby = isWithinThreshold(targetLocation, 100);

  if (error) return <Text>Error: {error}</Text>;
  if (!userLocation) return <Text>Getting location...</Text>;

  return (
    <View>
      <Text>Your location: {userLocation.latitude}, {userLocation.longitude}</Text>
      <Text>Distance to target: {distance} meters</Text>
      <Text>Nearby: {isNearby ? "Yes" : "No"}</Text>
    </View>
  );
}
```

## Internal State Management

### State Variables

- **`userLocation`**: Stores the current GPS coordinates
- **`isWatching`**: Tracks if the subscription is active
- **`error`**: Stores any error messages
- **`lastUpdateAt`**: Timestamp for cache/stale detection

### Refs

- **`subscriptionRef`**: Holds the Expo location subscription for cleanup
- **`isMountedRef`**: Prevents state updates after unmount (memory leak prevention)

## Location Watching Flow

```
1. Component mounts
       │
       ▼ (if autoStart=true)
2. startWatching() called
       │
       ▼
3. Check foreground permissions
       │
       ├─ Not granted → Request permissions
       │                      │
       │                      ├─ Denied → Set error, return
       │                      │
       │                      └─ Granted → Continue
       │
       └─ Granted → Continue
              │
              ▼
4. Create subscription via Location.watchPositionAsync()
       │
       ▼
5. On each location update:
   - Extract latitude/longitude
   - Update userLocation state
   - Update lastUpdateAt timestamp
       │
       ▼
6. On unmount → stopWatching() cleans up subscription
```

## Distance Calculation

The context uses [Turf.js](https://turfjs.org/) for accurate geographic distance calculations via the `@/utils/geo` module.

### How it works:

1. **`calculateDistanceKm`**: Uses Turf's `distance()` function with the Haversine formula
2. **`calculateDistanceMeters`**: Converts km to meters (`km * 1000`)

### Coordinates Interface

```ts
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

## Permission Handling

The provider handles location permissions automatically:

1. First checks if foreground permission is already granted
2. If not, requests permission from the user
3. If denied, sets an error state: `"Location permission denied"`

**Note:** Only foreground permissions are requested. For background location tracking, additional permissions would be needed.

## Performance Optimizations

1. **`useMemo` for context value**: Prevents unnecessary re-renders of consumers
2. **`useCallback` for functions**: Stable function references across renders
3. **Distance/time interval config**: Control update frequency to balance accuracy vs battery
4. **Single subscription**: All components share one location subscription via context

## Error Handling

Errors are captured in the `error` state and can occur from:

- Permission denied
- Location services disabled
- GPS hardware issues
- Any exception during `watchPositionAsync`

## Cleanup

The provider properly cleans up:

1. Removes location subscription on unmount
2. Uses `isMountedRef` to prevent state updates after unmount
3. Clears subscription ref to allow restart

## Example: Complete Usage

```tsx
// App.tsx
import { LocationProvider } from "@/context/LocationContext";

export default function App() {
  return (
    <LocationProvider timeInterval={5000} distanceInterval={10}>
      <Navigation />
    </LocationProvider>
  );
}

// EmergencyScreen.tsx
import { useLocation } from "@/context/LocationContext";

function EmergencyScreen({ emergencyLocation }) {
  const { userLocation, getDistanceKmTo, isWithinThreshold } = useLocation();

  const distanceKm = getDistanceKmTo(emergencyLocation);
  const hasArrived = isWithinThreshold(emergencyLocation, 50); // 50 meters

  return (
    <View>
      {distanceKm !== null && (
        <Text>Distance: {distanceKm.toFixed(2)} km</Text>
      )}
      {hasArrived && <Text>You have arrived!</Text>}
    </View>
  );
}
```

## Commented Out: `useDistanceToTargetFromContext`

There's a commented-out hook (lines 217-244) that was designed to provide a convenient wrapper for distance tracking to a specific target. It combines:

- `distanceMeters`: Memoized distance in meters to target
- `distanceKm`: Memoized distance in km to target
- `userLocation`: Current user location
- `isWithinThreshold`: Function to check proximity

This could be uncommented and used if you need a simpler API for distance tracking.

## Dependencies

- `expo-location`: For GPS location services
- `@turf/distance`: For accurate geographic distance calculations
- `@turf/helpers`: For creating GeoJSON point objects
