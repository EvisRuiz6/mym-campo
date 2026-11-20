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
const flightHelpers = extract('function flightNumber(value)', '\nfunction flightFields()');
const climateHelpers = extract('const CLIMATE_VARIABLES', '\nfunction resetClimateChart()');
const helpers = runInNewContext(flightHelpers + '\n' + climateHelpers +
  '\n({ climateScopedRecords, climateReadings, climateTimestamp, climateVariables, flightRecordBelongsToUser })',
  { recordDetailLabel: key => key });
const merge = runInNewContext(extract('function mergeScopedReportRecords(', '\nfunction resetFlightVariation()') +
  '\nmergeScopedReportRecords', { flightRecordBelongsToUser: helpers.flightRecordBelongsToUser });
const user = { id: 'one', username: 'uno', role: 'aereo', status: 'active' };
const admin = { id: 'admin', username: 'admin', role: 'admin', status: 'active' };
const record = (id, ownerId, datos, extra = {}) => ({
  id, ownerId, ownerUsername: ownerId === 'one' ? 'uno' : 'dos', tipo: 'clima', syncStatus: 'synced', datos, ...extra
});
const plain = value => JSON.parse(JSON.stringify(value));

test('preserves and orders each reading, including equal timestamps and missing values', () => {
  const records = [
    record('b', 'one', { fecha: '2026-03-02', finca: 'F', zona: '1', lecturas: [{ hora: '08:00', temperatura: '0' }, { hora: '08:00', temperatura: '22' }, { hora: '', temperatura: '21' }] }),
    record('a', 'one', { fecha: '2026-03-01', finca: 'F', zona: '1', lecturas: [{ hora: '16:00', temperatura: '' }] }),
    record('c', 'one', { fecha: '', lecturas: [{ hora: '08:00', temperatura: '15' }] })
  ];
  const result = helpers.climateReadings(records, {});
  assert.deepEqual(plain(result.rows.map(row => row.key)), ['a:0', 'b:0', 'b:1', 'b:2', 'c:0']);
  assert.equal(result.rows[1].timestamp, result.rows[2].timestamp);
  assert.equal(result.rows[3].timestamp, null);
  assert.equal(result.rows[4].timestamp, null);
  assert.equal(helpers.climateTimestamp('2026-02-30', '12:00'), null);
  assert.equal(helpers.climateTimestamp('2026-03-01', '24:00'), null);
});

test('filters by inclusive dates, farm, zone and owner, and reports missing records', () => {
  const records = [
    record('a', 'one', { fecha: '2026-03-01', finca: 'Finca A', zona: '1', lecturas: [{ hora: '08:00' }] }),
    record('b', 'two', { fecha: '2026-03-31', finca: 'Finca A', zona: '1', lecturas: [{ hora: '08:00' }] }),
    record('c', 'one', { fecha: '2026-03-15', finca: 'Finca B', zona: '2', lecturas: [{ hora: '08:00' }] }),
    record('d', 'one', { finca: 'Finca A', zona: '1', lecturas: [{ hora: '08:00' }] }),
    record('e', 'one', { fecha: '2026-03-10', finca: 'Finca A', zona: '1', lecturas: [] })
  ];
  const result = helpers.climateReadings(records, { from: '2026-03-01', to: '2026-03-31', finca: 'finca a', zona: '1', owner: 'id:one' });
  assert.deepEqual(plain(result.rows.map(row => row.key)), ['a:0']);
  assert.equal(result.missingDateExcluded, 1);
  assert.equal(result.missingReadings, 1);
  assert.equal(helpers.climateReadings(records, { from: '2026-04-01', to: '2026-03-01' }).invalidDateRange, true);
});

test('scopes climate records and merges pending changes without exposing another owner', () => {
  const rows = [
    record('a', 'one', { lecturas: [] }),
    record('b', 'two', { lecturas: [] }, { ownerUsername: 'uno' }),
    record('c', null, { lecturas: [] }, { ownerUsername: 'uno', syncStatus: 'pending' }),
    record('d', 'one', { lecturas: [] }, { syncStatus: 'delete-pending' })
  ];
  for (const role of ['aereo', 'terrestre', 'supervisor']) {
    assert.deepEqual(plain(helpers.climateScopedRecords(rows, { ...user, role }).map(row => row.id)), ['a', 'c']);
  }
  assert.equal(helpers.climateScopedRecords(rows, { ...admin, status: 'suspended' }).length, 0);
  assert.equal(helpers.climateScopedRecords(rows, admin).length, 3);
  assert.deepEqual(plain(merge(rows, rows, user, false, 'clima').map(row => row.id)), ['a', 'c']);
});

test('hides other climate records from the ordinary lists and exports', () => {
  for (const role of ['aereo', 'terrestre', 'supervisor']) {
    const visible = runInNewContext(
      extract('function visibleLocalRecords(records)', "\n$('#climate-chart-filters')") + '\nvisibleLocalRecords',
      { state: { user: { ...user, role } }, recordHasLotAccess: () => true,
        isActiveAdmin: () => false, flightRecordBelongsToUser: helpers.flightRecordBelongsToUser }
    );
    const rows = [record('own', 'one', {}), record('other', 'two', {}, { ownerUsername: 'uno' })];
    assert.deepEqual(plain(visible(rows).map(row => row.id)), ['own']);
  }
});

test('discovers additional numeric variables without treating time or direction as numeric', () => {
  const variables = helpers.climateVariables([record('a', 'one', { lecturas: [{ hora: '08:00', direccion: '2', presion: '1000', texto: 'x' }] })]);
  assert.ok(variables.has('temperatura'));
  assert.ok(variables.has('presion'));
  assert.equal(variables.has('direccion'), false);
  assert.equal(variables.has('texto'), false);
});

test('loads only the owner from the server and rejects another owner returned by it', async () => {
  const controls = { '#climate-chart-refresh': {}, '#climate-chart-status': {} };
  const state = { user, configured: true, climateLoadSeq: 0 };
  const paths = [];
  const load = runInNewContext(extract('async function loadClimateChart()', '\nfunction mergeScopedReportRecords(') + '\nloadClimateChart', {
    state, $: selector => controls[selector], navigator: { onLine: true }, getRecords: async () => [],
    recordHasLotAccess: () => true, cloudRequest: async path => {
      paths.push(path);
      return [record('a', 'one', {}), record('b', 'two', {})];
    }, mapCloudRecord: row => row, mergeScopedReportRecords: merge,
    updateClimateOptions() {}, renderClimateChart() {}, console
  });
  await load();
  assert.match(paths[0], /tipo=eq\.clima&owner_id=eq\.one/);
  assert.deepEqual(plain(state.climateRecords.map(row => row.id)), ['a']);
  assert.equal(controls['#climate-chart-refresh'].disabled, false);
});

test('clears stale climate results and provides retry guidance on server failure', async () => {
  const controls = Object.fromEntries(['refresh', 'status', 'count', 'plot', 'details', 'list'].map(key => ['#climate-chart-' + key, {}]));
  const state = { user, configured: true, climateLoadSeq: 0, climateRecords: [record('old', 'one', {})] };
  const load = runInNewContext(extract('async function loadClimateChart()', '\nfunction mergeScopedReportRecords(') + '\nloadClimateChart', {
    state, $: selector => controls[selector], navigator: { onLine: true }, getRecords: async () => [],
    recordHasLotAccess: () => true, cloudRequest: async () => { throw new Error('red'); }, mapCloudRecord: row => row,
    mergeScopedReportRecords: merge, updateClimateOptions() {}, renderClimateChart() {}, console: { error() {} }
  });
  await load();
  assert.equal(state.climateRecords.length, 0);
  assert.match(controls['#climate-chart-status'].textContent, /No se pudieron cargar.*Actualizar datos/);
  assert.equal(controls['#climate-chart-refresh'].disabled, false);
});

test('ignores a response after the session changes', async () => {
  const controls = { '#climate-chart-refresh': {}, '#climate-chart-status': {} };
  const state = { user: admin, configured: true, climateLoadSeq: 0, climateRecords: [] };
  let release;
  const response = new Promise(resolve => { release = resolve; });
  let rendered = 0;
  const load = runInNewContext(extract('async function loadClimateChart()', '\nfunction mergeScopedReportRecords(') + '\nloadClimateChart', {
    state, $: selector => controls[selector], navigator: { onLine: true }, getRecords: async () => [],
    recordHasLotAccess: () => true, cloudRequest: async () => response, mapCloudRecord: row => row,
    mergeScopedReportRecords: merge, updateClimateOptions() {}, renderClimateChart() { rendered++; }, console
  });
  const pending = load();
  await new Promise(resolve => setImmediate(resolve));
  state.user = user;
  state.climateLoadSeq++;
  release([record('b', 'two', {})]);
  await pending;
  assert.equal(state.climateRecords.length, 0);
  assert.equal(rendered, 0);
});
