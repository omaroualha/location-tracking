# SEON Responder App

A mission-critical React Native/Expo mobile application for emergency responder coordination, paired with a Node.js location backend.

---

## Project Structure

```
SEON/
├── responder-app/        # React Native mobile app (Expo SDK 54)
├── location-backend/     # Node.js Express API + web dashboard
├── DOCUMENTATION.md      # Deep technical documentation
├── design-memo.md        # Architecture decisions
└── task.txt              # Original assignment brief
```

---

## Prerequisites

- **Node.js** 18+
- **Yarn** (responder-app uses Yarn 4)
- **Expo CLI**: `npm install -g expo-cli`
- **iOS development**: Xcode + Apple Developer account (for real device)
- **Android development**: Android Studio + Android SDK

---

## 1. Location Backend

The backend receives location batches from the mobile app and exposes a real-time dashboard.

### Setup

```bash
cd location-backend
npm install
```

### Run

```bash
# Development (with file watching)
npm run dev

# Production
npm run build && npm start
```

Runs on **http://localhost:3001** by default. Set `PORT` env var to change.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/locations` | Receive location batch from device |
| `GET` | `/api/locations` | Query stored locations (`?limit=50&deviceId=...`) |
| `GET` | `/api/sessions` | List all responder sessions |
| `GET` | `/api/stats` | Totals: locations, devices, active sessions |
| `GET` | `/api/gaps/:deviceId` | Detect update gaps (`?threshold=30000`) |
| `GET` | `/api/export` | Export all data as JSON |
| `DELETE` | `/api/data` | Clear all data (dev only) |
| `GET` | `/` | Real-time web dashboard (SSE) |

### Find Your Local IP (for mobile → backend)

```bash
# macOS
ipconfig getifaddr en0

# Linux
ip addr show wlan0
```

Use this IP in the responder app's sync config so the device can reach the backend.

---

## 2. Responder App

### Setup

```bash
cd responder-app
yarn install
```

### Running

#### Expo Go (quickest, limited features)

Background location tracking does **not** work in Expo Go.

```bash
yarn start
# Scan QR code with Expo Go app
```

#### iOS Simulator

```bash
yarn ios
# or: npx expo run:ios
```

#### iOS Real Device (recommended for full features)

Requires Xcode and an Apple Developer account.

```bash
yarn ios:device
# or: npx expo run:ios --device
```

#### Android Emulator

```bash
yarn android
# or: npx expo run:android
```

#### Android Real Device

```bash
npx expo run:android --device
```

### Testing

```bash
yarn test             # Run once
yarn test:watch       # Watch mode
yarn test:coverage    # Coverage report
```

---

## Running Both Together

1. Start the backend first:
   ```bash
   cd location-backend && npm run dev
   ```

2. Find your machine's local IP (see above).

3. Update the sync URL in the responder app to point to `http://<YOUR_IP>:3001`.

4. Start the responder app on your device:
   ```bash
   cd responder-app && yarn ios:device
   ```

5. Open the dashboard at **http://localhost:3001** to watch location updates arrive in real time.

---

## Feature Overview

### Duty States

Responders toggle between three states that control tracking frequency:

| State | Interval | Distance Filter | Description |
|-------|----------|-----------------|-------------|
| `OFF_DUTY` | None | None | Not tracking |
| `ON_DUTY` | 60s | 50m | Available, waiting for incidents |
| `ON_MISSION` | 15s | 20m | Actively responding |

### Location Tracking

- **Foreground**: `watchPositionAsync()` while app is visible
- **Background**: `expo-task-manager` task runs even when app is closed
- Inaccurate readings are filtered out
- Only records a new point if time **or** distance threshold is exceeded

> Background tracking requires a **development build** (not Expo Go)

### Offline-First Queue

All locations are written to a local **SQLite database** before being sent. If the network is unavailable:
- Locations accumulate in the queue
- The sync service retries with exponential backoff (1s → 2s → 4s → max 30s)
- Entries are deleted from the queue only after the server confirms receipt

### Mission Lifecycle

```
idle → pending → accepted → arrived → completed
```

- 30-second window to accept or decline an incident
- 50-meter threshold triggers automatic arrival detection
- Distance to incident shown on map during navigation

### Monitor Screen

A built-in diagnostics screen (tab in the app) shows:
- Current duty state
- Location queue depth
- Sync status and last error
- Network connectivity
- Recent location entries
- Permission status

Useful for debugging during development.

---

## Simulator vs Real Device

The app detects simulator vs real device using `expo-device`:

| Environment | Map location | Tracking mode | Background location |
|-------------|-------------|--------------|---------------------|
| iOS Simulator | Hardcoded Düsseldorf | Foreground only | No |
| Expo Go (real device) | Your real location | Foreground only | No |
| Dev build (real device) | Your real location | Background | Yes |

To get full functionality (background tracking + real location), always use a **development build on a real device**.

---

## Key Source Files

```
responder-app/src/
├── App.tsx                              # App init, duty/location startup
├── features/
│   ├── duty/dutyStore.ts               # OFF_DUTY / ON_DUTY / ON_MISSION state
│   ├── location/locationService.ts     # GPS collection, foreground + background
│   ├── location/locationStore.ts       # Zustand location state
│   ├── queue/locationQueue.ts          # SQLite durable queue
│   ├── sync/syncService.ts             # Batch upload with retry logic
│   ├── mission/missionStore.ts         # Incident state machine
│   ├── map/hooks/useMapNavigation.ts   # Map state + simulator detection
│   ├── monitor/MonitorScreen.tsx       # Diagnostics dashboard
│   └── theme/                          # Colors, typography, spacing
├── utils/
│   └── environment.ts                  # isExpoGo(), isSimulator()
└── context/LocationContext.tsx         # Real-time location provider

location-backend/src/
├── index.ts                            # Express setup
├── db.ts                               # SQLite schema + queries
└── routes/
    ├── api.ts                          # Location API
    └── dashboard.ts                    # Web dashboard + SSE
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript 5.9 (strict) |
| State management | Zustand 5 |
| Navigation | React Navigation 7 |
| Maps | react-native-maps |
| GPS | expo-location + expo-task-manager |
| Local storage | expo-sqlite |
| Device detection | expo-device |
| Notifications | expo-notifications |
| Geo calculations | @turf/distance |
| Backend | Node.js + Express 4 |
| Backend DB | better-sqlite3 |
| Testing | Jest 30 |
