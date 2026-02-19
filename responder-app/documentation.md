# Position Tracking System Documentation

Complete documentation of the location tracking pipeline from GPS to backend.

---

## Architecture Overview

The app has **two separate location systems**:

| System | Purpose | Method | Destination |
|--------|---------|--------|-------------|
| **Location Service** | Track responder for dispatch | Polling (`getCurrentPositionAsync`) | SQLite → Backend |
| **Location Context** | Display on map UI | Subscription (`watchPositionAsync`) | React state only |

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              GPS HARDWARE                                     │
└──────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    ▼                                    ▼
    ┌───────────────────────────┐        ┌───────────────────────────┐
    │    LOCATION SERVICE       │        │    LOCATION CONTEXT       │
    │  (Backend Tracking)       │        │  (UI Display)             │
    │                           │        │                           │
    │  getCurrentPositionAsync  │        │  watchPositionAsync       │
    │  at interval (polling)    │        │  subscription-based       │
    └───────────────────────────┘        └───────────────────────────┘
                    │                                    │
                    ▼                                    ▼
    ┌───────────────────────────┐        ┌───────────────────────────┐
    │    SQLite Queue           │        │    React State            │
    │  (durable, persisted)     │        │  (in-memory)              │
    └───────────────────────────┘        └───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────┐
    │    Sync Service           │
    │  (batch sender, retry)    │
    └───────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────┐
    │    Mock Backend API       │
    │  (simulated latency)      │
    └───────────────────────────┘
```

---

## Scenarios

### Scenario 1: App Cold Start

```
App mounts
    │
    ├── 1. initializeSequence()        → Load queue sequence from SQLite
    │
    ├── 2. restoreDutyState()          → Load duty state from SQLite
    │       └── Returns: 'OFF_DUTY' | 'ON_DUTY' | 'ON_MISSION'
    │
    ├── 3. restoreMissionState()       → Load mission from SQLite (if any)
    │
    ├── 4. restoreThemeState()         → Load theme preference
    │
    ├── 5. startSync()                 → Start sync loop (every 5s)
    │
    ├── 6. subscribeToNetworkChanges() → Listen for online/offline
    │
    ├── 7. IF duty !== 'OFF_DUTY':
    │       └── startLocationTracking(config)
    │
    └── 8. LocationProvider mounts     → Start UI location subscription
```

**File:** `src/App.tsx:67-104`

---

### Scenario 2: User Toggles Duty ON

```
User taps duty toggle (OFF_DUTY → ON_DUTY)
    │
    ├── 1. useDutyStore.toggleDuty()
    │       ├── State: dutyState = 'ON_DUTY'
    │       └── Persist to SQLite (async)
    │
    ├── 2. useEffect in AppContent detects dutyState change
    │       └── Calls startLocationTracking(config)
    │
    └── 3. startLocationTracking(config):
            ├── Stop any existing tracking
            ├── Request permissions
            │     ├── Foreground: REQUIRED
            │     └── Background: Optional (dev build only)
            │
            ├── IF background permission granted AND NOT Expo Go:
            │     └── Start background task → setTracking(true, 'background')
            │
            └── ELSE (Expo Go or no background permission):
                  └── Start polling timer → setTracking(true, 'foreground')
```

**Files:**
- `src/features/duty/dutyStore.ts:29-37`
- `src/App.tsx:44-54`
- `src/features/location/locationService.ts:130-169`

---

### Scenario 3: User Toggles Duty OFF

```
User taps duty toggle (ON_DUTY → OFF_DUTY)
    │
    ├── 1. useDutyStore.toggleDuty()
    │       ├── State: dutyState = 'OFF_DUTY'
    │       └── Persist to SQLite
    │
    ├── 2. useEffect detects dutyState change
    │       └── Calls stopLocationTracking()
    │
    └── 3. stopLocationTracking():
            ├── clearInterval(pollingTimer)
            ├── stopLocationUpdatesAsync (if background)
            └── setTracking(false, 'none')
```

**Note:** Cannot toggle while ON_MISSION. The toggle is disabled.

---

### Scenario 4: Mission Received (ON_DUTY → ON_MISSION)

```
Push notification received with mission
    │
    ├── 1. missionStore.setMission(mission)
    │       └── State: missionState = 'pending'
    │
    ├── 2. AlertModal appears (30s countdown)
    │
    ├── 3. User accepts mission:
    │       ├── missionStore.acceptMission()
    │       ├── dutyStore.setDutyState('ON_MISSION')
    │       └── Tracking restarts with ON_MISSION config (faster interval)
    │
    └── 4. User arrives (within 50m of target):
            ├── missionStore.setArrived()
            └── Can complete mission
```

**ON_MISSION tracking:** 5s interval (dev) / 15s interval (prod), high accuracy

---

### Scenario 5: Location Update Cycle

```
pollingTimer fires (every intervalMs)
    │
    ├── 1. fetchAndProcessLocation(accuracy)
    │       │
    │       ├── 2. Location.getCurrentPositionAsync({ accuracy })
    │       │       └── Returns: { coords: {lat, lng, ...}, timestamp }
    │       │
    │       ├── 3. toLocationData(location)
    │       │       └── Returns: { latitude, longitude, accuracy, altitude, timestamp }
    │       │
    │       ├── 4. useLocationStore.recordLocation(data)
    │       │       └── Updates: lastLocation, lastUpdateAt, totalReceived++
    │       │
    │       └── 5. enqueue([data])
    │               │
    │               ├── sequenceCounter++
    │               ├── INSERT INTO location_queue (lat, lng, ..., sequence)
    │               └── Retry up to 3 times on failure
    │
    └── [Loop continues until stopPolling()]
```

**File:** `src/features/location/locationService.ts:41-78`

---

### Scenario 6: Sync Cycle

```
syncService loop (every 5s, or with backoff on error)
    │
    ├── 1. Check network connectivity
    │       └── IF offline: set status='offline', skip sync
    │
    ├── 2. getStats() → get queue count
    │       └── IF empty: set status='idle', skip sync
    │
    ├── 3. set status='syncing'
    │
    ├── 4. peekAndDelete(50, async (entries) => {...})
    │       │
    │       ├── SELECT * FROM location_queue ORDER BY sequence LIMIT 50
    │       │
    │       ├── sendLocationBatch({ locations, deviceId, sentAt })
    │       │       │
    │       │       ├── [Mock API] Random latency 100-500ms
    │       │       ├── [Mock API] 10% random failure
    │       │       │
    │       │       ├── IF success:
    │       │       │     └── return { success: true, processedCount }
    │       │       │
    │       │       └── IF failure:
    │       │             └── return { success: false, error: message }
    │       │
    │       ├── IF API success:
    │       │     ├── DELETE FROM location_queue WHERE id IN (...)
    │       │     └── return true
    │       │
    │       └── IF API failure:
    │             ├── recordFailure(error)
    │             └── return false
    │
    ├── 5. Update pendingCount from getStats()
    │
    └── 6. Schedule next run:
            ├── IF success: 5s delay
            └── IF failure: exponential backoff (1s, 2s, 4s, ... max 30s)
```

**File:** `src/features/sync/syncService.ts:70-145`

---

### Scenario 7: Network Goes Offline

```
Network state changes to offline
    │
    ├── 1. Network listener detects change
    │       └── useSyncStore.setStatus('offline')
    │
    ├── 2. Location tracking CONTINUES
    │       └── Locations queue in SQLite (durable)
    │
    └── 3. Sync attempts skip (isOnline = false)
```

---

### Scenario 8: Network Restored

```
Network state changes to online
    │
    ├── 1. Network listener detects change
    │       │
    │       ├── IF wasOffline AND isNowOnline:
    │       │     └── triggerImmediateSync()
    │       │           ├── Clear current timeout
    │       │           ├── Reset backoff
    │       │           └── Run sync immediately
    │       │
    │       └── All queued locations get synced
```

**File:** `src/features/sync/syncService.ts:181-201`

---

### Scenario 9: App Goes to Background

**Expo Go (foreground only):**
```
App backgrounded
    └── Polling timer pauses (OS limitation)
        └── Locations missed until app returns to foreground
```

**Development Build (with background permission):**
```
App backgrounded
    │
    ├── Background task continues
    │     ├── OS delivers locations to RESPONDER_LOCATION_TASK
    │     └── Locations enqueued to SQLite
    │
    └── Foreground service notification visible:
          "Responder Active - Tracking location for dispatch"
```

---

### Scenario 10: Error During Enqueue

```
enqueue() called
    │
    ├── INSERT fails (e.g., database locked)
    │
    ├── Retry 1: wait 100ms, try again
    │
    ├── INSERT fails again
    │
    ├── Retry 2: wait 100ms, try again
    │
    ├── INSERT fails again
    │
    └── Retry 3: wait 100ms, try again
        │
        ├── IF success: continue
        └── IF fail: log error, throw (location lost)
```

**File:** `src/features/queue/locationQueue.ts:27-56`

---

## Configuration

### Duty Configs

| State | Dev Mode | Production |
|-------|----------|------------|
| **OFF_DUTY** | No tracking | No tracking |
| **ON_DUTY** | 10s / 5m / balanced | 60s / 50m / balanced |
| **ON_MISSION** | 5s / 3m / high | 15s / 20m / high |

**File:** `src/features/duty/dutyConfig.ts`

### Sync Config

| Setting | Value |
|---------|-------|
| Batch size | 50 entries |
| Sync interval | 5 seconds |
| Base backoff | 1 second |
| Max backoff | 30 seconds |

### Mock API Config

| Setting | Default |
|---------|---------|
| Min latency | 100ms |
| Max latency | 500ms |
| Failure rate | 10% |

---

## File Reference: `/features/location`

### `types.ts`

**Purpose:** Location data types and conversion utilities.

| Export | Type | Description |
|--------|------|-------------|
| `LocationData` | interface | Simplified GPS data: lat, lng, accuracy, altitude, timestamp |
| `toLocationData(loc)` | function | Converts expo LocationObject → LocationData |
| `getAccuracy(config)` | function | Maps "high"/"balanced" → expo Accuracy enum |

### `locationStore.ts`

**Purpose:** Zustand store for location state (used by UI).

| State | Type | Description |
|-------|------|-------------|
| `lastLocation` | LocationData \| null | Most recent tracked location |
| `lastUpdateAt` | number \| null | When last update received |
| `totalReceived` | number | Count of updates this session |
| `isTracking` | boolean | Whether tracking is active |
| `trackingMode` | 'none' \| 'foreground' \| 'background' | Current mode |

| Action | Description |
|--------|-------------|
| `recordLocation(loc)` | Record single location |
| `recordLocations(locs)` | Record batch (background) |
| `setTracking(bool, mode)` | Update tracking state |

### `locationTask.ts`

**Purpose:** Background task definition (dev builds only).

| Export | Description |
|--------|-------------|
| `LOCATION_TASK_NAME` | Task identifier: `'RESPONDER_LOCATION_TASK'` |
| `setLocationHandler(fn)` | Register callback for background updates |

**Task behavior:**
1. Receives locations from OS
2. Converts to LocationData[]
3. Enqueues to SQLite
4. Calls registered handler

### `locationService.ts`

**Purpose:** Main tracking orchestration.

**Module State:**
| Variable | Description |
|----------|-------------|
| `pollingTimer` | Active setInterval ID |
| `currentConfig` | Current DutyConfig |
| `isPolling` | Whether polling active |

**Public API:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `requestLocationPermissions()` | `() → {foreground, background}` | Request permissions |
| `startLocationTracking(config)` | `(DutyConfig) → boolean` | Start tracking |
| `stopLocationTracking()` | `() → void` | Stop all tracking |
| `restartLocationTracking()` | `() → boolean` | Restart with current config |
| `forceLocationUpdate()` | `() → LocationData \| null` | Get immediate update |
| `checkBackgroundTaskStatus()` | `() → boolean` | Check if bg task running |
| `getIsTracking()` | `() → boolean` | Get tracking state |

**Internal Functions:**

| Function | Description |
|----------|-------------|
| `fetchAndProcessLocation(accuracy)` | Get GPS, record, enqueue |
| `startPolling(config)` | Start setInterval polling |
| `stopPolling()` | Clear interval |
| `startBackgroundTracking(config)` | Start expo background task |
| `stopBackgroundTracking()` | Stop expo background task |

---

## File Reference: `/features/queue`

### `types.ts`

| Export | Description |
|--------|-------------|
| `LocationEntry` | Queue row: id, lat, lng, accuracy, altitude, timestamp, sequence, createdAt |
| `QueueStats` | Stats: count, oldestTimestamp, newestTimestamp |

### `database.ts`

**Purpose:** SQLite database management.

**Tables:**
- `location_queue` - Pending locations to sync
- `app_state` - Key-value store for duty/mission state

| Function | Description |
|----------|-------------|
| `getDatabase()` | Get/init database singleton |
| `withTransaction(fn)` | Run in transaction |
| `saveState(key, value)` | Persist JSON value |
| `loadState<T>(key)` | Load persisted value |
| `clearState(key)` | Delete value |
| `closeDatabase()` | Close connection |

### `locationQueue.ts`

**Purpose:** Durable queue with sequence ordering.

| Function | Description |
|----------|-------------|
| `initializeSequence()` | Load max sequence from DB |
| `enqueue(locations)` | Add to queue (with retry) |
| `peek(limit)` | Read oldest entries |
| `deleteByIds(ids)` | Remove entries |
| `peekAndDelete(limit, callback)` | Atomic read-process-delete |
| `getStats()` | Get queue statistics |
| `clear()` | Empty queue |

---

## File Reference: `/features/sync`

### `types.ts`

| Export | Description |
|--------|-------------|
| `SyncStatus` | 'idle' \| 'syncing' \| 'error' \| 'offline' |
| `SyncState` | Full state: status, lastSyncAt, lastError, pendingCount, consecutiveFailures |

### `api.ts`

**Purpose:** API type definitions.

| Type | Description |
|------|-------------|
| `LocationBatchRequest` | { locations, deviceId, sentAt } |
| `LocationBatchResponse` | { success, error?, processedCount? } |
| `ApiErrorCode` | NETWORK_ERROR, TIMEOUT, SERVER_ERROR, RATE_LIMITED, UNAUTHORIZED, UNKNOWN |
| `LocationApiClient` | Interface for API implementations |

### `mockApi.ts`

**Purpose:** Simulated backend for development.

| Function | Description |
|----------|-------------|
| `configureMockApi(config)` | Set latency/failure rate |
| `resetMockApi()` | Reset to defaults |
| `sendLocationBatch(payload)` | Simulate API call |

### `syncService.ts`

**Purpose:** Background sync with retry.

**Store:** `useSyncStore`
| State | Description |
|-------|-------------|
| `status` | Current sync status |
| `lastSyncAt` | Last success timestamp |
| `lastError` | Last error message |
| `pendingCount` | Queue size |
| `consecutiveFailures` | For backoff calculation |

**Functions:**

| Function | Description |
|----------|-------------|
| `startSync()` | Start sync loop |
| `stopSync()` | Stop sync loop |
| `triggerImmediateSync()` | Force sync now |
| `subscribeToNetworkChanges()` | Listen for connectivity |

---

## File Reference: `/context`

### `LocationContext.tsx`

**Purpose:** Real-time location for UI display (separate from backend tracking).

**Props:**
| Prop | Default | Description |
|------|---------|-------------|
| `accuracy` | High | GPS accuracy |
| `timeInterval` | 3000 | Update interval (ms) |
| `distanceInterval` | 5 | Update distance (m) |
| `autoStart` | true | Start on mount |

**Context Value:**
| Property | Description |
|----------|-------------|
| `userLocation` | Current {latitude, longitude} |
| `isWatching` | Whether subscription active |
| `error` | Any error message |
| `lastUpdateAt` | Last update timestamp |
| `startWatching()` | Start subscription |
| `stopWatching()` | Stop subscription |
| `getDistanceMetersTo(target)` | Calculate distance |
| `isWithinThreshold(target, meters)` | Check if within range |

**Used by:** Map display, mission arrival detection, AlertModal

---

## Switching to Real Backend

1. Create `realApi.ts`:
```typescript
import { LocationBatchRequest, LocationBatchResponse } from './api';

const API_URL = 'https://your-backend.com/api/locations';

export async function sendLocationBatch(
  payload: LocationBatchRequest
): Promise<LocationBatchResponse> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }

  return response.json();
}
```

2. Update `syncService.ts`:
```typescript
// Change:
import { sendLocationBatch } from './mockApi';
// To:
import { sendLocationBatch } from './realApi';
```

---

## Testing

Run all tests:
```bash
npm test
```

| Test File | Coverage |
|-----------|----------|
| `location/types.test.ts` | Type conversions |
| `location/locationService.test.ts` | Permissions, tracking |
| `queue/locationQueue.test.ts` | Queue operations |
| `duty/dutyStore.test.ts` | Duty state machine |
