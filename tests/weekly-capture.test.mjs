import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function saveWeeklyCapture(event) {');
const end = source.indexOf('\nfunction showWeeklyCaptureError', start);
assert.ok(start >= 0 && end > start);
const saveSource = 'let weeklyCapture;\n' + source.slice(start, end) +
  '\n({ saveWeeklyCapture, setCapture: value => { weeklyCapture = value; }, getCapture: () => weeklyCapture })';

function harness(request) {
  const controls = {
    '#weekly-capture-submit': { disabled: false },
    '#weekly-capture-close': { disabled: false },
    '#weekly-capture-cancel': { disabled: false },
    '#weekly-capture-dialog': { closed: false, close() { this.closed = true; } }
  };
  const calls = [];
  const form = { reportValidity: () => true };
  const context = runInNewContext(saveSource, {
    $: selector => controls[selector],
    navigator: { onLine: true },
    state: { configured: true },
    serializeForm: async () => ({ subregistros: { malezas_detalle: [{ LOTE: '0000017' }] } }),
    cloudRequest: async (path, options) => { calls.push({ path, options }); return request(); },
    loadLotFollowup: async () => {},
    syncCloudRecords: async () => {},
    toast: () => {},
    handleLotFollowupError: () => {},
    setLotFollowupStatus: () => {}
  });
  context.setCapture({
    lotCode: '0000017', number: 3, cycleDate: '2026-01-01', scheduledDate: '2026-03-01',
    recordId: 'record-id', finca: 'Finca A', time: { horaRegistro: '08:30' }, busy: false
  });
  return { ...context, controls, calls, form };
}

test('saves the chosen visit once and disables duplicate submission while awaiting the server', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  const event = { preventDefault() {}, currentTarget: h.form };
  const first = h.saveWeeklyCapture(event);
  await Promise.resolve();
  await h.saveWeeklyCapture(event);
  assert.equal(h.calls.length, 1);
  assert.equal(h.controls['#weekly-capture-submit'].disabled, true);
  const body = h.calls[0].options.body;
  assert.equal(body.p_record_id, 'record-id');
  assert.equal(body.p_lot_code, '0000017');
  assert.equal(body.p_visit_number, 3);
  assert.equal(body.p_cycle_date, '2026-01-01');
  assert.equal(body.p_datos.FINCA, 'Finca A');
  resolve();
  await first;
  assert.equal(h.controls['#weekly-capture-dialog'].closed, true);
});

test('keeps the form and the same record identity after a failed save', async () => {
  const h = harness(() => { throw new Error('Sin conexión'); });
  const event = { preventDefault() {}, currentTarget: h.form };
  await assert.rejects(h.saveWeeklyCapture(event), /Sin conexión/);
  assert.equal(h.getCapture().recordId, 'record-id');
  assert.equal(h.controls['#weekly-capture-dialog'].closed, false);
  assert.equal(h.controls['#weekly-capture-submit'].disabled, false);
  await assert.rejects(h.saveWeeklyCapture(event), /Sin conexión/);
  assert.equal(h.calls[1].options.body.p_record_id, 'record-id');
});

test('loads visit numbers together with their records for the weekly schedule', async () => {
  const loadStart = source.indexOf('async function fetchAllLotFollowupVisits() {');
  const loadEnd = source.indexOf('\nlet weeklyCapture = null;', loadStart);
  assert.ok(loadStart >= 0 && loadEnd > loadStart);
  const state = { configured: true, user: { id: 'user' }, lotFollowupLoadPromise: null };
  const visits = [{ record_id: 'r1', lot_code: '0000017', visit_date: '2026-03-01', cycle_date: '2026-01-01', visit_number: 3 }];
  const { loadLotFollowup } = runInNewContext(source.slice(loadStart, loadEnd) + '\n({ loadLotFollowup })', {
    state, navigator: { onLine: true }, canAccessLotFollowup: () => true,
    setLotFollowupStatus: () => {}, loadLotLookup: async () => {},
    fetchAllLotFollowupPlans: async () => [{ lot_code: '0000017' }],
    cloudRequest: async path => {
      assert.match(path, /^rpc\/get_lot_followup_visits_with_links\?/);
      return visits;
    },
    renderLotFollowupLotOptions: () => {}, renderLotFollowup: () => {}
  });
  await loadLotFollowup();
  assert.equal(state.lotFollowupVisits[0].visit_number, 3);
  assert.equal(state.lotFollowupVisits[0].cycle_date, '2026-01-01');
});

test('serializes the weekly Malezas form independently and retains detail identity on retry', async () => {
  const serializeStart = source.indexOf('async function serializeForm(form, recordId, previousData, moduleKey) {');
  const serializeEnd = source.indexOf('\nfunction setFormValue', serializeStart);
  assert.ok(serializeStart >= 0 && serializeEnd > serializeStart);
  const form = {};
  const list = { dataset: { repeatList: 'malezas_detalle' } };
  const row = { dataset: {} };
  const fields = [
    { dataset: { childField: 'FECHA' }, value: '2026-03-01' },
    { dataset: { childField: 'LOTE' }, value: '0000017' },
    { dataset: { childField: 'LABOR' }, value: 'Soca' },
    { dataset: { childField: '% CONTROL' }, value: '20' },
    { dataset: { childField: 'IMAGEN' }, type: 'file', multiple: true, files: [{ name: 'foto.png', type: 'image/png', size: 2 }] }
  ];
  let ids = 0;
  const { serializeForm } = runInNewContext(source.slice(serializeStart, serializeEnd) + '\n({ serializeForm })', {
    state: { currentModule: 'clima' },
    crypto: { randomUUID: () => 'detail-' + (++ids) },
    File: undefined,
    FileReader: class {
      readAsDataURL() { this.result = 'data:image/png;base64,AA=='; this.onload(); }
    },
    FormData: class {
      entries() { return [['FECHA', '2026-03-01']][Symbol.iterator](); }
    },
    $$: (selector, root) => {
      if (selector === '[data-repeat-list]' && root === form) return [list];
      if (selector === '.child-row' && root === list) return [row];
      if (selector === '[data-child-field]' && root === row) return fields;
      return [];
    },
    updateWeedsCatorcena: () => {},
    malezasCoveragePercent: value => 100 - Number(value)
  });
  const first = await serializeForm(form, 'capture-id', null, 'malezas');
  const retry = await serializeForm(form, 'capture-id', null, 'malezas');
  const detail = first.subregistros.malezas_detalle[0];
  assert.equal(first.ID, 'capture-id');
  assert.equal(detail.ID, retry.subregistros.malezas_detalle[0].ID);
  assert.equal(detail.ID_NEW, 'capture-id');
  assert.equal(detail['% COBERTURA'], '80');
  assert.equal(detail.IMAGEN[0].name, 'foto.png');
  assert.equal(ids, 1);
});
