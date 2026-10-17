// Loads the Teachable Machine model and runs genuine inference with TensorFlow.js.
// The heavy libraries are only downloaded when the model is first needed.
//
// States: 'idle' -> 'loading' -> 'ready' | 'error'

import { MODEL_DIR, MODEL_LOAD_TIMEOUT } from './config.js';
import { getPref } from './prefs.js';

const listeners = new Set();
export const modelState = {
  status: 'idle',
  error: null,        // { code, message, detail }
  labels: null,
  metadata: null,
  url: null,
  backend: null,
  loadMs: null,
  warmupMs: null,
};
let model = null;
let loadPromise = null;

export const MODEL_ERRORS = {
  'missing-files': 'The AI model files were not found. A trained model has not been added to this app yet — see "Model setup" in Settings.',
  'bad-files': 'The model files were found but could not be read. They may be incomplete. Re-export the model from Teachable Machine and copy all three files again.',
  'library': 'The AI library could not be loaded. Check your internet connection and reload the page.',
  'timeout': 'The model is taking too long to load. Check your internet connection and try again.',
  'mismatch': 'The model and its metadata do not match (different number of classes). Re-export the model and copy all three files together.',
  'network': 'The model could not be downloaded. Check your internet connection and try again.',
  'unknown': 'The AI model could not be started on this device.',
};

class ModelError extends Error {
  constructor(code, detail) {
    super(MODEL_ERRORS[code] || MODEL_ERRORS.unknown);
    this.code = code;
    this.detail = detail;
  }
}

function emit() {
  for (const fn of listeners) fn(modelState);
}

export function onModelChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Where the model lives. A Settings override (e.g. a Teachable Machine share link) wins. */
export function modelBaseUrl() {
  let url = getPref('modelUrl', '') || MODEL_DIR;
  if (!url.endsWith('/')) url += '/';
  return url;
}

function withTimeout(promise, ms, code) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new ModelError(code)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

const loadedScripts = new Map();
function loadScript(src) {
  if (!loadedScripts.has(src)) {
    loadedScripts.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => {
        loadedScripts.delete(src);
        reject(new ModelError('library', src));
      };
      document.head.appendChild(s);
    }));
  }
  return loadedScripts.get(src);
}

async function fetchJSON(url) {
  let res;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch (err) {
    throw new ModelError('network', String(err));
  }
  if (res.status === 404) throw new ModelError('missing-files', `${url} returned 404`);
  if (!res.ok) throw new ModelError('network', `${url} returned HTTP ${res.status}`);
  try {
    return await res.json();
  } catch (err) {
    throw new ModelError('bad-files', `${url} is not valid JSON`);
  }
}

async function doLoad() {
  const started = performance.now();
  const base = modelBaseUrl();
  modelState.url = base;

  await loadScript('vendor/tf.min.js');
  await loadScript('vendor/teachablemachine-image.min.js');
  if (!window.tf || !window.tmImage) throw new ModelError('library', 'globals missing');

  // Check both files first so we can give a clear message if they are missing.
  const [modelJson, metadata] = await Promise.all([
    fetchJSON(`${base}model.json`),
    fetchJSON(`${base}metadata.json`),
  ]);
  if (!modelJson.modelTopology || !modelJson.weightsManifest) throw new ModelError('bad-files', 'model.json has no topology/weights');
  if (!Array.isArray(metadata.labels) || metadata.labels.length < 2) throw new ModelError('bad-files', 'metadata.json has no labels');

  let loaded;
  try {
    loaded = await window.tmImage.load(`${base}model.json`, `${base}metadata.json`);
  } catch (err) {
    throw new ModelError('bad-files', String(err));
  }
  const classes = loaded.getTotalClasses();
  if (classes !== metadata.labels.length) throw new ModelError('mismatch', `${classes} outputs vs ${metadata.labels.length} labels`);

  modelState.loadMs = Math.round(performance.now() - started);

  // Warm-up run so the first real scan is not slow (also proves the model runs here).
  const blank = document.createElement('canvas');
  blank.width = blank.height = metadata.imageSize || 224;
  const w0 = performance.now();
  await loaded.predict(blank);
  modelState.warmupMs = Math.round(performance.now() - w0);

  model = loaded;
  modelState.labels = metadata.labels.slice();
  modelState.metadata = metadata;
  modelState.backend = window.tf.getBackend ? window.tf.getBackend() : null;
}

/** Start loading (safe to call many times; only one load runs at once). */
export function loadModel() {
  if (modelState.status === 'ready') return Promise.resolve(modelState);
  if (loadPromise) return loadPromise;
  modelState.status = 'loading';
  modelState.error = null;
  emit();
  loadPromise = withTimeout(doLoad(), MODEL_LOAD_TIMEOUT, 'timeout')
    .then(() => {
      modelState.status = 'ready';
      emit();
      return modelState;
    })
    .catch((err) => {
      const code = err instanceof ModelError ? err.code : 'unknown';
      console.error('[FreshCheck] model load failed:', code, err.detail || err);
      model = null;
      modelState.status = 'error';
      modelState.error = { code, message: MODEL_ERRORS[code] || MODEL_ERRORS.unknown, detail: err.detail || String(err) };
      emit();
      return modelState;
    })
    .finally(() => { loadPromise = null; });
  return loadPromise;
}

/** Forget the current model (used when the model location changes). */
export function resetModel() {
  model = null;
  Object.assign(modelState, { status: 'idle', error: null, labels: null, metadata: null, url: null, backend: null, loadMs: null, warmupMs: null });
  emit();
}

/**
 * Run the model on a canvas. Returns { predictions, ms }.
 * predictions = [{ className, probability }] straight from the model.
 */
export async function classify(canvas) {
  if (modelState.status !== 'ready' || !model) throw new Error('Model is not ready');
  const t0 = performance.now();
  const predictions = await model.predict(canvas);
  return { predictions, ms: Math.round(performance.now() - t0) };
}
