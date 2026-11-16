import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function flightNumber(value) {');
const helperEnd = appSource.indexOf('\nfunction flightFields()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Flight report helpers must exist in app.js');
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) +
  '\n({ FLIGHT_REPORT_DRONES, FLIGHT_REPORT_MISSING_FILTER, flightReportFilterOptions, flightReportData, formatFlightReportNumber })'
);

const reportStart = appSource.indexOf('function flightReportFilterLabel(field, value) {');
const reportEnd = appSource.indexOf('\nfunction updateFlightReportFilterOptions()', reportStart);
assert.ok(reportStart >= 0 && reportEnd > reportStart, 'Flight report document builder must exist in app.js');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const buildDocument = runInNewContext(
  appSource.slice(reportStart, reportEnd) + '\nflightReportDocument',
  {
    FLIGHT_REPORT_MISSING_FILTER: helpers.FLIGHT_REPORT_MISSING_FILTER,
    esc: escapeHtml,
    formatDate: value => 'Fecha ' + value,
    formatFlightReportNumber: helpers.formatFlightReportNumber,
    localDate: () => '2026-11-16',
    slug: value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }
);

function flight(data) {
  return { tipo: 'vuelos', datos: data };
}

test('filters inclusively by date, farm, zone, and labor before aggregating', () => {
  const records = [
    flight({ fecha: '2026-03-01', finca: 'Norte', zona: '1', labor: 'Madurante', dron: 'T40-1', area_ha: '10.5', litros: '154' }),
    flight({ fecha: '2026-03-31', finca: 'Norte', zona: '1', labor: 'Madurante', dron: 'T40-1', area_ha: '2', litros: '28' }),
    flight({ fecha: '2026-03-15', finca: 'Sur', zona: '1', labor: 'Madurante', dron: 'T40-1', area_ha: '20', litros: '280' }),
    flight({ fecha: '2026-03-15', finca: 'Norte', zona: '2', labor: 'Madurante', dron: 'T40-1', area_ha: '30', litros: '420' }),
    flight({ fecha: '2026-03-15', finca: 'Norte', zona: '1', labor: 'Premadurante', dron: 'T40-1', area_ha: '40', litros: '800' }),
    flight({ fecha: '2026-04-01', finca: 'Norte', zona: '1', labor: 'Madurante', dron: 'T40-1', area_ha: '50', litros: '700' }),
    { tipo: 'malezas', datos: { fecha: '2026-03-15', finca: 'Norte', zona: '1', labor: 'Madurante', area_ha: '100', litros: '1400' } }
  ];

  const report = helpers.flightReportData(records, {
    from: '2026-03-01',
    to: '2026-03-31',
    finca: 'Norte',
    zona: '1',
    labor: 'Madurante'
  });
  const t40 = report.rows.find(row => row.drone === 'T40-1');
  assert.equal(t40.flights, 2);
  assert.equal(t40.hectares, 12.5);
  assert.equal(t40.liters, 182);
  assert.equal(report.totals.flights, 2);
  assert.equal(report.totals.hectares, 12.5);
  assert.equal(report.totals.liters, 182);
  assert.equal(report.rows.length, 9);
});

test('keeps the requested drone rows and includes unlisted or unidentified drones in totals', () => {
  const records = [
    flight({ fecha: '2026-03-01', dron: 'T50-2', area_ha: '5', litros: '100' }),
    flight({ fecha: '2026-03-02', dron: 'T80-1', area_ha: '3', litros: '60' }),
    flight({ fecha: '2026-03-03', area_ha: '2', litros: '40' })
  ];
  const report = helpers.flightReportData(records, {});
  const names = report.rows.map(row => row.drone);
  assert.deepEqual(JSON.parse(JSON.stringify(names.slice(0, 9))), JSON.parse(JSON.stringify(helpers.FLIGHT_REPORT_DRONES)));
  assert.deepEqual(JSON.parse(JSON.stringify(names.slice(9))), ['T80-1', 'Sin identificar']);
  assert.equal(report.totals.flights, 3);
  assert.equal(report.totals.hectares, 10);
  assert.equal(report.totals.liters, 200);
  assert.equal(report.rows.find(row => row.drone === 'T40-1').flights, 0);
});

test('does not silently sum invalid measurements and reports missing dates excluded by date filters', () => {
  const records = [
    flight({ fecha: '2026-03-10', dron: 'T40-1', area_ha: 'inválido', litros: '12' }),
    flight({ fecha: '2026-03-11', dron: 'T40-1', area_ha: '3', litros: '' }),
    flight({ dron: 'T40-1', area_ha: '7', litros: '70' })
  ];
  const report = helpers.flightReportData(records, { from: '2026-03-01', to: '2026-03-31' });
  assert.equal(report.totals.flights, 2);
  assert.equal(report.totals.hectares, 3);
  assert.equal(report.totals.liters, 12);
  assert.equal(report.totals.invalidAreaRecords, 1);
  assert.equal(report.totals.invalidLitersRecords, 1);
  assert.equal(report.totals.incompleteFlights, 2);
  assert.equal(report.totals.missingDateExcluded, 1);

  const allDates = helpers.flightReportData(records, {});
  assert.equal(allDates.totals.flights, 3);
  assert.equal(allDates.totals.missingDateIncluded, 1);
});

test('exposes missing filter choices and rejects reversed or invalid date ranges', () => {
  const records = [
    flight({ finca: 'Norte', zona: '1', labor: 'Madurante', area_ha: '1', litros: '14' }),
    flight({ area_ha: '2', litros: '28' })
  ];
  for (const [field, expectedLabel] of [['finca', 'Sin finca'], ['zona', 'Sin zona'], ['labor', 'Sin labor']]) {
    const options = helpers.flightReportFilterOptions(records, field);
    assert.equal(options.at(-1).value, helpers.FLIGHT_REPORT_MISSING_FILTER);
    assert.equal(options.at(-1).label, expectedLabel);
  }
  assert.equal(helpers.flightReportData(records, { from: '2026-04-01', to: '2026-03-01' }).invalidDateRange, true);
  assert.equal(helpers.flightReportData(records, { from: 'no-es-fecha' }).invalidDateRange, true);
});

test('builds the cumulative PDF with the selected criteria and matching totals', () => {
  const filters = {
    from: '2026-03-01',
    to: '2026-03-31',
    finca: 'Norte',
    zona: '1',
    labor: 'Madurante'
  };
  const report = helpers.flightReportData([
    flight({ fecha: '2026-03-01', finca: 'Norte', zona: '1', labor: 'Madurante', dron: 'T40-1', area_ha: '10', litros: '140' })
  ], filters);
  const html = buildDocument(report, filters);
  assert.match(html, /RESUMEN ACUMULADO DE VUELOS/);
  assert.match(html, /Rango de fechas/);
  assert.match(html, /Finca/);
  assert.match(html, /Zona/);
  assert.match(html, /Labor/);
  assert.match(html, /Norte/);
  assert.match(html, /1 vuelo/);
  assert.match(html, /10\.00 ha/);
  assert.match(html, /140\.00 L/);
  assert.match(html, /T40-1/);
});
