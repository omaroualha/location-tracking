import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  insertLocationBatch,
  getRecent,
  getDeviceLocations,
  getSessions,
  getStatistics,
  getDeviceGaps,
  clearAllData,
  LocationBatchRequest,
} from '../db.js';
import { broadcast } from './dashboard.js';

export const apiRouter = Router();

// POST /api/locations - Receive location batch from mobile app
apiRouter.post('/locations', (req: Request, res: Response) => {
  try {
    const payload = req.body as LocationBatchRequest;

    // Validate payload
    if (!payload.locations || !Array.isArray(payload.locations)) {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid locations array',
      });
      return;
    }

    if (!payload.deviceId) {
      res.status(400).json({
        success: false,
        error: 'Missing deviceId',
      });
      return;
    }

    const batchId = uuidv4();
    const count = insertLocationBatch(payload, batchId);

    console.log(
      `[API] Received ${count} locations from ${payload.deviceId} (batch: ${batchId.slice(0, 8)})`
    );

    // Broadcast to SSE clients
    broadcast({
      type: 'locations',
      data: {
        deviceId: payload.deviceId,
        count,
        batchId,
        timestamp: Date.now(),
        locations: payload.locations.slice(0, 5), // Send first 5 for preview
      },
    });

    res.json({
      success: true,
      processedCount: count,
      serverTimestamp: Date.now(),
    });
  } catch (error) {
    console.error('[API] Error processing locations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// GET /api/locations - Get recent locations
apiRouter.get('/locations', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const deviceId = req.query.deviceId as string;

  try {
    const locations = deviceId
      ? getDeviceLocations(deviceId, limit)
      : getRecent(limit);

    res.json({ locations });
  } catch (error) {
    console.error('[API] Error fetching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions - Get all sessions
apiRouter.get('/sessions', (_req: Request, res: Response) => {
  try {
    const sessions = getSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('[API] Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats - Get statistics
apiRouter.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = getStatistics();
    const sessions = getSessions();
    res.json({
      ...stats,
      active_sessions: sessions.filter(
        (s) => Date.now() - s.last_seen_at < 5 * 60 * 1000 // Active in last 5 min
      ).length,
    });
  } catch (error) {
    console.error('[API] Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/gaps/:deviceId - Get gaps for a device
apiRouter.get('/gaps/:deviceId', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const threshold = parseInt(req.query.threshold as string) || 30000;

  try {
    const gaps = getDeviceGaps(deviceId, threshold);
    res.json({ gaps });
  } catch (error) {
    console.error('[API] Error fetching gaps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/export - Export all data as JSON
apiRouter.get('/export', (_req: Request, res: Response) => {
  try {
    const locations = getRecent(10000);
    const sessions = getSessions();
    const stats = getStatistics();

    res.setHeader('Content-Disposition', 'attachment; filename=location-data.json');
    res.json({
      exportedAt: new Date().toISOString(),
      stats,
      sessions,
      locations,
    });
  } catch (error) {
    console.error('[API] Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/data - Clear all data
apiRouter.delete('/data', (_req: Request, res: Response) => {
  try {
    clearAllData();
    console.log('[API] All data cleared');
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error clearing data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
