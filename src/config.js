import 'dotenv/config';

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = Object.freeze({
  host: process.env.HOST ?? '0.0.0.0',
  port: toNumber(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://osm:osm@localhost:5432/osm',
  defaultSearchRadiusMeters: toNumber(process.env.DEFAULT_SEARCH_RADIUS_METERS, 60),
  maxSearchRadiusMeters: toNumber(process.env.MAX_SEARCH_RADIUS_METERS, 250)
});
