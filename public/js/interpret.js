// Turns the raw output of the model into a result the app can show.
// This file never invents numbers: every score comes from the model output.

import { parseLabel, parseFruitName, CONDITIONS } from './fruits.js';

export class MalformedOutputError extends Error {}

/**
 * Check that the model output looks like a list of class scores.
 * predictions: [{ className: string, probability: number }, ...]
 */
export function validatePredictions(predictions, expectedCount) {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    throw new MalformedOutputError('The model returned no class scores.');
  }
  if (expectedCount && predictions.length !== expectedCount) {
    throw new MalformedOutputError(`Expected ${expectedCount} class scores but got ${predictions.length}.`);
  }
  let sum = 0;
  for (const p of predictions) {
    if (!p || typeof p.className !== 'string' || typeof p.probability !== 'number'
        || !Number.isFinite(p.probability) || p.probability < -1e-6 || p.probability > 1 + 1e-6) {
      throw new MalformedOutputError('The model returned an invalid class score.');
    }
    sum += p.probability;
  }
  // Teachable Machine models end in a softmax layer, so the scores add up to 1.
  if (Math.abs(sum - 1) > 0.02) {
    throw new MalformedOutputError(`Class scores add up to ${sum.toFixed(3)} instead of 1.`);
  }
}

/**
 * Pick the confidence threshold for a fruit.
 * thresholds: { default: number, perFruit?: { [fruitId]: number } }
 */
export function thresholdFor(fruitId, thresholds) {
  const per = thresholds?.perFruit?.[fruitId];
  return typeof per === 'number' ? per : thresholds.default;
}

/**
 * Interpret model predictions.
 *
 * options:
 *   thresholds   { default, perFruit }  minimum top-class score
 *   minMargin    minimum gap between the top two classes (0 disables)
 *   support      map fruitId -> 'supported' | 'experimental' | 'not-in-model'
 *   userFruitId  fruit chosen by the user (optional, never used to change the AI answer)
 *   poorImage    true when the photo is far too dark/bright to trust
 *
 * Returns a plain object that is safe to store in history.
 */
export function interpret(predictions, options) {
  validatePredictions(predictions, options.expectedCount);
  const ranked = [...predictions]
    .map((p) => ({ className: p.className, probability: p.probability, parsed: parseLabel(p.className) }))
    .sort((a, b) => b.probability - a.probability);
  const top = ranked[0];
  const second = ranked[1];

  // Fruit-level score = sum of the scores of every class of that fruit.
  // This is how "which fruit is it?" is answered by a combined classifier.
  const fruitScores = {};
  for (const r of ranked) {
    if (r.parsed.kind === 'fruit-condition') {
      fruitScores[r.parsed.fruitId] = (fruitScores[r.parsed.fruitId] || 0) + r.probability;
    }
  }

  const result = {
    topClass: top.className,
    confidence: top.probability,
    margin: second ? top.probability - second.probability : top.probability,
    scores: ranked.map((r) => ({ className: r.className, probability: r.probability })),
    detectedFruitId: null,
    fruitConfidence: null,
    conditionId: 'uncertain',
    reasons: [],
    experimental: false,
    userFruitId: options.userFruitId || null,
    fruitMismatch: false,
    threshold: null,
  };

  if (top.parsed.kind === 'reject') {
    result.reasons.push('not-a-fruit');
    return result;
  }
  if (top.parsed.kind === 'unknown') {
    result.reasons.push('unknown-class');
    return result;
  }

  const fruitId = top.parsed.fruitId;
  result.detectedFruitId = fruitId;
  result.fruitConfidence = fruitScores[fruitId];
  result.threshold = thresholdFor(fruitId, options.thresholds);

  const status = options.support?.[fruitId];
  if (status === 'experimental') result.experimental = true;
  if (status === 'not-in-model') result.reasons.push('fruit-not-supported');

  if (top.probability < result.threshold) result.reasons.push('low-confidence');
  if (options.poorImage) result.reasons.push('poor-image');
  if (options.minMargin && second && result.margin < options.minMargin) result.reasons.push('close-call');

  if (result.userFruitId && result.userFruitId !== fruitId) {
    result.fruitMismatch = true;
    result.reasons.push('fruit-mismatch');
  }

  // Any reason makes the result uncertain. Otherwise show the model's condition.
  if (result.reasons.length === 0) result.conditionId = top.parsed.conditionId;
  return result;
}

/**
 * Combine the freshness result with the fruit-identifier model (second opinion).
 *
 * freshResult   output of interpret() for the freshness model
 * idPredictions raw identifier scores, or null when no identifier model is loaded
 * options       { idThreshold, freshFruits: Set of fruit ids the freshness model covers,
 *                 userFruitId, poorImage }
 *
 * Rules (never invents an answer):
 *  - identifier says "Not a fruit" confidently        -> uncertain (not-a-fruit)
 *  - identifier unsure                                -> keep freshness result only if both
 *                                                        models' top fruit agree, else uncertain
 *  - fruit WITHOUT freshness data                     -> 'identified' (name the fruit, no freshness claim)
 *  - fruit WITH freshness data but models disagree    -> uncertain (models-disagree)
 *  - otherwise                                        -> freshness result
 */
export function combine(freshResult, idPredictions, options) {
  if (!idPredictions) return freshResult;
  validatePredictions(idPredictions, options.idExpectedCount);
  const ranked = [...idPredictions]
    .map((p) => ({ className: p.className, probability: p.probability, parsed: parseFruitName(p.className) }))
    .sort((a, b) => b.probability - a.probability);
  const top = ranked[0];
  const idThreshold = options.idThreshold ?? 0.6;
  const out = {
    ...freshResult,
    reasons: [...freshResult.reasons],
    identifiedFruitId: top.parsed.kind === 'fruit' ? top.parsed.fruitId : null,
    idTopClass: top.className,
    idConfidence: top.probability,
    idThreshold,
    idScores: ranked.slice(0, 5).map((r) => ({ className: r.className, probability: r.probability })),
    freshnessAvailable: true,
  };
  const uncertain = (reason) => {
    out.conditionId = 'uncertain';
    if (!out.reasons.includes(reason)) out.reasons.push(reason);
    return out;
  };
  const idSure = top.probability >= idThreshold;

  if (top.parsed.kind === 'reject') {
    if (idSure) {
      out.detectedFruitId = null;
      out.fruitConfidence = null;
      out.reasons = out.reasons.filter((r) => r !== 'fruit-mismatch');
      return uncertain('not-a-fruit');
    }
    return freshResult.conditionId === 'uncertain' ? out : uncertain('low-confidence-id');
  }
  if (top.parsed.kind !== 'fruit') return uncertain('unknown-class');

  const fruitId = top.parsed.fruitId;
  if (!idSure) {
    // Only trust the freshness answer if both models point to the same fruit.
    return freshResult.detectedFruitId === fruitId ? out : uncertain('low-confidence-id');
  }

  if (!options.freshFruits?.has(fruitId)) {
    // A fruit the freshness model was never trained on: name it, but make no freshness claim.
    out.detectedFruitId = fruitId;
    out.fruitConfidence = top.probability;
    out.freshnessAvailable = false;
    out.experimental = false;
    out.threshold = idThreshold;
    out.topClass = top.className;
    out.confidence = top.probability;
    out.reasons = [];
    if (options.poorImage) out.reasons.push('poor-image');
    if (out.userFruitId && out.userFruitId !== fruitId) {
      out.fruitMismatch = true;
      out.reasons.push('fruit-mismatch');
    }
    out.conditionId = out.reasons.length ? 'uncertain' : 'identified';
    return out;
  }

  if (freshResult.detectedFruitId !== fruitId) {
    out.reasons = out.reasons.filter((r) => r !== 'not-a-fruit');
    return uncertain('models-disagree');
  }
  return out;
}

export const REASON_TEXT = {
  'not-a-fruit': 'The AI thinks this photo does not show a fruit it knows.',
  'models-disagree': 'The fruit recogniser and the freshness checker disagreed about which fruit this is.',
  'low-confidence-id': 'The fruit recogniser was not sure which fruit this is.',
  'unknown-class': 'The model chose a class name that this app does not recognise. Check the class names in the model (see the AI Model Guide).',
  'fruit-not-supported': 'This fruit is not supported by the current model.',
  'low-confidence': 'The model\'s confidence is below the threshold set for this fruit.',
  'close-call': 'Two classes received similar scores, so the model could not clearly decide.',
  'poor-image': 'The photo is too dark or too bright for a reliable answer.',
  'fruit-mismatch': 'The fruit you selected is different from the fruit the model detected.',
};

export function conditionInfo(id) {
  return CONDITIONS[id] || CONDITIONS.uncertain;
}
