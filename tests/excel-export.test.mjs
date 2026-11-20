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
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Vuelos', 'Clima', 'Malezas']);
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
    isActiveAdmin: () => false, toast: text => { message = text; },
    cloudRequest: async () => { queried = true; }
  });
  await run({ preventDefault() {} });
  assert.equal(queried, false);
  assert.match(message, /administradora/);
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
    state, modules, childSchemas: {}, qualityForms: {}, navigator: { onLine: true },
    isActiveAdmin: () => true, $: selector => controls[selector],
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
