// Scan screen: camera / upload -> preview -> genuine model inference -> result.

import { html, icon, announce, toast } from '../ui.js';
import { FRUITS } from '../fruits.js';
import { loadModel, onModelChange, modelState, classify } from '../model.js';
import { interpret, combine, MalformedOutputError } from '../interpret.js';
import { loadPhoto, makeThumbnail, checkQuality, scaleToCanvas, ImageError, QUALITY_TEXT } from '../image.js';
import { cameraAvailability, startCamera, grabFrame, CAMERA_ERRORS } from '../camera.js';
import { ANALYSIS_MAX_SIDE } from '../config.js';
import { getThresholds, getMinMargin, getSupportMap, getSupport, getIdThreshold, getFreshFruits, handoff } from '../state.js';
import { makeScanRecord, saveScan, setFeedback } from '../history.js';
import { storageState, isQuotaError } from '../db.js';
import { resultCard } from './result-card.js';

export function render(main, _params, query) {
  main.innerHTML = String(html`
    <div class="stack">
      <div class="page-head"><p class="eyebrow">AI scanner</p><h1>Scan a fruit</h1></div>
      <ol class="stepper" id="stepper" aria-label="Progress">
        <li data-step="1"><b>1</b>Photo</li><li data-step="2"><b>2</b>Analyse</li><li data-step="3"><b>3</b>Result</li>
      </ol>
      <div id="model-status" aria-live="polite"></div>
      <div class="scan-stage" id="stage" aria-label="Photo area"></div>
      <div id="message" aria-live="assertive"></div>
      <div id="controls" class="stack"></div>
      <div id="result"></div>
      <label class="field" for="fruit-select" id="fruit-field">Which fruit is it? <span class="hint">Optional. The AI still decides by itself — your choice is only used to warn you if the AI sees a different fruit.</span>
        <select id="fruit-select">
          <option value="">Let the AI decide</option>
          ${FRUITS.map((f) => html`<option value="${f.id}">${f.emoji} ${f.name}</option>`)}
        </select>
      </label>
      <details id="tips">
        <summary><span class="topic-emoji" aria-hidden="true">💡</span>Tips for a good photo</summary>
        <div><ul class="steps">
          <li>One fruit at a time, filling most of the square.</li>
          <li>Good, even light. Avoid strong shadows and flash glare.</li>
          <li>A plain background works best.</li>
          <li>Hold the phone steady so the photo is sharp.</li>
          <li>Only the centre square of the photo is analysed.</li>
        </ul></div>
      </details>
    </div>
    <input type="file" id="file-capture" accept="image/*" capture="environment" class="visually-hidden" tabindex="-1" aria-hidden="true">
    <input type="file" id="file-upload" accept="image/*" class="visually-hidden" tabindex="-1" aria-hidden="true">
  `);

  const $ = (s) => main.querySelector(s);
  const stage = $('#stage');
  const controls = $('#controls');
  const message = $('#message');
  const resultBox = $('#result');
  const fruitSelect = $('#fruit-select');

  let stopCamera = null;
  let video = null;
  let photo = null;          // analysis-sized canvas
  let quality = null;
  let busy = false;
  let analysisToken = 0;
  let mode = 'empty';
  let destroyed = false;

  // ---------- model status ----------
  function renderModelStatus() {
    const box = $('#model-status');
    if (!box) return;
    const s = modelState.status;
    if (s === 'ready') {
      const support = getSupport().filter((r) => r.status === 'supported' || r.status === 'experimental');
      box.innerHTML = String(html`<details class="note good" style="display:block;padding:0;box-shadow:none">
        <summary style="min-height:48px;padding:10px 14px">${icon('cpu', 'inline-icon')} <span><strong>AI ready</strong> · runs on this device, photos are not uploaded</span></summary>
        <div class="small">${modelState.id?.status === 'ready' ? `Fruit recogniser: knows ${getSupport().filter((r) => r.identifiable).length} fruits. ` : ''}${support.length ? `Freshness check: ${support.map((r) => r.fruit.name + (r.status === 'experimental' ? ' (experimental)' : '')).join(', ')}.` : 'The freshness model has no fruit classes.'}
          <a href="#/fruits">Fruit library</a></div></details>`);
    } else if (s === 'loading') {
      box.innerHTML = String(html`<p class="note">${icon('cpu')}<span><strong>Loading the AI model…</strong> This can take a few seconds the first time.</span></p>`);
    } else if (s === 'error') {
      box.innerHTML = String(html`<div class="note bad">${icon('alert')}<div><strong>AI model unavailable.</strong> ${modelState.error.message}
        <div class="row" style="margin-top:8px"><button class="btn secondary" id="retry-model">${icon('retry')} Try again</button><a class="link-btn" href="#/settings">Model setup help</a></div></div></div>`);
      box.querySelector('#retry-model').addEventListener('click', () => loadModel());
    } else {
      box.innerHTML = '';
    }
    if (mode === 'preview') renderControls();
  }
  const offModel = onModelChange(renderModelStatus);
  renderModelStatus();
  loadModel();

  // ---------- stage + controls ----------
  function showMessage(text, tone = 'bad') {
    message.innerHTML = text ? String(html`<p class="note ${tone}" role="alert">${icon(tone === 'bad' ? 'alert' : 'info')}<span>${text}</span></p>`) : '';
  }

  function setStep(n) {
    main.querySelectorAll('#stepper li').forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle('active', s === n);
      li.classList.toggle('done', s < n);
      if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  function renderEmpty() {
    mode = 'empty';
    setStep(1);
    stage.innerHTML = String(html`<div class="empty-stage"><div class="icon-ring">${icon('camera')}</div><p>No photo yet</p><small>Use the camera or upload a photo of one fruit</small></div>`);
    const live = cameraAvailability() === 'ok';
    controls.innerHTML = String(html`
      ${live ? html`<button class="btn big block" id="btn-live">${icon('camera')} Use camera</button>` : ''}
      <div class="grid-2">
        <button class="btn secondary" id="btn-capture">${icon('camera')} Take photo</button>
        <button class="btn secondary" id="btn-upload">${icon('upload')} Upload</button>
      </div>`);
    $('#btn-live')?.addEventListener('click', openLiveCamera);
    $('#btn-capture').addEventListener('click', () => $('#file-capture').click());
    $('#btn-upload').addEventListener('click', () => $('#file-upload').click());
  }

  async function openLiveCamera() {
    showMessage('');
    resultBox.innerHTML = '';
    mode = 'camera';
    stage.innerHTML = String(html`<video aria-label="Live camera preview" playsinline muted></video><div class="crop-guide" style="inset:6%"></div><div class="stage-caption">Fit one fruit inside the square</div>`);
    video = stage.querySelector('video');
    controls.innerHTML = String(html`<div class="grid-2">
        <button class="btn big" id="btn-shoot" disabled>${icon('camera')} Capture</button>
        <button class="btn big secondary" id="btn-cancel-cam">${icon('x')} Cancel</button></div>`);
    $('#btn-cancel-cam').addEventListener('click', () => { closeCamera(); renderEmpty(); });
    try {
      stopCamera = await startCamera(video);
      if (destroyed || mode !== 'camera') { closeCamera(); return; }
      const shoot = $('#btn-shoot');
      shoot.disabled = false;
      shoot.focus();
      shoot.addEventListener('click', () => {
        if (!video.videoWidth) return;
        const frame = scaleToCanvas(grabFrame(video), ANALYSIS_MAX_SIDE);
        closeCamera();
        setPhoto(frame);
      });
    } catch (err) {
      closeCamera();
      renderEmpty();
      showMessage(err.message || CAMERA_ERRORS.unknown);
    }
  }

  function closeCamera() {
    if (stopCamera) stopCamera();
    stopCamera = null;
    video = null;
  }

  async function handleFile(file) {
    showMessage('');
    resultBox.innerHTML = '';
    if (!file) { showMessage('No photo was selected.', 'info'); return; }
    stage.innerHTML = String(html`<div class="empty-stage"><div class="spinner" role="progressbar" aria-label="Opening photo"></div><p>Opening photo…</p></div>`);
    try {
      setPhoto(await loadPhoto(file));
    } catch (err) {
      renderEmpty();
      showMessage(err instanceof ImageError ? err.message : 'This photo could not be opened. Please try a different one.');
      if (!(err instanceof ImageError)) console.error(err);
    }
  }

  function setPhoto(canvas) {
    photo = canvas;
    quality = checkQuality(canvas);
    mode = 'preview';
    stage.innerHTML = '';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Preview of the selected photo');
    stage.appendChild(canvas);
    const side = (Math.min(canvas.width, canvas.height) / Math.max(canvas.width, canvas.height)) * 100;
    stage.insertAdjacentHTML('beforeend', `<div class="crop-guide" style="width:${side}%;height:${side}%"></div><div class="stage-caption">The AI analyses the area inside the square</div>`);
    setStep(2);
    if (quality.warnings.length) {
      showMessage(quality.warnings.map((w) => QUALITY_TEXT[w]).join(' '), 'warn');
    }
    renderControls();
    // Keep the Analyse button visible above the bottom navigation bar.
    $('#btn-analyse')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    announce('Photo ready. Press Analyse photo to run the AI.');
  }

  function renderControls() {
    if (mode !== 'preview') return;
    const ready = modelState.status === 'ready';
    const label = ready ? 'Analyse photo'
      : modelState.status === 'error' ? 'AI model unavailable' : 'Waiting for AI model…';
    controls.innerHTML = String(html`
      <button class="btn big block" id="btn-analyse" ${ready ? '' : 'disabled'}>${icon('cpu')} ${label}</button>
      <div class="grid-2">
        <button class="btn secondary" id="btn-retake">${icon('camera')} Retake</button>
        <button class="btn danger" id="btn-remove" aria-label="Remove photo">${icon('trash')} Remove</button>
      </div>`);
    $('#btn-analyse').addEventListener('click', analyse);
    $('#btn-retake').addEventListener('click', () => {
      photo = null;
      if (cameraAvailability() === 'ok') openLiveCamera(); else $('#file-capture').click();
    });
    $('#btn-remove').addEventListener('click', () => { photo = null; showMessage(''); renderEmpty(); announce('Photo removed.'); });
  }

  // ---------- analysis ----------
  async function analyse() {
    if (busy || !photo) return;               // ignore repeated taps
    if (modelState.status !== 'ready') { showMessage('The AI model is not ready yet.', 'info'); return; }
    busy = true;
    const token = ++analysisToken;
    mode = 'analysing';
    stage.insertAdjacentHTML('beforeend', '<div class="scan-line" aria-hidden="true"></div>');
    showMessage('');
    controls.innerHTML = String(html`<div class="card center stack" role="status">
        <div class="spinner" aria-hidden="true"></div>
        <p><strong>Analysing…</strong><br><span class="small muted">The AI model is running on this device.</span></p>
        <button class="btn secondary" id="btn-cancel-analysis">Cancel</button></div>`);
    $('#btn-cancel-analysis').addEventListener('click', () => {
      stage.querySelector('.scan-line')?.remove();
      analysisToken++;
      busy = false;
      mode = 'preview';
      renderControls();
      announce('Analysis cancelled.');
    });
    announce('Analysing the photo.');

    try {
      const { predictions, idPredictions, ms } = await classify(photo);
      if (token !== analysisToken || destroyed) return;   // cancelled or left the page
      const opts = {
        expectedCount: modelState.labels.length,
        thresholds: getThresholds(),
        minMargin: getMinMargin(),
        support: getSupportMap(),
        userFruitId: fruitSelect.value || null,
        poorImage: quality?.severe,
      };
      // Second opinion from the fruit recogniser (if installed).
      const result = combine(interpret(predictions, opts), idPredictions, {
        ...opts,
        idExpectedCount: modelState.id?.labels?.length,
        idThreshold: getIdThreshold(),
        freshFruits: getFreshFruits(),
      });
      const record = makeScanRecord(result, {
        thumbnail: makeThumbnail(photo),
        modelVersion: modelState.metadata?.timeStamp || null,
      });
      let saved = storageState.persistent ? 'saved' : 'memory';
      try {
        await saveScan(record);
      } catch (err) {
        console.error('[FreshCheck] save failed', err);
        saved = 'failed';
        if (isQuotaError(err)) toast('Storage is full. Delete old scans in History.');
      }
      if (token !== analysisToken || destroyed) return;
      showResult(record, { saved, quality, ms });
    } catch (err) {
      if (token !== analysisToken || destroyed) return;
      console.error('[FreshCheck] analysis failed', err);
      stage.querySelector('.scan-line')?.remove();
      mode = 'preview';
      renderControls();
      showMessage(err instanceof MalformedOutputError
        ? 'The AI model gave an unexpected answer, so no result is shown. The model files may be damaged — see Settings → Model setup.'
        : 'The analysis did not work on this device. Please try again, or reload the page.');
    } finally {
      if (token === analysisToken) busy = false;
    }
  }

  function showResult(record, opts) {
    mode = 'result';
    stage.querySelector('.scan-line')?.remove();
    setStep(3);
    setFormVisible(false);
    controls.innerHTML = String(html`
        <button class="btn big block" id="btn-again">${icon('camera')} Scan another fruit</button>
        <a class="btn secondary block" href="#/history">${icon('history')} View history</a>`);
    $('#btn-again').addEventListener('click', () => {
      photo = null;
      setFormVisible(true);
      resultBox.innerHTML = '';
      showMessage('');
      renderEmpty();
      window.scrollTo({ top: 0 });
    });
    resultBox.innerHTML = String(resultCard(record, opts));
    wireFeedback(resultBox, record.id);
    const label = resultBox.querySelector('.verdict span')?.textContent;
    announce(`Result: ${label}. Model confidence ${(record.confidence * 100).toFixed(0)} percent.`);
    resultBox.querySelector('.verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // The fruit selector and tips are hidden while a result is on screen.
  function setFormVisible(show) {
    $('#fruit-field').hidden = !show;
    $('#tips').hidden = !show;
  }

  // ---------- file inputs ----------
  for (const id of ['#file-capture', '#file-upload']) {
    $(id).addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) handleFile(file);
    });
  }

  renderEmpty();
  if (handoff.file) {
    const f = handoff.file;
    handoff.file = null;
    handleFile(f);
  } else if (query.get('start') === 'camera' && cameraAvailability() === 'ok') {
    openLiveCamera();
  }

  return () => {
    destroyed = true;
    analysisToken++;
    closeCamera();
    offModel();
  };
}

export function wireFeedback(root, id) {
  root.querySelectorAll('[data-feedback]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.feedback;
      const status = root.querySelector('[data-feedback-status]');
      try {
        await setFeedback(id, value);
        root.querySelectorAll('[data-feedback]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        status.textContent = 'Thanks — your answer is saved with this scan on this device.';
      } catch {
        status.textContent = 'Your answer could not be saved (storage unavailable).';
      }
    });
  });
}
