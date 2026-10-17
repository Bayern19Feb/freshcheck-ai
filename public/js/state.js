// Shared app state: the model card (thresholds + evaluation records),
// the active thresholds and the fruit-support map.

import { MODEL_CARD_URL, FALLBACK_THRESHOLDS, FALLBACK_MIN_MARGIN } from './config.js';
import { fruitSupport } from './fruits.js';
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

/** Support rows for the eight target fruits, based on the loaded model + model card. */
export function getSupport() {
  return fruitSupport(modelState.status === 'ready' ? modelState.labels : null, card);
}

export function getSupportMap() {
  return Object.fromEntries(getSupport().map((s) => [s.fruit.id, s.status]));
}

/** Hand-over from the Home screen to the Scan screen (e.g. a photo picked on Home). */
export const handoff = { file: null, mode: null };
