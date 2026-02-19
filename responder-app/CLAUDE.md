# Responder App

Emergency responder location tracking app built with React Native + Expo.

## Tech Stack
- React Native 0.81 + Expo SDK 54
- TypeScript (strict mode)
- Zustand for state management
- React Navigation (bottom tabs)
- react-native-maps for map display
- expo-linear-gradient for gradient effects
- expo-sqlite for durable queue
- expo-location + expo-task-manager for background tracking
- expo-notifications for push notifications

## Architecture

Feature-based structure under `src/`:

### Features (`src/features/`)
- **duty/** - Duty state management (OFF_DUTY, ON_DUTY, ON_MISSION)
- **location/** - Background location collection
- **queue/** - SQLite durable queue for offline resilience
- **sync/** - Batch sender with retry logic
- **mission/** - Mission state machine, types, mock data
- **notifications/** - Push notification setup and handlers

### UI Structure
- **screens/** - Tab screens (MapScreen, ProfileScreen)
- **components/mission/** - AlertModal, MissionHeader, ArrivedButton, CountdownTimer
- **hooks/** - useCountdown, useDistanceToTarget, useNetworkStatus, usePermissions
- **theme/** - Centralized theme system
- **utils/** - Geo calculations, helpers

## Code Conventions

### Naming
- Files: camelCase for modules (`dutyStore.ts`), PascalCase for components (`DutyToggle.tsx`)
- Types: PascalCase with descriptive suffixes (`DutyState`, `LocationEntry`)
- Constants: UPPER_SNAKE_CASE (`LOCATION_TASK_NAME`)

### Zustand Stores
- One store per feature domain
- Export typed hooks: `useDutyStore()`
- Keep actions inside store, not separate files

### Background Tasks
- Register tasks at app startup (top-level, not inside components)
- Task names prefixed: `RESPONDER_LOCATION_TASK`

### Error Handling
- Never swallow errors silently
- Log errors with context (no PII/coordinates in logs)
- Queue operations should be idempotent

## Theme System

All styling uses the centralized theme at `src/theme/index.ts`. Import and use theme values instead of hardcoding colors, spacing, etc.

### Usage
```typescript
import { colors, typography, spacing, radius, shadows } from '@/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.md,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
});
```

### Theme Exports
- **colors** - Background, text, brand, status, priority, UI, gradients
- **typography** - Font sizes, weights, line heights, letter spacing
- **spacing** - Consistent spacing scale (xs: 4, sm: 8, md: 12, lg: 16, xl: 20, etc.)
- **radius** - Border radius presets (sm: 4, md: 8, lg: 12, xl: 16, etc.)
- **shadows** - Shadow presets (sm, md, lg) + `glow(color)` function
- **commonStyles** - Reusable card, button, text, layout styles

### Gradients
For `LinearGradient` colors, use theme gradients which are typed as tuples:
```typescript
<LinearGradient colors={colors.gradients.primary} />
// Available: primary, success, warning, error, dark, glass
```

### Color Palette
- **Background**: primary (#0a0a12), secondary (#12121f), tertiary (#1a1a2e)
- **Brand**: primary (#6366f1 indigo), secondary (#8b5cf6 purple), accent (#06b6d4 cyan)
- **Status**: success (#22c55e), warning (#f59e0b), error (#ef4444), info (#3b82f6)
- **Priority**: critical (#dc2626), high (#ea580c), medium (#d97706), low (#16a34a)

## Key Thresholds (from design memo)

| Duty State | Interval | Distance |
|------------|----------|----------|
| OFF_DUTY   | None     | None     |
| ON_DUTY    | 60s      | 50m      |
| ON_MISSION | 15s      | 20m      |

## Mission State Machine

```
idle → pending (on receive) → accepted (on accept) → arrived (within 50m) → idle (on complete)
                ↓
           idle (on decline/timeout)
```

- **ALERT_TIMEOUT_SECONDS**: 30 seconds to accept/decline
- **ARRIVAL_THRESHOLD_METERS**: 50m to mark as arrived

## Commands
- `npx expo start` - Start dev server
- `npx expo run:ios` - Build and run on iOS simulator
- `npx expo run:android` - Build and run on Android emulator

## Testing Background Location
- Requires development build (not Expo Go)
- Use `npx expo prebuild` then `npx expo run:ios/android`
- Test on real devices for accurate battery/background behavior
