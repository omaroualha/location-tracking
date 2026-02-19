# Design Memo: Permanent Location Updates

**Author:** Omar Oualha | **Date:** January 2025

---

## Problem Statement

The Responder App sometimes stops sending location updates. We don't always know why — and we might assign incidents to responders who won't receive them.

**Goals:**
- Reliable location updates on iOS and Android
- Detect unreachable responders within 2-3 minutes
- Resource-efficient (battery, network)
- Observable and debuggable

**Non-Goals:**
- Perfect real-time tracking (not Google Maps navigation)
- Guaranteeing background execution when OS disallows it

---

## 1. Mobile App (Client)

### Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      RESPONDER APP                          │
│                                                             │
│  ┌──────────────┐    ┌─────────────┐    ┌────────────────┐ │
│  │ Duty State   │───►│  Location   │───►│ Durable Queue  │ │
│  │ Manager      │    │  Collector  │    │   (SQLite)     │ │
│  └──────────────┘    └─────────────┘    └───────┬────────┘ │
│         │                                       │          │
│         │            ┌─────────────┐            │          │
│         └───────────►│ Environment │            │          │
│                      │   Monitor   │            ▼          │
│                      └─────────────┘    ┌────────────────┐ │
│                                         │ Sender Engine  │──┼──► Backend
│                                         │ (batch + retry)│ │
│                                         └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Location Update Sequence

```
┌───────────────────────────────────────────────────────────────────┐
│                    LOCATION UPDATE SEQUENCE                       │
└───────────────────────────────────────────────────────────────────┘

  GPS           Collector       Queue          Sender         Backend
   │               │              │              │               │
   │  callback     │              │              │               │
   │──────────────►│              │              │               │
   │               │              │              │               │
   │               │ filter by    │              │               │
   │               │ accuracy &   │              │               │
   │               │ distance     │              │               │
   │               │              │              │               │
   │               │   INSERT     │              │               │
   │               │─────────────►│              │               │
   │               │              │              │               │
   │               │              │  read batch  │               │
   │               │              │◄─────────────│               │
   │               │              │              │               │
   │               │              │   entries    │               │
   │               │              │─────────────►│               │
   │               │              │              │               │
   │               │              │              │ POST /locations
   │               │              │              │──────────────►│
   │               │              │              │               │
   │               │              │              │    200 OK     │
   │               │              │              │◄──────────────│
   │               │              │              │               │
   │               │              │ delete sent  │               │
   │               │              │◄─────────────│               │
   │               │              │              │               │

  On failure: backoff 1s → 2s → 4s → max 30s
  On network change: reset backoff, retry immediately
  On 401: refresh token, retry once
```

### Resource Efficiency

| Duty State | Interval | Distance | Rationale |
|------------|----------|----------|-----------|
| OFF_DUTY | None | None | No tracking needed |
| ON_DUTY | 60 seconds | 50 meters | Available but waiting |
| ON_MISSION | 15 seconds | 20 meters | Active incident |

Updates only sent when: time threshold reached OR distance threshold exceeded.

### Background Execution & OS Constraints

| Platform | Approach |
|----------|----------|
| **iOS** | `expo-location` background mode with `pausesUpdatesAutomatically: false`. Fall back to significant-change (~500m) in low power mode. |
| **Android** | Start with `expo-task-manager`. Escalate to native foreground service (persistent notification) if metrics show background kills. |

### Failure Scenarios

| Situation | Detection | Response |
|-----------|-----------|----------|
| **App in background** | Lifecycle event | Continue tracking (best-effort) |
| **App killed / OS stops tasks** | Not detectable on device | Backend detects via missing updates |
| **Permission revoked** | Permission API check | Stop tracking, show prompt, notify backend |
| **Location services disabled** | Location API error | Queue error event, show prompt |
| **Battery saver / low power** | System API | Switch to conservative profile (longer intervals) |
| **Offline / no connectivity** | Network listener | Queue locally, retry on connectivity change |
| **Captive portal** | `GET /health` returns non-200 | Treat as offline, keep queueing |
| **Wi-Fi ↔ cellular switch** | Network change event | Reset backoff, retry immediately |

### Telemetry (Minimal, Privacy-Aware)

**Logged on device (no PII, no coordinates):**
- Duty state transitions
- Permission state changes
- Network type changes
- Battery level thresholds (20%, 10%)
- Queue depth and oldest entry age
- Send success/failure (error class only)
- App lifecycle events (foreground/background)

**Sent with each location batch:**
```
{
  permission_status: "granted" | "denied",
  location_services: true | false,
  power_mode: "normal" | "low_power",
  app_state: "foreground" | "background",
  queue_depth: 5,
  network_type: "wifi" | "cellular" | "none"
}
```

---

## 2. Backend

### Liveness State Machine

```
┌───────────────────────────────────────────────────────────┐
│               LIVENESS STATE MACHINE                      │
└───────────────────────────────────────────────────────────┘

                         ┌───────────┐
                         │  UNKNOWN  │
                         └─────┬─────┘
                               │ location received
                               ▼
           ┌───────────────────────────────────┐
           │              ONLINE               │◄─────────┐
           │     (updates within expected)     │          │
           └─────────────────┬─────────────────┘          │
                             │                            │
                update late  │                   update   │
               (>1.5× interval)                 received  │
                             ▼                            │
           ┌───────────────────────────────────┐          │
           │             DEGRADED              │──────────┘
           │      (late but still arriving)    │
           └─────────────────┬─────────────────┘
                             │
               update missing│
                (>3× interval)
                             ▼
           ┌───────────────────────────────────┐
           │              OFFLINE              │
           └───────────────────────────────────┘
```

**Thresholds (based on duty state):**

| Duty State | Expected | DEGRADED | OFFLINE |
|------------|----------|----------|---------|
| ON_DUTY | 60s | 90s | 180s |
| ON_MISSION | 15s | 30s | 60s |

### Backend Liveness Check Sequence

```
┌───────────────────────────────────────────────────────────────────┐
│                 LIVENESS CHECK SEQUENCE                           │
└───────────────────────────────────────────────────────────────────┘

  Scheduler      LivenessJob       DB            Alerting
      │               │             │                │
      │  trigger      │             │                │
      │  (every 30-60s)             │                │
      │──────────────►│             │                │
      │               │             │                │
      │               │ get active  │                │
      │               │ responders  │                │
      │               │────────────►│                │
      │               │             │                │
      │               │  responders │                │
      │               │◄────────────│                │
      │               │             │                │
      │               │             │                │
      │         ┌─────┴─────┐       │                │
      │         │ for each  │       │                │
      │         │ responder │       │                │
      │         └─────┬─────┘       │                │
      │               │             │                │
      │               │ check time  │                │
      │               │ since last  │                │
      │               │ update      │                │
      │               │             │                │
      │               │ if threshold│                │
      │               │ exceeded:   │                │
      │               │ update state│                │
      │               │────────────►│                │
      │               │             │                │
      │               │ if OFFLINE: │                │
      │               │─────────────────────────────►│
      │               │             │                │
      │               │             │           log + alert
      │               │             │                │
```

### Ingestion Rules

1. **Accept out-of-order batches** — network delays happen
2. **Deduplicate** by `(responder_id, sequence)` — retries happen
3. **Store latest location separately** — fast "where is everyone?" queries
4. **Store history** — for gap analysis and debugging

### Monitoring & Alerting

**Metrics:**
- `responders_by_status{status}` — gauge (ONLINE/DEGRADED/OFFLINE count)
- `location_update_delay_seconds` — histogram
- `status_transitions{from, to}` — counter

**Alerts:**
- `HighOfflineRate` — >10% of active responders offline
- `ResponderFlapping` — rapid ONLINE↔OFFLINE transitions
- `NoOnlineResponders` — zero available in a region (critical)

### What Backend Should NOT Do

- ❌ Assume push notifications reliably wake apps
- ❌ Require long-lived WebSocket for tracking
- ❌ Complex ML prediction without metrics to justify
- ❌ Over-engineer retry/ping mechanisms

---

## 3. Incident Delegation

### Assignment Sequence

```
┌───────────────────────────────────────────────────────────────────┐
│                 INCIDENT ASSIGNMENT SEQUENCE                      │
└───────────────────────────────────────────────────────────────────┘

  ControlRoom     Backend         DB           Push         Responder
      │              │             │             │              │
      │ new incident │             │             │              │
      │─────────────►│             │             │              │
      │              │             │             │              │
      │              │ get ONLINE  │             │              │
      │              │ responders  │             │              │
      │              │────────────►│             │              │
      │              │             │             │              │
      │              │ responders  │             │              │
      │              │◄────────────│             │              │
      │              │             │             │              │
      │              │ sort by     │             │              │
      │              │ distance    │             │              │
      │              │             │             │              │
      │              │ send push   │             │              │
      │              │────────────────────────►│              │
      │              │             │             │              │
      │              │             │             │ notification │
      │              │             │             │─────────────►│
      │              │             │             │              │
      │              │             │             │     ACK      │
      │              │◄────────────────────────────────────────│
      │              │             │             │              │
      │              │ (or timeout │             │              │
      │              │  → try next)│             │              │
      │              │             │             │              │
      │  assigned    │             │             │              │
      │◄─────────────│             │             │              │
      │              │             │             │              │
```

### Backend vs App Decisions

| Decision | Owner | Rationale |
|----------|-------|-----------|
| Who is ONLINE/OFFLINE | Backend | Has global view of update timing |
| Which responder to assign | Backend | Needs proximity + availability |
| When to send updates | App | Knows local conditions |
| Which profile to use | App | Knows battery/power state |

### UX Signals to Responder

- **Green:** "Location tracking active"
- **Yellow:** "Connectivity degraded — you may miss assignments"
- **Red:** "Location permission required"

---

## 4. React Native + Expo

### Expo APIs Used

| Feature | Package | Notes |
|---------|---------|-------|
| Location | `expo-location` | Background mode requires "Always" permission |
| Background tasks | `expo-task-manager` | Registration for background execution |
| Local storage | `expo-sqlite` | Durable queue |
| Network state | `expo-network` | Connectivity detection |
| Push notifications | `expo-notifications` | Incident delivery |
| Device info | `expo-device` | Platform detection |

### Native Module Contingency

**If Expo background reliability is insufficient:**

1. Use `expo-dev-client` to add custom native code
2. Android: Native foreground service with proper notification channel
3. iOS: Native significant-change monitoring as fallback
4. Keep Expo for non-location features — avoid full ejection

### Pragmatic Steps for Expo Limitations

1. **Measure first** — Phase 1 telemetry will show actual failure rates
2. **EAS Build required** — can't test background in Expo Go
3. **Test on real devices** — include iOS 15+, Android 10+
4. **Escalate with data** — native modules only if metrics justify

---

## Failure Modes & Mitigations

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| iOS kills app | Backend: no updates | Mark OFFLINE, reassign incidents |
| Android Doze | Updates stop | Foreground service (if needed) |
| Network offline | Client: queue grows | Batch locally, sync on reconnect |
| Permission revoked | Client: API check | Prompt user, notify backend |
| Token expired | Client: 401 response | Refresh token, retry once |

---

## Trade-offs

| Choice | Trade-off | Rationale |
|--------|-----------|-----------|
| 60s interval (on-duty) | Accuracy vs battery | Good enough for assignment |
| Single channel (no heartbeat) | Simplicity vs granularity | Same failure modes |
| SQLite queue | Complexity vs reliability | Survives crashes |
| Accept iOS limitations | Control vs reality | Can't fight the OS |

**Battery impact:** ~3-5% (on-duty) / ~8-12% (on-mission) per 8hr shift

---

## Rollout Strategy

| Phase | Scope | Goal |
|-------|-------|------|
| 1. Measure | Add telemetry | Baseline failure rate |
| 2. Queue | 20% rollout | Reduce data loss |
| 3. Liveness | 50% rollout | Gate incident assignment |
| 4. Tune | 100% rollout | Optimize thresholds |

**Feature flags:** Intervals, thresholds, native fallback toggles

---

## Open Questions & Assumptions

**Assumptions:**
- Responders explicitly toggle "on duty"
- "Always" location permission is acceptable
- Responders have access to chargers
- Push notification infrastructure exists

**Open Questions:**
- Current failure rate and device distribution?
- Existing incident reassignment logic?
- SLAs for maximum location staleness?

---

## Summary

Like Uber knowing when a driver's app crashed:

1. **Send reliably** — local queue, retry logic, platform-aware
2. **Know when it fails** — backend detects OFFLINE within 2-3 min
3. **Respond appropriately** — don't assign to unreachable responders
