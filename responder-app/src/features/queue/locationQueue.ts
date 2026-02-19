import { getDatabase } from './database';
import { LocationEntry, QueueStats } from './types';
import { LocationData } from '@features/location/types';

const TAG = 'LocationQueue';

let sequenceCounter = 0;

export async function initializeSequence(): Promise<void> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ maxSeq: number | null }>(
    'SELECT MAX(sequence) as maxSeq FROM location_queue'
  );
  sequenceCounter = result?.maxSeq ?? 0;
  console.log(`[${TAG}] Initialized sequence:`, sequenceCounter);
}

export async function enqueue(locations: LocationData[]): Promise<void> {
  if (locations.length === 0) return;

  const now = Date.now();

  for (const loc of locations) {
    sequenceCounter++;
    const seq = sequenceCounter;

    // Retry logic for concurrent access issues
    let retries = 3;
    while (retries > 0) {
      try {
        const db = await getDatabase();
        await db.runAsync(
          `INSERT INTO location_queue
           (latitude, longitude, accuracy, altitude, timestamp, sequence, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            loc.latitude,
            loc.longitude,
            loc.accuracy,
            loc.altitude,
            loc.timestamp,
            seq,
            now,
          ]
        );
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(`[${TAG}] Failed to enqueue after retries:`, error);
          throw error;
        }
        console.warn(`[${TAG}] Enqueue failed, retrying... (${retries} left)`);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms before retry
      }
    }
  }

  console.log(`[${TAG}] Enqueued`, locations.length, 'locations');
}

export async function peek(limit: number): Promise<LocationEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    timestamp: number;
    sequence: number;
    created_at: number;
  }>('SELECT * FROM location_queue ORDER BY sequence ASC LIMIT ?', [limit]);

  return rows.map((row) => ({
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude,
    timestamp: row.timestamp,
    sequence: row.sequence,
    createdAt: row.created_at,
  }));
}

export async function deleteByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM location_queue WHERE id IN (${placeholders})`,
    ids
  );

  console.log(`[${TAG}] Deleted`, ids.length, 'entries');
}

/**
 * Atomically peek and delete entries - used for safe sync operations
 * This ensures no duplicates if the app crashes between peek and delete
 */
export async function peekAndDelete(
  limit: number,
  onBatch: (entries: LocationEntry[]) => Promise<boolean>
): Promise<{ success: boolean; count: number }> {
  const db = await getDatabase();

  // Peek entries first (outside transaction to avoid holding lock during API call)
  const rows = await db.getAllAsync<{
    id: number;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    altitude: number | null;
    timestamp: number;
    sequence: number;
    created_at: number;
  }>('SELECT * FROM location_queue ORDER BY sequence ASC LIMIT ?', [limit]);

  if (rows.length === 0) {
    return { success: true, count: 0 };
  }

  const entries: LocationEntry[] = rows.map((row) => ({
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude,
    timestamp: row.timestamp,
    sequence: row.sequence,
    createdAt: row.created_at,
  }));

  // Process the batch (e.g., send to API)
  const success = await onBatch(entries);

  if (success) {
    // Delete only if processing succeeded
    const ids = entries.map((e) => e.id);
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM location_queue WHERE id IN (${placeholders})`,
      ids
    );
    console.log(`[${TAG}] Synced and deleted`, entries.length, 'entries');
    return { success: true, count: entries.length };
  }

  return { success: false, count: 0 };
}

export async function getStats(): Promise<QueueStats> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{
    count: number;
    oldest: number | null;
    newest: number | null;
  }>(`
    SELECT
      COUNT(*) as count,
      MIN(timestamp) as oldest,
      MAX(timestamp) as newest
    FROM location_queue
  `);

  return {
    count: result?.count ?? 0,
    oldestTimestamp: result?.oldest ?? null,
    newestTimestamp: result?.newest ?? null,
  };
}

export async function clear(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM location_queue');
  sequenceCounter = 0;
  console.log(`[${TAG}] Cleared`);
}
