import app from './app.js';
import { config } from './config/config.js';
import { ensureDbReady } from './database/seed.js';

// Initialize database & start listening for local development
async function startServer() {
  try {
    await ensureDbReady();

    app.listen(config.port, () => {
      console.log(`🚀 StationAI Backend API server running on port ${config.port}`);
      console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
      console.log(`📦 Ready for requests.`);
    });
  } catch (err) {
    console.error('Failed to start backend server:', err);
    process.exit(1);
  }
}

startServer();
