import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, thresholdSweep, toCSV } from '../../public/js/evaluation.js';

const item = (trueFruitId, trueConditionId, pairs) => ({
  trueFruitId, trueConditionId, scores: pairs.map(([className, probability]) => ({ className, probability })),
});
const items = [
  item('banana', 'fresh', [['Banana - Fresh', 0.9], ['Banana - Spoiled', 0.05], ['Not a fruit', 0.05]]),   // correct
  item('banana', 'spoiled', [['Banana - Fresh', 0.8], ['Banana - Spoiled', 0.15], ['Not a fruit', 0.05]]), // wrong + dangerous
  item('banana', 'spoiled', [['Banana - Fresh', 0.4], ['Banana - Spoiled', 0.55], ['Not a fruit', 0.05]]), // uncertain at 0.75
  item(null, 'not-fruit', [['Banana - Fresh', 0.1], ['Banana - Spoiled', 0.1], ['Not a fruit', 0.8]]),    // correctly rejected
];
const opts = { thresholds: { default: 0.75, perFruit: {} }, minMargin: 0 };

test('counts correct, answered, uncertain and dangerous errors', () => {
  const ev = evaluate(items, opts);
  assert.equal(ev.total.n, 4);
  assert.equal(ev.total.correct, 2);
  assert.equal(ev.total.answered, 2);
  assert.equal(ev.total.uncertain, 2);
  assert.equal(ev.total.dangerous, 1);
  assert.equal(ev.total.precisionCovered, 0.5);
  assert.equal(ev.perFruit.banana.n, 3);
  assert.equal(ev.perFruit.banana.correct, 1);
  assert.equal(ev.perFruit.banana.fruitIdentified, 3);
  assert.equal(ev.perFruit['not-fruit'].correct, 1);
});

test('confusion matrix rows are real labels, columns are app answers', () => {
  const { matrix } = evaluate(items, opts);
  assert.deepEqual(matrix['banana:fresh'], { 'banana:fresh': 1 });
  assert.deepEqual(matrix['banana:spoiled'], { 'banana:fresh': 1, uncertain: 1 });
  assert.deepEqual(matrix['not-fruit'], { uncertain: 1 });
});

test('threshold sweep: a higher threshold answers less often', () => {
  const sweep = thresholdSweep(items, { minMargin: 0, steps: [0.5, 0.85] });
  assert.equal(sweep[0].answered, 3);
  assert.equal(sweep[1].answered, 1);
});

test('CSV escapes commas and quotes', () => {
  assert.equal(toCSV([{ a: 'x,y', b: 'say "hi"' }]), 'a,b\n"x,y","say ""hi"""');
  assert.equal(toCSV([]), '');
});
