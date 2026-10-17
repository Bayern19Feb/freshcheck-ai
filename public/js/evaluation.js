// Evaluation maths for the "Test the model" tool.
// Each test item stores the real model scores for one labelled test photo,
// so results can be recalculated for different thresholds without re-running
// the model.

import { interpret } from './interpret.js';

/** Key for a true label or a prediction, e.g. "banana:fresh", "not-fruit", "uncertain". */
export function trueKey(item) {
  return item.trueConditionId === 'not-fruit' ? 'not-fruit' : `${item.trueFruitId}:${item.trueConditionId}`;
}

export function predict(item, { thresholds, minMargin }) {
  const r = interpret(item.scores, { thresholds, minMargin });
  if (r.conditionId === 'uncertain') return { key: 'uncertain', result: r };
  return { key: `${r.detectedFruitId}:${r.conditionId}`, result: r };
}

/**
 * Evaluate a list of test items.
 * Returns overall numbers, per-fruit numbers and a confusion matrix.
 *  - accuracy     correct / all items (uncertain counts as not correct)
 *  - coverage     items with a confident answer / all items
 *  - precisionCovered  correct / confident answers
 *  - dangerous    truly spoiled items that were predicted "fresh"
 * For true "not-fruit" items, an uncertain answer is counted as correct.
 */
export function evaluate(items, options) {
  const matrix = {};          // matrix[trueKey][predKey] = count
  const blank = () => ({ n: 0, correct: 0, answered: 0, answeredCorrect: 0, uncertain: 0, dangerous: 0, fruitIdentified: 0 });
  const perFruit = {};
  const total = blank();

  for (const item of items) {
    const t = trueKey(item);
    const { key: p, result } = predict(item, options);
    (matrix[t] ||= {});
    matrix[t][p] = (matrix[t][p] || 0) + 1;

    const isCorrect = t === 'not-fruit' ? p === 'uncertain' : p === t;
    const fruitKey = t === 'not-fruit' ? 'not-fruit' : item.trueFruitId;
    const f = (perFruit[fruitKey] ||= blank());

    for (const b of [total, f]) {
      b.n += 1;
      if (isCorrect) b.correct += 1;
      if (p === 'uncertain') b.uncertain += 1;
      else {
        b.answered += 1;
        if (isCorrect) b.answeredCorrect += 1;
      }
      if (item.trueConditionId === 'spoiled' && result.conditionId === 'fresh') b.dangerous += 1;
      if (t !== 'not-fruit' && result.detectedFruitId === item.trueFruitId) b.fruitIdentified += 1;
    }
  }

  const finish = (b) => ({
    ...b,
    accuracy: b.n ? b.correct / b.n : null,
    coverage: b.n ? b.answered / b.n : null,
    precisionCovered: b.answered ? b.answeredCorrect / b.answered : null,
  });
  const perFruitOut = Object.fromEntries(Object.entries(perFruit).map(([k, b]) => [k, finish(b)]));
  return { total: finish(total), perFruit: perFruitOut, matrix };
}

/** Try several thresholds and report accuracy/coverage for each (for choosing a threshold). */
export function thresholdSweep(items, { minMargin, fruitId = null, steps = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95] }) {
  const subset = fruitId ? items.filter((i) => i.trueFruitId === fruitId) : items;
  return steps.map((t) => {
    const { total } = evaluate(subset, { thresholds: { default: t, perFruit: {} }, minMargin });
    return { threshold: t, ...total };
  });
}

/** Turn rows into CSV text. */
export function toCSV(rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
