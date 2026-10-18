// Fruit and condition definitions, plus the parsers that map the class names
// inside the Teachable Machine models to fruits and freshness conditions.
//
// Two models (see docs/AI_MODEL_GUIDE.md):
//   freshness model classes: "<Fruit> - <Condition>"  e.g. "Banana - Fresh", "Apple - Spoiled", plus "Other"
//   identifier model classes: "<Fruit>"               e.g. "Kiwi", "Banana", plus "Not a fruit"
// Matching is case-insensitive and accepts the aliases in fruit-data.js.

import { FRUIT_LIST, GROUPS } from './fruit-data.js';

const plural = (w) => (w.endsWith('y') ? `${w.slice(0, -1)}ies` : w.endsWith('o') || w.endsWith('h') ? `${w}es` : `${w}s`);

export const FRUITS = FRUIT_LIST.map(([id, name, emoji, group, hindi, aliases, note]) => {
  const base = name.toLowerCase().replace(/\s*\(.*\)\s*/, '').trim();
  const all = new Set([id, id.replace(/-/g, ' '), base, plural(base), ...aliases.map((a) => a.toLowerCase())]);
  return { id, name, emoji, group, hindi, note, aliases: [...all] };
});

export { GROUPS };

// Condition ids used by the model labels. "uncertain" and "identified" are never
// model classes; the app produces them.
export const CONDITIONS = {
  fresh: { id: 'fresh', label: 'Appears Fresh', short: 'Fresh', tone: 'good', icon: 'check',
    aliases: ['fresh', 'good', 'healthy'] },
  overripe: { id: 'overripe', label: 'Overripe Appearance', short: 'Overripe', tone: 'warn', icon: 'clock',
    aliases: ['overripe', 'over-ripe', 'over ripe', 'very ripe'] },
  spoiled: { id: 'spoiled', label: 'Possible Signs of Spoilage', short: 'Spoilage signs', tone: 'bad', icon: 'alert',
    aliases: ['spoiled', 'spoilt', 'rotten', 'bad', 'mouldy', 'moldy', 'decayed'] },
  identified: { id: 'identified', label: 'Fruit Identified — Check Freshness Yourself', short: 'Identified only', tone: 'neutral', icon: 'info',
    aliases: [] },
  uncertain: { id: 'uncertain', label: 'Uncertain — Inspect Manually', short: 'Uncertain', tone: 'neutral', icon: 'question',
    aliases: [] },
};

// Classes that mean "this is not something the model supports".
const REJECT_ALIASES = ['not a fruit', 'not fruit', 'unsupported', 'other', 'background', 'unknown', 'none', 'nothing'];

const norm = (s) => String(s).toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
const findFruit = (text) => FRUITS.find((f) => f.aliases.includes(text)) || null;

export function getFruit(id) {
  return FRUITS.find((f) => f.id === id) || null;
}

const isReject = (text) => REJECT_ALIASES.includes(text.replace(/-/g, ' '));

/**
 * Parse one freshness-model class name.
 * Returns { raw, kind: 'fruit-condition', fruitId, conditionId }
 *      or { raw, kind: 'reject' }
 *      or { raw, kind: 'unknown' }   (the app does not understand this class)
 */
export function parseLabel(raw) {
  const text = norm(raw);
  if (isReject(text)) return { raw, kind: 'reject' };

  // Split on " - ", ":", "/", "|" or the last space if nothing else.
  let parts = text.split(/\s+-\s+|\s*[:|/]\s*/).filter(Boolean);
  if (parts.length === 1) parts = text.split(/\s*-\s*/).filter(Boolean);
  if (parts.length === 1) {
    const i = text.lastIndexOf(' ');
    parts = i > 0 ? [text.slice(0, i), text.slice(i + 1)] : parts;
  }
  if (parts.length < 2) return { raw, kind: 'unknown' };

  const tryPair = (a, b) => {
    const fruit = findFruit(a);
    const cond = Object.values(CONDITIONS).find((c) => c.aliases.includes(b));
    return fruit && cond ? { raw, kind: 'fruit-condition', fruitId: fruit.id, conditionId: cond.id } : null;
  };
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join(' ');
    const b = parts.slice(i).join(' ');
    const hit = tryPair(a, b) || tryPair(b, a);
    if (hit) return hit;
  }
  return { raw, kind: 'unknown' };
}

/**
 * Parse one identifier-model class name ("Kiwi", "Not a fruit").
 * Returns { raw, kind: 'fruit', fruitId } | { raw, kind: 'reject' } | { raw, kind: 'unknown' }
 */
export function parseFruitName(raw) {
  const text = norm(raw);
  if (isReject(text)) return { raw, kind: 'reject' };
  const fruit = findFruit(text) || findFruit(text.replace(/\s*\(.*\)\s*/, '').trim());
  return fruit ? { raw, kind: 'fruit', fruitId: fruit.id } : { raw, kind: 'unknown' };
}

/**
 * Summarise what a freshness model's labels cover.
 * Returns { parsed[], fruitsInModel: {fruitId: [conditionIds]}, hasReject, unknownLabels[] }
 */
export function describeLabels(labels) {
  const parsed = labels.map(parseLabel);
  const fruitsInModel = {};
  for (const p of parsed) {
    if (p.kind !== 'fruit-condition') continue;
    (fruitsInModel[p.fruitId] ||= []).push(p.conditionId);
  }
  return {
    parsed,
    fruitsInModel,
    hasReject: parsed.some((p) => p.kind === 'reject'),
    unknownLabels: parsed.filter((p) => p.kind === 'unknown').map((p) => p.raw),
  };
}

/** Summarise an identifier model's labels. */
export function describeIdLabels(labels) {
  const parsed = labels.map(parseFruitName);
  return {
    parsed,
    fruits: parsed.filter((p) => p.kind === 'fruit').map((p) => p.fruitId),
    hasReject: parsed.some((p) => p.kind === 'reject'),
    unknownLabels: parsed.filter((p) => p.kind === 'unknown').map((p) => p.raw),
  };
}

/**
 * Freshness support status for every fruit.
 *  - 'not-in-model'  : the freshness model has no classes for this fruit
 *  - 'experimental'  : the model has classes, but evaluation has not passed
 *  - 'supported'     : the model has classes AND the model card records a
 *                      passed evaluation on independent test images
 *  - 'unknown'       : no freshness model is loaded yet
 * `identifiable` is true/false when an identifier model is loaded, else null.
 */
export function fruitSupport(modelLabels, modelCard, idLabels = null) {
  const info = modelLabels ? describeLabels(modelLabels) : null;
  const idInfo = idLabels ? describeIdLabels(idLabels) : null;
  return FRUITS.map((fruit) => {
    const evaluation = modelCard?.fruits?.[fruit.id] || {};
    const conditions = info?.fruitsInModel[fruit.id] || [];
    let status;
    if (!info) status = 'unknown';
    else if (!conditions.length) status = 'not-in-model';
    else if (evaluation.evaluation === 'passed') status = 'supported';
    else status = 'experimental';
    const identifiable = idInfo ? idInfo.fruits.includes(fruit.id) : null;
    return { fruit, status, conditions, evaluation, identifiable };
  });
}

export const SUPPORT_TEXT = {
  'unknown': { label: 'Model not loaded', tone: 'neutral' },
  'not-in-model': { label: 'No freshness check', tone: 'neutral' },
  'experimental': { label: 'Freshness: experimental', tone: 'warn' },
  'supported': { label: 'Freshness: supported', tone: 'good' },
};
