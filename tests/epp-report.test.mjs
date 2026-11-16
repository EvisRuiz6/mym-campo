import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const functionsStart = appSource.indexOf('const eppFunctions = [');
const functionsEnd = appSource.indexOf('\n];', functionsStart) + 3;
const rolesStart = appSource.indexOf('const eppReportRoles = {');
const rolesEnd = appSource.indexOf('\n};', rolesStart) + 3;
const helpersStart = appSource.indexOf('function eppReportCount(value) {');
const helpersEnd = appSource.indexOf('\nasync function generateEppPdf(', helpersStart);
assert.ok(functionsStart >= 0 && functionsEnd > functionsStart, 'EPP report functions must exist in app.js');
assert.ok(rolesStart >= 0 && rolesEnd > rolesStart, 'EPP report roles must exist in app.js');
assert.ok(helpersStart >= 0 && helpersEnd > helpersStart, 'EPP report builder must exist in app.js');

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const buildReport = runInNewContext([
  appSource.slice(functionsStart, functionsEnd),
  appSource.slice(rolesStart, rolesEnd),
  appSource.slice(helpersStart, helpersEnd),
  '\neppReportDocument'
].join('\n'), {
  esc: escapeHtml,
  slug: value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  formatDate: value => String(value),
  recordDetailTime: () => '',
  recordStatus: () => 'Pendiente de revisión',
  localDate: () => '2026-11-16'
});

test('uses the 2026-2027 season in the EPP PDF heading', () => {
  const html = buildReport({ datos: {} });
  assert.match(html, /<p class="epp-report-period">TEMPORADA 2026-2027<\/p>/);
  assert.doesNotMatch(html, /2025-2026/);
});
