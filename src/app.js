import express from 'express';
import { config } from './config.js';
import { lookupSpeedLimit } from './services/speed-limit-service.js';

function readInput(req) {
  const source = req.method === 'GET' ? req.query : req.body ?? {};
  const lat = Number(source.lat);
  const lon = Number(source.lon);
  const heading = source.heading === undefined ? null : Number(source.heading);
  const radiusMeters = source.radiusMeters === undefined
    ? config.defaultSearchRadiusMeters
    : Number(source.radiusMeters);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: 'lat must be a number between -90 and 90' };
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { error: 'lon must be a number between -180 and 180' };
  }

  if (heading !== null && (!Number.isFinite(heading) || heading < 0 || heading >= 360)) {
    return { error: 'heading must be a number from 0 to 359.999' };
  }

  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0 || radiusMeters > config.maxSearchRadiusMeters) {
    return { error: `radiusMeters must be between 0 and ${config.maxSearchRadiusMeters}` };
  }

  return {
    value: {
      lat,
      lon,
      heading,
      radiusMeters
    }
  };
}

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    res.json({ ok: true });
  });

  async function handleLookup(req, res, next) {
    const parsed = readInput(req);

    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    try {
      const result = await lookupSpeedLimit(parsed.value);
      return res.json({
        input: parsed.value,
        found: result.road !== null,
        candidateCount: result.candidateCount,
        road: result.road
      });
    } catch (error) {
      return next(error);
    }
  }

  app.get('/api/speed-limit', handleLookup);
  app.post('/api/speed-limit', handleLookup);

  app.use((error, _req, res, _next) => {
    if (error.code === '42P01') {
      return res.status(503).json({
        error: 'speed_roads table was not found. Import the Geofabrik PBF first.'
      });
    }

    console.error(error);
    return res.status(500).json({
      error: 'internal_server_error'
    });
  });

  return app;
}
