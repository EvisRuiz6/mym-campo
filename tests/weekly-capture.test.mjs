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
    '#weekly-capture-dialog': { closed: false, close() { this.closed = true; } },
    '#weekly-capture-fields': {}
  };
  const calls = [];
  const form = { reportValidity: () => true };
  const rows = [{ querySelector: () => ({ value: '2026-03-01' }) }, { querySelector: () => ({ value: '2026-03-02' }) }];
  const context = runInNewContext(saveSource, {
    $: (selector, root) => {
      if (selector === '[data-repeat-list="malezas_detalle"]') return {};
      if (controls[selector]) return controls[selector];
      return root && root.querySelector ? root.querySelector(selector) : undefined;
    },
    $$: () => rows,
    navigator: { onLine: true },
    state: { configured: true },
    serializeForm: async () => ({
      ID: 'record-1',
      subregistros: { malezas_detalle: [{ LOTE: '0000017' }, { LOTE: '0000018' }] }
    }),
    cloudRequest: async (path, options) => { calls.push({ path, options }); return request(); },
    loadLotFollowup: async () => {},
    syncCloudRecords: async () => {},
    flushWeeklyCaptureDraft: async () => {},
    deleteWeeklyVisitDraft: async () => {},
    toast: () => {},
    handleLotFollowupError: () => {},
    setLotFollowupStatus: () => {}
  });
  context.setCapture({
    visits: [
      { lotCode: '0000017', visitNumber: 1, cycleDate: '2026-01-01', scheduledDate: '2026-03-01' },
      { lotCode: '0000018', visitNumber: 2, cycleDate: '2026-01-01', scheduledDate: '2026-03-02' }
    ],
    recordIds: ['record-1', 'record-2'], draftId: 'draft', assignedDate: '2026-03-01',
    farm: 'Finca A', time: { horaRegistro: '08:30' }, busy: false
  });
  return { ...context, controls, calls, form };
}

test('saves every visit in the group together and disables a duplicate submission', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  const event = { preventDefault() {}, currentTarget: h.form };
  const first = h.saveWeeklyCapture(event);
  await new Promise(done => setImmediate(done));
  await h.saveWeeklyCapture(event);
  try {
    assert.equal(h.calls.length, 1);
    assert.equal(h.controls['#weekly-capture-submit'].disabled, true);
    assert.equal(h.calls[0].path, 'rpc/save_lot_visit_captures');
    const body = h.calls[0].options.body;
    assert.equal(body.p_captures.length, 2);
    assert.equal(body.p_captures[0].record_id, 'record-1');
    assert.equal(body.p_captures[0].lot_code, '0000017');
    assert.equal(body.p_captures[0].visit_number, 1);
    assert.equal(body.p_captures[0].cycle_date, '2026-01-01');
    assert.equal(body.p_captures[1].record_id, 'record-2');
    assert.equal(body.p_captures[1].lot_code, '0000018');
    assert.equal(body.p_captures[1].visit_number, 2);
    assert.equal(body.p_captures[1].datos.ID, 'record-2');
  } finally {
    resolve();
    await first;
  }
  assert.equal(h.controls['#weekly-capture-dialog'].closed, true);
});

test('keeps the group form and record identities after a failed save', async () => {
  const h = harness(() => { throw new Error('Sin conexión'); });
  const event = { preventDefault() {}, currentTarget: h.form };
  await assert.rejects(h.saveWeeklyCapture(event), /Sin conexión/);
  assert.deepEqual(Array.from(h.getCapture().recordIds), ['record-1', 'record-2']);
  assert.equal(h.controls['#weekly-capture-dialog'].closed, false);
  assert.equal(h.controls['#weekly-capture-submit'].disabled, false);
  await assert.rejects(h.saveWeeklyCapture(event), /Sin conexión/);
  assert.deepEqual(Array.from(h.calls[1].options.body.p_captures.map(item => item.record_id)), ['record-1', 'record-2']);
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

test('stores the combined form, image data, and every record identity in the local draft', async () => {
  const start = source.indexOf('function persistWeeklyCaptureDraft() {');
  const end = source.indexOf('\nasync function flushWeeklyCaptureDraft', start);
  assert.ok(start >= 0 && end > start);
  let savedDraft;
  const capture = {
    draftId: 'draft-id',
    farm: 'Finca A',
    assignedDate: '2026-03-01',
    visits: [{ lotCode: '0000017', visitNumber: 1 }, { lotCode: '0000018', visitNumber: 2 }],
    recordIds: ['record-1', 'record-2'],
    data: {},
    time: { horaRegistro: '08:30' },
    persistPromise: Promise.resolve(),
    busy: false
  };
  const status = { textContent: '' };
  const { persistWeeklyCaptureDraft } = runInNewContext(source.slice(start, end) + '\n({ persistWeeklyCaptureDraft })', {
    weeklyCapture: capture,
    state: { user: { id: 'user-id' } },
    $: selector => selector === '#weekly-capture-draft-status' ? status : {},
    serializeForm: async () => ({
      subregistros: { malezas_detalle: [{ IMAGEN: [{ name: 'lote1.png' }] }, { IMAGEN: [{ name: 'lote2.png' }] }] }
    }),
    putWeeklyVisitDraft: async draft => { savedDraft = draft; }
  });
  await persistWeeklyCaptureDraft();
  assert.equal(savedDraft.id, 'draft-id');
  assert.equal(savedDraft.userId, 'user-id');
  assert.deepEqual(Array.from(savedDraft.visits, visit => visit.recordId), ['record-1', 'record-2']);
  assert.equal(savedDraft.data.subregistros.malezas_detalle[1].IMAGEN[0].name, 'lote2.png');
  assert.match(status.textContent, /Borrador guardado/);
});

test('renders a single group capture action and keeps each original visit in the group', () => {
  const start = source.indexOf('function lotWeeklyVisitGroupCard(group) {');
  const end = source.indexOf('\nfunction lotWeeklyProgramWindow', start);
  assert.ok(start >= 0 && end > start);
  const { lotWeeklyVisitGroupCard } = runInNewContext(source.slice(start, end) + '\n({ lotWeeklyVisitGroupCard })', {
    esc: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'),
    formatDate: value => value,
    lotWeeklyProgramDayName: () => 'jueves'
  });
  const html = lotWeeklyVisitGroupCard({
    farm: 'Finca A',
    assignedDate: '2026-03-05',
    visits: [
      { lotCode: '0000017', visitNumber: 1, cycleDate: '2026-01-01', scheduledDate: '2026-03-01', responsible: 'Ana', status: 'Pendiente', statusKey: 'pending' },
      { lotCode: '0000018', visitNumber: 2, cycleDate: '2026-01-02', scheduledDate: '2026-03-02', responsible: 'Ana', status: 'Vencida', statusKey: 'overdue' }
    ]
  });
  assert.equal((html.match(/data-weekly-capture-group=/g) || []).length, 1);
  assert.equal((html.match(/<tr>/g) || []).length, 3);
  assert.match(html, /Capturar visitas del día \(2\)/);
  assert.match(html, /2026-03-01/);
  assert.match(html, /2026-03-02/);
});

test('isolates saved drafts for different filtered subsets of the same farm and day', () => {
  const start = source.indexOf('function weeklyVisitIdentity(visit) {');
  const end = source.indexOf('\nfunction queueWeeklyCaptureDraft', start);
  assert.ok(start >= 0 && end > start);
  const { weeklyVisitDraftId } = runInNewContext(source.slice(start, end) + '\n({ weeklyVisitDraftId })', {
    state: { user: { id: 'user-id' } },
    normalizeLotWeeklyFarm: value => String(value).trim().toLowerCase()
  });
  const first = { lotCode: '0000017', cycleDate: '2026-01-01', visitNumber: 1, scheduledDate: '2026-03-01' };
  const second = { lotCode: '0000018', cycleDate: '2026-01-02', visitNumber: 2, scheduledDate: '2026-03-02' };
  assert.equal(weeklyVisitDraftId('Finca A', '2026-03-05', [first, second]),
    weeklyVisitDraftId('finca a', '2026-03-05', [second, first]));
  assert.notEqual(weeklyVisitDraftId('Finca A', '2026-03-05', [first]),
    weeklyVisitDraftId('Finca A', '2026-03-05', [second]));
});
