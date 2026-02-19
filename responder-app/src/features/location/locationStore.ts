import { create } from 'zustand';
import { LocationData } from './types';

type TrackingMode = 'none' | 'foreground' | 'background';

interface LocationStore {
  lastLocation: LocationData | null;
  lastUpdateAt: number | null;
  totalReceived: number;
  isTracking: boolean;
  trackingMode: TrackingMode;

  recordLocation: (location: LocationData) => void;
  recordLocations: (locations: LocationData[]) => void;
  setTracking: (isTracking: boolean, mode: TrackingMode) => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  lastLocation: null,
  lastUpdateAt: null,
  totalReceived: 0,
  isTracking: false,
  trackingMode: 'none',

  recordLocation: (location) =>
    set((state) => ({
      lastLocation: location,
      lastUpdateAt: Date.now(),
      totalReceived: state.totalReceived + 1,
    })),

  recordLocations: (locations) =>
    set((state) => ({
      lastLocation: locations[locations.length - 1] ?? state.lastLocation,
      lastUpdateAt: Date.now(),
      totalReceived: state.totalReceived + locations.length,
    })),

  setTracking: (isTracking, mode) =>
    set({ isTracking, trackingMode: mode }),
}));
