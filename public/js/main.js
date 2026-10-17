// App start-up and a tiny hash router (#/scan, #/history/abc ...).
// Hash routes keep working after a page refresh on any static host.

import { html } from './ui.js';
import { onModelChange, modelState } from './model.js';
import { loadModelCard } from './state.js';
import * as home from './views/home.js';
import * as scan from './views/scan.js';
import * as historyView from './views/history.js';
import * as learn from './views/learn.js';
import * as quiz from './views/quiz.js';
import * as dashboard from './views/dashboard.js';
import * as fruitsView from './views/fruits.js';
import * as modelInfo from './views/model-info.js';
import * as settings from './views/settings.js';
import * as evaluate from './views/evaluate.js';

const ROUTES = [
  { pattern: /^\/$/, view: home, nav: 'home', title: 'Home' },
  { pattern: /^\/scan$/, view: scan, nav: 'scan', title: 'Scan a fruit' },
  { pattern: /^\/history$/, view: historyView, nav: 'history', title: 'Scan history' },
  { pattern: /^\/history\/([\w-]+)$/, view: historyView, nav: 'history', title: 'Scan details' },
  { pattern: /^\/learn$/, view: learn, nav: 'learn', title: 'Learning centre' },
  { pattern: /^\/learn\/([\w-]+)$/, view: learn, nav: 'learn', title: 'Learning centre' },
  { pattern: /^\/quiz$/, view: quiz, nav: 'learn', title: 'Quiz' },
  { pattern: /^\/dashboard$/, view: dashboard, nav: 'settings', title: 'My scan dashboard' },
  { pattern: /^\/fruits$/, view: fruitsView, nav: 'settings', title: 'Supported fruits' },
  { pattern: /^\/model$/, view: modelInfo, nav: 'settings', title: 'Model information' },
  { pattern: /^\/settings$/, view: settings, nav: 'settings', title: 'More & settings' },
  { pattern: /^\/evaluate$/, view: evaluate, nav: 'settings', title: 'Test the model' },
];

const main = document.getElementById('main');
let cleanup = null;
let renderId = 0;

function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = h.split('?');
  return { path, query: new URLSearchParams(qs) };
}

async function route() {
  const id = ++renderId;
  if (typeof cleanup === 'function') {
    try { cleanup(); } catch (err) { console.error(err); }
  }
  cleanup = null;
  const { path, query } = parseHash();
  let match = null;
  let entry = ROUTES.find((r) => (match = path.match(r.pattern)));
  if (!entry) {
    main.innerHTML = String(html`<div class="card center stack"><h1>Page not found</h1><p>This page does not exist.</p><a class="btn" href="#/">Go home</a></div>`);
    return;
  }
  document.title = `${entry.title} · FreshCheck AI`;
  for (const a of document.querySelectorAll('.bottom-nav a')) {
    if (a.dataset.nav === entry.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  main.innerHTML = '';
  try {
    const result = await entry.view.render(main, match.slice(1), query);
    if (id !== renderId) { if (typeof result === 'function') result(); return; }
    cleanup = result;
  } catch (err) {
    console.error('[FreshCheck] view error', err);
    main.innerHTML = String(html`<div class="card stack"><h1>Something went wrong</h1><p>This screen could not be shown. Please go back and try again.</p><a class="btn" href="#/">Go home</a></div>`);
  }
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function renderModelPill() {
  const el = document.getElementById('model-pill');
  const map = {
    idle: ['neutral', 'AI not loaded'],
    loading: ['warn', 'Loading AI…'],
    ready: ['good', 'AI ready'],
    error: ['bad', 'AI unavailable'],
  };
  const [tone, text] = map[modelState.status];
  el.innerHTML = String(html`<a href="#/settings" class="pill ${tone}" title="Model status"><span class="dot ${modelState.status === 'loading' ? 'pulse' : ''}"></span>${text}</a>`);
}

async function start() {
  await loadModelCard();
  onModelChange(renderModelPill);
  renderModelPill();
  window.addEventListener('hashchange', route);
  await route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('[FreshCheck] service worker not registered', err));
  }
}

start();
