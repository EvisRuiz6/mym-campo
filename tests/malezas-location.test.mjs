import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const functionStart = appSource.indexOf('function captureWeedsLocation(root) {');
const functionEnd = appSource.indexOf('\nfunction renderUsers', functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, 'Malezas GPS capture must exist in app.js');
const captureSource = appSource.slice(functionStart, functionEnd) + '\n({ captureWeedsLocation })';

function createHarness(geolocation) {
  const input = { value: '', dataset: {}, isConnected: true };
  const status = { textContent: '' };
  const button = { disabled: false };
  const root = { querySelector: () => null };
  const elements = new Map([
    ['#form-fields', root],
    ['[name="UBICACIÓN"]', input],
    ['[data-weeds-location-status]', status],
    ['[data-weeds-retry-location]', button]
  ]);
  const { captureWeedsLocation } = runInNewContext(captureSource, {
    navigator: { geolocation },
    $: selector => elements.get(selector)
  });
  return { captureWeedsLocation, input, status, button };
}

test('fills editable Malezas coordinates from GPS', () => {
  const harness = createHarness({
    getCurrentPosition(success, failure, options) {
      assert.equal(options.enableHighAccuracy, true);
      success({ coords: { latitude: 14.12345678, longitude: -90.7654321, accuracy: 13.6 } });
    }
  });

  harness.captureWeedsLocation();
  assert.equal(harness.input.value, '14.123457, -90.765432');
  assert.equal(harness.input.dataset.gpsValue, harness.input.value);
  assert.match(harness.status.textContent, /precisión aproximada: 14 m/);
  assert.equal(harness.button.disabled, false);
});

test('does not overwrite coordinates entered while GPS is resolving', () => {
  let resolveLocation;
  const harness = createHarness({
    getCurrentPosition(success) { resolveLocation = success; }
  });

  harness.captureWeedsLocation();
  harness.input.value = '14.000000, -90.000000';
  resolveLocation({ coords: { latitude: 15, longitude: -91, accuracy: 8 } });

  assert.equal(harness.input.value, '14.000000, -90.000000');
  assert.match(harness.status.textContent, /se conservó la ubicación escrita manualmente/);
  assert.equal(harness.button.disabled, false);
});
