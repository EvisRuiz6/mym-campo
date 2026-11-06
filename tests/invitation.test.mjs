import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInvitation } from '../supabase/functions/_shared/invitation.mjs';

test('normalizes and returns a valid invitation', () => {
  assert.deepEqual(validateInvitation({
    email: '  Campo.User@Example.COM ',
    username: ' Campo.User ',
    display_name: '  Usuario de campo  ',
    role: 'supervisor'
  }), {
    email: 'campo.user@example.com',
    username: 'campo.user',
    display_name: 'Usuario de campo',
    role: 'supervisor'
  });
});

test('rejects invalid email, username, name, and role', () => {
  for (const body of [
    { email: 'invalid', username: 'campo', display_name: 'Nombre', role: 'aereo' },
    { email: 'user@example.com', username: 'x!', display_name: 'Nombre', role: 'aereo' },
    { email: 'user@example.com', username: 'campo', display_name: ' ', role: 'aereo' },
    { email: 'user@example.com', username: 'campo', display_name: 'Nombre', role: 'owner' }
  ]) {
    assert.throws(() => validateInvitation(body));
  }
});

test('rejects missing and non-object request bodies', () => {
  assert.throws(() => validateInvitation(null));
  assert.throws(() => validateInvitation([]));
});
