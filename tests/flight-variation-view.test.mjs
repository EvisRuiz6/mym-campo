import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function extract(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Missing ${start}`);
  return source.slice(first, last);
}
const helperCode = extract('function flightNumber(value)', '\nfunction flightFields()');
const helpers = runInNewContext(helperCode +
  '\n({ flightReportData, flightVariationScopedRecords, flightRecordBelongsToUser, flightReportFilterOptions, formatFlightReportNumber, flightReportDate, flightReportValue, flightNumber })');
const merge = runInNewContext(
  extract('function mergeFlightVariationRecords(', '\nfunction resetFlightVariation()') + '\nmergeFlightVariationRecords',
  { flightVariationScopedRecords: helpers.flightVariationScopedRecords, flightRecordBelongsToUser: helpers.flightRecordBelongsToUser }
);
const owner = { id: 'one', username: 'uno', role: 'aereo', status: 'active' };
const admin = { id: 'admin', username: 'admin', role: 'admin', status: 'active' };
function flight(id, ownerId, data = {}, extra = {}) {
  return { id, ownerId, ownerUsername: ownerId === 'one' ? 'uno' : 'dos', tipo: 'vuelos', syncStatus: 'synced', datos: data, ...extra };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('aggregates selected dates, labor and user, preserving the flights behind each bar', () => {
  const records = [
    flight('a', 'one', { fecha: '2026-03-01', labor: 'Madurante', dron: 'T50-1', area_ha: '2.5' }),
    flight('b', 'one', { fecha: '2026-03-31', labor: 'Madurante', dron: 'T50-1', area_ha: '3' }),
    flight('c', 'two', { fecha: '2026-03-20', labor: 'Madurante', dron: 'T50-1', area_ha: '20' }),
    flight('d', 'one', { fecha: '2026-04-01', labor: 'Madurante', dron: 'T50-1', area_ha: '30' }),
    flight('e', 'one', { fecha: '2026-03-15', labor: 'Otra', dron: 'T50-1', area_ha: '40' }),
    flight('f', 'one', { fecha: '2026-03-15', labor: 'Madurante', dron: 'Otro', area_ha: 'invalid' })
  ];
  const report = helpers.flightReportData(records, { from: '2026-03-01', to: '2026-03-31', labor: 'Madurante', owner: 'id:one' });
  assert.equal(report.totals.hectares, 5.5);
  assert.equal(report.totals.flights, 3);
  assert.equal(report.totals.invalidAreaRecords, 1);
  assert.deepEqual(plain(report.rows.find(row => row.drone === 'T50-1').records.map(row => row.id)), ['a', 'b']);
  assert.equal(report.rows.find(row => row.drone === 'Otro').hectares, 0);
  assert.ok(report.rows.some(row => row.drone === 'T100-4' && row.hectares === 0));
  assert.equal(helpers.flightReportData(records, { from: '2026-04-01', to: '2026-03-01' }).invalidDateRange, true);
});

test('limits local and server records to the owner for every non-admin role', () => {
  const records = [
    flight('mine', 'one'), flight('other', 'two'),
    flight('spoof', 'two', {}, { ownerUsername: 'uno' }),
    flight('legacy', null, {}, { ownerUsername: 'uno', syncStatus: 'pending' }),
    flight('deleted', 'one', {}, { syncStatus: 'delete-pending' })
  ];
  for (const role of ['aereo', 'terrestre', 'supervisor']) {
    assert.deepEqual(plain(helpers.flightVariationScopedRecords(records, { ...owner, role }).map(row => row.id)), ['mine', 'legacy']);
  }
  assert.equal(helpers.flightVariationScopedRecords(records, { ...admin, status: 'suspended' }).length, 0);
  assert.equal(helpers.flightVariationScopedRecords(records, admin).length, 4);
});

test('merges remote flights and local pending changes without duplicates or other owners', () => {
  const remote = [flight('a', 'one', { area_ha: '2' }), flight('b', 'two', { area_ha: '20' })];
  const local = [
    flight('a', 'one', { area_ha: '4' }, { syncStatus: 'pending' }),
    flight('local', null, { area_ha: '3' }, { ownerUsername: 'uno', syncStatus: 'pending' }),
    flight('b', 'two', { area_ha: '99' }, { syncStatus: 'pending' }),
    flight('deleted', 'one', {}, { syncStatus: 'delete-pending' })
  ];
  const mine = merge(remote, local, owner, false);
  assert.deepEqual(plain(mine.map(row => row.id)), ['a', 'local']);
  assert.equal(mine[0].datos.area_ha, '4');
  assert.equal(mine[1].ownerId, 'one');
  assert.deepEqual(plain(merge(remote, local, owner, true).map(row => row.id)), ['a', 'local']);
  assert.deepEqual(plain(merge(remote, local, admin, false).map(row => row.id)), ['a', 'b', 'local']);
});

test('requests own flights on the server and rejects a different owner even if returned', async () => {
  const controls = { '#flight-variation-refresh': {}, '#flight-variation-status': {} };
  const state = { user: owner, configured: true, flightVariationLoadSeq: 0 };
  const paths = [];
  let rendered = 0;
  const load = runInNewContext(
    extract('async function loadFlightVariation()', '\nfunction recordDetailLabel(') + '\nloadFlightVariation',
    {
      state, $: selector => controls[selector], navigator: { onLine: true },
      getRecords: async () => [], recordHasLotAccess: () => true,
      cloudRequest: async path => { paths.push(path); return [flight('mine', 'one'), flight('other', 'two')]; },
      mapCloudRecord: row => row, mergeFlightVariationRecords: merge,
      updateFlightVariationOptions() {}, renderFlightVariation() { rendered++; }, console
    }
  );
  await load();
  assert.match(paths[0], /owner_id=eq\.one/);
  assert.deepEqual(plain(state.flightVariationRecords.map(row => row.id)), ['mine']);
  assert.equal(rendered, 1);
  assert.equal(controls['#flight-variation-refresh'].disabled, false);
});

test('reports server failure instead of presenting stale totals as current', async () => {
  const controls = Object.fromEntries([
    '#flight-variation-refresh', '#flight-variation-status', '#flight-variation-total',
    '#flight-variation-count', '#flight-variation-chart', '#flight-variation-details'
  ].map(id => [id, {}]));
  const state = { user: owner, configured: true, flightVariationLoadSeq: 0, flightVariationRecords: [flight('old', 'one')] };
  const load = runInNewContext(
    extract('async function loadFlightVariation()', '\nfunction recordDetailLabel(') + '\nloadFlightVariation',
    {
      state, $: selector => controls[selector], navigator: { onLine: true },
      getRecords: async () => [], recordHasLotAccess: () => true,
      cloudRequest: async () => { throw new Error('red'); }, mapCloudRecord: row => row,
      mergeFlightVariationRecords: merge, updateFlightVariationOptions() {}, renderFlightVariation() {},
      console: { error() {} }
    }
  );
  await load();
  assert.equal(state.flightVariationRecords.length, 0);
  assert.equal(controls['#flight-variation-total'].textContent, '—');
  assert.match(controls['#flight-variation-status'].textContent, /No se pudieron cargar.*Actualizar datos/);
  assert.equal(controls['#flight-variation-refresh'].disabled, false);
});

test('discards an in-flight response when the active session changes', async () => {
  const controls = { '#flight-variation-refresh': {}, '#flight-variation-status': {} };
  const state = { user: admin, configured: true, flightVariationLoadSeq: 0, flightVariationRecords: [] };
  let release;
  const response = new Promise(resolve => { release = resolve; });
  let rendered = 0;
  const load = runInNewContext(
    extract('async function loadFlightVariation()', '\nfunction recordDetailLabel(') + '\nloadFlightVariation',
    {
      state, $: selector => controls[selector], navigator: { onLine: true },
      getRecords: async () => [], recordHasLotAccess: () => true,
      cloudRequest: async () => response, mapCloudRecord: row => row, mergeFlightVariationRecords: merge,
      updateFlightVariationOptions() {}, renderFlightVariation() { rendered++; }, console
    }
  );
  const loading = load();
  await new Promise(resolve => setImmediate(resolve));
  state.user = owner;
  state.flightVariationLoadSeq++;
  release([flight('other', 'two')]);
  await loading;
  assert.equal(state.flightVariationRecords.length, 0);
  assert.equal(rendered, 0);
});

test('does not display another user flight in the regular local record lists', () => {
  const visible = runInNewContext(
    extract('function visibleLocalRecords(records)', "\n$('#flight-variation-filters')") + '\nvisibleLocalRecords',
    { state: { user: { ...owner, role: 'supervisor' } }, recordHasLotAccess: () => true,
      isActiveAdmin: () => false, flightRecordBelongsToUser: helpers.flightRecordBelongsToUser }
  );
  const rows = [flight('own', 'one'), flight('other', 'two'), { id: 'other-malezas', tipo: 'malezas', syncStatus: 'synced' }];
  assert.deepEqual(plain(visible(rows).map(row => row.id)), ['own', 'other-malezas']);
});
