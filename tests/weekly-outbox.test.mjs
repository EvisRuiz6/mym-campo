import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function syncWeeklyVisitOutbox(');
const end = source.indexOf('\nasync function syncCloudRecords(', start);
assert.ok(start >= 0 && end > start);
const user = { id: 'one', role: 'supervisor', status: 'active', allowedZones: ['1'] };
const makeGroup = () => ({
  id: 'group', userId: 'one', scope: 'scope', status: 'pending',
  captures: [{ record_id: 'a', lot_code: '17' }, { record_id: 'b', lot_code: '18' }]
});

function harness(initial, request) {
  const groups = new Map(initial.map(group => [group.id, structuredClone(group)]));
  const calls = [];
  const state = { user };
  const sync = runInNewContext(source.slice(start, end) + '\nsyncWeeklyVisitOutbox', {
    state, sameOfflineScope: expected => state.user.id === expected.id,
    offlineSnapshotKey: () => 'scope',
    getWeeklyVisitOutbox: async () => [...groups.values()].map(group => structuredClone(group)),
    writeWeeklyVisitOutbox: async (group, operation) => {
      if (operation === 'delete') groups.delete(group.id);
      else groups.set(group.id, structuredClone(group));
    },
    cloudRequest: async (path, options) => { calls.push({ path, options }); return request(options); }
  });
  return { sync, groups, calls, state };
}

test('confirms the whole group before removing it and sends stable identities', async () => {
  const h = harness([makeGroup()], async () => ['a', 'b']);
  const result = await h.sync(user);
  assert.equal(result.uploaded, 2);
  assert.equal(h.groups.size, 0);
  assert.equal(h.calls[0].path, 'rpc/save_lot_visit_captures');
  assert.deepEqual(h.calls[0].options.body.p_captures.map(item => item.record_id), ['a', 'b']);
});

test('retains the original group on network failure or incomplete confirmation', async () => {
  for (const request of [
    async () => { throw Object.assign(new Error('red'), { connectionFailure: true }); },
    async () => ['a']
  ]) {
    const h = harness([makeGroup()], request);
    await assert.rejects(h.sync(user));
    assert.deepEqual(h.groups.get('group'), makeGroup());
  }
});

test('preserves a rejected group as a conflict and never uploads another account', async () => {
  const other = { ...makeGroup(), id: 'other', userId: 'two' };
  const h = harness([makeGroup(), other], async () => {
    throw Object.assign(new Error('Ya existe una visita'), { httpStatus: 400 });
  });
  const result = await h.sync(user);
  assert.equal(result.conflicts, 1);
  assert.equal(h.groups.get('group').status, 'conflict');
  assert.equal(h.groups.get('group').error, 'Ya existe una visita');
  assert.deepEqual(h.groups.get('group').captures, makeGroup().captures);
  assert.equal(h.calls.length, 1);
  assert.equal(h.groups.get('other').status, 'pending');
});

test('does not send a group when the authorized scope changes', async () => {
  const group = { ...makeGroup(), scope: 'old-scope' };
  const h = harness([group], async () => { throw new Error('must not send'); });
  const result = await h.sync(user);
  assert.equal(result.conflicts, 1);
  assert.equal(h.calls.length, 0);
  assert.equal(h.groups.get('group').status, 'conflict');
});

test('replaces only an existing conflict and removes its draft with the confirmed group', async () => {
  const first = source.indexOf('function writeWeeklyVisitOutbox(');
  const last = source.indexOf('\nfunction offlineSnapshotKey(', first);
  assert.ok(first >= 0 && last > first);
  const groups = new Map([['group', { ...makeGroup(), status: 'conflict' }]]);
  const drafts = new Map([['group', { id: 'group' }]]);
  const state = { db: { transaction() {
    let aborted = false;
    const tx = {
      abort() { aborted = true; },
      objectStore(name) {
        const map = name === 'weekly-visit-drafts' ? drafts : groups;
        return {
          get(id) {
            const request = {};
            queueMicrotask(() => {
              request.result = map.get(id);
              request.onsuccess();
              if (aborted) tx.onabort();
              else tx.oncomplete();
            });
            return request;
          },
          put(group) { map.set(group.id, group); },
          delete(id) { map.delete(id); queueMicrotask(() => tx.oncomplete()); }
        };
      }
    };
    return tx;
  } } };
  const write = runInNewContext(source.slice(first, last) + '\nwriteWeeklyVisitOutbox', { state });
  const pending = makeGroup();
  await write(pending, 'replace-conflict');
  assert.equal(groups.get('group').status, 'pending');
  await assert.rejects(write(pending, 'replace-conflict'), /grupo cambió/);
  assert.equal(groups.get('group').status, 'pending');
  await write(pending, 'delete');
  assert.equal(groups.has('group'), false);
  assert.equal(drafts.has('group'), false);
});

test('does not show an empty pending list while a visit group or deletion is queued', async () => {
  const first = source.indexOf('async function refreshLists()');
  const last = source.indexOf('\nfunction toast(', first);
  assert.ok(first >= 0 && last > first);
  let groups = [makeGroup()], records = [];
  const nodes = new Map();
  const element = key => {
    if (!nodes.has(key)) nodes.set(key, { value: '', innerHTML: '', textContent: '' });
    return nodes.get(key);
  };
  const refresh = runInNewContext(source.slice(first, last) + '\nrefreshLists', {
    state: { db: {}, user: { ...user, username: 'uno' } },
    getRecords: async () => records, getWeeklyVisitOutbox: async () => groups,
    sameOfflineScope: () => true, visibleLocalRecords: () => [],
    isActiveAdmin: () => false, weeklyOutboxMarkup: () => 'queued group',
    recordRow: () => '', emptyState: message => message, canManageRecord: () => false,
    $: element
  });
  await refresh();
  assert.equal(element('#pending-list').innerHTML, '');
  groups = [];
  records = [{ syncStatus: 'delete-pending', ownerUsername: 'uno' }];
  await refresh();
  assert.equal(element('#pending-list').innerHTML, '');
  records = [];
  await refresh();
  assert.equal(element('#pending-list').innerHTML, 'No hay capturas pendientes.');
});
