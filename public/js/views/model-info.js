// Model information screen ("model card").

import { html, icon, pct } from '../ui.js';
import { getCard, getCardError, getThresholds, getMinMargin, getSupport } from '../state.js';
import { loadModel, modelState, onModelChange } from '../model.js';
import { describeLabels, SUPPORT_TEXT } from '../fruits.js';

export function render(main) {
  function draw() {
    const card = getCard() || {};
    const t = getThresholds();
    const m = modelState.metadata;
    const labels = modelState.labels;
    const info = labels ? describeLabels(labels) : null;
    main.innerHTML = String(html`
      <div class="stack">
        <div class="page-head"><p class="eyebrow">About the AI</p><h1>Model information</h1></div>
        ${getCardError() ? html`<p class="note bad">${icon('alert')}<span>The model card file could not be loaded (${getCardError()}).</span></p>` : ''}
        <section class="card stack">
          <h2>Status</h2>
          <dl class="kv">
            <dt>Status</dt><dd data-testid="model-status">${{ idle: 'Not loaded', loading: 'Loading…', ready: 'Ready', error: 'Unavailable' }[modelState.status]}</dd>
            <dt>Location</dt><dd><code>${modelState.url || '—'}</code></dd>
            <dt>Model name</dt><dd>${m?.modelName || card.modelName || '—'}</dd>
            <dt>Export date</dt><dd>${m?.timeStamp ? new Date(m.timeStamp).toLocaleString() : card.exportDate || '—'}</dd>
            <dt>Version</dt><dd>${card.modelVersion || '—'}</dd>
            <dt>Library</dt><dd>${m ? `${m.packageName || ''} ${m.packageVersion || ''}, TF.js ${m.tfjsVersion || '?'}` : '—'}</dd>
            <dt>Runs on</dt><dd>${modelState.backend ? `This device (${modelState.backend})` : '—'}</dd>
            <dt>Load time</dt><dd>${modelState.loadMs ? `${modelState.loadMs} ms (measured now)` : '—'}</dd>
            <dt>Last verified</dt><dd>${card.lastVerified || 'Not verified yet'}</dd>
          </dl>
          ${modelState.status === 'error' ? html`<p class="note bad">${icon('alert')}<span>${modelState.error.message}</span></p>` : ''}
        </section>

        <section class="card stack">
          <h2>Classes in the model</h2>
          ${labels ? html`<ul class="steps">${info.parsed.map((p) => html`<li><code>${p.raw}</code> → ${
            p.kind === 'fruit-condition' ? `${p.fruitId}, ${p.conditionId}` : p.kind === 'reject' ? 'reject class (not a supported fruit)' : 'NOT RECOGNISED by the app'}</li>`)}</ul>
            ${info.unknownLabels.length ? html`<p class="note warn">${icon('alert')}<span>Some class names do not follow the naming rule "Fruit - Condition". Predictions of those classes are shown as Uncertain.</span></p>` : ''}
            ${!info.hasReject ? html`<p class="note warn">${icon('info')}<span>This model has no "Not a fruit" class, so photos of other things may be given a fruit label.</span></p>` : ''}`
            : html`<p class="muted">Load a model to see its classes.</p>`}
        </section>

        <section class="card stack">
          <h2>Fruit support</h2>
          <ul class="steps">${getSupport().map((r) => html`<li>${r.fruit.emoji} ${r.fruit.name}: ${SUPPORT_TEXT[r.status].label}</li>`)}</ul>
        </section>

        <section class="card stack">
          <h2>Confidence threshold</h2>
          <p>Default threshold: <strong>${pct(t.default)}</strong> ${t.source === 'override' ? '(changed on this device in Settings)' : t.source === 'model-card' ? '(from the model card)' : '(built-in fallback)'}.
            Minimum gap between the top two classes: <strong>${pct(getMinMargin())}</strong>.</p>
          ${Object.keys(t.perFruit || {}).length ? html`<p>Per-fruit thresholds: ${Object.entries(t.perFruit).map(([k, v]) => `${k} ${pct(v)}`).join(', ')}.</p>` : ''}
          <p class="small muted">${card.thresholdNote || ''}</p>
        </section>

        <section class="card stack">
          <h2>Training data and testing</h2>
          <dl class="kv">
            <dt>Source</dt><dd>${card.source || '—'}</dd>
            <dt>Model type</dt><dd>${card.architecture || '—'}</dd>
            <dt>Training data</dt><dd>${card.trainingData || '—'}</dd>
            <dt>Test procedure</dt><dd>${card.testProcedure || '—'}</dd>
          </dl>
        </section>

        <section class="card stack">
          <h2>Known limitations</h2>
          <ul class="steps">${(card.knownLimitations || []).map((l) => html`<li>${l}</li>`)}</ul>
          <p class="small muted">This model is not certified by any scientific, medical or food-safety authority.</p>
        </section>
      </div>`);
  }
  const off = onModelChange(draw);
  draw();
  loadModel();
  return off;
}
