import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const serviceWorkerHelper = source.match(/function registerWebServiceWorker\(\) \{[\s\S]*?\n\}/);
assert.ok(serviceWorkerHelper);

test('native APK uses its packaged assets instead of registering the web service worker', () => {
  let registrations = 0;
  const register = runInNewContext(serviceWorkerHelper[0] + '\nregisterWebServiceWorker', {
    window: { Capacitor: { isNativePlatform: () => true } },
    navigator: { serviceWorker: { register: () => { registrations++; } } },
    location: { protocol: 'https:' },
    console
  });
  register();
  assert.equal(registrations, 0);
});

test('web PWA still registers its offline service worker', () => {
  const calls = [];
  const register = runInNewContext(serviceWorkerHelper[0] + '\nregisterWebServiceWorker', {
    window: {},
    navigator: { serviceWorker: { register: path => { calls.push(path); return { catch() {} }; } } },
    location: { protocol: 'https:' },
    console
  });
  register();
  assert.deepEqual(calls, ['./service-worker.js']);
});
