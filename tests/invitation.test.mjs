import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInvitation, zonesForRole } from '../supabase/functions/_shared/invitation.mjs';

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
