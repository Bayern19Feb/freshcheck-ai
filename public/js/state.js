// Shared app state: the model card (thresholds + evaluation records),
// the active thresholds and the fruit-support map.

import { MODEL_CARD_URL, FALLBACK_THRESHOLDS, FALLBACK_MIN_MARGIN, FALLBACK_ID_THRESHOLD } from './config.js';
import { fruitSupport, describeLabels } from './fruits.js';
import { getPref } from './prefs.js';
import { modelState } from './model.js';

let card = null;
let cardError = null;

export async function loadModelCard() {
  try {
    const res = await fetch(MODEL_CARD_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    card = await res.json();
  } catch (err) {
    cardError = String(err);
    console.warn('[FreshCheck] model card could not be loaded:', err);
    card = null;
  }
  return card;
}

export const getCard = () => card;
export const getCardError = () => cardError;

/** Thresholds in use. A device override from Settings replaces the model card values. */
export function getThresholds() {
  const override = getPref('thresholdOverride', null);
  if (typeof override === 'number') return { default: override, perFruit: {}, source: 'override' };
  if (card?.thresholds && typeof card.thresholds.default === 'number') {
    return { default: card.thresholds.default, perFruit: card.thresholds.perFruit || {}, source: 'model-card' };
  }
  return { ...FALLBACK_THRESHOLDS, source: 'built-in' };
}

export function getMinMargin() {
  return typeof card?.minMargin === 'number' ? card.minMargin : FALLBACK_MIN_MARGIN;
}

/** Minimum identifier score before the app trusts which fruit it is. */
export function getIdThreshold() {
  return typeof card?.idThreshold === 'number' ? card.idThreshold : FALLBACK_ID_THRESHOLD;
}

/** Support rows for every fruit, based on the loaded models + model card. */
export function getSupport() {
  const ready = modelState.status === 'ready';
  const idLabels = ready && modelState.id?.status === 'ready' ? modelState.id.labels : null;
  return fruitSupport(ready ? modelState.labels : null, card, idLabels);
}

/** Fruit ids that the loaded freshness model has classes for. */
export function getFreshFruits() {
  if (modelState.status !== 'ready') return new Set();
  return new Set(Object.keys(describeLabels(modelState.labels).fruitsInModel));
}

export function getSupportMap() {
  return Object.fromEntries(getSupport().map((s) => [s.fruit.id, s.status]));
}

/** Hand-over from the Home screen to the Scan screen (e.g. a photo picked on Home). */
export const handoff = { file: null, mode: null };
