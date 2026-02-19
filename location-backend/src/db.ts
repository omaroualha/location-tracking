import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'locations.db');

export const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    altitude REAL,
    captured_at INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    batch_id TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_device_time ON locations(device_id, captured_at DESC);
  CREATE INDEX IF NOT EXISTS idx_received ON locations(received_at DESC);
  CREATE INDEX IF NOT EXISTS idx_batch ON locations(batch_id);

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL UNIQUE,
    started_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    location_count INTEGER DEFAULT 0,
    expected_interval_ms INTEGER DEFAULT 10000
  );
`);

// Prepared statements for performance
const insertLocation = db.prepare(`
  INSERT INTO locations (device_id, latitude, longitude, accuracy, altitude, captured_at, sequence, received_at, batch_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const upsertSession = db.prepare(`
  INSERT INTO sessions (device_id, started_at, last_seen_at, location_count, expected_interval_ms)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(device_id) DO UPDATE SET
    last_seen_at = excluded.last_seen_at,
    location_count = sessions.location_count + excluded.location_count
`);

const getRecentLocations = db.prepare(`
  SELECT * FROM locations ORDER BY received_at DESC LIMIT ?
`);

const getLocationsByDevice = db.prepare(`
  SELECT * FROM locations WHERE device_id = ? ORDER BY captured_at DESC LIMIT ?
`);

const getAllSessions = db.prepare(`
  SELECT * FROM sessions ORDER BY last_seen_at DESC
`);

const getStats = db.prepare(`
  SELECT
    COUNT(*) as total_locations,
    COUNT(DISTINCT device_id) as total_devices,
    MIN(captured_at) as earliest,
    MAX(captured_at) as latest
  FROM locations
`);

const getGaps = db.prepare(`
  WITH ordered AS (
    SELECT
      device_id,
      captured_at,
      LAG(captured_at) OVER (PARTITION BY device_id ORDER BY captured_at) as prev_captured_at
    FROM locations
    WHERE device_id = ?
  )
  SELECT
    device_id,
    prev_captured_at as gap_start,
    captured_at as gap_end,
    (captured_at - prev_captured_at) as gap_ms
  FROM ordered
  WHERE prev_captured_at IS NOT NULL
    AND (captured_at - prev_captured_at) > ?
  ORDER BY gap_ms DESC
  LIMIT 20
`);

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

export interface LocationBatchRequest {
  locations: LocationEntry[];
  deviceId: string;
  sentAt: number;
}

export interface Session {
  id: number;
  device_id: string;
  started_at: number;
  last_seen_at: number;
  location_count: number;
  expected_interval_ms: number;
}

export interface Gap {
  device_id: string;
  gap_start: number;
  gap_end: number;
  gap_ms: number;
}

export function insertLocationBatch(
  batch: LocationBatchRequest,
  batchId: string
): number {
  const now = Date.now();
  const insertMany = db.transaction((locations: LocationEntry[]) => {
    for (const loc of locations) {
      insertLocation.run(
        batch.deviceId,
        loc.latitude,
        loc.longitude,
        loc.accuracy,
        loc.altitude,
        loc.timestamp,
        loc.sequence,
        now,
        batchId
      );
    }
  });

  insertMany(batch.locations);

  // Update session
  const firstTimestamp = batch.locations[0]?.timestamp ?? now;
  upsertSession.run(
    batch.deviceId,
    firstTimestamp,
    now,
    batch.locations.length,
    10000 // Default expected interval
  );

  return batch.locations.length;
}

export function getRecent(limit: number = 50): LocationEntry[] {
  return getRecentLocations.all(limit) as LocationEntry[];
}

export function getDeviceLocations(deviceId: string, limit: number = 100): LocationEntry[] {
  return getLocationsByDevice.all(deviceId, limit) as LocationEntry[];
}

export function getSessions(): Session[] {
  return getAllSessions.all() as Session[];
}

export function getStatistics() {
  return getStats.get() as {
    total_locations: number;
    total_devices: number;
    earliest: number | null;
    latest: number | null;
  };
}

export function getDeviceGaps(deviceId: string, thresholdMs: number = 30000): Gap[] {
  return getGaps.all(deviceId, thresholdMs) as Gap[];
}

export function clearAllData(): void {
  db.exec('DELETE FROM locations');
  db.exec('DELETE FROM sessions');
}
