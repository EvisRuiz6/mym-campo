import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function canManageRecordForUser(record, user, hasLotAccess) {');
const helperEnd = appSource.indexOf('\nfunction canManageRecord(record)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Record management permission helper must exist in app.js');
const canManageRecordForUser = runInNewContext(
  appSource.slice(helperStart, helperEnd) + '\ncanManageRecordForUser'
);

test('users can manage their own active records, including supervisors', () => {
  const record = { ownerUsername: 'ana' };
  for (const role of ['aereo', 'terrestre', 'supervisor']) {
    assert.equal(
      canManageRecordForUser(record, { username: 'ana', role, status: 'active' }, true),
      true
    );
  }
});

test('only an active administrator can manage another user record', () => {
  const record = { ownerUsername: 'ana' };
  assert.equal(
    canManageRecordForUser(record, { username: 'admin', role: 'admin', status: 'active' }, true),
    true
  );
  assert.equal(
    canManageRecordForUser(record, { username: 'supervisor', role: 'supervisor', status: 'active' }, true),
    false
  );
});

test('management permission requires an active user and accessible record scope', () => {
  const record = { ownerUsername: 'ana' };
  assert.equal(
    canManageRecordForUser(record, { username: 'ana', role: 'aereo', status: 'suspended' }, true),
    false
  );
  assert.equal(
    canManageRecordForUser(record, { username: 'ana', role: 'aereo', status: 'active' }, false),
    false
  );
});
