import { DutyState, DutyConfig } from './types';

// Production thresholds (from design memo)
// ON_DUTY: 60s / 50m - responder available but waiting
// ON_MISSION: 15s / 20m - active incident response

// For development/testing, use shorter intervals
const IS_DEV = __DEV__;

// Demo mode: Set to true for video demos (very frequent updates, even stationary)
// WARNING: Uses more battery! Set to false for normal development
const DEMO_MODE = true;

export const DUTY_CONFIGS: Record<DutyState, DutyConfig> = {
  OFF_DUTY: {
    intervalMs: null,
    distanceMeters: null,
    accuracy: 'balanced',
  },
  ON_DUTY: {
    // Demo: 5s / 1m - frequent updates even when stationary
    // Dev: 10s / 5m for testing
    // Prod: 60s / 50m for battery efficiency
    intervalMs: DEMO_MODE ? 5_000 : IS_DEV ? 10_000 : 60_000,
    distanceMeters: DEMO_MODE ? 1 : IS_DEV ? 5 : 50,
    accuracy: DEMO_MODE ? 'high' : 'balanced',
  },
  ON_MISSION: {
    // Demo: 3s / 1m - very frequent updates
    // Dev: 5s / 3m for testing
    // Prod: 15s / 20m for battery efficiency
    intervalMs: DEMO_MODE ? 3_000 : IS_DEV ? 5_000 : 15_000,
    distanceMeters: DEMO_MODE ? 1 : IS_DEV ? 3 : 20,
    accuracy: 'high',
  },
};

// Export for display in UI
export const TRACKING_MODE = DEMO_MODE ? 'DEMO' : IS_DEV ? 'DEV' : 'PROD';
