function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function parseSpeedTag(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const raw = String(rawValue).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();
  if (['none', 'signals', 'variable', 'implicit', 'unknown'].includes(normalized)) {
    return null;
  }

  if (normalized === 'walk') {
    return {
      raw,
      value: 5,
      unit: 'km/h',
      kph: 5
    };
  }

  const segments = raw.split(/[;|]/).map((segment) => segment.trim()).filter(Boolean);

  for (const segment of segments) {
    const match = segment.match(/(\d+(?:\.\d+)?)\s*(mph|km\/h|kmh|kph)?/i);
    if (!match) {
      continue;
    }

    const value = Number(match[1]);
    const unitToken = (match[2] ?? 'km/h').toLowerCase();
    const unit = unitToken === 'mph' ? 'mph' : 'km/h';
    const kph = unit === 'mph' ? value * 1.609344 : value;

    return {
      raw,
      value,
      unit,
      kph: round(kph)
    };
  }

  return null;
}

export function normalizeHeading(heading) {
  if (!Number.isFinite(heading)) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

export function angularDistance(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return null;
  }

  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

export function chooseDirectionalSpeed(row, heading) {
  const normalizedHeading = normalizeHeading(heading);
  const roadHeading = normalizeHeading(Number(row.road_heading_deg));
  const generic = parseSpeedTag(row.maxspeed);
  const forward = parseSpeedTag(row.maxspeed_forward);
  const backward = parseSpeedTag(row.maxspeed_backward);

  const forwardDelta = normalizedHeading === null || roadHeading === null
    ? null
    : angularDistance(normalizedHeading, roadHeading);
  const backwardDelta = normalizedHeading === null || roadHeading === null
    ? null
    : angularDistance(normalizedHeading, (roadHeading + 180) % 360);

  if (forwardDelta !== null && backwardDelta !== null) {
    if (forwardDelta <= backwardDelta && forward) {
      return {
        source: 'maxspeed:forward',
        direction: 'forward',
        headingDelta: forwardDelta,
        speed: forward
      };
    }

    if (backward) {
      return {
        source: 'maxspeed:backward',
        direction: 'backward',
        headingDelta: backwardDelta,
        speed: backward
      };
    }
  }

  if (generic) {
    return {
      source: 'maxspeed',
      direction: null,
      headingDelta: forwardDelta !== null && backwardDelta !== null ? Math.min(forwardDelta, backwardDelta) : null,
      speed: generic
    };
  }

  if (forward && !backward) {
    return {
      source: 'maxspeed:forward',
      direction: 'forward',
      headingDelta: forwardDelta,
      speed: forward
    };
  }

  if (backward && !forward) {
    return {
      source: 'maxspeed:backward',
      direction: 'backward',
      headingDelta: backwardDelta,
      speed: backward
    };
  }

  if (forward && backward && forward.kph === backward.kph) {
    return {
      source: 'maxspeed:forward',
      direction: 'forward',
      headingDelta: forwardDelta,
      speed: forward
    };
  }

  return {
    source: null,
    direction: null,
    headingDelta: forwardDelta !== null && backwardDelta !== null ? Math.min(forwardDelta, backwardDelta) : null,
    speed: null
  };
}

export function pickBestCandidate(rows, heading) {
  if (!rows.length) {
    return null;
  }

  const scored = rows.map((row) => {
    const speedSelection = chooseDirectionalSpeed(row, heading);
    const speedPenalty = speedSelection.speed ? 0 : 35;
    const headingPenalty = speedSelection.headingDelta === null ? 0 : speedSelection.headingDelta / 12;
    const score = Number(row.distance_m) + speedPenalty + headingPenalty;

    return {
      row,
      score,
      speedSelection
    };
  });

  scored.sort((left, right) => left.score - right.score);
  return scored[0];
}
