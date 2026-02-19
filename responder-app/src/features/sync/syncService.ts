import * as Network from "expo-network";
import { create } from "zustand";
import { peekAndDelete, getStats } from "@features/queue/locationQueue";
// import { sendLocationBatch } from './mockApi';
import { SyncState, SyncStatus } from "./types";
import { getErrorMessage } from "@/utils/errorHandler";
import { sendLocationBatch } from "./realApi";

const TAG = "SyncService";
const BATCH_SIZE = 50;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const SYNC_INTERVAL_MS = 5_000;
const DEVICE_ID = "device-" + Math.random().toString(36).substring(2, 10);

interface SyncStore extends SyncState {
  setStatus: (status: SyncStatus) => void;
  setLastError: (error: string | null) => void;
  setPendingCount: (count: number) => void;
  recordSuccess: () => void;
  recordFailure: (error: string) => void;
  resetBackoff: () => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: "idle",
  lastSyncAt: null,
  lastError: null,
  pendingCount: 0,
  consecutiveFailures: 0,

  setStatus: (status) => set({ status }),
  setLastError: (error) => set({ lastError: error }),
  setPendingCount: (count) => set({ pendingCount: count }),

  recordSuccess: () =>
    set({
      status: "idle",
      lastSyncAt: Date.now(),
      lastError: null,
      consecutiveFailures: 0,
    }),

  recordFailure: (error) =>
    set((state) => ({
      status: "error",
      lastError: error,
      consecutiveFailures: state.consecutiveFailures + 1,
    })),

  resetBackoff: () => set({ consecutiveFailures: 0 }),
}));

function calculateBackoff(failures: number): number {
  const backoff = BASE_BACKOFF_MS * Math.pow(2, failures);
  return Math.min(backoff, MAX_BACKOFF_MS);
}

let syncTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

async function syncOnce(): Promise<void> {
  const store = useSyncStore.getState();

  const online = await isOnline();
  if (!online) {
    store.setStatus("offline");
    return;
  }

  const stats = await getStats();
  store.setPendingCount(stats.count);

  if (stats.count === 0) {
    store.setStatus("idle");
    return;
  }

  store.setStatus("syncing");

  // Use transaction-safe peek and delete
  const result = await peekAndDelete(BATCH_SIZE, async (entries) => {
    const response = await sendLocationBatch({
      locations: entries,
      deviceId: DEVICE_ID,
      sentAt: Date.now(),
    });

    if (!response.success) {
      store.recordFailure(response.error ?? "Unknown error");
      return false;
    }

    return true;
  });

  if (result.success) {
    if (result.count > 0) {
      store.recordSuccess();
    } else {
      store.setStatus("idle");
    }

    const updatedStats = await getStats();
    store.setPendingCount(updatedStats.count);
  }
}

async function runSyncLoop(): Promise<void> {
  if (!isRunning) return;

  try {
    await syncOnce();
  } catch (error) {
    const message = getErrorMessage(error);
    console.error(`[${TAG}] Error:`, message);
    useSyncStore.getState().recordFailure(message);
  }

  if (!isRunning) return;

  const { consecutiveFailures, status } = useSyncStore.getState();

  let delay = SYNC_INTERVAL_MS;
  if (status === "error" && consecutiveFailures > 0) {
    delay = calculateBackoff(consecutiveFailures);
    console.log(
      `[${TAG}] Backing off for`,
      delay,
      "ms after",
      consecutiveFailures,
      "failures",
    );
  }

  syncTimeoutId = setTimeout(runSyncLoop, delay);
}

export function startSync(): void {
  if (isRunning) return;

  isRunning = true;
  console.log(`[${TAG}] Started`);
  runSyncLoop();
}

export function stopSync(): void {
  isRunning = false;

  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }

  useSyncStore.getState().setStatus("idle");
  console.log(`[${TAG}] Stopped`);
}

export function triggerImmediateSync(): void {
  if (!isRunning) return;

  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }

  useSyncStore.getState().resetBackoff();
  runSyncLoop();
}

let networkSubscription: { remove: () => void } | null = null;

export function subscribeToNetworkChanges(): () => void {
  networkSubscription = Network.addNetworkStateListener((state) => {
    const wasOffline = useSyncStore.getState().status === "offline";
    const isNowOnline =
      state.isConnected === true && state.isInternetReachable !== false;

    if (wasOffline && isNowOnline) {
      console.log(`[${TAG}] Network restored, triggering sync`);
      triggerImmediateSync();
    } else if (!isNowOnline) {
      useSyncStore.getState().setStatus("offline");
    }
  });

  return () => {
    if (networkSubscription) {
      networkSubscription.remove();
      networkSubscription = null;
    }
  };
}
