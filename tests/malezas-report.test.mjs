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
  '\n({ malezasReportRows, malezasReportMapSvg, formatVisitMapControlPercent })',
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
    malezasReportMapSvg: helpers.malezasReportMapSvg,
    recordDetailTime: value => value || '',
    recordStatus: () => 'En cola',
    localDate: () => '2026-03-15'
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
  assert.match(map.markup, /control-medium-high/);
  assert.match(map.markup, /0000017/);
  assert.doesNotMatch(map.markup, /0000099/);
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
  assert.match(html, /control-medium-high/);
  assert.match(html, /72\.5%/);
  assert.match(html, /27\.5%/);
  assert.match(html, /src="data:image\/jpeg;base64,Zm9v"/);
  assert.match(html, /&lt;script&gt;no ejecutar&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>no ejecutar<\/script>/);
});
