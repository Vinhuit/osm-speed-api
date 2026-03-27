import { createApp } from './app.js';
import { closePool } from './db.js';
import { config } from './config.js';

const app = createApp();
const server = app.listen(config.port, config.host, () => {
  console.log(`speed api listening on http://${config.host}:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
