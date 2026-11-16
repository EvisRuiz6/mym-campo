import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const functionStart = appSource.indexOf('async function serializeForm(form, recordId, previousData) {');
const functionEnd = appSource.indexOf('\nfunction setFormValue', functionStart);
assert.ok(functionStart >= 0 && functionEnd > functionStart, 'Capture serialization must exist in app.js');
const serializeFormSource = appSource.slice(functionStart, functionEnd) + '\n({ serializeForm })';

test('serializes climate readings from row controls without treating each row as a form', async () => {
  const formEntries = [['fecha', '2026-11-16'], ['lote', '0100101']];
  const weatherControls = [
    { name: 'hora', value: '08:44' },
    { name: 'temperatura', value: '21.5' },
    { name: 'humedad', value: '63' },
    { name: 'viento', value: '4.2' },
    { name: 'direccion', value: 'N' },
    { name: 'delta_t', value: '2.1' }
  ];
  const form = { tagName: 'FORM' };
  const weatherRoot = {};
  const formFields = {};
  const row = { tagName: 'DIV' };
  const { serializeForm } = runInNewContext(serializeFormSource, {
    state: { currentModule: 'clima' },
    File: undefined,
    FormData: class {
      constructor(target) {
        if (target !== form) throw new TypeError('FormData only accepts a form element');
      }

      entries() {
        return formEntries[Symbol.iterator]();
      }
    },
    $: selector => selector === '#weather-rows' ? weatherRoot : formFields,
    $$: (selector, root) => {
      if (selector === '.repeat-row' && root === weatherRoot) return [row];
      if (selector === '[name]' && root === row) return weatherControls;
      return [];
    }
  });

  const record = await serializeForm(form, 'capture-id', null);

  assert.deepEqual(JSON.parse(JSON.stringify(record)), {
    fecha: '2026-11-16',
    lote: '0100101',
    lecturas: [{
      hora: '08:44',
      temperatura: '21.5',
      humedad: '63',
      viento: '4.2',
      direccion: 'N',
      delta_t: '2.1'
    }]
  });
});
