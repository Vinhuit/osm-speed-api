import test from 'node:test';
import assert from 'node:assert/strict';
import { pickDisplayName } from '../src/services/speed-limit-service.js';

test('pickDisplayName returns own name when available', () => {
  const row = {
    osm_id: '1',
    name: 'Vo Van Kiet',
    ref: null,
    highway: 'primary'
  };

  assert.equal(pickDisplayName(row, [row]), 'Vo Van Kiet');
});

test('pickDisplayName falls back to nearby named segment with same highway', () => {
  const row = {
    osm_id: '1',
    name: null,
    ref: null,
    highway: 'service'
  };

  const rows = [
    row,
    {
      osm_id: '2',
      name: 'Dong Khoi',
      ref: null,
      highway: 'service'
    }
  ];

  assert.equal(pickDisplayName(row, rows), 'Dong Khoi');
});

test('pickDisplayName falls back to ref when no named candidate exists', () => {
  const row = {
    osm_id: '1',
    name: null,
    ref: 'QL1A',
    highway: 'trunk'
  };

  assert.equal(pickDisplayName(row, [row]), 'QL1A');
});

test('pickDisplayName falls back to unnamed highway label', () => {
  const row = {
    osm_id: '1',
    name: null,
    ref: null,
    highway: 'service'
  };

  assert.equal(pickDisplayName(row, [row]), 'Unnamed service');
});
