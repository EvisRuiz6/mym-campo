import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ExcelJS = require('../vendor/exceljs-4.4.0.min.js');
const exportExcel = require('../excel-export.js');
const modules = { vuelos: { title: 'Vuelos' }, malezas: { title: 'Malezas' }, clima: { title: 'Clima' } };
const schemas = { childSchemas: { malezas_detalle: [{ key: '% CONTROL', type: 'number' }] }, qualityForms: {} };
const record = (id, tipo, datos, owner = 'uno') => ({
  id, tipo, datos, owner_id: owner, owner_username: owner, owner_name: owner,
  created_at: '2026-03-01T10:00:00Z', schema_version: 5, review_status: 'pending'
});
const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('applies every filter to individual malezas details, including their own dates', () => {
  const row = record('1', 'malezas', { FECHA: '2026-03-01', FINCA: 'Finca Á', ZONA: '01',
    subregistros: { malezas_detalle: [
      { FECHA: '2026-03-02', LABOR: 'Plantilla', LOTE: '0001' },
      { FECHA: '2026-03-03', LABOR: 'Soca', LOTE: '0002' }
    ] } });
  const filters = { from: '2026-03-03', to: '2026-03-03', farm: 'finca a', zone: '01', labor: 'soca', owner: 'UNO' };
  const rows = exportExcel.matchingRows(row, filters);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data.subregistros.malezas_detalle.LOTE, '0002');
  assert.equal(rows[0].detailNumber, 2);
  assert.equal(exportExcel.matchingRows(row, { ...filters, owner: 'otro' }).length, 0);
  assert.equal(exportExcel.matchingRows(row, { ...filters, farm: 'otra' }).length, 0);
  assert.equal(exportExcel.matchingRows(row, { ...filters, zone: '1' }).length, 0);
});

test('filter options use the same fields as exports, including each Malezas detail and historical owners', () => {
  const records = [
    record('1', 'malezas', { FINCA: 'Finca Á', ZONA: '01', LABOR: 'Respaldo',
      subregistros: { malezas_detalle: [{ LABOR: 'Soca' }, { LABOR: 'Plantilla' }, {}] } }, 'antiguo'),
    record('2', 'vuelos', { finca: 'finca a', zona: '01', labor_aplicacion: 'Madurante' }, 'actual'),
    record('3', 'clima', { finca: '', zona: '' }, '')
  ];
  assert.deepEqual(exportExcel.filterOptions(records), {
    farm: ['Finca Á'], zone: ['01'], labor: ['Madurante', 'Plantilla', 'Respaldo', 'Soca'],
    owner: ['actual', 'antiguo']
  });
  assert.equal(exportExcel.matchingRows(records[0], { labor: 'Respaldo' }).length, 1);
});

test('writes a real workbook with separate sheets, typed cells, detail rows and attachment metadata', async () => {
  const records = [
    record('v1', 'vuelos', { fecha: '2026-03-01', finca: 'F', zona: '1', labor: 'Madurante',
      area_ha: '2.5', lote: '00045', observaciones: '=SUM(1,1)' }),
    record('v2', 'vuelos', { fecha: '2026-04-01', finca: 'F', zona: '1', labor: 'Madurante', area_ha: '9' }),
    record('c1', 'clima', { fecha: '2026-03-01', finca: 'F', zona: '1', lecturas: [
      { hora: '08:30', temperatura: '21.5' }, { hora: '08:30', temperatura: '22.5' }
    ] }),
    record('m1', 'malezas', { FECHA: '2026-03-01', FINCA: 'F', ZONA: '1',
      subregistros: { malezas_detalle: [{ FECHA: '2026-03-01', LABOR: 'Soca', LOTE: '001',
        '% CONTROL': '55.5', IMAGEN: [{ name: 'foto.jpg', mimeType: 'image/jpeg', size: 23, dataUrl: 'data:image/jpeg;base64,secret' }] }] } })
  ];
  const result = await exportExcel.createWorkbook(records, ['vuelos', 'clima', 'malezas'],
    { from: '2026-03-01', to: '2026-03-31', farm: 'F' }, modules, schemas, ExcelJS);
  assert.equal(result.totalRows, 4);
  assert.equal(Buffer.from(result.buffer).subarray(0, 2).toString(), 'PK');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Vuelos', 'Clima', 'Visita Malezas', 'Malezas']);
  const values = sheet => {
    const header = sheet.getRow(1).values;
    return Object.fromEntries(header.slice(1).map((name, i) => [name, sheet.getRow(2).getCell(i + 1)]));
  };
  const flight = values(workbook.getWorksheet('Vuelos'));
  assert.equal(flight['Datos · Area ha'].value, 2.5);
  assert.equal(flight['Datos · Lote'].value, '00045');
  assert.equal(flight['Datos · Observaciones'].value, '=SUM(1,1)');
  assert.ok(flight['Datos · Fecha'].value instanceof Date);
  assert.equal(flight['Datos · Fecha'].numFmt, 'dd/mm/yyyy');
  const climate = values(workbook.getWorksheet('Clima'));
  assert.equal(climate['Datos · Lecturas · Temperatura'].value, 21.5);
  assert.equal(climate['Datos · Lecturas · Hora'].value.toISOString(), '1899-12-30T08:30:00.000Z');
  assert.equal(climate['Datos · Lecturas · Hora'].numFmt, 'hh:mm:ss');
  assert.equal(workbook.getWorksheet('Clima').rowCount, 3);
  const weeds = values(workbook.getWorksheet('Malezas'));
  assert.equal(weeds['Datos · Subregistros · Malezas detalle · % CONTROL'].value, 55.5);
  assert.equal(weeds['Datos · Subregistros · Malezas detalle · IMAGEN · 1 · Name'].value, 'foto.jpg');
  assert.ok(!Object.keys(weeds).some(key => /dataUrl/i.test(key)));
});

test('exports filtered Malezas in the reference layout with correct cycle dates and percentages', async () => {
  const records = [record('visit-1', 'malezas', {
    FECHA: '2026-03-01', UBICACIÓN: '14, -91', RESPONSABLE: 'Ana', ZONA: '01', FINCA: 'F',
    subregistros: { malezas_detalle: [
      { FECHA: '2026-03-01', LOTE: '0000017', LABOR: 'Soca', '% CONTROL': '98', '% COBERTURA': '2', CATORCENA: '10', OBSERVACIONES: 'Primera' },
      { FECHA: '2026-03-02', LOTE: '0000018', LABOR: 'Plantilla', '% CONTROL': '0', OBSERVACIONES: 'Segunda' }
    ] }
  })];
  const links = [{ record_id: 'visit-1', lot_code: '17', cycle_date: '2026-01-17' }];
  const calendar = date => date === '2026-03-01' ? { period: '30', number: 10 } : null;
  const { buffer, totalRows } = await exportExcel.createWorkbook(records, ['malezas'], {},
    modules, schemas, ExcelJS, { visitLinks: links, weedsCatorcenaForDate: calendar });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Visita Malezas');
  assert.equal(totalRows, 2);
  assert.deepEqual(sheet.getRow(6).values.slice(1), ['ID', 'UBICACIÓN', 'RESPONSABLE', 'ZONA', 'PERIODO',
    'FECHA', 'CATORCENA', 'FINCA', 'LOTE', 'FECHA DE CORTE O SIEMBRA', 'LABOR',
    'DIA DE EVALUACIÓN', '% CONTROL', '% COBERTURA', 'OBSERVACIONES']);
  assert.equal(sheet.getCell('A1').value, 'INGENIO MADRE TIERRA');
  assert.equal(sheet.getCell('I7').value, '0000017');
  assert.equal(sheet.getCell('E7').value, 30);
  assert.equal(sheet.getCell('J7').value.toISOString().slice(0, 10), '2026-01-17');
  assert.equal(sheet.getCell('L7').value, 43);
  assert.equal(sheet.getCell('M7').value, 0.98);
  assert.equal(sheet.getCell('N7').value, 0.02);
  assert.equal(sheet.getCell('M7').numFmt, '0.00%');
  assert.equal(sheet.getCell('I8').value, '0000018');
  assert.equal(sheet.getCell('J8').value, null);
  assert.equal(sheet.getCell('L8').value, null);
  assert.equal(sheet.getCell('M8').value, 0);
  assert.equal(sheet.getCell('N8').value, 1);
  const filtered = await exportExcel.createWorkbook(records, ['malezas'], { labor: 'Soca' },
    modules, schemas, ExcelJS, { visitLinks: links, weedsCatorcenaForDate: calendar });
  assert.equal(filtered.totalRows, 1);
  await assert.rejects(() => exportExcel.createWorkbook([record('bad', 'malezas', {
    subregistros: { malezas_detalle: [{ LOTE: '0000017', '% CONTROL': '101' }] }
  })], ['malezas'], {}, modules, schemas, ExcelJS), /valor inválido de % CONTROL/);
});

test('retains long text, rejects ambiguous columns and keeps numeric identifiers as text', async () => {
  const fields = exportExcel.typedFields(schemas.childSchemas, schemas.qualityForms);
  const result = new Map();
  const text = 'a'.repeat(32766) + '😀' + 'b';
  exportExcel.flatten({ lote: '0001', observaciones: text }, ['Datos'], result, fields);
  assert.equal(result.get('Datos · Lote'), '0001');
  assert.equal(result.get('Datos · Observaciones · Parte 1') + result.get('Datos · Observaciones · Parte 2'), text);
  assert.throws(() => exportExcel.flatten({ foo_bar: 1, 'foo bar': 2 }, ['Datos'], new Map(), fields), /duplicados/);
});

test('non-admin users cannot invoke the export query from the UI handler', async () => {
  const start = source.indexOf('let excelExportSequence = 0;');
  const end = source.indexOf('\nfunction handleCloudError(', start);
  let queried = false, message = '';
  const run = runInNewContext(source.slice(start, end) + '\ndownloadAdminExcel', {
    canViewAllRecords: () => false, toast: text => { message = text; },
    cloudRequest: async () => { queried = true; }
  });
  await run({ preventDefault() {} });
  assert.equal(queried, false);
  assert.match(message, /permiso/);
});

test('paginates server records and reports failures without producing a partial download', async () => {
  const start = source.indexOf('let excelExportSequence = 0;');
  const end = source.indexOf('\nfunction handleCloudError(', start);
  const controls = Object.fromEntries(['submit', 'status', 'modules'].map(key => ['#excel-export-' + key, {}]));
  for (const key of ['from', 'to', 'farm', 'zone', 'labor', 'owner']) controls['#excel-' + key] = { value: '' };
  const state = { user: { id: 'admin' }, configured: true };
  const calls = [];
  let downloaded = 0, fail = false, produced = 0;
  const context = {
    state, modules, childSchemas: {}, qualityForms: {}, navigator: { onLine: true }, weedsCatorcenaForDate() {},
    canViewAllRecords: () => true, $: selector => controls[selector],
    $$: () => [{ value: 'vuelos' }], console: { error() {} },
    ExcelExport: { dateValue: exportExcel.dateValue, createWorkbook: async records => {
      produced = records.length;
      return { buffer: new Uint8Array([1]), totalRows: records.length };
    } },
    window: { ExcelJS: {} }, Blob,
    URL: { createObjectURL: () => 'blob:example', revokeObjectURL() {} },
    document: { createElement: () => ({ click() { downloaded++; } }) },
    setTimeout() {}, localDate: () => '2026-03-01',
    cloudRequest: async (path, request) => {
      calls.push(request.body);
      if (fail) throw new Error('red interrumpida');
      if (calls.length === 1) return Array.from({ length: 250 }, (_, i) =>
        ({ id: String(i), created_at: '2026-03-01T10:00:00Z' }));
      return [{ id: 'last', created_at: '2026-03-02T10:00:00Z' }];
    }
  };
  const run = runInNewContext(source.slice(start, end) + '\ndownloadAdminExcel', context);
  await run({ preventDefault() {} });
  assert.equal(downloaded, 1);
  assert.equal(produced, 251);
  assert.equal(calls[1].p_after_id, '249');
  assert.match(controls['#excel-export-status'].textContent, /Archivo listo/);
  fail = true;
  await run({ preventDefault() {} });
  assert.equal(downloaded, 1);
  assert.equal(controls['#excel-export-submit'].disabled, false);
  assert.match(controls['#excel-export-status'].textContent, /No se pudo descargar Excel.*red interrumpida/);
});

test('requires linked visit data before downloading Malezas and reports lookup failures', async () => {
  const start = source.indexOf('let excelExportSequence = 0;');
  const end = source.indexOf('\nfunction handleCloudError(', start);
  const controls = Object.fromEntries(['submit', 'status', 'modules'].map(key => ['#excel-export-' + key, {}]));
  for (const key of ['from', 'to', 'farm', 'zone', 'labor', 'owner']) controls['#excel-' + key] = { value: '' };
  const links = [{ record_id: 'm1', lot_code: '0000017', cycle_date: '2026-01-17' }];
  let fail = false, downloaded = 0, passedLinks;
  const run = runInNewContext(source.slice(start, end) + '\ndownloadAdminExcel', {
    state: { user: { id: 'admin' }, configured: true }, modules, childSchemas: {}, qualityForms: {},
    navigator: { onLine: true }, canViewAllRecords: () => true, $: selector => controls[selector],
    $$: () => [{ value: 'malezas' }], console: { error() {} },
    fetchAllLotFollowupVisits: async () => { if (fail) throw new Error('red interrumpida'); return links; },
    weedsCatorcenaForDate() {},
    ExcelExport: { dateValue: exportExcel.dateValue, createWorkbook: async (...args) => {
      passedLinks = args[6].visitLinks;
      return { buffer: new Uint8Array([1]), totalRows: 1 };
    } },
    window: { ExcelJS: {} }, Blob,
    URL: { createObjectURL: () => 'blob:example', revokeObjectURL() {} },
    document: { createElement: () => ({ click() { downloaded++; } }) },
    setTimeout() {}, localDate: () => '2026-03-01', cloudRequest: async () => []
  });
  await run({ preventDefault() {} });
  assert.equal(passedLinks, links);
  assert.equal(downloaded, 1);
  fail = true;
  await run({ preventDefault() {} });
  assert.equal(downloaded, 1);
  assert.match(controls['#excel-export-status'].textContent, /No se pudo descargar Excel.*red interrumpida/);
});

test('loads dropdown options across pages, keeps selections, and offers retry on error', async () => {
  const start = source.indexOf('let excelExportSequence = 0;');
  const end = source.indexOf('\nfunction handleCloudError(', start);
  const controls = {
    '#excel-options-status': {}, '#excel-options-retry': {},
    '#excel-farm': { value: 'Anterior' }, '#excel-zone': { value: '' },
    '#excel-labor': { value: '' }, '#excel-owner': { value: '' }
  };
  let calls = 0, fail = false;
  const state = { user: { id: 'admin' }, configured: true };
  const run = runInNewContext(source.slice(start, end) + '\n({ loadExcelFilterOptions })', {
    state, modules, canViewAllRecords: () => !!state.user, navigator: { onLine: true },
    $: selector => controls[selector], esc: text => String(text).replaceAll('"', '&quot;'),
    ExcelExport: exportExcel, console: { error() {} },
    cloudRequest: async () => {
      if (fail) throw new Error('red interrumpida');
      calls++;
      if (calls === 1) return Array.from({ length: 250 }, (_, i) =>
        ({ ...record(String(i), 'vuelos', { finca: 'Finca A' }), created_at: '2026-03-01T10:00:00Z' }));
      return [record('last', 'vuelos', { finca: 'Finca B', zona: '3', labor: 'Soca' }, 'otro')];
    }
  });
  await run.loadExcelFilterOptions();
  assert.equal(calls, 2);
  assert.match(controls['#excel-farm'].innerHTML, /Finca A/);
  assert.match(controls['#excel-farm'].innerHTML, /Finca B/);
  assert.match(controls['#excel-farm'].innerHTML, /Anterior/);
  assert.equal(controls['#excel-farm'].value, 'Anterior');
  assert.match(controls['#excel-owner'].innerHTML, /otro/);
  fail = true;
  await run.loadExcelFilterOptions();
  assert.equal(controls['#excel-options-retry'].hidden, false);
  assert.match(controls['#excel-options-status'].textContent, /red interrumpida/);
  assert.match(controls['#excel-farm'].innerHTML, /Finca B/);
});

test('ignores dropdown responses from a previous user session', async () => {
  const start = source.indexOf('let excelExportSequence = 0;');
  const end = source.indexOf('\nfunction handleCloudError(', start);
  const controls = { '#excel-options-status': {}, '#excel-options-retry': {} };
  const state = { user: { id: 'admin' }, configured: true };
  let resolve;
  const run = runInNewContext(source.slice(start, end) + '\n({ loadExcelFilterOptions })', {
    state, modules, canViewAllRecords: () => !!state.user, navigator: { onLine: true },
    $: selector => controls[selector], ExcelExport: exportExcel,
    cloudRequest: () => new Promise(done => { resolve = done; }), console: { error() {} }
  });
  const pending = run.loadExcelFilterOptions();
  state.user = { id: 'different' };
  resolve([record('1', 'vuelos', { finca: 'Finca A' })]);
  await pending;
  assert.match(controls['#excel-options-status'].textContent, /Cargando/);
});
