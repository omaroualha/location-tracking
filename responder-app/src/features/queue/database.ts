import * as SQLite from 'expo-sqlite';
import { safeJsonParse } from '@/utils/errorHandler';

const DB_NAME = 'responder.db';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If already initialized and valid, return it
  if (db) {
    return db;
  }

  // If initialization is in progress, wait for it
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Start initialization
  isInitializing = true;
  initPromise = initializeDatabase();

  try {
    db = await initPromise;
    return db;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  console.log('[Database] Opening database...');
  const database = await SQLite.openDatabaseAsync(DB_NAME);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS location_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      altitude REAL,
      timestamp INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_location_queue_sequence
    ON location_queue(sequence);

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  console.log('[Database] Initialized');
  return database;
}

/**
 * Execute a function within a database transaction
 * Provides ACID guarantees for multi-step operations
 */
export async function withTransaction(
  fn: (db: SQLite.SQLiteDatabase) => Promise<void>
): Promise<void> {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await fn(database);
  });
}

/**
 * Generic key-value persistence for app state
 */
export async function saveState(key: string, value: unknown): Promise<void> {
  const database = await getDatabase();
  const json = JSON.stringify(value);
  await database.runAsync(
    `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, ?)`,
    [key, json, Date.now()]
  );
}

export async function loadState<T>(key: string): Promise<T | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_state WHERE key = ?`,
    [key]
  );

  if (!result) return null;

  return safeJsonParse<T | null>(result.value, null);
}

export async function clearState(key: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM app_state WHERE key = ?`, [key]);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
