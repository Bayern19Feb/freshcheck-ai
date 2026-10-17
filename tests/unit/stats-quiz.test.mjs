import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../../public/js/stats.js';
import { createQuiz, QUESTIONS } from '../../public/js/quiz.js';
import { GUIDANCE, ALWAYS_NOTE } from '../../public/js/guidance.js';

test('stats are counted only from records', () => {
  const s = computeStats([
    { conditionId: 'fresh', detectedFruitId: 'banana', feedback: 'yes' },
    { conditionId: 'uncertain', detectedFruitId: null, userFruitId: 'apple', feedback: 'no' },
    { conditionId: 'spoiled', detectedFruitId: 'banana' },
  ]);
  assert.equal(s.total, 3);
  assert.deepEqual(s.byCondition, { fresh: 1, overripe: 0, spoiled: 1, uncertain: 1 });
  assert.deepEqual(s.mostScanned, { fruitId: 'banana', count: 2 });
  assert.equal(s.manualOnly, 1);
  assert.equal(s.helpfulYes, 1);
  assert.equal(s.helpfulNo, 1);
  assert.equal(computeStats([]).mostScanned, null);
});

test('quiz has at least five valid questions', () => {
  assert.ok(QUESTIONS.length >= 5);
  for (const q of QUESTIONS) {
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
    assert.ok(q.explain.length > 10);
  }
});

test('quiz scoring: correct answers count, answers are final', () => {
  const quiz = createQuiz();
  assert.equal(quiz.answer(0, QUESTIONS[0].answer), true);
  assert.equal(quiz.answer(1, (QUESTIONS[1].answer + 1) % QUESTIONS[1].options.length), false);
  quiz.answer(0, 3); // changing an answer is ignored
  assert.equal(quiz.score(), 1);
  assert.equal(quiz.answeredCount(), 2);
  assert.equal(quiz.isFinished(), false);
  QUESTIONS.forEach((q, i) => quiz.answer(i, q.answer));
  assert.equal(quiz.isFinished(), true);
  assert.equal(quiz.score(), QUESTIONS.length - 1);
  assert.throws(() => quiz.answer(99, 0), RangeError);
});

test('no guidance or quiz text claims guaranteed safety', () => {
  const text = JSON.stringify({ GUIDANCE, ALWAYS_NOTE, QUESTIONS }).toLowerCase();
  for (const banned of ['100% safe', 'guaranteed safe', 'certified safe', 'no bacteria detected', 'guaranteed rotten']) {
    assert.equal(text.includes(banned), false, banned);
  }
});
