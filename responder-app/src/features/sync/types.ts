export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastError: string | null;
  pendingCount: number;
  consecutiveFailures: number;
}

// Re-export API types for convenience
export type {
  LocationBatchRequest,
  LocationBatchResponse,
  LocationApiClient,
  ApiErrorCode,
  ApiError,
} from './api';
