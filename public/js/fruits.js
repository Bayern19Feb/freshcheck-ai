// Fruit and condition definitions, plus the parser that maps the class names
// inside a Teachable Machine model to fruits and freshness conditions.
//
// Naming convention for model classes (see docs/AI_MODEL_GUIDE.md):
//   "<Fruit> - <Condition>"   e.g. "Banana - Fresh", "Apple - Spoiled"
//   "Not a fruit"             (recommended "reject" class)
// Matching is case-insensitive and accepts the aliases listed below.

export const FRUITS = [
  { id: 'apple', name: 'Apple', emoji: '🍎', aliases: ['apple', 'apples'] },
  { id: 'banana', name: 'Banana', emoji: '🍌', aliases: ['banana', 'bananas'] },
  { id: 'orange', name: 'Orange', emoji: '🍊', aliases: ['orange', 'oranges'] },
  { id: 'mango', name: 'Mango', emoji: '🥭', aliases: ['mango', 'mangoes', 'mangos'] },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', aliases: ['grapes', 'grape'] },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', aliases: ['strawberry', 'strawberries'] },
  { id: 'guava', name: 'Guava', emoji: '🍐', aliases: ['guava', 'guavas'] },
  { id: 'papaya', name: 'Papaya', emoji: '🍈', aliases: ['papaya', 'papayas'] },
];

// Condition ids used by the model labels. "uncertain" is never a model class;
// the app produces it when the model's answer is not reliable enough.
export const CONDITIONS = {
  fresh: { id: 'fresh', label: 'Appears Fresh', short: 'Fresh', tone: 'good', icon: 'check',
    aliases: ['fresh', 'good', 'healthy'] },
  overripe: { id: 'overripe', label: 'Overripe Appearance', short: 'Overripe', tone: 'warn', icon: 'clock',
    aliases: ['overripe', 'over-ripe', 'over ripe', 'very ripe'] },
  spoiled: { id: 'spoiled', label: 'Possible Signs of Spoilage', short: 'Spoilage signs', tone: 'bad', icon: 'alert',
    aliases: ['spoiled', 'spoilt', 'rotten', 'bad', 'mouldy', 'moldy', 'decayed'] },
  uncertain: { id: 'uncertain', label: 'Uncertain — Inspect Manually', short: 'Uncertain', tone: 'neutral', icon: 'question',
    aliases: [] },
};

// Classes that mean "this is not something the model supports".
const REJECT_ALIASES = ['not a fruit', 'not fruit', 'unsupported', 'other', 'background', 'unknown', 'none', 'nothing'];

const norm = (s) => String(s).toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

export function getFruit(id) {
  return FRUITS.find((f) => f.id === id) || null;
}

/**
 * Parse one model class name.
 * Returns { raw, kind: 'fruit-condition', fruitId, conditionId }
 *      or { raw, kind: 'reject' }
 *      or { raw, kind: 'unknown' }   (the app does not understand this class)
 */
export function parseLabel(raw) {
  const text = norm(raw);
  if (REJECT_ALIASES.includes(text.replace(/-/g, ' '))) return { raw, kind: 'reject' };

  // Split on " - ", ":", "/", "|" or the last space if nothing else.
  let parts = text.split(/\s*[-:|/]\s*/).filter(Boolean);
  if (parts.length === 1) {
    const i = text.lastIndexOf(' ');
    parts = i > 0 ? [text.slice(0, i), text.slice(i + 1)] : parts;
  }
  if (parts.length < 2) return { raw, kind: 'unknown' };

  const tryPair = (a, b) => {
    const fruit = FRUITS.find((f) => f.aliases.includes(a));
    const cond = Object.values(CONDITIONS).find((c) => c.aliases.includes(b));
    return fruit && cond ? { raw, kind: 'fruit-condition', fruitId: fruit.id, conditionId: cond.id } : null;
  };
  const a = parts[0];
  const b = parts.slice(1).join(' ');
  return tryPair(a, b) || tryPair(b, a) || { raw, kind: 'unknown' };
}

/**
 * Summarise what a model's labels cover.
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

/**
 * Support status for each of the eight target fruits.
 *  - 'not-in-model'  : the loaded model has no classes for this fruit
 *  - 'experimental'  : the model has classes, but evaluation has not passed
 *  - 'supported'     : the model has classes AND the model card records a
 *                      passed evaluation on independent test images
 *  - 'unknown'       : no model is loaded yet
 */
export function fruitSupport(modelLabels, modelCard) {
  const info = modelLabels ? describeLabels(modelLabels) : null;
  return FRUITS.map((fruit) => {
    const evaluation = modelCard?.fruits?.[fruit.id] || {};
    const conditions = info?.fruitsInModel[fruit.id] || [];
    let status;
    if (!info) status = 'unknown';
    else if (!conditions.length) status = 'not-in-model';
    else if (evaluation.evaluation === 'passed') status = 'supported';
    else status = 'experimental';
    return { fruit, status, conditions, evaluation };
  });
}

export const SUPPORT_TEXT = {
  'unknown': { label: 'Model not loaded', tone: 'neutral' },
  'not-in-model': { label: 'Not supported yet', tone: 'neutral' },
  'experimental': { label: 'Experimental', tone: 'warn' },
  'supported': { label: 'Supported (evaluated)', tone: 'good' },
};
