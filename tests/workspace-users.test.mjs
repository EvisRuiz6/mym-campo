import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');

function extract(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}

test('reports network failures and missing user services without exposing raw fetch errors', async () => {
  const code = extract('async function apiRequest(path, options)', '\nfunction saveAuthSession(');
  let fetchResponse;
  const { apiRequest } = runInNewContext(code + '\n({ apiRequest })', {
    supabaseConfig: () => ({ url: 'https://example.test', anonKey: 'public' }),
    navigator: { onLine: true }, console: { error() {} },
    fetch: async () => {
      if (!fetchResponse) throw new TypeError('Failed to fetch');
      return fetchResponse;
    }
  });
  await assert.rejects(apiRequest('/rest/v1/field_lots', {}), /No se pudo conectar.*CORS/);
  fetchResponse = { ok: false, status: 404, text: async () => '{"message":"Not found"}' };
  await assert.rejects(apiRequest('/functions/v1/create-user', {}), /no está desplegado/);
  fetchResponse = { ok: false, status: 403, text: async () => '{}' };
  await assert.rejects(apiRequest('/rest/v1/field_lots', {}), /no tiene permisos/);
});

test('loads zones from all pages independently of the users list', async () => {
  const code = extract('async function fetchUserZones()', '\nfunction populateInviteRoles()');
  const controls = {
    '#users-retry': {},
    '#users-load-status-text': {},
    '#users-load-status': {}
  };
  const state = { user: { id: 'admin' }, usersLoadPromise: null, zoneOptions: [], zonesReady: false };
  const paths = [];
  let usersFail = true;
  const rendered = [];
  const { refreshUsers } = runInNewContext(code + '\n({ refreshUsers })', {
    state, $: selector => controls[selector], isActiveAdmin: () => true,
    normalizeZoneValue: value => String(value || '').trim(),
    cloudRequest: async path => {
      paths.push(path);
      if (path.startsWith('profiles')) {
        if (usersFail) throw new Error('Sin permiso para usuarios');
        return [{ id: 'member' }];
      }
      return path.endsWith('offset=0')
        ? Array.from({ length: 1000 }, (_, i) => ({ zone: i % 2 ? '3' : '1' }))
        : [{ zone: '4' }];
    },
    updateInviteZoneVisibility() {}, updateCreateUserZoneVisibility() {},
    renderUsers: (users, zones) => rendered.push({ users, zones }),
    console: { error() {} }
  });
  await refreshUsers();
  assert.equal(state.zonesReady, true);
  assert.deepEqual(Array.from(state.zoneOptions), ['1', '3', '4']);
  assert.match(controls['#users-load-status-text'].textContent, /lista de usuarios/);
  assert.equal(controls['#users-load-status'].hidden, false);
  assert.equal(paths.filter(path => path.startsWith('field_lots')).length, 2);
  usersFail = false;
  await refreshUsers();
  assert.equal(controls['#users-load-status'].hidden, true);
  assert.equal(rendered.length, 1);
});

test('zone failure is visible and retry keeps previous choices until a successful reload', async () => {
  const code = extract('async function fetchUserZones()', '\nfunction populateInviteRoles()');
  const controls = {
    '#users-retry': {},
    '#users-load-status-text': {},
    '#users-load-status': {}
  };
  const state = { user: { id: 'admin' }, usersLoadPromise: null, zoneOptions: ['anterior'], zonesReady: true };
  let fail = true;
  let refreshed = 0;
  const { refreshUsers } = runInNewContext(code + '\n({ refreshUsers })', {
    state, $: selector => controls[selector], isActiveAdmin: () => true,
    normalizeZoneValue: value => String(value || '').trim(),
    cloudRequest: async path => {
      if (path.startsWith('profiles')) return [];
      if (fail) throw new Error('Sin conexión');
      return [{ zone: '3' }];
    },
    updateInviteZoneVisibility() { refreshed++; }, updateCreateUserZoneVisibility() {},
    renderUsers() {}, console: { error() {} }
  });
  await refreshUsers();
  assert.equal(state.zonesReady, false);
  assert.deepEqual(state.zoneOptions, ['anterior']);
  assert.match(controls['#users-load-status-text'].textContent, /zonas permitidas.*Sin conexión/);
  assert.equal(refreshed, 0);
  fail = false;
  await refreshUsers();
  assert.equal(state.zonesReady, true);
  assert.deepEqual(Array.from(state.zoneOptions), ['3']);
  assert.equal(controls['#users-load-status'].hidden, true);
  assert.equal(refreshed, 1);
});

test('refreshing zone choices preserves selected zones in each user form', () => {
  const code = extract('function updateCreateUserZoneVisibility()', '\nfunction userCanAccessLot(');
  const controls = {
    '#create-user-role': { value: 'supervisor' },
    '#invite-user-role': { value: 'terrestre' },
    '#create-user-zone-picker': {},
    '#invite-user-zone-picker': {},
    '#create-user-zone-policy': {},
    '#invite-zone-policy': {},
    '#create-user-zones': { selected: [{ value: '1' }] },
    '#invite-user-zones': { selected: [{ value: '3' }] }
  };
  const calls = [];
  const ui = runInNewContext(code + '\n({ updateCreateUserZoneVisibility, updateInviteZoneVisibility })', {
    state: { zoneOptions: ['1', '3'] },
    $: selector => controls[selector],
    $$: (selector, root) => root.selected,
    renderZoneCheckboxes: (container, zones, selected) => calls.push({ container, selected })
  });
  ui.updateCreateUserZoneVisibility();
  ui.updateInviteZoneVisibility();
  assert.deepEqual(Array.from(calls[0].selected), ['1']);
  assert.deepEqual(Array.from(calls[1].selected), ['3']);
  assert.equal(controls['#create-user-zone-picker'].hidden, false);
  assert.equal(controls['#invite-user-zone-picker'].hidden, false);
});

test('restores menu state per account and rejects pages outside the current role', () => {
  const code = extract('function workspaceMenuKey()', '\nfunction setMobileMenu(open)');
  const storage = new Map();
  const groups = [
    { dataset: { menuGroup: 'campo' }, open: true },
    { dataset: { menuGroup: 'administracion' }, open: false }
  ];
  const state = { user: { id: 'a' } };
  let admin = true;
  const menu = runInNewContext(code + '\n({ saveWorkspaceMenu, restoreWorkspaceMenu })', {
    state, WORKSPACE_MENU_KEY: 'menu:', WORKSPACE_PAGES: ['inicio', 'usuarios', 'seguimiento-lotes'],
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    $$: () => groups, isActiveAdmin: () => admin, canAccessLotFollowup: () => false,
    console, toast() {}
  });
  menu.saveWorkspaceMenu('usuarios');
  groups[0].open = false;
  groups[1].open = true;
  assert.equal(menu.restoreWorkspaceMenu(), 'usuarios');
  assert.equal(groups[0].open, true);
  assert.equal(groups[1].open, false);
  admin = false;
  assert.equal(menu.restoreWorkspaceMenu(), 'inicio');
  state.user = { id: 'b' };
  assert.equal(menu.restoreWorkspaceMenu(), 'inicio');
  assert.equal(groups[1].open, true);
  storage.set('menu:b', '{"page":"[invalid","groups":{}}');
  assert.equal(menu.restoreWorkspaceMenu(), 'inicio');
});

test('opens and closes the mobile menu with synchronized accessibility state', () => {
  const code = extract('function setMobileMenu(open)', '\nfunction navigate(page)');
  const classes = () => ({
    values: new Set(),
    toggle(name, enabled) { if (enabled) this.values.add(name); else this.values.delete(name); },
    contains(name) { return this.values.has(name); }
  });
  let focused = false;
  const controls = {
    '#workspace-menu': { classList: classes() },
    '#mobile-menu-toggle': { setAttribute(name, value) { this[name] = value; } },
    '#mobile-menu-backdrop': { hidden: true },
    '#mobile-menu-close': { focus() { focused = true; } }
  };
  const body = { classList: classes() };
  const { setMobileMenu } = runInNewContext(code + '\n({ setMobileMenu })', {
    $: selector => controls[selector], document: { body }
  });
  setMobileMenu(true);
  assert.equal(controls['#workspace-menu'].classList.contains('mobile-open'), true);
  assert.equal(controls['#mobile-menu-toggle']['aria-expanded'], 'true');
  assert.equal(controls['#mobile-menu-backdrop'].hidden, false);
  assert.equal(body.classList.contains('mobile-menu-open'), true);
  assert.equal(focused, true);
  setMobileMenu(false);
  assert.equal(controls['#workspace-menu'].classList.contains('mobile-open'), false);
  assert.equal(controls['#mobile-menu-toggle']['aria-expanded'], 'false');
  assert.equal(controls['#mobile-menu-backdrop'].hidden, true);
  assert.equal(body.classList.contains('mobile-menu-open'), false);
});

test('menu controls close the drawer on outside tap, Escape, and desktop resize', () => {
  const menuCode = extract('function setMobileMenu(open)', '\nfunction navigate(page)');
  const handlers = extract(
    "$$('[data-menu-group]').forEach(group => group.addEventListener('toggle'",
    "  if (event.target.closest('#users-retry'))"
  );
  const classes = () => ({
    values: new Set(),
    toggle(name, enabled) { if (enabled) this.values.add(name); else this.values.delete(name); },
    contains(name) { return this.values.has(name); }
  });
  let focused = '';
  let groupToggle;
  const documentHandlers = {};
  const windowHandlers = {};
  const controls = {
    '#workspace-menu': { classList: classes() },
    '#mobile-menu-toggle': { setAttribute() {}, focus() { focused = 'toggle'; } },
    '#mobile-menu-backdrop': { hidden: true },
    '#mobile-menu-close': { focus() { focused = 'close'; } }
  };
  const document = { body: { classList: classes() }, addEventListener: (type, fn) => { documentHandlers[type] = fn; } };
  const window = { innerWidth: 320, addEventListener: (type, fn) => { windowHandlers[type] = fn; } };
  let saves = 0;
  runInNewContext(menuCode + '\n' + handlers + '\n});', {
    document, window, $: selector => controls[selector],
    $$: () => [{ addEventListener(type, fn) { if (type === 'toggle') groupToggle = fn; } }],
    saveWorkspaceMenu() { saves++; }
  });
  const click = selector => documentHandlers.click({ target: { closest: query => query.split(', ').includes(selector) } });
  click('#mobile-menu-toggle');
  assert.equal(controls['#mobile-menu-backdrop'].hidden, false);
  assert.equal(focused, 'close');
  click('#mobile-menu-backdrop');
  assert.equal(controls['#mobile-menu-backdrop'].hidden, true);
  assert.equal(focused, 'toggle');
  click('#mobile-menu-toggle');
  documentHandlers.keydown({ key: 'Escape' });
  assert.equal(controls['#mobile-menu-backdrop'].hidden, true);
  click('#mobile-menu-toggle');
  window.innerWidth = 761;
  windowHandlers.resize();
  assert.equal(controls['#mobile-menu-backdrop'].hidden, true);
  groupToggle();
  assert.equal(saves, 1);
});
