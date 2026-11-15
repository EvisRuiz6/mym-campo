import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const helperStart = appSource.indexOf('function weedsCatorcenaForDate(value) {');
const helperEnd = appSource.indexOf('\nfunction variacionAguilonFields()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Malezas catorcena helpers must exist in app.js');
const helpers = runInNewContext(
  appSource.slice(helperStart, helperEnd) + '\n({ weedsCatorcenaForDate, updateWeedsCatorcena })'
);

test('maps the supplied period boundaries and 14-day catorcena starts', () => {
  const cases = [
    ['2025-10-20', { period: '30', number: 1 }],
    ['2025-11-02', { period: '30', number: 1 }],
    ['2025-11-03', { period: '30', number: 2 }],
    ['2026-10-18', { period: '30', number: 26 }],
    ['2026-10-19', { period: '31', number: 1 }],
    ['2027-10-17', { period: '31', number: 26 }]
  ];

  for (const [date, expected] of cases) {
    assert.deepEqual(
      JSON.parse(JSON.stringify(helpers.weedsCatorcenaForDate(date))),
      expected,
      date
    );
  }
});

test('rejects invalid dates and dates outside the supplied calendars', () => {
  for (const date of ['2025-10-19', '2027-10-18', '2026-02-31', '']) {
    assert.equal(helpers.weedsCatorcenaForDate(date), null, date);
  }
});

test('updates the catorcena field and clears it outside the calendar', () => {
  const dateInput = { value: '2026-10-19' };
  const hint = { textContent: '' };
  const catorcenaInput = {
    value: '25',
    closest(selector) {
      assert.equal(selector, '.field');
      return { querySelector: () => hint };
    }
  };
  const row = {
    querySelector(selector) {
      if (selector === '[data-child-field="FECHA"]') return dateInput;
      if (selector === '[data-child-field="CATORCENA"]') return catorcenaInput;
      return null;
    }
  };

  helpers.updateWeedsCatorcena(row);
  assert.equal(catorcenaInput.value, '1');
  assert.match(hint.textContent, /Periodo 31/);

  dateInput.value = '2027-10-18';
  helpers.updateWeedsCatorcena(row);
  assert.equal(catorcenaInput.value, '');
  assert.match(hint.textContent, /fuera del calendario/);
});
