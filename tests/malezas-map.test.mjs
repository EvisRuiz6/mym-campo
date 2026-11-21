import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function normalizeVisitMapLotCode(value) {');
const helperEnd = appSource.indexOf('\nfunction visitMapRings(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Visit-map statistics helpers must exist in app.js');
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) +
  '\n({ visitMapControlPercent, malezasCoveragePercent, formatVisitMapControlPercent, visitMapControlClass, visitStatsByLot })'
);

test('parses valid control percentages and rejects out-of-range values', () => {
  assert.equal(helpers.visitMapControlPercent('72.5%'), 72.5);
  assert.equal(helpers.visitMapControlPercent('25,5'), 25.5);
  assert.equal(helpers.visitMapControlPercent('0'), 0);
  assert.equal(helpers.visitMapControlPercent(''), null);
  assert.equal(helpers.visitMapControlPercent('101'), null);
  assert.equal(helpers.visitMapControlPercent('-1'), null);
  assert.equal(helpers.formatVisitMapControlPercent(72.5), '72.5%');
});

test('calculates weed coverage as 100 minus control', () => {
  assert.equal(helpers.malezasCoveragePercent(0), 100);
  assert.equal(helpers.malezasCoveragePercent('72.5'), 27.5);
  assert.equal(helpers.malezasCoveragePercent('25,25'), 74.75);
  assert.equal(helpers.malezasCoveragePercent(100), 0);
  assert.equal(helpers.malezasCoveragePercent(''), null);
  assert.equal(helpers.malezasCoveragePercent(101), null);
});

test('uses the latest per-lot sample to display control and color', () => {
  const records = [
    {
      tipo: 'malezas',
      ownerName: 'Ana',
      datos: {
        FECHA: '2026-03-15',
        subregistros: {
          malezas_detalle: [
            { LOTE: '17', FECHA: '2026-03-01', '% CONTROL': '35' },
            { LOTE: '17', FECHA: '2026-03-15', '% CONTROL': '72.5' },
            { LOTE: '18', FECHA: '2026-03-15', '% CONTROL': '' }
          ]
        }
      }
    },
    {
      tipo: 'malezas',
      ownerName: 'Bruno',
      datos: {
        subregistros: {
          malezas_detalle: [{ LOTE: '0000017', FECHA: '2026-03-20', '% CONTROL': '0' }]
        }
      }
    },
    { tipo: 'clima', datos: {} }
  ];

  const stats = helpers.visitStatsByLot(records);
  const sampled = stats.get('0000017');
  const missing = stats.get('0000018');
  assert.equal(sampled.visits, 2);
  assert.equal(sampled.latestDate, '2026-03-20');
  assert.equal(sampled.latestControlPercent, 0);
  assert.equal([...sampled.owners].sort().join(', '), 'Ana, Bruno');
  assert.equal(helpers.visitMapControlClass(sampled).trim(), 'is-visited control-low');
  assert.equal(helpers.formatVisitMapControlPercent(sampled.latestControlPercent), '0%');
  assert.equal(missing.latestControlPercent, null);
  assert.equal(helpers.visitMapControlClass(missing).trim(), 'is-visited control-missing');
});

test('maps each control range to its expected color category', () => {
  const ranges = [
    [24.99, 'control-low'],
    [25, 'control-medium-low'],
    [50, 'control-medium-high'],
    [75, 'control-high'],
    [100, 'control-high']
  ];
  for (const [percent, expected] of ranges) {
    assert.match(helpers.visitMapControlClass({ latestControlPercent: percent }), new RegExp(expected));
  }
});

test('identifies visits awaiting synchronization or conflict review in map totals', () => {
  const stats = helpers.visitStatsByLot([
    { tipo: 'malezas', syncStatus: 'synced', datos: { LOTE: '17', FECHA: '2026-03-01' } },
    { tipo: 'malezas', syncStatus: 'pending', pendingConflict: true, datos: { LOTE: '17', FECHA: '2026-03-02' } }
  ]).get('0000017');
  assert.equal(stats.visits, 2);
  assert.equal(stats.pendingVisits, 1);
  assert.equal(stats.conflictVisits, 1);
});
