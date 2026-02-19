# SEON Responder App - Technical Documentation

## Overview

**SEON Responder App** is a mission-critical React Native mobile application designed for **emergency response coordination**. It enables professional responders to receive incident assignments, track their location in real-time, navigate to incident locations, and report completion.

The app is part of a larger emergency response platform that connects:
- **Users** - People needing help
- **Responders** - Professional staff (this app)
- **Control Rooms** - Dispatchers monitoring responder availability

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EMERGENCY RESPONSE PLATFORM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐       ┌─────────────┐       ┌─────────────────────┐      │
│   │             │       │             │       │                     │      │
│   │    USER     │──────▶│   BACKEND   │◀─────▶│    CONTROL ROOM     │      │
│   │    APP      │       │   SERVERS   │       │    (DISPATCHERS)    │      │
│   │             │       │             │       │                     │      │
│   └─────────────┘       └──────┬──────┘       └─────────────────────┘      │
│                                │                                            │
│                                │ Push Notifications                         │
│                                │ Location Updates                           │
│                                ▼                                            │
│                       ┌─────────────────┐                                   │
│                       │                 │                                   │
│                       │   RESPONDER     │  ◀── This Application             │
│                       │      APP        │                                   │
│                       │                 │                                   │
│                       └─────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Application Structure

```
responder-app/
├── src/
│   ├── features/              # Core business logic domains
│   │   ├── duty/              # Duty state management
│   │   ├── location/          # GPS location collection
│   │   ├── queue/             # SQLite durable queue
│   │   ├── sync/              # Backend synchronization
│   │   ├── mission/           # Incident handling
│   │   └── notifications/     # Push notifications
│   │
│   ├── screens/               # UI Screens
│   │   ├── MapScreen.tsx      # Main map & navigation
│   │   ├── ProfileScreen.tsx  # User profile
│   │   └── DebugMonitor.tsx   # Diagnostics dashboard
│   │
│   ├── components/            # Reusable UI components
│   ├── context/               # React Context providers
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Utility functions
│   └── theme/                 # Styling system
│
├── app.json                   # Expo configuration
└── package.json               # Dependencies
```

---

## Core Features

### 1. Duty State Management

The app uses a three-state system to control location tracking:

```
                    ┌──────────────────────────────────────────────┐
                    │              DUTY STATE MACHINE              │
                    └──────────────────────────────────────────────┘

     ┌───────────────┐      Go On Duty      ┌───────────────┐
     │               │─────────────────────▶│               │
     │   OFF_DUTY    │                      │   ON_DUTY     │
     │               │◀─────────────────────│               │
     │  (No Tracking)│      Go Off Duty     │ (60s updates) │
     └───────────────┘                      └───────┬───────┘
                                                    │
                                        Accept      │      Complete
                                        Mission     │      Mission
                                                    ▼
                                            ┌───────────────┐
                                            │               │
                                            │  ON_MISSION   │
                                            │ (15s updates) │
                                            │               │
                                            └───────────────┘
```

| State | Location Interval | Distance Threshold | Purpose |
|-------|-------------------|-------------------|---------|
| OFF_DUTY | None | None | Responder offline |
| ON_DUTY | 60 seconds | 50 meters | Available, waiting for missions |
| ON_MISSION | 15 seconds | 20 meters | Active incident response |

---

### 2. Location Tracking System

The app tracks responder location using two modes:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        LOCATION TRACKING FLOW                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│    ┌──────────────────┐                    ┌──────────────────┐           │
│    │   GPS / SENSORS  │                    │   GPS / SENSORS  │           │
│    └────────┬─────────┘                    └────────┬─────────┘           │
│             │                                       │                      │
│             ▼                                       ▼                      │
│    ┌──────────────────┐                    ┌──────────────────┐           │
│    │    FOREGROUND    │                    │    BACKGROUND    │           │
│    │    TRACKING      │                    │    TASK          │           │
│    │                  │                    │                  │           │
│    │  (App Visible)   │                    │  (App Hidden)    │           │
│    └────────┬─────────┘                    └────────┬─────────┘           │
│             │                                       │                      │
│             └───────────────┬───────────────────────┘                      │
│                             │                                              │
│                             ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │  LOCATION STORE  │  ◀── UI visibility                 │
│                    └────────┬─────────┘                                    │
│                             │                                              │
│                             ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │   SQLITE QUEUE   │  ◀── Durable persistence           │
│                    └────────┬─────────┘                                    │
│                             │                                              │
│                             ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │   SYNC SERVICE   │  ◀── Batch upload                  │
│                    └────────┬─────────┘                                    │
│                             │                                              │
│                             ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │     BACKEND      │                                    │
│                    └──────────────────┘                                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Foreground Mode**: Active when app is visible, uses `watchPositionAsync()`
- **Background Mode**: Runs even when app is closed, uses `expo-task-manager`
- **Accuracy Filtering**: Ignores inaccurate readings
- **Distance Threshold**: Only records if moved beyond threshold

---

### 3. Durable Queue & Offline Resilience

The app uses SQLite to ensure no location data is lost:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      OFFLINE-FIRST ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│     Location Event                                                      │
│          │                                                              │
│          ▼                                                              │
│    ┌───────────────────────────────────────────────────────────────┐   │
│    │                      SQLITE DATABASE                          │   │
│    │  ┌─────────────────────────────────────────────────────────┐  │   │
│    │  │                   location_queue                        │  │   │
│    │  │                                                         │  │   │
│    │  │  id │ lat │ lon │ accuracy │ timestamp │ sequence      │  │   │
│    │  │  ───┼─────┼─────┼──────────┼───────────┼────────────   │  │   │
│    │  │  1  │ ... │ ... │   10m    │ 1706...   │    001        │  │   │
│    │  │  2  │ ... │ ... │   15m    │ 1706...   │    002        │  │   │
│    │  │  3  │ ... │ ... │   8m     │ 1706...   │    003        │  │   │
│    │  │  ...│ ... │ ... │   ...    │ ...       │    ...        │  │   │
│    │  └─────────────────────────────────────────────────────────┘  │   │
│    └───────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│                    ┌───────────────────┐                               │
│                    │   SYNC SERVICE    │                               │
│                    │                   │                               │
│        Online? ────│  Read 50 entries  │                               │
│           │        │  Send to backend  │                               │
│           │        │  Delete on success│                               │
│           │        └───────────────────┘                               │
│           │                 │                                          │
│           ▼                 ▼                                          │
│     ┌──────────┐      ┌──────────┐                                     │
│     │  RETRY   │      │  DELETE  │                                     │
│     │  LATER   │      │  ENTRIES │                                     │
│     └──────────┘      └──────────┘                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Resilience Features:**
- Survives app crashes
- Works offline (stores locally, syncs when online)
- Atomic transactions prevent data corruption
- Sequence numbers prevent duplicates

---

### 4. Mission/Incident Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MISSION STATE MACHINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              Push Notification                               │
│                                    │                                         │
│                                    ▼                                         │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│   │              │  Alert  │              │ Accept  │              │        │
│   │     IDLE     │────────▶│   PENDING    │────────▶│   ACCEPTED   │        │
│   │              │         │              │         │              │        │
│   │  (Waiting)   │         │ (30s Timer)  │         │ (Navigating) │        │
│   └──────────────┘         └──────┬───────┘         └──────┬───────┘        │
│          ▲                        │                        │                 │
│          │                        │                        │                 │
│          │     Decline/Timeout    │                        │  Within 50m     │
│          │◀───────────────────────┘                        ▼                 │
│          │                                          ┌──────────────┐        │
│          │                                          │              │        │
│          │              Complete                    │   ARRIVED    │        │
│          │◀─────────────────────────────────────────│              │        │
│          │                                          │  (On Site)   │        │
│                                                     └──────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Mission Flow:**
1. Backend sends push notification with incident details
2. Alert modal appears with 30-second countdown
3. Responder accepts or declines
4. If accepted: Navigation starts, duty state → ON_MISSION
5. Auto-detection when within 50m of incident
6. Complete mission to return to ON_DUTY state

---

### 5. Sync Service & Retry Logic

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNC SERVICE LOOP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    START ───▶ Check Online? ───No───▶ Wait for Network ──────────┐         │
│                    │                                              │         │
│                   Yes                                             │         │
│                    │                                              │         │
│                    ▼                                              │         │
│              Read 50 locations                                    │         │
│              from queue                                           │         │
│                    │                                              │         │
│                    ▼                                              │         │
│              ┌───────────────┐                                    │         │
│              │ POST /locations│                                    │         │
│              │   to Backend   │                                    │         │
│              └───────┬───────┘                                    │         │
│                      │                                            │         │
│            ┌─────────┴─────────┐                                  │         │
│            │                   │                                  │         │
│         Success             Failure                               │         │
│            │                   │                                  │         │
│            ▼                   ▼                                  │         │
│     ┌────────────┐     ┌────────────────┐                        │         │
│     │   DELETE   │     │  EXPONENTIAL   │                        │         │
│     │   ENTRIES  │     │   BACKOFF      │                        │         │
│     │            │     │                │                        │         │
│     │ Reset      │     │ 1s → 2s → 4s   │                        │         │
│     │ Backoff    │     │ → 8s → ... 30s │                        │         │
│     └─────┬──────┘     └───────┬────────┘                        │         │
│           │                    │                                  │         │
│           └────────────────────┴──────────────────────────────────┘         │
│                                │                                            │
│                      Wait 5 seconds                                         │
│                      Loop again                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TECHNOLOGY STACK                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          PRESENTATION LAYER                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │ React Native │  │    React     │  │  React Navigation        │   │   │
│  │  │    0.81      │  │    19.1      │  │      (Tabs/Stacks)       │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          STATE MANAGEMENT                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │   Zustand    │  │    React     │  │   TypeScript             │   │   │
│  │  │   Stores     │  │   Context    │  │   (Strict Mode)          │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          DEVICE SERVICES                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │expo-location │  │expo-task-    │  │ expo-notifications       │   │   │
│  │  │   (GPS)      │  │  manager     │  │   (Push Alerts)          │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          DATA LAYER                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │ expo-sqlite  │  │ expo-network │  │  @turf (Geospatial)      │   │   │
│  │  │ (Persistence)│  │ (Connectivity│  │                          │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          UI COMPONENTS                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │   │
│  │  │ react-native │  │ expo-linear- │  │ Custom Theme System      │   │   │
│  │  │    -maps     │  │   gradient   │  │                          │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌───────────────────┐                               │
│                         │    GPS SENSORS    │                               │
│                         └─────────┬─────────┘                               │
│                                   │                                         │
│              ┌────────────────────┴────────────────────┐                    │
│              │                                         │                    │
│              ▼                                         ▼                    │
│    ┌──────────────────┐                     ┌──────────────────┐           │
│    │   FOREGROUND     │                     │    BACKGROUND    │           │
│    │   TRACKER        │                     │    TASK          │           │
│    └────────┬─────────┘                     └────────┬─────────┘           │
│             │                                        │                      │
│             └────────────────┬───────────────────────┘                      │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                     │
│                    │   DUTY STORE     │ ◀── Controls tracking intensity     │
│                    │                  │                                     │
│                    │ OFF_DUTY: Stop   │                                     │
│                    │ ON_DUTY: 60s     │                                     │
│                    │ ON_MISSION: 15s  │                                     │
│                    └────────┬─────────┘                                     │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌────────────┐    ┌────────────────┐   ┌────────────────┐                 │
│  │ LOCATION   │    │  SQLITE QUEUE  │   │ MISSION STORE  │                 │
│  │   STORE    │    │                │   │                │                 │
│  │ (UI State) │    │  (Persistence) │   │ (Incident FSM) │                 │
│  └────────────┘    └───────┬────────┘   └────────────────┘                 │
│                            │                                                │
│                            ▼                                                │
│                   ┌────────────────┐                                        │
│                   │  SYNC SERVICE  │                                        │
│                   │                │                                        │
│                   │ Batch: 50 locs │                                        │
│                   │ Retry: Exp.    │                                        │
│                   └───────┬────────┘                                        │
│                           │                                                 │
│                           ▼                                                 │
│          ┌────────────────────────────────┐                                 │
│          │           BACKEND              │                                 │
│          │                                │                                 │
│          │  POST /locations               │                                 │
│          │  { locations[], deviceId }     │                                 │
│          │                                │                                 │
│          │  Push Notifications ──────────────▶ MISSION ALERTS               │
│          └────────────────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Overview

### Map Screen (Main)
- Interactive map with dark theme
- Current location marker (blue dot)
- Incident location marker (red pin)
- Turn-by-turn navigation route
- Distance and ETA display
- Arrival detection (within 50m)

### Profile Screen
- Responder information
- Duty state toggle
- Settings and preferences

### Debug Monitor
- Queue statistics
- Sync status
- Location tracking mode
- Network connectivity
- Battery and device info
- Manual testing controls

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SQLITE TABLES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        location_queue                                  │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ Column      │ Type    │ Description                                   │ │
│  │─────────────┼─────────┼───────────────────────────────────────────────│ │
│  │ id          │ INTEGER │ Auto-increment primary key                    │ │
│  │ latitude    │ REAL    │ GPS latitude coordinate                       │ │
│  │ longitude   │ REAL    │ GPS longitude coordinate                      │ │
│  │ accuracy    │ REAL    │ GPS accuracy in meters                        │ │
│  │ altitude    │ REAL    │ Altitude in meters                            │ │
│  │ timestamp   │ INTEGER │ Device timestamp (epoch ms)                   │ │
│  │ sequence    │ INTEGER │ Unique sequence for deduplication             │ │
│  │ created_at  │ INTEGER │ Queue entry time (epoch ms)                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                          app_state                                     │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ Column      │ Type    │ Description                                   │ │
│  │─────────────┼─────────┼───────────────────────────────────────────────│ │
│  │ key         │ TEXT    │ State key (primary key)                       │ │
│  │ value       │ JSON    │ State value                                   │ │
│  │ updated_at  │ INTEGER │ Last update timestamp                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Stored Keys:                                                               │
│  - duty_state: Current duty status (OFF_DUTY/ON_DUTY/ON_MISSION)           │
│  - mission_state: Current mission data if active                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| ON_DUTY Interval | 10 seconds | 60 seconds |
| ON_MISSION Interval | 5 seconds | 15 seconds |
| Batch Size | 10 | 50 |
| Max Backoff | 10 seconds | 30 seconds |

### Location Permissions Required

**iOS:**
- Location When In Use
- Location Always (for background)
- Background Modes: Location, Fetch, Remote Notifications

**Android:**
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION
- FOREGROUND_SERVICE

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite Queue** | Survives app crashes; truly offline-first |
| **Batch Sending (50/request)** | Reduces network overhead and battery usage |
| **Exponential Backoff** | Prevents server overload on failures |
| **Zustand over Redux** | Simpler, lighter for this feature set |
| **Expo Managed** | Faster development; handles OS complexities |
| **Feature-Based Structure** | Clear separation of concerns |

---

## Error Handling & Resilience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ERROR HANDLING STRATEGY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     NETWORK FAILURES                                 │   │
│  │                                                                      │   │
│  │    Request Failed ──▶ Keep in Queue ──▶ Exponential Backoff         │   │
│  │                                              │                       │   │
│  │                                              ▼                       │   │
│  │                                    Network Restored ──▶ Retry        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     APP CRASHES                                      │   │
│  │                                                                      │   │
│  │    Crash ──▶ SQLite Persists ──▶ App Restarts ──▶ Resume Sync       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     AUTH FAILURES (401)                              │   │
│  │                                                                      │   │
│  │    401 ──▶ Refresh Token ──▶ Retry Once ──▶ Fail? ──▶ Re-login      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     GPS FAILURES                                     │   │
│  │                                                                      │   │
│  │    No Signal ──▶ Log Error ──▶ Continue When Available              │   │
│  │    Low Accuracy ──▶ Filter Out ──▶ Wait for Better Fix              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Backend Integration

### Expected API Endpoints

```
POST /locations
Request Body:
{
  "locations": [
    {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 10.5,
      "altitude": 50.2,
      "timestamp": 1706123456789,
      "sequence": 12345
    },
    ...
  ],
  "deviceId": "abc123",
  "sentAt": 1706123456800
}

Response: 200 OK | 401 Unauthorized | 5xx Server Error
```

### Backend Responsibilities

1. **Receive location batches** via POST /locations
2. **Deduplicate** by (responder_id, sequence)
3. **Determine liveness**: ONLINE / DEGRADED / OFFLINE
4. **Detect unreachable responders**: No update in 2-3x expected interval
5. **Prevent assignment to OFFLINE responders**
6. **Alert/reassign** if responder goes OFFLINE during incident

---

## Summary

The SEON Responder App is a **robust, offline-first location tracking system** built with React Native + Expo. Its core mission is to ensure responders' locations are **reliably transmitted** to a backend dispatch system, even in challenging conditions:

- **Network failures** → Queued locally, synced when online
- **App crashes** → SQLite persistence survives restarts
- **Background restrictions** → Continues tracking when app is hidden
- **Battery efficiency** → Configurable intervals based on duty state

The modular, feature-based architecture makes the codebase maintainable and testable, while the comprehensive debug monitor enables real-time diagnostics during development and troubleshooting.
