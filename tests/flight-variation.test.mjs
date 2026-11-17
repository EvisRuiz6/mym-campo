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
  '\n({ flightLitersPerHaByLabor, calculateFlightMetrics, formatFlightVariationPercent, FLIGHT_REPORT_DRONES })'
);
const readoutStart = appSource.indexOf('function updateFlightMetricsReadouts() {');
const readoutEnd = appSource.indexOf('\nconst FLIGHT_REPORT_DRONES', readoutStart);
assert.ok(readoutStart >= 0 && readoutEnd > readoutStart, 'Flight form readouts must be updateable');
const readoutSource = appSource.slice(readoutStart, readoutEnd);
const flightFieldsStart = appSource.indexOf('function flightFields() {');
const flightFieldsEnd = appSource.indexOf('\nfunction qualityFields()', flightFieldsStart);
assert.ok(flightFieldsStart >= 0 && flightFieldsEnd > flightFieldsStart, 'Flight fields must be renderable');
const flightFieldsSource = appSource.slice(flightFieldsStart, flightFieldsEnd);

test('uses the configured application volume for every flight labor', () => {
  const expectedVolumes = {
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
  assert.deepEqual(JSON.parse(JSON.stringify(helpers.flightLitersPerHaByLabor)), expectedVolumes);
  for (const [labor, applicationVolume] of Object.entries(expectedVolumes)) {
    const metrics = helpers.calculateFlightMetrics(labor, applicationVolume * 2, 2);
    assert.equal(metrics.applicationVolumeLitersPerHa, applicationVolume, labor);
    assert.equal(metrics.variationPercent, 0, labor);
  }
});

test('calculates real volume and variation against the selected labor', () => {
  const metrics = helpers.calculateFlightMetrics('Madurante', '154', '10');
  assert.equal(metrics.appliedLitersPerHa, 15.4);
  assert.ok(Math.abs(metrics.variationPercent - 10) < 1e-10);
  assert.equal(helpers.formatFlightVariationPercent(metrics.variationPercent), '+10.0%');

  const belowTarget = helpers.calculateFlightMetrics('Madurante', 126, 10);
  assert.ok(Math.abs(belowTarget.variationPercent + 10) < 1e-10);
  assert.equal(helpers.formatFlightVariationPercent(belowTarget.variationPercent), '-10.0%');

  const zeroLiters = helpers.calculateFlightMetrics('Madurante', 0, 10);
  assert.equal(zeroLiters.variationPercent, -100);

  const screenshotExample = helpers.calculateFlightMetrics('Madurante', 68, 4.5);
  assert.equal(screenshotExample.applicationVolumeLitersPerHa, 14);
  assert.ok(Math.abs(screenshotExample.appliedLitersPerHa - (68 / 4.5)) < 1e-10);
  assert.ok(Math.abs(screenshotExample.variationPercent - (((68 / 14) / 4.5 - 1) * 100)) < 1e-10);
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
  assert.equal(helpers.calculateFlightMetrics('Madurante', '', 10).applicationVolumeLitersPerHa, 14);
  assert.equal(helpers.formatFlightVariationPercent(null), '—');
});

test('updates the displayed application volume, real volume, and variation', () => {
  const runReadouts = (labor, liters, area) => {
    const inputs = {
      labor: { value: labor },
      litros: { value: liters },
      area_ha: { value: area }
    };
    const outputs = {
      '#application-volume-output': { textContent: '' },
      '#real-volume-output': { textContent: '' },
      '#variation-output': { textContent: '' }
    };
    const getElement = selector => {
      if (selector === '#form-fields') return {};
      const nameMatch = selector.match(/^\[name="([^"]+)"\]$/);
      if (nameMatch) return inputs[nameMatch[1]];
      return outputs[selector];
    };
    runInNewContext(readoutSource + '\nupdateFlightMetricsReadouts();', {
      $: getElement,
      calculateFlightMetrics: helpers.calculateFlightMetrics,
      formatFlightVariationPercent: helpers.formatFlightVariationPercent
    });
    return outputs;
  };

  const complete = runReadouts('Madurante', '68', '4.5');
  assert.equal(complete['#application-volume-output'].textContent, '14 L/ha');
  assert.equal(complete['#real-volume-output'].textContent, '15.11 L/ha');
  assert.equal(complete['#variation-output'].textContent, '+7.9%');

  const incomplete = runReadouts('Madurante', '68', '0');
  assert.equal(incomplete['#real-volume-output'].textContent, '— L/ha');
  assert.equal(incomplete['#variation-output'].textContent, '—');
});

test('provides the requested drones in a dropdown and preserves legacy values while editing', () => {
  const getDroneOptions = editingRecord => {
    const fields = [];
    runInNewContext(flightFieldsSource + '\nflightFields();', {
      state: { editingRecord },
      flightLitersPerHaByLabor: helpers.flightLitersPerHaByLabor,
      FLIGHT_REPORT_DRONES: helpers.FLIGHT_REPORT_DRONES,
      commonFields: () => '',
      fieldMarkup: field => { fields.push(field); return ''; }
    });
    return fields.find(field => field.name === 'dron');
  };
  const requestedDrones = [
    'T40-1',
    'T50-1', 'T50-2', 'T50-3', 'T50-4',
    'T100-1', 'T100-2', 'T100-3', 'T100-4'
  ];
  const droneField = getDroneOptions(null);
  assert.equal(droneField.type, 'select');
  assert.deepEqual(JSON.parse(JSON.stringify(droneField.options)), requestedDrones);

  const legacyField = getDroneOptions({ tipo: 'vuelos', datos: { dron: 't50' } });
  assert.equal(legacyField.options[0].value, 't50');
  assert.equal(legacyField.options[0].label, 't50 (guardado en esta captura)');
});
