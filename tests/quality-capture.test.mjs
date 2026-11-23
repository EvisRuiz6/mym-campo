import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Missing source section: ${start}`);
  return source.slice(first, last);
}

test('quality captures expose lot lookup and each selected form has notes and multiple images', () => {
  const details = { innerHTML: '' };
  let onChange;
  const script = [
    section('const qualityForms = {', '\nconst childSchemas ='),
    section('function fieldMarkup(', '\nfunction workContextControls'),
    section('function qualityFields()', '\nfunction repeatSection'),
    section('function renderQualityDetails(', '\nfunction '),
    section("$('#form-fields').addEventListener('change', event => {", "\n$('#capture-form').addEventListener('submit'"),
    '({ qualityFields, renderQualityDetails })'
  ].join('\n');
  const state = { currentModule: 'calidad', lotLookup: { '0000001': { finca: 'Finca A', zona: 'Zona A' } } };
  const { qualityFields } = runInNewContext(script, {
    localDate: () => '2026-01-01',
    state,
    slug: value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    esc: value => String(value),
    $: selector => selector === '#quality-details' ? details : {
      addEventListener: (event, handler) => { onChange = handler; }
    }
  });
  const main = qualityFields();
  assert.match(main, /Fecha de la visita/);
  assert.match(main, /type="date" name="FECHA"[^>]*required[^>]*value="2026-01-01"/);
  assert.match(main, /name="lote" data-lot-lookup="true"/);
  assert.match(main, /name="finca" data-location-target="finca"/);
  assert.match(main, /name="zona" data-location-target="zona"/);
  assert.match(main, /value="0000001"/);
  for (const type of ['aguilon', 'arranque', 'pcpm']) {
    onChange({ target: { name: 'calidad_tipo', value: type } });
    assert.match(details.innerHTML, /name="Observaciones Generales"/);
    assert.match(details.innerHTML, /type="file" name="IMAGEN"[^>]*accept="image\/\*" multiple/);
    assert.doesNotMatch(details.innerHTML, /name="FECHA"/);
  }
});

test('editing a quality capture restores its existing visit date', () => {
  const date = { name: 'FECHA', type: 'date', value: '2026-01-01' };
  const { setNamedFields } = runInNewContext(
    section('function setFormValue(', '\nfunction setChildFields') + '\n({ setNamedFields })',
    { $$: () => [date] }
  );
  setNamedFields({}, { FECHA: '2025-12-15' });
  assert.equal(date.value, '2025-12-15');
});

test('quality lot lookup uses the saved offline catalog and rejects unavailable lots', async () => {
  const lot = { value: '0000001' };
  const finca = { value: '', dataset: {} };
  const zona = { value: '', dataset: {} };
  const status = {};
  const form = {
    querySelector(selector) {
      return {
        '[data-location-target="finca"]': finca,
        '[data-location-target="zona"]': zona,
        '[data-lot-location-status]': status
      }[selector];
    },
    querySelectorAll: () => [lot]
  };
  const { updateLotLocations } = runInNewContext(
    section('function clearAutoLocation(', '\nfunction updateZoneFromFarm') + '\n({ updateLotLocations })',
    { state: { lotLookup: { '0000001': { finca: 'Finca A', zona: 'Zona A' } } }, navigator: { onLine: false } }
  );
  assert.equal(await updateLotLocations(form, true), true);
  assert.equal(finca.value, 'Finca A');
  assert.equal(zona.value, 'Zona A');
  lot.value = '0000002';
  assert.equal(await updateLotLocations(form, true), false);
  assert.equal(finca.value, '');
  assert.equal(zona.value, '');
  assert.match(status.textContent, /Sin conexión/);
});

test('quality lot validation enforces assigned zones even with an offline catalog', () => {
  const state = {
    user: { role: 'supervisor', allowedZones: ['Zona A'] },
    lotLookup: {
      '0000001': { zona: 'Zona A' },
      '0000002': { zona: 'Zona B' }
    }
  };
  const form = {
    lot: '0000001',
    querySelectorAll(selector) {
      return selector === '[data-lot-lookup]' ? [{ value: this.lot }] : [];
    }
  };
  const { invalidLotsInForm } = runInNewContext(
    section('function userCanAccessLot(', '\nfunction recordHasLotAccess') + '\n({ invalidLotsInForm })',
    { state, normalizeZoneValue: value => String(value || '').trim() }
  );
  assert.deepEqual(Array.from(invalidLotsInForm(form)), []);
  form.lot = '0000002';
  assert.deepEqual(Array.from(invalidLotsInForm(form)), ['0000002']);
  form.lot = '0000003';
  assert.deepEqual(Array.from(invalidLotsInForm(form)), ['0000003']);
});

function serializationHarness(files, entries = []) {
  const form = {};
  const input = { name: 'IMAGEN', files };
  const script = section('async function serializeForm(', '\nfunction setFormValue') + '\n({ serializeForm })';
  const { serializeForm } = runInNewContext(script, {
    state: { currentModule: 'calidad' },
    File: undefined,
    FileReader: class {
      readAsDataURL(file) {
        this.result = 'data:' + file.type + ';base64,' + file.name;
        this.onload();
      }
    },
    FormData: class { entries() { return entries[Symbol.iterator](); } },
    $$: (selector, root) => selector === 'input[type="file"][multiple][name]' && root === form ? [input] : []
  });
  return { serializeForm, form };
}

test('quality capture stores every selected image and observations', async () => {
  const files = [
    { name: 'one.png', type: 'image/png', size: 2 },
    { name: 'two.jpg', type: 'image/jpeg', size: 3 }
  ];
  const { serializeForm, form } = serializationHarness(files, [
    ['FECHA', '2026-01-02'], ['lote', '0000001'], ['Observaciones Generales', 'Revisar'], ['IMAGEN', files[0]], ['IMAGEN', files[1]]
  ]);
  const data = await serializeForm(form, 'id', null, 'calidad');
  assert.deepEqual(Array.from(data.IMAGEN, image => image.name), ['one.png', 'two.jpg']);
  assert.equal(data['Observaciones Generales'], 'Revisar');
  assert.equal(data.FECHA, '2026-01-02');
  assert.equal(data.lote, '0000001');
});

test('editing retains historical single and multiple images unless replacements are selected', async () => {
  const oldImage = { name: 'old.png', dataUrl: 'data:image/png;base64,AA==' };
  const savedImages = [oldImage, { name: 'second.png' }];
  const empty = serializationHarness([], [['IMAGEN', '']]);
  assert.equal((await empty.serializeForm(empty.form, 'id', { IMAGEN: oldImage }, 'calidad')).IMAGEN, oldImage);
  assert.equal((await empty.serializeForm(empty.form, 'id', { IMAGEN: savedImages }, 'calidad')).IMAGEN, savedImages);
  const replacement = serializationHarness([{ name: 'new.png', type: 'image/png', size: 1 }]);
  const result = await replacement.serializeForm(replacement.form, 'id', { IMAGEN: oldImage }, 'calidad');
  assert.deepEqual(Array.from(result.IMAGEN, image => image.name), ['new.png']);
});
