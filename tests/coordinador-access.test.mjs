import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { validateInvitation, zonesForRole } from '../supabase/functions/_shared/invitation.mjs';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function extract(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}

test('coordinator receives aerial and supervision forms but no terrestrial forms', () => {
  const state = { user: { role: 'coordinador', status: 'active', allowedZones: [] } };
  const code = [
    extract('const modules = {', '\nconst eppFunctions ='),
    extract('function userCanOpenModule(', '\nfunction moduleCard('),
    '({ userCanOpenModule, groupsForRole })'
  ].join('\n');
  const { userCanOpenModule, groupsForRole } = runInNewContext(code, { state });
  assert.deepEqual(Array.from(groupsForRole('coordinador'), group => group.title), ['Aplicaciones aéreas', 'Supervisión']);
  for (const type of ['clima', 'epp', 'vuelos', 'malezas', 'calidad']) assert.equal(userCanOpenModule(type), true);
  for (const type of ['variacion_aguilon', 'calibracion_aguilon', 'calibraciones_pcpm']) assert.equal(userCanOpenModule(type), false);
});

test('coordinator invitation receives all configured zones', () => {
  const invitation = validateInvitation({
    email: 'test@example.invalid', username: 'test_user', display_name: 'Test',
    role: 'coordinador', allowed_zones: []
  });
  assert.equal(invitation.role, 'coordinador');
  assert.deepEqual(zonesForRole(invitation.role, [], ['1', '2']), ['1', '2']);
});

test('weekly visits are available to active coordinators without legacy management access', () => {
  const state = { user: { role: 'coordinador', status: 'active' } };
  const code = extract('function isActiveAdmin()', '\nfunction consumeInviteLink()') +
    '\n({ isActiveAdmin, canAccessLotFollowup, canReviewLotVisits })';
  const access = runInNewContext(code, { state });
  assert.equal(access.canAccessLotFollowup(), true);
  assert.equal(access.isActiveAdmin(), false);
  assert.equal(access.canReviewLotVisits(), false);
  for (const role of ['admin', 'supervisor']) {
    state.user.role = role;
    assert.equal(access.canAccessLotFollowup(), true);
    assert.equal(access.canReviewLotVisits(), true);
  }
  state.user = { role: 'coordinador', status: 'suspended' };
  assert.equal(access.canAccessLotFollowup(), false);
  state.user = { role: 'aereo', status: 'active' };
  assert.equal(access.canAccessLotFollowup(), false);
});

test('coordinator loads weekly visits using the shared export reader', async () => {
  const state = { user: { role: 'coordinador', status: 'active' } };
  const code = extract('async function fetchAllLotFollowupVisits()', '\nasync function loadLotFollowup()');
  const calls = [];
  const load = runInNewContext(code + '\nfetchAllLotFollowupVisits', {
    state, cloudRequest: async path => { calls.push(path); return []; }
  });
  await load();
  assert.match(calls[0], /^rpc\/get_export_lot_visits\?/);
});

test('coordinator sees shared synced captures but not another account’s local pending data', () => {
  const state = { user: { id: 'one', username: 'one', role: 'coordinador', status: 'active' } };
  const code = extract('function flightRecordBelongsToUser(', '\nfunction flightVariationScopedRecords(') +
    extract('function visibleLocalRecords(records)', "\n$('#climate-chart-filters')") + '\nvisibleLocalRecords';
  const visible = runInNewContext(code, {
    state, recordHasLotAccess: () => true, isActiveAdmin: () => false, canViewAllRecords: () => true
  });
  const records = [
    { id: 'shared', ownerId: 'two', syncStatus: 'synced' },
    { id: 'own', ownerId: 'one', syncStatus: 'pending' },
    { id: 'private-local', ownerId: 'two', syncStatus: 'pending' }
  ];
  assert.deepEqual(Array.from(visible(records), record => record.id), ['shared', 'own']);
});

test('coordinator charts exclude another account’s unsynced local data', () => {
  const user = { id: 'one', username: 'one', role: 'coordinador', status: 'active' };
  const code = [
    extract('function flightRecordBelongsToUser(', '\nfunction flightReportFilterOptions('),
    extract('function climateScopedRecords(', '\nfunction climateNumeric('),
    extract('function mergeScopedReportRecords(', '\nfunction resetFlightVariation('),
    '({ flightVariationScopedRecords, climateScopedRecords, mergeScopedReportRecords })'
  ].join('\n');
  const helpers = runInNewContext(code, {});
  const records = [
    { id: 'shared', tipo: 'vuelos', ownerId: 'two', syncStatus: 'synced' },
    { id: 'own', tipo: 'vuelos', ownerId: 'one', syncStatus: 'pending' },
    { id: 'private-local', tipo: 'vuelos', ownerId: 'two', syncStatus: 'pending' }
  ];
  assert.deepEqual(Array.from(helpers.flightVariationScopedRecords(records, user), row => row.id), ['shared', 'own']);
  assert.deepEqual(Array.from(helpers.mergeScopedReportRecords([], records, user, true), row => row.id), ['shared', 'own']);
  assert.deepEqual(Array.from(helpers.climateScopedRecords(records.map(row => ({ ...row, tipo: 'clima' })), user), row => row.id), ['shared', 'own']);
});
