import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function normalizeVisitMapLotCode(value) {');
const helperEnd = appSource.indexOf('\nfunction visitMapControlPercent(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Lot follow-up helpers must exist in app.js');
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) +
  '\n({ parseXlsxWorkbook, parseLotFollowupRows, excelDateToIso, evaluateLotFollowup })',
  { Blob, Response, TextDecoder, DecompressionStream }
);

function makeXlsx(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const [path, content] of Object.entries(entries)) {
    const name = Buffer.from(path);
    const raw = Buffer.from(content);
    const compressed = deflateRawSync(raw);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centralParts.length, 8);
  end.writeUInt16LE(centralParts.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function sampleWorkbook() {
  const sharedValues = [
    'FECHA SIEMBRA/CORTE', 'FINCA', 'LOTE', 'ESTADO', 'RESPONSABLE',
    'VISITA 1', 'VISITA 2', 'VISITA 3', 'SANTA ISABEL', '0850103', 'SOCA', 'Ana Pérez'
  ];
  const sharedXml = '<sst>' + sharedValues.map(value => '<si><t>' + value + '</t></si>').join('') + '</sst>';
  const cells = (row, values) => values.map(([column, value, type]) =>
    '<c r="' + column + row + '"' + (type ? ' t="' + type + '"' : '') + '><v>' + value + '</v></c>'
  ).join('');
  const sheetXml = '<worksheet><sheetData>' +
    '<row r="1">' + cells(1, [['A', 0, 's'], ['B', 1, 's'], ['C', 2, 's'], ['D', 3, 's'], ['E', 4, 's'], ['F', 5, 's'], ['G', 6, 's'], ['H', 7, 's']]) + '</row>' +
    '<row r="2">' + cells(2, [['A', 46336, 'n'], ['B', 8, 's'], ['C', 9, 's'], ['D', 10, 's'], ['E', 11, 's'], ['F', 46366, 'n'], ['G', 46396, 'n']]) + '</row>' +
    '</sheetData></worksheet>';
  return makeXlsx({
    'xl/workbook.xml': '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="RESUMEN" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': sharedXml,
    'xl/worksheets/sheet1.xml': sheetXml
  });
}

test('reads the first worksheet and converts Excel serial dates into a lot plan', async () => {
  const bytes = sampleWorkbook();
  const rows = await helpers.parseXlsxWorkbook({
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  });
  const result = helpers.parseLotFollowupRows(JSON.parse(JSON.stringify(rows)));
  assert.equal(helpers.excelDateToIso(46336), '2026-11-10');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    plans: [{
      lot_code: '0850103',
      cycle_date: '2026-11-10',
      finca: 'SANTA ISABEL',
      crop_state: 'SOCA',
      responsible: 'Ana Pérez',
      visit_dates: ['2026-12-10', '2027-01-09']
    }],
    errors: []
  });
});

test('rejects duplicate lots and visit dates that are not chronological', () => {
  const rows = [
    ['FECHA SIEMBRA/CORTE', 'FINCA', 'LOTE', 'ESTADO', 'RESPONSABLE', 'VISITA 1', 'VISITA 2'],
    ['2026-01-01', 'Finca A', '17', 'Soca', 'Ana', '2026-03-01', '2026-02-01'],
    ['2026-01-01', 'Finca A', '17', 'Soca', 'Ana', '2026-03-01', '2026-04-01'],
    ['2026-01-01', 'Finca A', '18', 'Soca', 'Ana', '', '2026-04-01']
  ];
  const result = JSON.parse(JSON.stringify(helpers.parseLotFollowupRows(rows)));
  assert.ok(result.errors.some(error => error.includes('orden cronológico')));
  assert.ok(result.errors.some(error => error.includes('aparece más de una vez')));
  assert.ok(result.errors.some(error => error.includes('falta una fecha anterior')));
});

test('counts distinct saved Malezas captures from the cycle date and never fulfills early', () => {
  const plan = {
    lot_code: '0000103',
    cycle_date: '2026-11-10',
    visit_dates: ['2026-11-20', '2026-12-20', '2027-01-20']
  };
  const firstVisit = [
    { record_id: 'before-cycle', lot_code: '103', visit_date: '2026-11-09' },
    { record_id: 'capture-1', lot_code: '103', visit_date: '2026-11-22' },
    { record_id: 'capture-1', lot_code: '0000103', visit_date: '2026-11-22' }
  ];
  const overdue = helpers.evaluateLotFollowup(plan, firstVisit, '2026-12-21');
  assert.equal(overdue.actualCount, 1);
  assert.equal(overdue.requiredCount, 3);
  assert.equal(overdue.pendingCount, 2);
  assert.equal(overdue.overdueCount, 1);
  assert.equal(overdue.slots[0].status, 'Realizada tarde');
  assert.equal(overdue.statusKey, 'overdue');
  assert.equal(overdue.fulfilled, false);

  const twoVisits = helpers.evaluateLotFollowup(plan, [
    ...firstVisit,
    { record_id: 'capture-2', lot_code: '103', visit_date: '2026-12-21' }
  ], '2026-12-21');
  assert.equal(twoVisits.pendingCount, 1);
  assert.equal(twoVisits.fulfilled, false);
  assert.equal(twoVisits.statusKey, 'pending');

  const complete = helpers.evaluateLotFollowup(plan, [
    ...firstVisit,
    { record_id: 'capture-2', lot_code: '103', visit_date: '2026-12-21' },
    { record_id: 'capture-3', lot_code: '103', visit_date: '2027-01-20' }
  ], '2027-01-20');
  assert.equal(complete.fulfilled, true);
  assert.equal(complete.statusLabel, 'Cumplido');
});

test('does not mark a plan with no scheduled visits as fulfilled', () => {
  const result = helpers.evaluateLotFollowup(
    { lot_code: '17', cycle_date: '2026-01-01', visit_dates: [] },
    [{ record_id: 'capture', lot_code: '17', visit_date: '2026-01-02' }],
    '2026-01-03'
  );
  assert.equal(result.fulfilled, false);
  assert.equal(result.statusKey, 'unscheduled');
});
