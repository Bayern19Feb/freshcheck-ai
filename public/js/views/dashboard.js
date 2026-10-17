// Awareness dashboard — numbers come only from scans saved on this device.

import { html, icon } from '../ui.js';
import { listScans } from '../history.js';
import { computeStats } from '../stats.js';
import { CONDITIONS, FRUITS, getFruit } from '../fruits.js';

export async function render(main) {
  const scans = await listScans().catch(() => []);
  const s = computeStats(scans);
  const max = Math.max(1, ...Object.values(s.byCondition));
  const most = s.mostScanned ? getFruit(s.mostScanned.fruitId) : null;

  main.innerHTML = String(html`
    <div class="stack">
      <div class="page-head"><p class="eyebrow">Your activity</p><h1>My scan dashboard</h1>
        <p>Counted from the scans saved on this device — not estimates of food saved.</p></div>
      <div class="grid-2">
        <div class="stat"><span class="icon-chip">${icon('camera')}</span><div class="n" data-testid="stat-total">${s.total}</div><div class="l">Total scans</div></div>
        <div class="stat"><span class="icon-chip plum">${icon('question')}</span><div class="n" data-testid="stat-uncertain">${s.byCondition.uncertain}</div><div class="l">Uncertain results</div></div>
        <div class="stat"><span class="icon-chip berry">${icon('apple')}</span><div class="n">${most ? `${most.emoji} ${most.name}` : '—'}</div><div class="l">Most scanned fruit${most ? ` (${s.mostScanned.count})` : ''}</div></div>
        <div class="stat"><span class="icon-chip mango">${icon('thumbUp')}</span><div class="n">${s.helpfulYes} / ${s.helpfulYes + s.helpfulNo}</div><div class="l">Results marked helpful</div></div>
      </div>

      <section class="card stack" aria-labelledby="by-cond">
        <h2 id="by-cond">Results by category</h2>
        ${Object.values(CONDITIONS).map((c) => html`
          <div class="bar-row"><span>${c.short}</span>
            <div class="meter ${c.tone}" role="img" aria-label="${c.short}: ${s.byCondition[c.id] || 0}"><span style="width:${((s.byCondition[c.id] || 0) / max) * 100}%"></span></div>
            <strong>${s.byCondition[c.id] || 0}</strong></div>`)}
      </section>

      <section class="card stack" aria-labelledby="by-fruit">
        <h2 id="by-fruit">Scans by fruit</h2>
        <p class="small muted">Uses the fruit the model detected, or your selection when the model did not identify a fruit${s.manualOnly ? ` (${s.manualOnly} scans)` : ''}.</p>
        <div class="table-wrap"><table><thead><tr><th scope="col">Fruit</th><th scope="col">Scans</th></tr></thead><tbody>
          ${FRUITS.map((f) => html`<tr><td>${f.emoji} ${f.name}</td><td>${s.byFruit[f.id] || 0}</td></tr>`)}
        </tbody></table></div>
      </section>

      <p class="note">${icon('leaf')}<span><strong>Why no "food saved" number?</strong> A scan does not tell us whether any fruit was actually eaten instead of thrown away, so the app does not claim to measure food waste reduced.</span></p>
      ${s.total === 0 ? html`<a class="btn block" href="#/scan">${icon('camera')} Scan your first fruit</a>` : ''}
    </div>`);
}
