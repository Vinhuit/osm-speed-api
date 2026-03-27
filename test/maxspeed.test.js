import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseDirectionalSpeed, parseSpeedTag, pickBestCandidate } from '../src/lib/maxspeed.js';

test('parseSpeedTag handles km/h values', () => {
  assert.deepEqual(parseSpeedTag('50'), {
    raw: '50',
    value: 50,
    unit: 'km/h',
    kph: 50
  });
});

test('parseSpeedTag converts mph to kph', () => {
  assert.deepEqual(parseSpeedTag('30 mph'), {
    raw: '30 mph',
    value: 30,
    unit: 'mph',
    kph: 48.3
  });
});

test('chooseDirectionalSpeed uses heading when directional tags exist', () => {
  const chosen = chooseDirectionalSpeed({
    maxspeed: null,
    maxspeed_forward: '80',
    maxspeed_backward: '50',
    road_heading_deg: 92
  }, 270);

  assert.equal(chosen.source, 'maxspeed:backward');
  assert.equal(chosen.speed.kph, 50);
});

test('pickBestCandidate prefers explicit speed limit over slightly closer empty road', () => {
  const match = pickBestCandidate([
    {
      distance_m: 4,
      maxspeed: null,
      maxspeed_forward: null,
      maxspeed_backward: null,
      road_heading_deg: null
    },
    {
      distance_m: 10,
      maxspeed: '60',
      maxspeed_forward: null,
      maxspeed_backward: null,
      road_heading_deg: null
    }
  ], null);

  assert.equal(match.row.distance_m, 10);
  assert.equal(match.speedSelection.speed.kph, 60);
});
