import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchLotZones,
  noEmailAuthAddress,
  validateInvitation,
  validateUserCreation,
  zonesForRole
} from '../supabase/functions/_shared/invitation.mjs';

test('loads unique zones from every page of actual lots', async () => {
  const pages = [
    Array.from({ length: 1000 }, (_, index) => ({ zone: index % 2 ? '3' : '1' })),
    [{ zone: '4' }, { zone: '3' }]
  ];
  const requestedRanges = [];
  const client = {
    from(table) {
      assert.equal(table, 'field_lots');
      return {
        select(columns) {
          assert.equal(columns, 'zone');
          return {
            order(column) {
              assert.equal(column, 'lot_code');
              return {
                range(from, to) {
                  requestedRanges.push([from, to]);
                  return Promise.resolve({ data: pages.shift(), error: null });
                }
              };
            }
          };
        }
      };
    }
  };

  const zones = await fetchLotZones(client);
  assert.deepEqual(zones, ['1', '3', '4']);
  assert.deepEqual(zonesForRole('admin', [], zones), ['1', '3', '4']);
  assert.throws(() => zonesForRole('supervisor', ['not-in-lots'], zones));
  assert.deepEqual(requestedRanges, [[0, 999], [1000, 1999]]);
});

test('normalizes and validates a username-only account', () => {
  assert.deepEqual(validateUserCreation({
    username: ' Campo.User ',
    display_name: '  Usuario de campo  ',
    role: 'supervisor',
    password: 'clave-segura-123',
    allowed_zones: [' 1 ', '3', '1']
  }), {
    username: 'campo.user',
    display_name: 'Usuario de campo',
    role: 'supervisor',
    password: 'clave-segura-123',
    allowed_zones: ['1', '3']
  });
  assert.equal(noEmailAuthAddress('campo.user'), 'campo.user@users.mym-campo.invalid');
});

test('rejects invalid username-only account data', () => {
  for (const body of [
    { username: 'x!', display_name: 'Nombre', role: 'aereo', password: '12345678' },
    { username: 'campo', display_name: ' ', role: 'aereo', password: '12345678' },
    { username: 'campo', display_name: 'Nombre', role: 'owner', password: '12345678' },
    { username: 'campo', display_name: 'Nombre', role: 'aereo', password: '1234567' },
    { username: 'campo', display_name: 'Nombre', role: 'aereo', password: '12345678', allowed_zones: ['?'] },
    { username: 'campo', display_name: 'Nombre', role: 'terrestre', password: '12345678', allowed_zones: ['1'], email: 'unexpected@example.com' }
  ]) {
    assert.throws(() => validateUserCreation(body));
  }
});

test('normalizes and returns a valid invitation', () => {
  assert.deepEqual(validateInvitation({
    email: '  Campo.User@Example.COM ',
    username: ' Campo.User ',
    display_name: '  Usuario de campo  ',
    role: 'supervisor',
    allowed_zones: [' 1 ', '3', '1']
  }), {
    email: 'campo.user@example.com',
    username: 'campo.user',
    display_name: 'Usuario de campo',
    role: 'supervisor',
    allowed_zones: ['1', '3']
  });
});

test('rejects invalid email, username, name, and role', () => {
  for (const body of [
    { email: 'invalid', username: 'campo', display_name: 'Nombre', role: 'aereo' },
    { email: 'user@example.com', username: 'x!', display_name: 'Nombre', role: 'aereo' },
    { email: 'user@example.com', username: 'campo', display_name: ' ', role: 'aereo' },
    { email: 'user@example.com', username: 'campo', display_name: 'Nombre', role: 'owner' },
    { email: 'campo@users.mym-campo.invalid', username: 'campo', display_name: 'Nombre', role: 'aereo' },
    { email: 'user@example.com', username: 'campo', display_name: 'Nombre', role: 'aereo', allowed_zones: '1' },
    { email: 'user@example.com', username: 'campo', display_name: 'Nombre', role: 'aereo', allowed_zones: ['?'] }
  ]) {
    assert.throws(() => validateInvitation(body));
  }
});

test('rejects missing and non-object request bodies', () => {
  assert.throws(() => validateInvitation(null));
  assert.throws(() => validateInvitation([]));
});

test('grants all zones to admin and aerial roles and only assigned zones to other roles', () => {
  const configured = ['1', '3', '4'];
  assert.deepEqual(zonesForRole('admin', [], configured), configured);
  assert.deepEqual(zonesForRole('aereo', [], configured), configured);
  assert.deepEqual(zonesForRole('supervisor', ['3'], configured), ['3']);
  assert.deepEqual(zonesForRole('terrestre', [], configured), []);
  assert.throws(() => zonesForRole('supervisor', ['unknown'], configured));
});
