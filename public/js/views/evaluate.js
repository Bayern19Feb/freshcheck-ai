// "Test the model": run the real model on labelled test photos that were NOT
// used for training, then show per-fruit results, a confusion matrix and a
// threshold table. All data stays on this device.

import { html, raw, icon, pct, confirmDialog, toast, downloadText, announce } from '../ui.js';
import { FRUITS, CONDITIONS, getFruit } from '../fruits.js';
import { loadModel, modelState, onModelChange, classify } from '../model.js';
import { loadPhoto } from '../image.js';
import { getThresholds, getMinMargin } from '../state.js';
import { evaluate, thresholdSweep, predict, toCSV, trueKey } from '../evaluation.js';
import * as db from '../db.js';

const keyLabel = (k) => {
  if (k === 'uncertain') return 'Uncertain';
  if (k === 'not-fruit') return 'Not a fruit';
  const [f, c] = k.split(':');
  return `${getFruit(f)?.name || f} – ${CONDITIONS[c]?.short || c}`;
};

export function render(main) {
  let running = false;
  let cancelRun = false;
  let destroyed = false;

  async function draw() {
    if (destroyed) return;
    const all = await db.getAll('evaluations').catch(() => []);
    const version = modelState.metadata?.timeStamp || null;
    const items = all.filter((i) => i.modelVersion === version);
    const otherVersions = all.length - items.length;
    const thresholds = getThresholds();
    const minMargin = getMinMargin();
    const ev = items.length ? evaluate(items, { thresholds, minMargin }) : null;
    const ready = modelState.status === 'ready';

    main.innerHTML = String(html`
      <div class="stack">
        <div class="page-head"><p class="eyebrow">Science lab</p><h1>Test the model</h1></div>
        <p class="note warn">${icon('flask')}<span><strong>Use only photos that were NOT used for training</strong> — ideally different fruits, taken on a different day. Testing with training photos gives falsely high results.</span></p>
        ${!ready ? html`<p class="note ${modelState.status === 'error' ? 'bad' : ''}">${icon('cpu')}<span>${modelState.status === 'error' ? modelState.error.message : 'Loading the AI model…'}</span></p>` : ''}

        <section class="card stack" aria-labelledby="ev-add">
          <h2 id="ev-add">1. Add labelled test photos</h2>
          <p class="small muted">Choose what the photos really show (checked by a person), then pick one or more photos of exactly that.</p>
          <div class="grid-2">
            <label class="field" for="ev-fruit">Real fruit
              <select id="ev-fruit">${FRUITS.map((f) => html`<option value="${f.id}">${f.emoji} ${f.name}</option>`)}<option value="">— Not a fruit —</option></select></label>
            <label class="field" for="ev-cond">Real condition
              <select id="ev-cond"><option value="fresh">Fresh</option><option value="overripe">Overripe</option><option value="spoiled">Spoiled</option></select></label>
          </div>
          <label class="field" for="ev-light">Lighting
            <select id="ev-light"><option>Good daylight</option><option>Indoor light</option><option>Dim</option><option>Very bright / glare</option><option>Mixed</option></select></label>
          <input type="file" id="ev-files" accept="image/*" multiple class="visually-hidden" tabindex="-1" aria-hidden="true">
          <button class="btn block" id="ev-pick" ${ready && !running ? '' : 'disabled'}>${icon('upload')} Choose test photos</button>
          <div id="ev-progress" aria-live="polite"></div>
        </section>

        <section class="card stack" aria-labelledby="ev-res">
          <h2 id="ev-res">2. Results</h2>
          ${otherVersions ? html`<p class="small muted">${otherVersions} test results from other model versions are hidden.</p>` : ''}
          ${!ev ? html`<p class="muted">No test results for this model yet.</p>` : html`
            <p>Using threshold <strong>${pct(thresholds.default)}</strong>${Object.keys(thresholds.perFruit).length ? ' (with per-fruit values)' : ''} and minimum gap <strong>${pct(minMargin)}</strong>. Change the threshold in Settings to compare.</p>
            <dl class="kv" data-testid="ev-total">
              <dt>Test photos</dt><dd>${ev.total.n}</dd>
              <dt>Correct</dt><dd>${ev.total.correct} (${pct(ev.total.accuracy)})</dd>
              <dt>Answered (not uncertain)</dt><dd>${ev.total.answered} (${pct(ev.total.coverage)})</dd>
              <dt>Correct when answered</dt><dd>${pct(ev.total.precisionCovered)}</dd>
              <dt>Spoiled shown as fresh</dt><dd>${ev.total.dangerous}</dd>
            </dl>
            <h3>Per fruit</h3>
            <div class="table-wrap"><table>
              <thead><tr><th scope="col">Real fruit</th><th scope="col">Photos</th><th scope="col">Correct</th><th scope="col">Answered</th><th scope="col">Correct when answered</th><th scope="col">Fruit identified</th><th scope="col">Spoiled → fresh</th></tr></thead>
              <tbody>${Object.entries(ev.perFruit).map(([k, b]) => html`<tr>
                <th scope="row">${k === 'not-fruit' ? 'Not a fruit' : getFruit(k)?.name}</th><td>${b.n}</td><td>${pct(b.accuracy)}</td><td>${pct(b.coverage)}</td><td>${pct(b.precisionCovered)}</td>
                <td>${k === 'not-fruit' ? '—' : pct(b.fruitIdentified / b.n)}</td><td>${b.dangerous}</td></tr>`)}</tbody>
            </table></div>
            <p class="small muted">For "Not a fruit" photos, an Uncertain answer counts as correct.</p>

            <h3>Confusion matrix</h3>
            <p class="small muted">Rows = what the photo really shows. Columns = what the app answered.</p>
            ${matrixTable(ev.matrix)}

            <h3>Threshold table</h3>
            <p class="small muted">How results would change with different thresholds (same test photos). Higher thresholds answer less often but are usually more careful.</p>
            <div class="table-wrap"><table>
              <thead><tr><th scope="col">Threshold</th><th scope="col">Correct</th><th scope="col">Answered</th><th scope="col">Correct when answered</th><th scope="col">Spoiled → fresh</th></tr></thead>
              <tbody>${thresholdSweep(items, { minMargin }).map((r) => html`<tr><th scope="row">${pct(r.threshold)}</th><td>${pct(r.accuracy)}</td><td>${pct(r.coverage)}</td><td>${pct(r.precisionCovered)}</td><td>${r.dangerous}</td></tr>`)}</tbody>
            </table></div>

            <div class="grid-2">
              <button class="btn secondary" id="ev-export">${icon('download')} Export CSV</button>
              <button class="btn danger" id="ev-clear">${icon('trash')} Delete test results</button>
            </div>`}
        </section>
      </div>`);

    const fruitSel = main.querySelector('#ev-fruit');
    const condSel = main.querySelector('#ev-cond');
    fruitSel.addEventListener('change', () => { condSel.disabled = !fruitSel.value; });
    main.querySelector('#ev-pick').addEventListener('click', () => main.querySelector('#ev-files').click());
    main.querySelector('#ev-files').addEventListener('change', (e) => {
      const files = [...(e.target.files || [])];
      e.target.value = '';
      if (files.length) runBatch(files, fruitSel.value || null, fruitSel.value ? condSel.value : 'not-fruit', main.querySelector('#ev-light').value);
    });
    main.querySelector('#ev-export')?.addEventListener('click', () => {
      const rows = items.map((i, n) => {
        const { key, result } = predict(i, { thresholds, minMargin });
        return {
          test_image_id: `T${String(n + 1).padStart(3, '0')}`,
          file_name: i.fileName,
          real_fruit: i.trueFruitId || 'not a fruit',
          real_condition: i.trueConditionId,
          lighting: i.lighting,
          model_top_class: result.topClass,
          model_confidence: result.confidence.toFixed(4),
          app_answer: keyLabel(key),
          outcome: key === 'uncertain' ? (trueKey(i) === 'not-fruit' ? 'correct (rejected)' : 'uncertain') : key === trueKey(i) ? 'correct' : 'incorrect',
          threshold: result.threshold ?? thresholds.default,
          date: i.createdAt,
        };
      });
      downloadText(`freshcheck-evaluation-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
    });
    main.querySelector('#ev-clear')?.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'Delete all test results?', message: 'This removes every saved test result on this device.', confirmText: 'Delete', danger: true });
      if (!ok) return;
      await db.clear('evaluations');
      toast('Test results deleted');
      draw();
    });
  }

  async function runBatch(files, trueFruitId, trueConditionId, lighting) {
    if (running || modelState.status !== 'ready') return;
    running = true;
    cancelRun = false;
    const progress = main.querySelector('#ev-progress');
    main.querySelector('#ev-pick').disabled = true;
    let done = 0;
    let failed = 0;
    for (const file of files) {
      if (cancelRun || destroyed) break;
      progress.innerHTML = String(html`<p class="note">${icon('cpu')}<span>Analysing photo ${done + failed + 1} of ${files.length}…</span></p>`);
      try {
        const canvas = await loadPhoto(file);
        const { predictions } = await classify(canvas);
        await db.put('evaluations', {
          id: db.newId(),
          createdAt: new Date().toISOString(),
          fileName: file.name,
          trueFruitId,
          trueConditionId,
          lighting,
          scores: predictions.map((p) => ({ className: p.className, probability: p.probability })),
          modelVersion: modelState.metadata?.timeStamp || null,
        });
        done += 1;
      } catch (err) {
        console.warn('[FreshCheck] test photo skipped', file.name, err);
        failed += 1;
      }
    }
    running = false;
    const msg = `Added ${done} test photo${done === 1 ? '' : 's'}${failed ? `, skipped ${failed} that could not be opened` : ''}.`;
    announce(msg);
    toast(msg);
    draw();
  }

  const off = onModelChange(draw);
  draw();
  loadModel();
  return () => { destroyed = true; cancelRun = true; off(); };
}

function matrixTable(matrix) {
  const rows = Object.keys(matrix).sort();
  const cols = [...new Set(rows.concat(...rows.map((r) => Object.keys(matrix[r]))))].filter((k) => k !== 'not-fruit').sort();
  if (!cols.includes('uncertain')) cols.push('uncertain');
  return html`<div class="table-wrap"><table data-testid="confusion">
    <thead><tr><th scope="col">Real ↓ / App →</th>${cols.map((c) => html`<th scope="col">${keyLabel(c)}</th>`)}</tr></thead>
    <tbody>${rows.map((r) => html`<tr><th scope="row">${keyLabel(r)}</th>${cols.map((c) => html`<td${raw(c === r || (r === 'not-fruit' && c === 'uncertain') ? ' style="background:var(--green-100);font-weight:700"' : '')}>${matrix[r][c] || 0}</td>`)}</tr>`)}</tbody>
  </table></div>`;
}

