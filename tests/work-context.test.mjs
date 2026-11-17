import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function localTime(date) {');
const helperEnd = appSource.indexOf('\nfunction esc(value)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Work-context helpers must exist in app.js');
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) +
  '\n({ captureTimestamp, workContextDraftKey, buildWorkContextDraftData, workContextDraftHasContent, createWorkContextDraft, clearFlightEntryFields })'
);

test('serializes Clima readings separately and excludes file inputs from local drafts', () => {
  const data = helpers.buildWorkContextDraftData('clima', [
    { name: 'fecha', value: '2026-11-17', type: 'date' },
    { name: 'lote', value: '0100101', type: 'text' },
    { name: 'hora', value: '08:44', type: 'time', inWeatherRow: true },
    { name: 'foto', value: 'no conservar', type: 'file' }
  ], [
    [
      { name: 'hora', value: '08:44', type: 'time' },
      { name: 'temperatura', value: '21.5', type: 'number' },
      { name: 'humedad', value: '63', type: 'number' }
    ],
    [
      { name: 'hora', value: '09:15', type: 'time' },
      { name: 'temperatura', value: '22', type: 'number' }
    ]
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(data)), {
    fecha: '2026-11-17',
    lote: '0100101',
    lecturas: [
      { hora: '08:44', temperatura: '21.5', humedad: '63' },
      { hora: '09:15', temperatura: '22' }
    ]
  });
});

test('keys saved contexts by user and module and validates their ownership', () => {
  assert.equal(
    helpers.workContextDraftKey('vuelos', 'user/one'),
    'mym-campo-work-context-v1:user%2Fone:vuelos'
  );
  const draft = helpers.createWorkContextDraft('vuelos', 'user-one', { contexto_vuelos_id: 'context-1' }, '2026-11-17T20:00:00.000Z');
  assert.equal(draft.ownerId, 'user-one');
  assert.equal(draft.moduleKey, 'vuelos');
  assert.equal(helpers.createWorkContextDraft('malezas', 'user-one', {}), null);
  assert.equal(helpers.createWorkContextDraft('clima', '', {}), null);
});

test('saves a flight context locally and restores it only for its owner', () => {
  const root = {};
  const status = { textContent: '', classList: { toggle() {} } };
  const fields = [
    { name: 'fecha', value: '2026-11-17', type: 'date' },
    { name: 'responsable', value: 'Operador', type: 'text' },
    { name: 'contexto_vuelos_id', value: 'context-1', type: 'hidden' },
    { name: 'labor', value: 'Madurante', type: 'select' }
  ];
  const stored = new Map();
  const result = runInNewContext(
    appSource.slice(helperStart, helperEnd) +
    `
      const saved = saveWorkContextDraft('vuelos', true);
      const ownDraft = readWorkContextDraft('vuelos');
      state.user = { id: 'user-two' };
      const otherDraft = readWorkContextDraft('vuelos');
      ({ saved, ownDraft, otherDraft });
    `,
    {
      state: { user: { id: 'user-one' }, currentModule: 'vuelos', editingRecord: null },
      localStorage: {
        getItem(key) { return stored.has(key) ? stored.get(key) : null; },
        setItem(key, value) { stored.set(key, value); },
        removeItem(key) { stored.delete(key); }
      },
      $: selector => selector === '#form-fields'
        ? root
        : selector === '[data-work-context-status="vuelos"]' ? status : null,
      $$: (selector, context) => selector === '[name]' && context === root ? fields : [],
      toast() {},
      console
    }
  );

  assert.equal(result.saved, true);
  assert.equal(result.ownDraft.ownerId, 'user-one');
  assert.equal(result.ownDraft.data.contexto_vuelos_id, 'context-1');
  assert.equal(result.otherDraft, null);
});

test('restores saved Clima fields and recreates each partial reading row', () => {
  const formFields = {};
  const assignments = [];
  const weatherRows = {
    innerHTML: '',
    rows: [],
    insertAdjacentHTML(position, markup) { this.rows.push(markup); },
    get lastElementChild() { return this.rows[this.rows.length - 1]; }
  };
  const draft = {
    moduleKey: 'clima',
    data: {
      fecha: '2026-11-17',
      lote: '0100101',
      lecturas: [
        { hora: '08:44', temperatura: '21.5' },
        { hora: '09:15', temperatura: '22' }
      ]
    }
  };
  const restored = runInNewContext(
    appSource.slice(helperStart, helperEnd) +
    '\nrestoreWorkContextDraft("clima", draft);',
    {
      draft,
      $: selector => selector === '#form-fields' ? formFields : weatherRows,
      setNamedFields(root, values) { assignments.push({ root, values }); },
      rowMarkup: (kind, index) => kind + '-' + index
    }
  );

  assert.equal(restored, true);
  assert.deepEqual(JSON.parse(JSON.stringify(assignments[0].values)), {
    fecha: '2026-11-17',
    lote: '0100101'
  });
  assert.equal(assignments[0].root, formFields);
  assert.deepEqual(JSON.parse(JSON.stringify(weatherRows.rows)), ['weather-0', 'weather-1']);
  assert.deepEqual(JSON.parse(JSON.stringify(assignments.slice(1).map(item => item.values))), [
    { hora: '08:44', temperatura: '21.5' },
    { hora: '09:15', temperatura: '22' }
  ]);
});

test('treats a shared flight context as saved and records different hours for each save', () => {
  assert.equal(helpers.workContextDraftHasContent({ contexto_vuelos_id: 'context-1' }), false);
  assert.equal(helpers.workContextDraftHasContent({
    contexto_vuelos_id: 'context-1',
    finca: 'El Paraíso'
  }), true);

  const first = helpers.captureTimestamp('2026-11-17T20:10:00.000Z');
  const second = helpers.captureTimestamp('2026-11-17T20:24:00.000Z');
  assert.notEqual(first.createdAt, second.createdAt);
  assert.notEqual(first.horaRegistro, second.horaRegistro);
  assert.equal(first.createdAt, '2026-11-17T20:10:00.000Z');
  const localFirst = new Date(first.createdAt);
  assert.equal(first.horaRegistro, String(localFirst.getHours()).padStart(2, '0') + ':' + String(localFirst.getMinutes()).padStart(2, '0'));
});

test('clears only the saved flight values while preserving jornada data', () => {
  const values = {
    labor: { value: 'Madurante' },
    dron: { value: 'T40-1' },
    area_ha: { value: '4.5' },
    litros: { value: '68' },
    observaciones: { value: 'Vuelo inicial' },
    fecha: { value: '2026-11-17' },
    finca: { value: 'El Paraíso' },
    lote: { value: '0100101' },
    zona: { value: '1' },
    responsable: { value: 'Operador' },
    contexto_vuelos_id: { value: 'context-1' }
  };
  const form = {
    querySelector(selector) {
      const match = selector.match(/^\[name="([^"]+)"\]$/);
      return match ? values[match[1]] || null : null;
    }
  };
  helpers.clearFlightEntryFields(form);

  for (const name of ['labor', 'dron', 'area_ha', 'litros', 'observaciones']) {
    assert.equal(values[name].value, '');
  }
  for (const name of ['fecha', 'finca', 'lote', 'zona', 'responsable', 'contexto_vuelos_id']) {
    assert.notEqual(values[name].value, '');
  }
});
