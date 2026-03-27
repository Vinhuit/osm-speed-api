import { pool } from '../db.js';
import { pickBestCandidate } from '../lib/maxspeed.js';

const NEAREST_ROADS_SQL = `
  WITH input AS (
    SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
  ),
  ranked AS (
    SELECT
      s.osm_id,
      s.name,
      s.ref,
      s.highway,
      s.maxspeed,
      s.maxspeed_forward,
      s.maxspeed_backward,
      s.maxspeed_type,
      s.source_maxspeed,
      s.oneway,
      s.tags,
      ST_DistanceSphere(s.geom, input.geom) AS distance_m,
      degrees(
        ST_Azimuth(
          ST_LineInterpolatePoint(
            s.geom,
            GREATEST(ST_LineLocatePoint(s.geom, input.geom) - 0.0005, 0)
          ),
          ST_LineInterpolatePoint(
            s.geom,
            LEAST(ST_LineLocatePoint(s.geom, input.geom) + 0.0005, 1)
          )
        )
      ) AS road_heading_deg
    FROM public.speed_roads AS s
    CROSS JOIN input
    WHERE s.geom && ST_Expand(input.geom, $3 / 111320.0)
    ORDER BY s.geom <-> input.geom
    LIMIT 24
  )
  SELECT *
  FROM ranked
  WHERE distance_m <= $3
  ORDER BY distance_m
  LIMIT 12;
`;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function humanizeHighway(highway) {
  if (!hasText(highway)) {
    return 'road';
  }

  return highway.replace(/_/g, ' ');
}

export function pickDisplayName(row, rows) {
  if (hasText(row.name)) {
    return row.name.trim();
  }

  const fallbackByRefAndHighway = rows.find((candidate) =>
    candidate.osm_id !== row.osm_id &&
    hasText(candidate.name) &&
    candidate.ref === row.ref &&
    candidate.highway === row.highway
  );

  if (fallbackByRefAndHighway) {
    return fallbackByRefAndHighway.name.trim();
  }

  const fallbackByHighway = rows.find((candidate) =>
    candidate.osm_id !== row.osm_id &&
    hasText(candidate.name) &&
    candidate.highway === row.highway
  );

  if (fallbackByHighway) {
    return fallbackByHighway.name.trim();
  }

  if (hasText(row.ref)) {
    return row.ref.trim();
  }

  return `Unnamed ${humanizeHighway(row.highway)}`;
}

function normalizeResult(match, rows) {
  if (!match) {
    return null;
  }

  const row = match.row;
  const speedSelection = match.speedSelection;
  const displayName = pickDisplayName(row, rows);

  return {
    osmId: row.osm_id,
    name: row.name,
    displayName,
    ref: row.ref,
    highway: row.highway,
    distanceMeters: Number(row.distance_m.toFixed(1)),
    roadHeadingDegrees: row.road_heading_deg === null ? null : Number(Number(row.road_heading_deg).toFixed(1)),
    oneway: row.oneway,
    maxspeedType: row.maxspeed_type,
    sourceMaxspeed: row.source_maxspeed,
    speedLimit: speedSelection.speed === null ? null : {
      raw: speedSelection.speed.raw,
      value: speedSelection.speed.value,
      unit: speedSelection.speed.unit,
      kph: speedSelection.speed.kph,
      source: speedSelection.source,
      direction: speedSelection.direction
    },
    rawTags: row.tags
  };
}

export async function lookupSpeedLimit({ lat, lon, heading, radiusMeters }) {
  const result = await pool.query(NEAREST_ROADS_SQL, [lon, lat, radiusMeters]);
  const bestCandidate = pickBestCandidate(result.rows, heading);

  return {
    searchRadiusMeters: radiusMeters,
    candidateCount: result.rows.length,
    road: normalizeResult(bestCandidate, result.rows)
  };
}
