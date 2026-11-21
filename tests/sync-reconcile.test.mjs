import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('function reconcileCloudRecords(');
const end = source.indexOf('\nconst deleteRecord', start);
assert.ok(start >= 0 && end > start);
const user = { id: 'one', username: 'uno', role: 'supervisor', status: 'active', allowedZones: ['1'] };

function harness(initial) {
  let records = new Map(initial.map(record => [record.id, record]));
  let puts = 0, deletes = 0;
  const state = { user };
  state.db = {
    transaction() {
      const working = new Map(records);
      let aborted = false;
      const tx = {
        abort() { aborted = true; },
        objectStore() {
          return {
            getAll() {
              const request = {};
              queueMicrotask(() => {
                request.result = [...working.values()];
                request.onsuccess();
                if (aborted) tx.onabort();
                else {
                  records = working;
                  tx.oncomplete();
                }
              });
              return request;
            },
            put(record) { puts++; working.set(record.id, record); },
            delete(id) { deletes++; working.delete(id); }
          };
        }
      };
      return tx;
    }
  };
  const reconcile = runInNewContext(source.slice(start, end) + '\nreconcileCloudRecords', {
    state, sameOfflineScope: expected => state.user === expected
  });
  return { reconcile, state, records: () => records, counts: () => ({ puts, deletes }) };
}

test('preserves pending edits and deletions while replacing or removing synchronized records', async () => {
  const pending = { id: 'edit', syncStatus: 'pending', datos: { value: 'local' } };
  const deletion = { id: 'delete', syncStatus: 'delete-pending' };
  const unchanged = { id: 'same', syncStatus: 'synced', ownerUsername: 'uno' };
  const h = harness([
    pending, deletion, unchanged,
    { id: 'stale', syncStatus: 'synced', ownerUsername: 'uno' },
    { id: 'old', syncStatus: 'synced', ownerUsername: 'uno', datos: { value: 1 } }
  ]);
  await h.reconcile([
    { id: 'edit', syncStatus: 'synced', datos: { value: 'remote' } },
    { id: 'delete', syncStatus: 'synced' },
    unchanged,
    { id: 'old', syncStatus: 'synced', ownerUsername: 'uno', datos: { value: 2 } },
    { id: 'new', syncStatus: 'synced', ownerUsername: 'uno' }
  ], user);
  assert.equal(h.records().get('edit').datos.value, 'local');
  assert.equal(h.records().get('delete').syncStatus, 'delete-pending');
  assert.equal(h.records().has('stale'), false);
  assert.equal(h.records().get('old').datos.value, 2);
  assert.equal(h.records().has('new'), true);
  assert.deepEqual(h.counts(), { puts: 2, deletes: 1 });
});

test('aborts without changing local records after an account change', async () => {
  const h = harness([{ id: 'old', syncStatus: 'synced', ownerUsername: 'uno' }]);
  const result = h.reconcile([{ id: 'new', syncStatus: 'synced' }], user);
  h.state.user = { ...user, id: 'two' };
  await assert.rejects(result, /cancelada/);
  assert.equal(h.records().has('old'), true);
  assert.equal(h.records().has('new'), false);
});

test('acknowledging an upload preserves edits and deletions made while it was in flight', async () => {
  const first = source.indexOf('function acknowledgeUploadedRecord(');
  const last = source.indexOf('\nconst deleteRecord', first);
  assert.ok(first >= 0 && last > first);
  const original = { id: 'a', syncStatus: 'pending', syncOrigin: 'new', datos: { value: 1 } };
  for (const [current, expectedStatus, expectedOrigin, needsSync] of [
    [original, 'synced', undefined, false],
    [{ ...original, datos: { value: 2 } }, 'pending', 'activity-update', true],
    [{ ...original, syncStatus: 'delete-pending' }, 'delete-pending', 'new', true],
    [undefined, 'delete-pending', 'new', true]
  ]) {
    let saved = current;
    const state = { db: { transaction() {
      const tx = {
        objectStore() {
          return {
            get() {
              const request = {};
              queueMicrotask(() => {
                request.result = current;
                request.onsuccess();
                tx.oncomplete();
              });

              return request;
            },
            put(record) { saved = record; }
          };
        }
      };
      return tx;
    } } };
    const helpers = runInNewContext(source.slice(first, last) + '\n({ acknowledgeUploadedRecord, canonicalJson })', { state });
    assert.equal(await helpers.acknowledgeUploadedRecord(original), needsSync);
    assert.equal(saved.syncStatus, expectedStatus);
    assert.equal(saved.syncOrigin, expectedOrigin);
    if (current && current.datos.value === 2) assert.equal(saved.datos.value, 2);
    assert.equal(JSON.stringify(helpers.canonicalJson({ b: 2, a: { y: 1, x: 2 } })),
      JSON.stringify(helpers.canonicalJson({ a: { x: 2, y: 1 }, b: 2 })));
  }
});

test('does not mark a different server record with the same ID as synchronized', async () => {
  const first = source.indexOf('async function syncCloudRecords(');
  const last = source.indexOf('\nfunction waitForSyncIdle(', first);
  assert.ok(first >= 0 && last > first);
  const record = { id: 'a', ownerUsername: 'uno', tipo: 'malezas',
    syncStatus: 'pending', syncOrigin: 'new', datos: { value: 'local' } };
  const state = { configured: true, user, syncBusy: false, syncIdleWaiters: [], syncRequested: false };
  let acknowledged = false;
  const sync = runInNewContext(source.slice(first, last) + '\nsyncCloudRecords', {
    state, navigator: { onLine: true }, sameOfflineScope: () => true,
    fetchProfile: async () => user, offlineSnapshotKey: () => 'scope',
    syncWeeklyVisitOutbox: async () => ({ uploaded: 0, conflicts: 0 }),
    getRecords: async () => [record], isActiveAdmin: () => false,
    cloudRequest: async path => path.startsWith('field_records?on_conflict')
      ? [] : [{ id: 'a', owner_id: 'one', tipo: 'malezas', datos: { value: 'different' } }],
    canonicalJson: value => value,
    acknowledgeUploadedRecord: async () => { acknowledged = true; },
    handleCloudError() {}
  });
  await assert.rejects(sync(false), /registro diferente/);
  assert.equal(acknowledged, false);
  assert.equal(record.syncStatus, 'pending');
});
