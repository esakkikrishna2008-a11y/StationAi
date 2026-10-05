import app from './app.js';
import { config } from './config/config.js';
import { ensureDbReady } from './database/seed.js';

// Initialize database & start listening
async function startServer() {
  try {
    await ensureDbReady();

    const PORT = process.env.PORT || config.port || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 StationAI Backend API server running on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📦 Ready for requests.`);
    });
  } catch (err) {
    console.error('Failed to start backend server:', err);
    process.exit(1);
  }
}

startServer();
