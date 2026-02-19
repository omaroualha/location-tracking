import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSessions, getStatistics, getRecent, getDeviceGaps } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const dashboardRouter = Router();

// SSE clients
const clients: Set<Response> = new Set();

// Broadcast to all SSE clients
export function broadcast(event: { type: string; data: unknown }) {
  const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
  clients.forEach((client) => {
    client.write(message);
  });
}

// SSE endpoint
dashboardRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`);

  clients.add(res);
  console.log(`[SSE] Client connected (total: ${clients.size})`);

  req.on('close', () => {
    clients.delete(res);
    console.log(`[SSE] Client disconnected (total: ${clients.size})`);
  });
});

// Main dashboard page
dashboardRouter.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// HTMX partials

// Stats partial
dashboardRouter.get('/partials/stats', (_req: Request, res: Response) => {
  const stats = getStatistics();
  const sessions = getSessions();
  const activeSessions = sessions.filter(
    (s) => Date.now() - s.last_seen_at < 5 * 60 * 1000
  ).length;

  res.send(`
    <div class="stat-card">
      <div class="stat-value">${stats.total_locations.toLocaleString()}</div>
      <div class="stat-label">Total Locations</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.total_devices}</div>
      <div class="stat-label">Devices</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${activeSessions}</div>
      <div class="stat-label">Active Now</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatDuration(Date.now() - (stats.earliest || Date.now()))}</div>
      <div class="stat-label">Data Span</div>
    </div>
  `);
});

// Sessions partial
dashboardRouter.get('/partials/sessions', (_req: Request, res: Response) => {
  const sessions = getSessions();

  if (sessions.length === 0) {
    res.send('<p class="empty">No sessions yet. Start tracking on your device.</p>');
    return;
  }

  const html = sessions
    .map((s) => {
      const isActive = Date.now() - s.last_seen_at < 5 * 60 * 1000;
      const duration = s.last_seen_at - s.started_at;
      const gaps = getDeviceGaps(s.device_id, s.expected_interval_ms * 2);

      return `
        <div class="session-card ${isActive ? 'active' : 'inactive'}">
          <div class="session-header">
            <span class="device-id">${s.device_id.slice(0, 12)}...</span>
            <span class="status-badge ${isActive ? 'active' : ''}">${isActive ? 'ACTIVE' : 'IDLE'}</span>
          </div>
          <div class="session-stats">
            <div><strong>${s.location_count.toLocaleString()}</strong> locations</div>
            <div><strong>${formatDuration(duration)}</strong> duration</div>
            <div>Last: <strong>${formatAge(s.last_seen_at)}</strong></div>
          </div>
          ${
            gaps.length > 0
              ? `<div class="gaps-warning">⚠️ ${gaps.length} gap(s) detected (>${s.expected_interval_ms * 2 / 1000}s)</div>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  res.send(html);
});

// Recent locations partial
dashboardRouter.get('/partials/recent', (_req: Request, res: Response) => {
  const locations = getRecent(20);

  if (locations.length === 0) {
    res.send('<p class="empty">No locations received yet.</p>');
    return;
  }

  const html = locations
    .map(
      (loc: any) => `
        <div class="location-row">
          <span class="time">${formatTime(loc.received_at)}</span>
          <span class="device">${loc.device_id.slice(0, 8)}</span>
          <span class="coords">${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}</span>
          <span class="accuracy">${loc.accuracy?.toFixed(1) || '?'}m</span>
        </div>
      `
    )
    .join('');

  res.send(html);
});

// Helper functions
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatAge(timestamp: number): string {
  const age = Date.now() - timestamp;
  if (age < 60000) return `${Math.floor(age / 1000)}s ago`;
  if (age < 3600000) return `${Math.floor(age / 60000)}m ago`;
  return `${Math.floor(age / 3600000)}h ago`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
