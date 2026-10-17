// Scan history: list, details, delete one, clear all, export CSV.

import { html, icon, pct, formatDate, confirmDialog, toast, downloadText, announce } from '../ui.js';
import { getFruit } from '../fruits.js';
import { conditionInfo } from '../interpret.js';
import { listScans, getScan, deleteScan, clearScans } from '../history.js';
import { storageState } from '../db.js';
import { toCSV } from '../evaluation.js';
import { resultCard } from './result-card.js';
import { wireFeedback } from './scan.js';

export async function render(main, params) {
  if (params[0]) return renderDetail(main, params[0]);
  return renderList(main);
}

async function renderList(main) {
  let scans = [];
  let loadError = false;
  try {
    scans = await listScans();
  } catch (err) {
    console.error(err);
    loadError = true;
  }

  main.innerHTML = String(html`
    <div class="stack">
      <div class="page-head"><p class="eyebrow">Saved on this device</p><h1>Scan history</h1></div>
      <p class="note">${icon('shield')}<span>Your scans are stored <strong>only on this device</strong> (in this browser). Nothing is uploaded. Clearing your browser data also deletes them.</span></p>
      ${!storageState.persistent ? html`<p class="note warn">${icon('alert')}<span>This browser is not allowing storage, so history only lasts until you close this page.</span></p>` : ''}
      ${loadError ? html`<p class="note bad">${icon('alert')}<span>History could not be read from this browser's storage.</span></p>` : ''}
      ${scans.length === 0 ? html`
        <div class="card center stack">
          <span class="icon-chip" style="margin:0 auto;width:56px;height:56px;border-radius:18px">${icon('history')}</span>
          <p style="margin:0"><strong>No scans yet.</strong></p>
          <p class="muted">Your results will appear here after you scan a fruit.</p>
          <a class="btn" href="#/scan">${icon('camera')} Scan a fruit</a>
        </div>` : html`
        <p class="muted small" data-testid="history-count">${scans.length} saved ${scans.length === 1 ? 'scan' : 'scans'}</p>
        <ul class="list">${scans.map(itemHTML)}</ul>
        <div class="grid-2">
          <button class="btn secondary" id="export">${icon('download')} Export CSV</button>
          <button class="btn danger" id="clear">${icon('trash')} Clear history</button>
        </div>`}
    </div>`);

  main.querySelector('#clear')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete all scans?',
      message: `This permanently deletes all ${scans.length} saved scans from this device. This cannot be undone.`,
      confirmText: 'Delete all',
      danger: true,
    });
    if (!ok) return;
    await clearScans();
    toast('History cleared');
    announce('History cleared');
    renderList(main);
  });

  main.querySelector('#export')?.addEventListener('click', () => {
    const rows = scans.map((s) => ({
      date: s.createdAt,
      user_selected_fruit: s.userFruitId || '',
      model_detected_fruit: s.detectedFruitId || '',
      result: conditionInfo(s.conditionId).label,
      top_class: s.topClass,
      model_confidence: s.confidence.toFixed(4),
      threshold: s.threshold ?? '',
      uncertain_reasons: (s.reasons || []).join(' '),
      experimental: s.experimental ? 'yes' : 'no',
      helpful: s.feedback || '',
    }));
    downloadText(`freshcheck-history-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  });
}

function itemHTML(s) {
  const cond = conditionInfo(s.conditionId);
  const fruit = getFruit(s.detectedFruitId) || getFruit(s.userFruitId);
  const fruitText = getFruit(s.detectedFruitId) ? fruit.name : fruit ? `${fruit.name} (your selection)` : 'Fruit not identified';
  return html`<li><a class="list-item" href="#/history/${s.id}">
      ${s.thumbnail ? html`<img src="${s.thumbnail}" alt="">` : html`<span class="ph" aria-hidden="true">${fruit?.emoji || '❔'}</span>`}
      <span><span class="pill ${cond.tone}"><span class="dot"></span>${cond.short}</span><span class="title">${fruitText}</span>
        <span class="small muted">${pct(s.confidence)} model confidence · ${formatDate(s.createdAt)}</span></span>
      ${icon('chevron', 'chev')}
    </a></li>`;
}

async function renderDetail(main, id) {
  const rec = await getScan(id).catch(() => null);
  if (!rec) {
    main.innerHTML = String(html`<div class="card center stack"><h1>Scan not found</h1><p>It may have been deleted.</p><a class="btn" href="#/history">Back to history</a></div>`);
    return;
  }
  main.innerHTML = String(html`
    <div class="stack">
      <a class="link-btn" href="#/history">← Back to history</a>
      <div class="page-head"><p class="eyebrow">History</p><h1>Scan details</h1></div>
      ${resultCard(rec, { showDate: true })}
      <button class="btn danger block" id="delete">${icon('trash')} Delete this scan</button>
    </div>`);
  wireFeedback(main, rec.id);
  main.querySelector('#delete').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Delete this scan?', message: 'This scan will be removed from this device.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    await deleteScan(rec.id);
    toast('Scan deleted');
    location.hash = '#/history';
  });
}
