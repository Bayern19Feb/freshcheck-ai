// Fruit-support status for the eight target fruits.

import { html, icon, pct } from '../ui.js';
import { SUPPORT_TEXT, CONDITIONS } from '../fruits.js';
import { getSupport } from '../state.js';
import { loadModel, modelState, onModelChange } from '../model.js';

export function render(main) {
  function draw() {
    const rows = getSupport();
    main.innerHTML = String(html`
      <div class="stack">
        <div class="page-head"><p class="eyebrow">Model coverage</p><h1>Supported fruits</h1></div>
        <p class="muted">A fruit is <strong>Supported</strong> only when the loaded model has classes for it <em>and</em> it passed testing on photos that were not used for training.
          <strong>Experimental</strong> means the model has classes for it but testing has not passed yet.</p>
        ${modelState.status !== 'ready' ? html`<p class="note warn">${icon('info')}<span>${modelState.status === 'loading' ? 'Loading the model…' : modelState.status === 'error' ? modelState.error.message : 'The model is not loaded yet.'}</span></p>` : ''}
        <ul class="list">
          ${rows.map((r) => html`<li class="card fruit-card" data-fruit="${r.fruit.id}" data-status="${r.status}">
            <span class="emoji" aria-hidden="true">${r.fruit.emoji}</span>
            <div>
              <div class="row" style="justify-content:space-between"><strong>${r.fruit.name}</strong>
                <span class="pill ${SUPPORT_TEXT[r.status].tone}">${SUPPORT_TEXT[r.status].label}</span></div>
              <p class="small muted" style="margin:4px 0 0">
                ${r.conditions.length ? `Model classes: ${r.conditions.map((c) => CONDITIONS[c].short).join(', ')}.` : 'No classes for this fruit in the current model.'}
                ${r.evaluation.testImages ? ` Tested on ${r.evaluation.testImages} independent photos${r.evaluation.accuracy !== null && r.evaluation.accuracy !== undefined ? `, correct when answered ${pct(r.evaluation.accuracy)}` : ''}.` : ''}
                ${r.evaluation.notes ? ` ${r.evaluation.notes}` : ''}
              </p>
            </div></li>`)}
        </ul>
        <p class="small muted">Evaluation records come from <code>config/model-card.json</code>. See the AI Model Guide for how they are measured.</p>
        <a class="btn secondary block" href="#/evaluate">${icon('flask')} Test the model</a>
      </div>`);
  }
  const off = onModelChange(draw);
  draw();
  loadModel();
  return off;
}
