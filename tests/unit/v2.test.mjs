import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRUITS, parseLabel, parseFruitName, fruitSupport, GROUPS } from '../../public/js/fruits.js';
import { interpret, combine } from '../../public/js/interpret.js';

const P = (pairs) => pairs.map(([className, probability]) => ({ className, probability }));
const OPTS = { thresholds: { default: 0.7, perFruit: {} }, minMargin: 0.15 };
const FRESH = new Set(['apple', 'banana']);
const run = (fresh, id, extra = {}) => combine(interpret(P(fresh), { ...OPTS, ...extra }), id ? P(id) : null,
  { ...OPTS, ...extra, idThreshold: 0.6, freshFruits: FRESH });

test('fruit catalogue matches the dataset catalogue, every fruit has a valid group', () => {
  const catalog = JSON.parse(readFileSync('tools/dataset/fruit_catalog.json', 'utf8'));
  const ids = FRUITS.map((f) => f.id).sort();
  assert.deepEqual(ids, Object.keys(catalog.fruits).sort());
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
  for (const f of FRUITS) assert.ok(GROUPS[f.group], `${f.id} has unknown group ${f.group}`);
});

test('no alias points to two different fruits', () => {
  const seen = new Map();
  for (const f of FRUITS) for (const a of f.aliases) {
    assert.ok(!seen.has(a) || seen.get(a) === f.id, `alias "${a}" used by ${seen.get(a)} and ${f.id}`);
    seen.set(a, f.id);
  }
});

test('identifier names and freshness labels the training scripts produce are understood', () => {
  for (const f of FRUITS) {
    const short = f.name.replace(/\s*\(.*\)\s*/, '').trim();
    assert.equal(parseFruitName(short).fruitId, f.id, short);
    assert.equal(parseLabel(`${short} - Fresh`).fruitId, f.id, `${short} - Fresh`);
    assert.equal(parseLabel(`${short} - Spoiled`).conditionId, 'spoiled');
  }
  assert.equal(parseFruitName('Not a fruit').kind, 'reject');
  assert.equal(parseFruitName('Durian').kind, 'unknown');
  assert.equal(parseLabel('Star fruit - Fresh').fruitId, 'star-fruit');
});

test('combine: agreeing models keep the freshness answer', () => {
  const r = run([['Apple - Fresh', 0.9], ['Apple - Spoiled', 0.05], ['Other', 0.05]], [['Apple', 0.95], ['Kiwi', 0.05]]);
  assert.equal(r.conditionId, 'fresh');
  assert.equal(r.identifiedFruitId, 'apple');
  assert.equal(r.idConfidence, 0.95);
});

test('combine: fruit without freshness data is identified, never given a freshness verdict', () => {
  const r = run([['Other', 0.8], ['Apple - Fresh', 0.2]], [['Kiwi', 0.9], ['Apple', 0.1]]);
  assert.equal(r.conditionId, 'identified');
  assert.equal(r.detectedFruitId, 'kiwi');
  assert.equal(r.freshnessAvailable, false);
  assert.deepEqual(r.reasons, []);
});

test('combine: models disagree -> uncertain; identifier unsure -> uncertain unless both agree', () => {
  const d = run([['Apple - Fresh', 0.9], ['Banana - Fresh', 0.1]], [['Banana', 0.9], ['Apple', 0.1]]);
  assert.equal(d.conditionId, 'uncertain');
  assert.ok(d.reasons.includes('models-disagree'));
  const u = run([['Apple - Spoiled', 0.9], ['Apple - Fresh', 0.1]], [['Apple', 0.5], ['Kiwi', 0.5]]);
  assert.equal(u.conditionId, 'spoiled', 'identifier unsure but agrees');
  const u2 = run([['Apple - Spoiled', 0.9], ['Apple - Fresh', 0.1]], [['Kiwi', 0.55], ['Apple', 0.45]]);
  assert.equal(u2.conditionId, 'uncertain');
  assert.ok(u2.reasons.includes('low-confidence-id'));
});

test('combine: confident "Not a fruit" -> uncertain; mismatch with user choice still flagged', () => {
  const r = run([['Apple - Fresh', 0.8], ['Other', 0.2]], [['Not a fruit', 0.9], ['Apple', 0.1]]);
  assert.equal(r.conditionId, 'uncertain');
  assert.ok(r.reasons.includes('not-a-fruit'));
  assert.equal(r.detectedFruitId, null);
  const m = run([['Other', 0.9], ['Apple - Fresh', 0.1]], [['Kiwi', 0.9], ['Apple', 0.1]], { userFruitId: 'mango' });
  assert.equal(m.conditionId, 'uncertain');
  assert.ok(m.reasons.includes('fruit-mismatch'));
});

test('combine: without an identifier the freshness result is unchanged', () => {
  const fresh = interpret(P([['Apple - Fresh', 0.9], ['Other', 0.1]]), OPTS);
  assert.equal(combine(fresh, null, {}), fresh);
});

test('support rows report recogniser coverage separately from freshness status', () => {
  const rows = fruitSupport(['Apple - Fresh', 'Apple - Spoiled', 'Other'], { fruits: { apple: { evaluation: 'passed' } } }, ['Apple', 'Kiwi', 'Not a fruit']);
  const byId = Object.fromEntries(rows.map((r) => [r.fruit.id, r]));
  assert.equal(byId.apple.status, 'supported');
  assert.equal(byId.apple.identifiable, true);
  assert.equal(byId.kiwi.status, 'not-in-model');
  assert.equal(byId.kiwi.identifiable, true);
  assert.equal(byId.mango.identifiable, false);
  assert.equal(fruitSupport(['Apple - Fresh', 'Other'], {}).every((r) => r.identifiable === null), true);
});
