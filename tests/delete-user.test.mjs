import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteUserAccount } from '../supabase/functions/_shared/delete-user.mjs';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const adminId = '12345678-1234-1234-1234-123456789abc';
const targetId = 'abcdef12-1234-1234-1234-123456789abc';
function client(caller = { role: 'admin', status: 'active', auth_user_id: adminId }, target = { auth_user_id: targetId }) {
  const deleted = [];
  return {
    deleted,
    from: () => ({ select: () => ({ eq: (_, id) => ({ maybeSingle: async () => ({ data: id === adminId ? caller : target, error: null }) }) }) }),
    auth: { admin: { deleteUser: async id => { deleted.push(id); return { error: null }; } } }
  };
}
test('only an active administrator can delete another existing account', async () => {
  const api = client();
  await deleteUserAccount(api, adminId, targetId);
  assert.deepEqual(api.deleted, [targetId]);
  await assert.rejects(deleteUserAccount(api, adminId, adminId), /propia cuenta/);
  await assert.rejects(deleteUserAccount(client({ role: 'supervisor', status: 'active', auth_user_id: adminId }), adminId, targetId), /administradora activa/);
  await assert.rejects(deleteUserAccount(client({ role: 'admin', status: 'suspended', auth_user_id: adminId }), adminId, targetId), /administradora activa/);
  await assert.rejects(deleteUserAccount(client(undefined, { auth_user_id: null }), adminId, targetId), /ya fue eliminada/);
  await assert.rejects(deleteUserAccount(api, adminId, 'not-a-uuid'), /usuario válido/);
  assert.equal(api.deleted.length, 1);
});
test('a failed Auth deletion is reported without claiming success', async () => {
  const api = client();
  api.auth.admin.deleteUser = async () => ({ error: { message: 'database failure' } });
  const original = console.error;
  console.error = () => {};
  try { await assert.rejects(deleteUserAccount(api, adminId, targetId), /No se pudo eliminar/); }
  finally { console.error = original; }
});
test('the delete action requires confirmation and leaves the button usable after failure', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const start = source.indexOf('async function deleteMember(button)');
  const end = source.indexOf('\nasync function reviewRecord(', start);
  assert.ok(start >= 0 && end > start);
  let confirmed = false;
  let calls = 0;
  let refreshed = 0;
  const button = { dataset: { memberDelete: targetId, memberName: 'Persona' }, disabled: false };
  const message = { classList: { add() {} } };
  const { deleteMember } = runInNewContext(source.slice(start, end) + '\n({ deleteMember })', {
    state: { user: { id: adminId } }, isActiveAdmin: () => true,
    window: { confirm: () => confirmed }, apiRequest: async () => { calls++; throw new Error('Sin conexión'); },
    accessToken: async () => 'token', authMessage() {}, $: () => message,
    refreshUsers: async () => { refreshed++; }
  });
  await deleteMember(button);
  assert.equal(calls, 0);
  confirmed = true;
  await assert.rejects(deleteMember(button), /Sin conexión/);
  assert.equal(button.disabled, false);
  assert.equal(refreshed, 0);
});

test('the user list offers deletion for others but not the current administrator', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const start = source.indexOf('function renderUsers(users, zones)');
  const end = source.indexOf('\nasync function fetchUserZones()', start);
  assert.ok(start >= 0 && end > start);
  const list = {};
  const { renderUsers } = runInNewContext(source.slice(start, end) + '\n({ renderUsers })', {
    state: { user: { id: adminId } }, $: () => list,
    esc: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'),
    initials: () => 'U', roleName: role => role, normalizeZoneValue: value => value,
    ROLE_OPTIONS: ['admin', 'supervisor'], emptyState: () => ''
  });
  renderUsers([
    { id: adminId, display_name: 'Administrador', username: 'admin', role: 'admin', status: 'active' },
    { id: targetId, display_name: 'Otra persona', username: 'otro', role: 'supervisor', status: 'active' }
  ], []);
  assert.match(list.innerHTML, new RegExp('data-member-delete="' + targetId + '"'));
  assert.doesNotMatch(list.innerHTML, new RegExp('data-member-delete="' + adminId + '"'));
});
