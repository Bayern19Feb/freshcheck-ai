// Fruit library: every fruit the app knows, what the AI can do for it, and
// how to check it yourself. #/fruits (list + search) and #/fruits/<id> (details).

import { html, icon, pct } from '../ui.js';
import { SUPPORT_TEXT, CONDITIONS, GROUPS, getFruit } from '../fruits.js';
import { getSupport } from '../state.js';
import { loadModel, modelState, onModelChange } from '../model.js';
import { fruitTips } from './result-card.js';

function statusPills(r) {
  const id = r.identifiable === null ? '' : r.identifiable
    ? html`<span class="pill good">${icon('cpu')} Recognised</span>` : html`<span class="pill neutral">Not recognised</span>`;
  const fr = r.status === 'unknown' ? '' : html`<span class="pill ${SUPPORT_TEXT[r.status].tone}">${SUPPORT_TEXT[r.status].label}</span>`;
  return html`${id}${fr}`;
}

export function render(main, params) {
  let query = '';
  let filter = 'all';

  function drawList() {
    const rows = getSupport();
    const q = query.trim().toLowerCase();
    const shown = rows.filter((r) => (!q || r.fruit.aliases.some((a) => a.includes(q)) || r.fruit.hindi.toLowerCase().includes(q))
      && (filter === 'all' || (filter === 'fresh' ? r.status === 'supported' || r.status === 'experimental' : r.identifiable)));
    const nFresh = rows.filter((r) => r.status === 'supported' || r.status === 'experimental').length;
    const nId = rows.filter((r) => r.identifiable).length;

    main.innerHTML = String(html`
      <div class="stack">
        <div class="page-head"><p class="eyebrow">Fruit library</p><h1>${rows.length} fruits</h1>
          <p>What the AI can do for each fruit, and how to check it yourself.</p></div>
        ${modelState.status !== 'ready' ? html`<p class="note warn">${icon('info')}<span>${modelState.status === 'loading' ? 'Loading the AI models…' : modelState.status === 'error' ? modelState.error.message : 'The AI is not loaded yet.'}</span></p>` : html`
          <div class="trust">
            <div><strong data-testid="count-id">${modelState.id?.status === 'ready' ? nId : '—'}</strong><span>recognised by the AI</span></div>
            <div><strong data-testid="count-fresh">${nFresh}</strong><span>with a freshness check</span></div>
            <div><strong>${rows.length}</strong><span>in the library</span></div>
          </div>`}
        <label class="field" for="fruit-search">Search
          <input type="text" id="fruit-search" placeholder="e.g. mango, anaar, kiwi" value="${query}" autocomplete="off">
        </label>
        <div class="row" role="group" aria-label="Filter">
          ${[['all', 'All'], ['fresh', 'Freshness check'], ['id', 'Recognised']].map(([k, l]) => html`
            <button class="btn ${filter === k ? '' : 'secondary'}" style="min-height:40px;padding:6px 14px" data-filter="${k}" aria-pressed="${filter === k}">${l}</button>`)}
        </div>
        <ul class="list" data-testid="fruit-list">
          ${shown.map((r) => html`<li><a class="list-item" href="#/fruits/${r.fruit.id}" data-fruit="${r.fruit.id}" data-status="${r.status}">
            <span class="ph" aria-hidden="true">${r.fruit.emoji}</span>
            <span><span class="title">${r.fruit.name}${r.fruit.hindi ? html` <small class="muted" style="font-weight:600">· ${r.fruit.hindi}</small>` : ''}</span>
              <span class="row" style="gap:6px;margin-top:4px">${statusPills(r)}</span></span>
            ${icon('chevron', 'chev')}</a></li>`)}
        </ul>
        ${shown.length === 0 ? html`<p class="muted center">No fruit matches "${query}".</p>` : ''}
        <p class="small muted">Freshness status comes from tests recorded in <code>config/model-card.json</code>. "Recognised" means the fruit recogniser model has a class for it.</p>
      </div>`);

    const input = main.querySelector('#fruit-search');
    input.addEventListener('input', () => {
      query = input.value;
      const pos = input.selectionStart;
      drawList();
      const again = main.querySelector('#fruit-search');
      again.focus();
      again.setSelectionRange(pos, pos);
    });
    main.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; drawList(); }));
  }

  function drawDetail(id) {
    const fruit = getFruit(id);
    if (!fruit) {
      main.innerHTML = String(html`<div class="card center stack"><h1>Fruit not found</h1><a class="btn" href="#/fruits">Back to the library</a></div>`);
      return;
    }
    const r = getSupport().find((x) => x.fruit.id === id);
    const ev = r.evaluation || {};
    main.innerHTML = String(html`
      <div class="stack" data-testid="fruit-detail">
        <a class="link-btn" href="#/fruits">← All fruits</a>
        <section class="card stack">
          <div class="row" style="gap:14px">
            <span class="icon-chip" style="width:64px;height:64px;font-size:2.2rem;border-radius:20px" aria-hidden="true">${fruit.emoji}</span>
            <div><h1 style="margin:0">${fruit.name}</h1>
              <p class="muted" style="margin:0">${GROUPS[fruit.group].name}${fruit.hindi ? ` · Hindi: ${fruit.hindi}` : ''}</p></div>
          </div>
          <div class="row" style="gap:6px">${statusPills(r)}</div>
          <dl class="kv">
            <dt>Fruit recogniser</dt><dd>${r.identifiable === null ? 'Model not loaded' : r.identifiable ? 'Can name this fruit' : 'Cannot recognise this fruit yet'}</dd>
            <dt>Freshness check</dt><dd>${r.conditions.length ? `Classes: ${r.conditions.map((c) => CONDITIONS[c].short).join(', ')}` : 'Not available — no licensed fresh/rotten photos of this fruit were found'}</dd>
            ${ev.testImages ? html`<dt>Tested on</dt><dd>${ev.testImages} photos not used for training${ev.accuracy !== null && ev.accuracy !== undefined ? `, correct when answered ${pct(ev.accuracy)}` : ''}</dd>` : ''}
          </dl>
          ${ev.notes ? html`<p class="small muted" style="margin:0">${ev.notes}</p>` : ''}
        </section>
        ${fruitTips(fruit, true)}
        <a class="btn big block" href="#/scan">${icon('camera')} Scan a ${fruit.name.toLowerCase().replace(/\s*\(.*\)/, '')}</a>
      </div>`);
  }

  const draw = () => (params[0] ? drawDetail(params[0]) : drawList());
  const off = onModelChange(draw);
  draw();
  loadModel();
  return off;
}
