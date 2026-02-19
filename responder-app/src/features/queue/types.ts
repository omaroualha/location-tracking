export interface LocationEntry {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
  sequence: number;
  createdAt: number;
}

export interface QueueStats {
  count: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}
