// Mock the entire database module BEFORE any imports
const mockDb = {
  execAsync: jest.fn(() => Promise.resolve()),
  runAsync: jest.fn(() => Promise.resolve()),
  getFirstAsync: jest.fn(() => Promise.resolve({ maxSeq: 0 })),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  closeAsync: jest.fn(),
};

jest.mock('@features/queue/database', () => ({
  getDatabase: jest.fn().mockResolvedValue(mockDb),
}));

// Now import modules
import { LocationData } from '@features/location/types';
import { enqueue, getStats, clear, initializeSequence, peek } from '@features/queue/locationQueue';
import { getDatabase } from '@features/queue/database';

describe('locationQueue', () => {
  const mockLocation: LocationData = {
    latitude: 37.785834,
    longitude: -122.406417,
    accuracy: 5.0,
    altitude: 10.5,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup the mock return value
    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    mockDb.getFirstAsync.mockResolvedValue({ maxSeq: 0 });
    mockDb.runAsync.mockResolvedValue(undefined);
    mockDb.getAllAsync.mockResolvedValue([]);
  });

  describe('initializeSequence', () => {
    it('queries database for max sequence', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ maxSeq: 42 });

      await initializeSequence();

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT MAX(sequence) as maxSeq FROM location_queue'
      );
    });

    it('handles empty database (null maxSeq)', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ maxSeq: null });

      await expect(initializeSequence()).resolves.not.toThrow();
    });
  });

  describe('enqueue', () => {
    beforeEach(async () => {
      mockDb.getFirstAsync.mockResolvedValue({ maxSeq: 0 });
      await initializeSequence();
    });

    it('does nothing for empty array', async () => {
      mockDb.runAsync.mockClear();

      await enqueue([]);

      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });

    it('inserts location into database', async () => {
      await enqueue([mockLocation]);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO location_queue'),
        expect.arrayContaining([
          mockLocation.latitude,
          mockLocation.longitude,
        ])
      );
    });

    it('enqueues multiple locations', async () => {
      mockDb.runAsync.mockClear();
      const locations = [mockLocation, { ...mockLocation, latitude: 38.0 }];

      await enqueue(locations);

      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats', () => {
    it('returns queue statistics', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        count: 5,
        oldest: 1706100000000,
        newest: 1706200000000,
      });

      const stats = await getStats();

      expect(stats).toEqual({
        count: 5,
        oldestTimestamp: 1706100000000,
        newestTimestamp: 1706200000000,
      });
    });

    it('handles empty queue', async () => {
      mockDb.getFirstAsync.mockResolvedValue({
        count: 0,
        oldest: null,
        newest: null,
      });

      const stats = await getStats();

      expect(stats).toEqual({
        count: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
      });
    });
  });

  describe('peek', () => {
    it('returns entries ordered by sequence', async () => {
      const mockEntries = [
        { id: 1, latitude: 37.7, longitude: -122.4, accuracy: 5, altitude: 10, timestamp: 1000, sequence: 1, created_at: 1000 },
        { id: 2, latitude: 37.8, longitude: -122.5, accuracy: 5, altitude: 10, timestamp: 2000, sequence: 2, created_at: 2000 },
      ];
      mockDb.getAllAsync.mockResolvedValue(mockEntries);

      const entries = await peek(5);

      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sequence ASC'),
        [5]
      );
    });
  });

  describe('clear', () => {
    it('deletes all entries from queue', async () => {
      await clear();

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM location_queue');
    });
  });
});
