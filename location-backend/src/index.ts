import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  if (req.method !== 'GET' || !req.url.includes('/partials')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Routes
app.use('/api', apiRouter);
app.use('/', dashboardRouter);

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Location Tracking Backend                                ║
║                                                            ║
║   Dashboard:  http://localhost:${PORT}                       ║
║   API:        http://localhost:${PORT}/api/locations          ║
║                                                            ║
║   To connect from mobile device, use your local IP:        ║
║   Run: ipconfig getifaddr en0 (macOS)                      ║
║        ip addr show wlan0 (Linux)                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
