import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpret, validatePredictions, MalformedOutputError, thresholdFor } from '../../public/js/interpret.js';

const P = (pairs) => pairs.map(([className, probability]) => ({ className, probability }));
const OPTS = { thresholds: { default: 0.75, perFruit: {} }, minMargin: 0.15 };

test('confident prediction keeps the model score exactly', () => {
  const r = interpret(P([['Banana - Fresh', 0.87], ['Banana - Spoiled', 0.08], ['Not a fruit', 0.05]]), OPTS);
  assert.equal(r.conditionId, 'fresh');
  assert.equal(r.detectedFruitId, 'banana');
  assert.equal(r.confidence, 0.87);
  assert.ok(Math.abs(r.fruitConfidence - 0.95) < 1e-9, 'fruit score = sum of banana classes');
  assert.deepEqual(r.reasons, []);
});

test('low confidence becomes uncertain', () => {
  const r = interpret(P([['Apple - Spoiled', 0.6], ['Apple - Fresh', 0.3], ['Not a fruit', 0.1]]), OPTS);
  assert.equal(r.conditionId, 'uncertain');
  assert.ok(r.reasons.includes('low-confidence'));
  assert.equal(r.confidence, 0.6, 'the real score is still reported');
});

test('close call between top two classes becomes uncertain', () => {
  const r = interpret(P([['Apple - Spoiled', 0.5], ['Apple - Fresh', 0.45], ['Not a fruit', 0.05]]),
    { thresholds: { default: 0.4, perFruit: {} }, minMargin: 0.15 });
  assert.equal(r.conditionId, 'uncertain');
  assert.ok(r.reasons.includes('close-call'));
});

test('reject class and unknown class are uncertain', () => {
  assert.deepEqual(interpret(P([['Not a fruit', 0.99], ['Apple - Fresh', 0.01]]), OPTS).reasons, ['not-a-fruit']);
  const u = interpret(P([['Class 3', 0.99], ['Apple - Fresh', 0.01]]), OPTS);
  assert.equal(u.conditionId, 'uncertain');
  assert.deepEqual(u.reasons, ['unknown-class']);
});

test('per-fruit threshold overrides the default', () => {
  const t = { default: 0.75, perFruit: { banana: 0.9 } };
  assert.equal(thresholdFor('banana', t), 0.9);
  assert.equal(thresholdFor('apple', t), 0.75);
  const r = interpret(P([['Banana - Fresh', 0.85], ['Apple - Fresh', 0.15]]), { thresholds: t, minMargin: 0 });
  assert.equal(r.conditionId, 'uncertain');
  assert.equal(r.threshold, 0.9);
});

test('user fruit selection never changes the AI answer; a mismatch makes it uncertain', () => {
  const preds = P([['Banana - Fresh', 0.9], ['Apple - Fresh', 0.1]]);
  assert.equal(interpret(preds, { ...OPTS, userFruitId: 'banana' }).conditionId, 'fresh');
  const diff = interpret(preds, { ...OPTS, userFruitId: 'apple' });
  assert.equal(diff.detectedFruitId, 'banana', 'detected fruit stays what the model said');
  assert.equal(diff.userFruitId, 'apple');
  assert.equal(diff.fruitMismatch, true);
  assert.equal(diff.conditionId, 'uncertain');
});

test('experimental fruit is flagged; poor image is uncertain', () => {
  const preds = P([['Banana - Fresh', 0.9], ['Apple - Fresh', 0.1]]);
  assert.equal(interpret(preds, { ...OPTS, support: { banana: 'experimental' } }).experimental, true);
  const dark = interpret(preds, { ...OPTS, poorImage: true });
  assert.equal(dark.conditionId, 'uncertain');
  assert.ok(dark.reasons.includes('poor-image'));
});

test('malformed outputs throw instead of producing a result', () => {
  assert.throws(() => validatePredictions([]), MalformedOutputError);
  assert.throws(() => validatePredictions(null), MalformedOutputError);
  assert.throws(() => validatePredictions(P([['A', NaN], ['B', 1]])), MalformedOutputError);
  assert.throws(() => validatePredictions(P([['A', 0.2], ['B', 0.2]])), MalformedOutputError, 'scores must sum to 1');
  assert.throws(() => validatePredictions(P([['A', 0.5], ['B', 0.5]]), 3), MalformedOutputError, 'class count must match');
  assert.throws(() => interpret(P([['A', 2], ['B', -1]]), OPTS), MalformedOutputError);
});
