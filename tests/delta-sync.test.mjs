import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function extract(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}
const user = { id: 'one', username: 'uno', role: 'supervisor', status: 'active' };
const synced = (id, value) => ({ id, ownerId: 'one', syncStatus: 'synced', datos: { value } });
const epoch = '01234567-89ab-cdef-0123-456789abcdef';
const cursor = (xmin, xmax, active = '') => `${epoch}|${xmin}:${xmax}:${active}`;

function harness(initial, failCommit = false) {
  let records = new Map(initial.map(record => [record.id, record]));
  let snapshots = new Map();
  const state = { user };
  state.db = { transaction() {
    const working = new Map(records), workingSnapshots = new Map(snapshots);
    let aborted = false;
    const tx = {
      abort() { aborted = true; },
      objectStore(name) {
        const map = name === 'records' ? working : workingSnapshots;
        return {
          getAll() {
            const request = {};
            queueMicrotask(() => {
              request.result = [...map.values()];
              request.onsuccess();
              if (aborted || failCommit) tx.onabort();
              else { records = working; snapshots = workingSnapshots; tx.oncomplete(); }
            });
            return request;
          },
          put(value) { map.set(value.id, value); },
          delete(id) { map.delete(id); }
        };
      }
    };
    return tx;
  } };
  const reconcile = runInNewContext(
    extract('function reconcileCloudRecords(', '\nfunction validSyncCursor(') + '\nreconcileCloudRecords',
    { state, sameOfflineScope: current => state.user.id === current.id && state.user.role === current.role }
  );
  return { state, reconcile, records: () => records, snapshots: () => snapshots };
}

test('requires a full refresh for a newly visible record even if it is locally cached', async () => {
  const h = harness([synced('a', 1), synced('b', 0)]);
  const snapshot = { id: 'scope', cursor: '7', previousIds: ['a'], full: false };
  await assert.rejects(h.reconcile([], user, ['a', 'b'], snapshot), error => error.needsFullSync === true);
  assert.equal(h.records().get('b').datos.value, 0);
  assert.equal(h.snapshots().size, 0);
});

test('updates records, removals and cursor together while preserving pending edits', async () => {
  const pending = { id: 'pending', ownerId: 'one', syncStatus: 'pending', datos: { value: 'local' } };
  const h = harness([synced('old', 1), pending]);
  const snapshot = { id: 'scope', cursor: '8', previousIds: [], full: true };
  await h.reconcile([synced('new', 2), synced('pending', 'remote')], user, ['new', 'pending'], snapshot);
  assert.equal(h.records().has('old'), false);
  assert.equal(h.records().get('new').datos.value, 2);
  assert.equal(h.records().get('pending').datos.value, 'local');
  assert.equal(h.snapshots().get('scope').cursor, '8');
  assert.deepEqual(Array.from(h.snapshots().get('scope').knownIds).sort(), ['new', 'pending']);
});

test('a failed transaction does not commit records or advance the cursor', async () => {
  const h = harness([synced('old', 1)], true);
  await assert.rejects(h.reconcile([synced('new', 2)], user, ['new'],
    { id: 'scope', cursor: '8', previousIds: [], full: true }));
  assert.equal(h.records().has('old'), true);
  assert.equal(h.records().has('new'), false);
  assert.equal(h.snapshots().size, 0);
});

test('a permission change during reconciliation leaves records and cursor untouched', async () => {
  const h = harness([synced('old', 1)]);
  const pending = h.reconcile([synced('new', 2)], user, ['new'],
    { id: 'scope', cursor: '8', previousIds: [], full: true });
  h.state.user = { ...user, role: 'aereo' };
  await assert.rejects(pending);
  assert.equal(h.records().has('old'), true);
  assert.equal(h.records().has('new'), false);
  assert.equal(h.snapshots().size, 0);
});

test('rejects incomplete or regressing incremental responses', async () => {
  const code = extract('function validSyncCursor(', '\nfunction acknowledgeUploadedRecord(');
  let response = { cursor: cursor(1, 3), full: true, ids: ['a'], records: [] };
  const load = runInNewContext(code + '\nfetchCloudRecordDelta', { cloudRequest: async () => response });
  await assert.rejects(load(null), /incompleta/);
  response.full = false;
  await assert.rejects(load(cursor(1, 4)), /no es válida/);
  response = { cursor: cursor(1, 5), full: false, ids: ['a', 'a'], records: [] };
  await assert.rejects(load(cursor(1, 4)), /no es válida/);
  response = { cursor: cursor(1, 5, '2,4'), full: false, ids: ['a'], records: [] };
  assert.equal((await load(cursor(1, 4))).cursor, cursor(1, 5, '2,4'));
});

test('requires a complete response when the server resets a cursor', async () => {
  const code = extract('function validSyncCursor(', '\nfunction acknowledgeUploadedRecord(');
  let response = { cursor: cursor(1, 2), full: true, ids: ['a'], records: [] };
  const load = runInNewContext(code + '\nfetchCloudRecordDelta', { cloudRequest: async () => response });
  await assert.rejects(load(cursor(1, 9)), /incompleta/);
  response = { cursor: cursor(1, 2), full: true, ids: [], records: [] };
  assert.equal((await load(cursor(1, 9))).full, true);
  response = { cursor: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa|1:9:`, full: false, ids: [], records: [] };
  await assert.rejects(load(cursor(1, 9)), /no es válida/);
});

test('recovers a missing local snapshot with a full refresh', async () => {
  const code = extract('async function syncCloudRecords(', '\nfunction waitForSyncIdle(');
  const state = { configured: true, user, syncBusy: false, syncIdleWaiters: [], syncRequested: false };
  const cursors = [], snapshots = [];
  const sync = runInNewContext(code + '\nsyncCloudRecords', {
    state, navigator: { onLine: true }, sameOfflineScope: () => true,
    fetchProfile: async () => user, offlineSnapshotKey: () => 'scope',
    syncWeeklyVisitOutbox: async () => ({ uploaded: 0, conflicts: 0 }),
    getRecords: async () => [], isActiveAdmin: () => false,
    getOfflineSnapshot: async () => ({ cursor: '5', knownIds: ['a'] }),
    validSyncCursor: () => true,
    fetchCloudRecordDelta: async cursor => {
      cursors.push(cursor);
      return { cursor: '6', full: cursor === null, ids: ['a'], records: cursor === null ? [synced('a', 2)] : [] };
    },
    mapCloudRecord: row => row,
    reconcileCloudRecords: async (_records, _user, _ids, snapshot) => {
      snapshots.push(snapshot);
      if (!snapshot.full) throw Object.assign(new Error('missing'), { needsFullSync: true });
    },
    updateConnection() {}, refreshLists: async () => {}, $: () => ({ hidden: true }),
    handleCloudError() {}
  });
  const result = await sync(false);
  assert.deepEqual(cursors, ['5', null]);
  assert.equal(snapshots[1].full, true);
  assert.equal(result.downloaded, 1);
});

test('a suspended profile is applied before sending queued visits', async () => {
  const code = extract('async function syncCloudRecords(', '\nfunction waitForSyncIdle(');
  const state = { configured: true, user, syncBusy: false, syncIdleWaiters: [], syncRequested: false };
  let uploaded = false;
  const sync = runInNewContext(code + '\nsyncCloudRecords', {
    state, navigator: { onLine: true }, sameOfflineScope: () => true,
    fetchProfile: async () => ({ ...user, status: 'suspended' }),
    offlineSnapshotKey: () => 'scope',
    startSession: async profile => { state.user = profile; },
    syncWeeklyVisitOutbox: async () => { uploaded = true; },
    handleCloudError() {}
  });
  await assert.rejects(sync(false), /permisos/);
  assert.equal(state.user.status, 'suspended');
  assert.equal(uploaded, false);
});
