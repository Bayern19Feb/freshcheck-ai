import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLabel, describeLabels, fruitSupport, FRUITS } from '../../public/js/fruits.js';

test('parses the recommended "Fruit - Condition" names', () => {
  assert.deepEqual(parseLabel('Banana - Fresh'), { raw: 'Banana - Fresh', kind: 'fruit-condition', fruitId: 'banana', conditionId: 'fresh' });
  assert.equal(parseLabel('Apple - Spoiled').conditionId, 'spoiled');
  assert.equal(parseLabel('Mango - Overripe').conditionId, 'overripe');
});

test('accepts aliases, other separators, plural fruit names and reversed order', () => {
  assert.equal(parseLabel('strawberries_rotten').fruitId, 'strawberry');
  assert.equal(parseLabel('strawberries_rotten').conditionId, 'spoiled');
  assert.equal(parseLabel('Grape: Good').fruitId, 'grapes');
  assert.equal(parseLabel('Fresh Papaya').fruitId, 'papaya');
  assert.equal(parseLabel('Banana - Over-ripe').conditionId, 'overripe');
  assert.equal(parseLabel('guava/mouldy').conditionId, 'spoiled');
});

test('recognises reject classes', () => {
  for (const l of ['Not a fruit', 'not-a-fruit', 'Background', 'Unsupported', 'Other']) {
    assert.equal(parseLabel(l).kind, 'reject', l);
  }
});

test('unknown names are flagged, never guessed', () => {
  assert.equal(parseLabel('Class 1').kind, 'unknown');
  assert.equal(parseLabel('Durian - Fresh').kind, 'unknown');
  assert.equal(parseLabel('Banana').kind, 'unknown');
  assert.equal(parseLabel('Banana - Tasty').kind, 'unknown');
});

test('describeLabels summarises fruits and conditions', () => {
  const d = describeLabels(['Apple - Fresh', 'Apple - Spoiled', 'Banana - Fresh', 'Not a fruit', 'Class 9']);
  assert.deepEqual(d.fruitsInModel, { apple: ['fresh', 'spoiled'], banana: ['fresh'] });
  assert.equal(d.hasReject, true);
  assert.deepEqual(d.unknownLabels, ['Class 9']);
});

test('a fruit is only "supported" when it is in the model AND passed evaluation', () => {
  const labels = ['Apple - Fresh', 'Apple - Spoiled', 'Banana - Fresh', 'Not a fruit'];
  const card = { fruits: { apple: { evaluation: 'passed' }, banana: { evaluation: 'not-evaluated' }, mango: { evaluation: 'passed' } } };
  const s = Object.fromEntries(fruitSupport(labels, card).map((r) => [r.fruit.id, r.status]));
  assert.equal(s.apple, 'supported');
  assert.equal(s.banana, 'experimental');
  assert.equal(s.mango, 'not-in-model', 'an evaluation record without model classes must not count');
  assert.equal(s.papaya, 'not-in-model');
  assert.equal(fruitSupport(null, card).every((r) => r.status === 'unknown'), true);
  assert.ok(FRUITS.length >= 50, `only ${FRUITS.length} fruits`);
});
