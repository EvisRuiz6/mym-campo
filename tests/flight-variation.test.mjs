import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('const flightLitersPerHaByLabor = Object.freeze({');
const helperEnd = appSource.indexOf('\nfunction flightFields()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Flight calculation helpers must exist in app.js');
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) +
  '\n({ flightLitersPerHaByLabor, calculateFlightMetrics, formatFlightVariationPercent })'
);

test('uses the configured target dose for every flight labor', () => {
  const expectedRates = {
    Madurante: 14,
    Premadurante: 20,
    Descecante: 20,
    Bioestimulante: 14,
    'Agro K': 10,
    Kelatex: 10,
    Ensayo_20: 20,
    Ensayo_14: 14,
    Madurante_20: 20,
    Madurante_25: 25,
    Madurante_30: 30
  };
  assert.deepEqual(JSON.parse(JSON.stringify(helpers.flightLitersPerHaByLabor)), expectedRates);
  for (const [labor, targetRate] of Object.entries(expectedRates)) {
    const metrics = helpers.calculateFlightMetrics(labor, targetRate * 2, 2);
    assert.equal(metrics.targetLitersPerHa, targetRate, labor);
    assert.equal(metrics.variationPercent, 0, labor);
  }
});

test('calculates applied rate and variation against the selected labor', () => {
  const metrics = helpers.calculateFlightMetrics('Madurante', '154', '10');
  assert.equal(metrics.appliedLitersPerHa, 15.4);
  assert.ok(Math.abs(metrics.variationPercent - 10) < 1e-10);
  assert.equal(helpers.formatFlightVariationPercent(metrics.variationPercent), '+10.0%');

  const belowTarget = helpers.calculateFlightMetrics('Madurante', 126, 10);
  assert.ok(Math.abs(belowTarget.variationPercent + 10) < 1e-10);
  assert.equal(helpers.formatFlightVariationPercent(belowTarget.variationPercent), '-10.0%');

  const zeroLiters = helpers.calculateFlightMetrics('Madurante', 0, 10);
  assert.equal(zeroLiters.variationPercent, -100);
});

test('does not calculate variation for missing or invalid application values', () => {
  for (const [labor, liters, area] of [
    ['Madurante', '', 10],
    ['Madurante', 140, ''],
    ['Madurante', 140, 0],
    ['Madurante', -1, 10],
    ['Unknown labor', 140, 10]
  ]) {
    assert.equal(helpers.calculateFlightMetrics(labor, liters, area).variationPercent, null);
  }
  assert.equal(helpers.calculateFlightMetrics('Madurante', '', 10).targetLitersPerHa, 14);
  assert.equal(helpers.formatFlightVariationPercent(null), '—');
});
