import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function normalizeVisitMapLotCode(value) {');
const helperEnd = appSource.indexOf('\nfunction renderVisitMap(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Malezas report helpers must exist in app.js');
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) +
  '\n({ malezasReportRows, malezasReportMapSvg, malezasReportControlClass, formatVisitMapControlPercent })',
  { esc: escapeHtml }
);
const reportStart = appSource.indexOf('function malezasReportDocument(record, boundaries) {');
const reportEnd = appSource.indexOf('\nasync function waitForReportImages(', reportStart);
assert.ok(reportStart >= 0 && reportEnd > reportStart, 'Malezas PDF document builder must exist in app.js');
const buildReport = runInNewContext(
  appSource.slice(reportStart, reportEnd) + '\nmalezasReportDocument',
  {
    esc: escapeHtml,
    slug: value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    formatDate: value => 'Fecha ' + value,
    formatVisitMapControlPercent: helpers.formatVisitMapControlPercent,
    malezasReportRows: helpers.malezasReportRows,
    malezasReportControlClass: helpers.malezasReportControlClass,
    malezasReportMapSvg: helpers.malezasReportMapSvg,
    recordDetailTime: value => value || '',
    recordStatus: () => 'En cola',
    localDate: () => '2026-03-15'
  }
);
const summaryStart = appSource.indexOf('function malezasSummaryData(');
const summaryEnd = appSource.indexOf('\nfunction formatVisitMapControlPercent(', summaryStart);
assert.ok(summaryStart >= 0 && summaryEnd > summaryStart);
const summary = runInNewContext(
  appSource.slice(summaryStart, summaryEnd) + '\n({ malezasSummaryData, malezasSummaryDocument })',
  {
    esc: escapeHtml,
    malezasReportRows: helpers.malezasReportRows,
    flightReportDate: value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '',
    formatDate: value => value,
    formatVisitMapControlPercent: helpers.formatVisitMapControlPercent,
    localDate: () => '2026-11-26',
    recordStatus: record => record.syncStatus === 'pending' ? 'En cola' : 'Pendiente de revisión'
  }
);

test('builds Malezas report rows with derived coverage and captured images', () => {
  const record = {
    tipo: 'malezas',
    datos: {
      FECHA: '2026-03-15',
      subregistros: {
        malezas_detalle: [
          {
            LOTE: '17',
            FECHA: '2026-03-01',
            LABOR: 'Plantilla',
            '% CONTROL': '72.5',
            '% COBERTURA': '5',
            IMAGEN: [
              { name: 'lote-17.jpg', dataUrl: 'data:image/jpeg;base64,Zm9v' },
              { name: 'no-image', dataUrl: 'javascript:alert(1)' }
            ]
          },
          { LOTE: '18', '% CONTROL': '0', IMAGEN: { name: 'lote-18.png', dataUrl: 'data:image/png;base64,YmFy' } }
        ]
      }
    }
  };

  const rows = helpers.malezasReportRows(record);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].lotCode, '0000017');
  assert.equal(rows[0].coveragePercent, 27.5);
  assert.equal(rows[0].images.length, 1);
  assert.equal(rows[1].coveragePercent, 100);
  assert.equal(rows[1].images.length, 1);
});

test('maps only sampled lots and colors each polygon with its control percentage', () => {
  const rows = [
    { lotCode: '0000017', date: '2026-03-01', controlPercent: 72.5 },
    { lotCode: '0000018', date: '2026-03-02', controlPercent: 0 }
  ];
  const boundaries = [
    {
      lot_code: '17',
      finca: 'Finca A',
      zone: '2',
      geometry: {
        crs: 'EPSG:32615',
        rings: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
      }
    },
    {
      lot_code: '99',
      finca: 'Finca A',
      zone: '2',
      geometry: {
        crs: 'EPSG:32615',
        rings: [[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]]
      }
    }
  ];

  const map = helpers.malezasReportMapSvg(boundaries, rows);
  assert.deepEqual([...map.lotCodes], ['0000017']);
  assert.match(map.markup, /malezas-map-lot is-visited control-medium-low/);
  assert.match(map.markup, /0000017/);
  assert.doesNotMatch(map.markup, /0000099/);
});

test('classifies every control percentage in non-overlapping PDF color ranges', () => {
  const ranges = [
    [0, 'control-low'],
    [69.99, 'control-low'],
    [70, 'control-medium-low'],
    [74.99, 'control-medium-low'],
    [75, 'control-medium-high'],
    [85, 'control-medium-high'],
    [85.01, 'control-high'],
    [100, 'control-high']
  ];
  for (const [percent, expected] of ranges) {
    assert.equal(helpers.malezasReportControlClass(percent), expected);
  }
  assert.equal(helpers.malezasReportControlClass(null), 'control-missing');
});

test('builds a printable report with the sampled map, derived metrics, and photos', () => {
  const record = {
    ownerName: 'Ana',
    syncStatus: 'pending',
    datos: {
      FECHA: '2026-03-01',
      FINCA: 'Finca Norte',
      ZONA: '2',
      subregistros: {
        malezas_detalle: [{
          LOTE: '17',
          FECHA: '2026-03-01',
          '% CONTROL': '72.5',
          OBSERVACIONES: '<script>no ejecutar</script>',
          IMAGEN: { name: 'lote.jpg', dataUrl: 'data:image/jpeg;base64,Zm9v' }
        }]
      }
    }
  };
  const boundaries = [{
    lot_code: '17',
    zone: '2',
    finca: 'Finca Norte',
    geometry: {
      crs: 'EPSG:32615',
      rings: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    }
  }];

  const html = buildReport(record, boundaries);
  assert.match(html, /MUESTREO DE MALEZAS/);
  assert.match(html, /class="malezas-report-control-value control-medium-low">72\.5%<\/strong>/);
  assert.match(html, /Menos de 70%/);
  assert.match(html, /70% a menos de 75%/);
  assert.match(html, /75% a 85%/);
  assert.match(html, /Más de 85%/);
  assert.match(html, /72\.5%/);
  assert.match(html, /27\.5%/);
  assert.match(html, /src="data:image\/jpeg;base64,Zm9v"/);
  assert.match(html, /&lt;script&gt;no ejecutar&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>no ejecutar<\/script>/);
});

test('filters details by inclusive date, farm and lot and counts distinct captures per lot', () => {
  const records = [
    { id: 'a', tipo: 'malezas', syncStatus: 'synced', datos: { FINCA: 'Norte', subregistros: { malezas_detalle: [
      { LOTE: '17', FECHA: '2026-11-01' }, { LOTE: '17', FECHA: '2026-11-01' },
      { LOTE: '18', FECHA: '2026-11-03' }
    ] } } },
    { id: 'b', tipo: 'malezas', syncStatus: 'pending', datos: { FINCA: 'Norte', subregistros: { malezas_detalle: [
      { LOTE: '17', FECHA: '2026-11-30' }, { LOTE: '17' }
    ] } } },
    { id: 'c', tipo: 'malezas', datos: { FINCA: 'Sur', LOTE: '17', FECHA: '2026-11-15' } }
  ];
  const report = summary.malezasSummaryData(records, { from: '2026-11-01', to: '2026-11-30', farm: 'Norte', lot: '0000017' });
  assert.equal(report.rows.length, 3);
  assert.equal(report.groups.length, 1);
  assert.equal(report.groups[0].visits, 2);
  assert.equal(report.groups[0].lastDate, '2026-11-30');
  assert.equal(report.missingDateExcluded, 1);
  assert.equal(summary.malezasSummaryData(records, { from: '2026-12-01', to: '2026-11-01' }).invalidDateRange, true);
});

test('includes optional photos and marks pending and conflict visits in escaped PDF output', () => {
  const records = [{ id: 'a', tipo: 'malezas', syncStatus: 'pending', pendingConflict: true, ownerName: 'Ana',
    datos: { FINCA: 'Norte', subregistros: { malezas_detalle: [{
      LOTE: '17', FECHA: '2026-11-01', '% CONTROL': '72.5', OBSERVACIONES: '<script>mal</script>',
      IMAGEN: { name: 'foto.jpg', dataUrl: 'data:image/jpeg;base64,Zm9v' }
    }] } } }];
  const report = summary.malezasSummaryData(records, {});
  const withoutPhotos = summary.malezasSummaryDocument(report, {}, false, 'Datos locales');
  const withPhotos = summary.malezasSummaryDocument(report, {}, true, 'Datos locales');
  assert.match(withoutPhotos, /Conflicto por revisar/);
  assert.match(withoutPhotos, /72\.5%/);
  assert.match(withoutPhotos, /27\.5%/);
  assert.match(withoutPhotos, /&lt;script&gt;mal&lt;\/script&gt;/);
  assert.doesNotMatch(withoutPhotos, /data:image/);
  assert.match(withPhotos, /src="data:image\/jpeg;base64,Zm9v"/);
});

test('uses only authorized local captures and queued visits when the server fails', async () => {
  const start = appSource.indexOf('let malezasSummary = ');
  const end = appSource.indexOf("\n$('#visit-map-stage').addEventListener", start);
  const mergeStart = appSource.indexOf('function mergeScopedReportRecords(');
  const mergeEnd = appSource.indexOf('\nfunction resetFlightVariation(', mergeStart);
  assert.ok(start >= 0 && end > start && mergeStart >= 0 && mergeEnd > mergeStart);
  const user = { id: 'one', username: 'uno', role: 'supervisor', status: 'active', allowedZones: ['1'] };
  const elements = new Map();
  const $ = selector => {
    if (!elements.has(selector)) elements.set(selector, { value: '', innerHTML: '', textContent: '', disabled: false, addEventListener() {} });
    return elements.get(selector);
  };
  const own = { id: 'own', tipo: 'malezas', ownerId: 'one', syncStatus: 'synced', datos: { FINCA: 'Norte', LOTE: '17', FECHA: '2026-11-01' } };
  const other = { ...own, id: 'other', ownerId: 'two' };
  const group = { userId: 'one', status: 'conflict', captures: [{ record_id: 'queued',
    datos: { FINCA: 'Norte', LOTE: '18', FECHA: '2026-11-02' } }] };
  const context = {
    state: { user, configured: true }, navigator: { onLine: true }, $, esc: escapeHtml,
    userCanOpenModule: () => true, sameOfflineScope: expected => expected.id === context.state.user?.id,
    getRecords: async () => [own, other], getWeeklyVisitOutbox: async () => [group],
    canAccessWeeklyOutbox: item => item.userId === context.state.user.id,
    recordHasLotAccess: () => true,
    flightRecordBelongsToUser: (record, current) => record.ownerId === current.id,
    cloudRequest: async () => { throw Object.assign(new Error('servidor no disponible'), { connectionFailure: true }); },
    malezasSummaryData: summary.malezasSummaryData, formatDate: value => value,
    console: { error() {} }, toast() {}
  };
  const harness = runInNewContext(appSource.slice(mergeStart, mergeEnd) + '\n' +
    appSource.slice(start, end) + '\n({ loadMalezasSummary, get: () => malezasSummary })', context);
  await harness.loadMalezasSummary();
  assert.deepEqual(Array.from(harness.get().records, row => row.id), ['own', 'queued']);
  assert.equal(harness.get().records[1].pendingConflict, true);
  assert.match(harness.get().source, /No se pudieron cargar las visitas compartidas/);
  context.cloudRequest = async () => { throw Object.assign(new Error('Sin permisos'), { httpStatus: 403 }); };
  await assert.rejects(harness.loadMalezasSummary(), /Sin permisos/);
  assert.equal(harness.get().records.length, 0);
  assert.equal($('#malezas-summary-pdf').disabled, true);
});
