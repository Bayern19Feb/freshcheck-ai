// "More" screen: links, model status, threshold, privacy, reset, help.

import { html, icon, pct, confirmDialog, toast } from '../ui.js';
import { APP_VERSION } from '../config.js';
import { loadModel, resetModel, modelState, onModelChange, modelBaseUrl } from '../model.js';
import { getPref, setPref } from '../prefs.js';
import { getCard } from '../state.js';
import { clearScans, listScans } from '../history.js';
import { storageState } from '../db.js';

export function render(main) {
  function draw() {
    const override = getPref('thresholdOverride', null);
    const cardDefault = getCard()?.thresholds?.default ?? 0.75;
    const current = typeof override === 'number' ? override : cardDefault;
    const status = { idle: ['neutral', 'Not loaded'], loading: ['warn', 'Loading…'], ready: ['good', 'Ready'], error: ['bad', 'Unavailable'] }[modelState.status];

    main.innerHTML = String(html`
      <div class="stack">
        <div class="page-head"><p class="eyebrow">FreshCheck AI</p><h1>More</h1></div>
        <div class="grid-2">
          <a class="tile" href="#/dashboard"><span class="icon-chip sky">${icon('chart')}</span><strong>Dashboard</strong><span>Your scan counts</span></a>
          <a class="tile" href="#/fruits"><span class="icon-chip berry">${icon('apple')}</span><strong>Fruit library</strong><span>All fruits and AI status</span></a>
          <a class="tile" href="#/model"><span class="icon-chip">${icon('cpu')}</span><strong>Model information</strong><span>Source, classes, limits</span></a>
          <a class="tile" href="#/evaluate"><span class="icon-chip plum">${icon('flask')}</span><strong>Test the model</strong><span>Measure accuracy with test photos</span></a>
        </div>

        <section class="card stack" aria-labelledby="s-model">
          <h2 id="s-model">AI model</h2>
          <p>Status: <span class="pill ${status[0]}" data-testid="settings-model-status">${status[1]}</span></p>
          ${modelState.status === 'error' ? html`<p class="note bad">${icon('alert')}<span>${modelState.error.message}</span></p>` : ''}
          <div class="row">
            <button class="btn secondary" id="load-model">${icon('retry')} ${modelState.status === 'ready' ? 'Reload model' : 'Load model'}</button>
          </div>
          <details>
            <summary>Model setup help</summary>
            <div class="stack">
              <ol class="steps">
                <li>Train an image model in Google Teachable Machine with classes named like <code>Banana - Fresh</code>, <code>Banana - Overripe</code>, <code>Banana - Spoiled</code> and <code>Not a fruit</code>.</li>
                <li>Export → TensorFlow.js → Download. Unzip it.</li>
                <li>Copy <code>model.json</code>, <code>metadata.json</code> and <code>weights.bin</code> into <code>public/models/fruit-freshness/</code>.</li>
                <li>Reload this page and press <strong>Load model</strong>.</li>
              </ol>
              <p class="small muted">Full instructions are in <code>docs/AI_MODEL_GUIDE.md</code>.</p>
              <label class="field" for="model-url">Model location (advanced)
                <span class="hint">Leave empty to use the model inside the app. You may paste a Teachable Machine share link (https://teachablemachine.withgoogle.com/models/…/). Photos still stay on this device; only the model is downloaded.</span>
                <input type="url" id="model-url" placeholder="models/fruit-freshness/" value="${getPref('modelUrl', '')}">
              </label>
              <div class="row"><button class="btn secondary" id="save-url">Save location</button></div>
              <p class="small muted">Currently using: <code>${modelBaseUrl()}</code></p>
            </div>
          </details>
        </section>

        <section class="card stack" aria-labelledby="s-thr">
          <h2 id="s-thr">Confidence threshold</h2>
          <p>If the model's top score is below this value, the result is shown as <strong>Uncertain — Inspect Manually</strong>.</p>
          <label class="field" for="thr">Threshold on this device: <output id="thr-out">${pct(current)}</output>
            <input type="range" id="thr" min="0.5" max="0.95" step="0.05" value="${current}">
          </label>
          <p class="small muted">Model card value: ${pct(cardDefault)}. ${getCard()?.thresholdNote || ''} A higher threshold gives fewer, more careful answers.</p>
          <div class="row"><button class="btn ghost" id="thr-reset" ${typeof override === 'number' ? '' : 'disabled'}>Use model card value</button></div>
        </section>

        <section class="card stack" aria-labelledby="s-privacy">
          <h2 id="s-privacy">Privacy</h2>
          <ul class="steps">
            <li><strong>Photos stay on this device.</strong> The AI runs inside your browser. Photos are never uploaded.</li>
            <li><strong>History is stored only in this browser</strong> (IndexedDB) as small thumbnails and results. Full-size photos are not kept.</li>
            <li>No account, no name, no phone number, no location, no advertising and no analytics.</li>
            <li><strong>Network use:</strong> the app files and the AI model are downloaded from the website the first time, then kept in the browser's cache so they can work offline. If you set a Teachable Machine link above, the model is downloaded from Google's server — photos are still not sent.</li>
          </ul>
          ${!storageState.persistent ? html`<p class="note warn">${icon('alert')}<span>This browser is not allowing storage. History will be lost when the page is closed.</span></p>` : ''}
        </section>

        <section class="card stack" aria-labelledby="s-data">
          <h2 id="s-data">Your data</h2>
          <button class="btn danger" id="reset">${icon('trash')} Delete all scan history</button>
        </section>

        <section class="card stack" aria-labelledby="s-help">
          <h2 id="s-help">Help and troubleshooting</h2>
          <details><summary>The camera does not open</summary><div><p>The live camera needs a secure address (https:// or localhost). If you blocked the permission, tap the lock icon next to the address → Permissions → Camera → Allow, and reload. You can always use <strong>Upload</strong> or <strong>Take photo</strong> instead.</p></div></details>
          <details><summary>"AI model unavailable"</summary><div><p>The model files are missing or could not be downloaded. Check that the three model files are in <code>public/models/fruit-freshness/</code>, check your internet connection, then press Load model.</p></div></details>
          <details><summary>Results are often "Uncertain"</summary><div><p>Use one fruit, good light and a plain background, filling the dashed square. If it still happens, the model may need more varied training photos.</p></div></details>
          <details><summary>Install as an app</summary><div><p>In Chrome on Android, open the menu (⋮) → <strong>Add to Home screen</strong> or <strong>Install app</strong>. FreshCheck AI then opens full-screen from its icon.</p></div></details>
          <details><summary>Does it work offline?</summary><div><p>After the app and model have been opened once with internet, they are cached, and scanning can work offline. History always works offline.</p></div></details>
        </section>

        <p class="center small muted">FreshCheck AI version ${APP_VERSION} · A school science exhibition project · Not affiliated with or endorsed by Google, TensorFlow or any food-safety authority.</p>
      </div>`);

    const thr = main.querySelector('#thr');
    thr.addEventListener('input', () => { main.querySelector('#thr-out').textContent = pct(Number(thr.value)); });
    thr.addEventListener('change', () => { setPref('thresholdOverride', Number(thr.value)); toast(`Threshold set to ${pct(Number(thr.value))} on this device`); draw(); });
    main.querySelector('#thr-reset').addEventListener('click', () => { setPref('thresholdOverride', null); toast('Using the model card threshold'); draw(); });
    main.querySelector('#load-model').addEventListener('click', () => { resetModel(); loadModel(); });
    main.querySelector('#save-url').addEventListener('click', () => {
      const v = main.querySelector('#model-url').value.trim();
      if (v && !/^(https:\/\/|models\/|\.\/|\/)/.test(v)) { toast('Please enter an https:// link or a folder path'); return; }
      setPref('modelUrl', v);
      resetModel();
      loadModel();
      toast(v ? 'Model location saved' : 'Using the built-in model location');
    });
    main.querySelector('#reset').addEventListener('click', async () => {
      const n = (await listScans().catch(() => [])).length;
      const ok = await confirmDialog({ title: 'Delete all scan history?', message: `This permanently deletes ${n} saved scans from this device.`, confirmText: 'Delete all', danger: true });
      if (!ok) return;
      await clearScans();
      toast('All scan history deleted');
    });
  }
  const off = onModelChange(draw);
  draw();
  return off;
}
