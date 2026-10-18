// Result card shared by the Scan screen and the History details screen.

import { html, raw, icon, pct, formatDate } from '../ui.js';
import { getFruit, GROUPS } from '../fruits.js';
import { conditionInfo, REASON_TEXT } from '../interpret.js';
import { GUIDANCE, ALWAYS_NOTE, FEATURES } from '../guidance.js';
import { QUALITY_TEXT } from '../image.js';

const CONDITION_ICON = { good: 'check', warn: 'clock', bad: 'alert', neutral: 'question' };
const ICON_FOR = (cond) => (cond.id === 'identified' ? 'info' : CONDITION_ICON[cond.tone]);

/** "How to check this fruit yourself" panel for a known fruit. */
export function fruitTips(fruit, open = false) {
  if (!fruit) return '';
  const g = GROUPS[fruit.group];
  return html`
    <details ${open ? 'open' : ''} data-testid="fruit-tips">
      <summary><span class="topic-emoji" aria-hidden="true">${fruit.emoji}</span>How to check a ${fruit.name.toLowerCase()} yourself</summary>
      <div class="stack">
        ${fruit.note ? html`<p class="note good" style="margin:0">${icon('info')}<span>${fruit.note}</span></p>` : ''}
        <div class="grid-2">
          <div><p class="eyebrow">Usually fine</p><ul class="steps">${g.fresh.map((t) => html`<li>${t}</li>`)}</ul></div>
          <div><p class="eyebrow" style="color:var(--bad)">Warning signs</p><ul class="steps">${g.spoiled.map((t) => html`<li>${t}</li>`)}</ul></div>
        </div>
        <p class="small muted" style="margin:0"><strong>Storage:</strong> ${g.storage}</p>
      </div>
    </details>`;
}

/** Circular gauge showing the model confidence, with the threshold marked. */
function gauge(confidence, threshold, tone) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(1, confidence)));
  const tick = threshold ? (() => {
    const a = threshold * 2 * Math.PI;
    const x1 = 60 + Math.cos(a) * 44; const y1 = 60 + Math.sin(a) * 44;
    const x2 = 60 + Math.cos(a) * 60; const y2 = 60 + Math.sin(a) * 60;
    return `<line class="tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="3" stroke-linecap="round"/>`;
  })() : '';
  return raw(`<div class="gauge" role="img" aria-label="Model confidence ${pct(confidence, 1)}${threshold ? `, threshold ${pct(threshold)}` : ''}">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle class="track" cx="60" cy="60" r="${R}" fill="none" stroke-width="11"/>
      <circle class="value ${tone}" cx="60" cy="60" r="${R}" fill="none" stroke-width="11" stroke-linecap="round"
        stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>
      ${tick}
    </svg>
    <div class="gauge-label"><strong data-testid="confidence">${pct(confidence, 1)}</strong><span>Model<br>confidence</span></div>
  </div>`);
}

/**
 * record: a scan record (see history.js makeScanRecord)
 * opts: { saved: 'saved'|'failed'|'memory', quality, ms, showDate }
 */
export function resultCard(record, opts = {}) {
  const cond = conditionInfo(record.conditionId);
  const guide = GUIDANCE[cond.id];
  const detected = getFruit(record.detectedFruitId);
  const chosen = getFruit(record.userFruitId);
  const thr = record.threshold;

  return html`
    <section class="card stack" aria-labelledby="result-title" data-testid="result">
      <h2 id="result-title" class="visually-hidden">Result</h2>
      <div class="verdict ${cond.tone}" data-condition="${cond.id}">
        <i aria-hidden="true">${icon(ICON_FOR(cond))}</i>
        <div><span>${cond.label}</span><small>${cond.id === 'identified' && detected ? `${detected.emoji} ${detected.name} — no freshness data for this fruit yet` : 'AI visual estimate for the whole photo'}</small></div>
      </div>
      ${record.experimental ? html`<p class="note warn">${icon('flask')}<span><strong>Experimental fruit.</strong> This fruit has not yet passed testing on independent photos, so treat this result with extra care.</span></p>` : ''}

      <div class="result-grid">
        <div class="photo-card">
          ${record.thumbnail ? html`<img src="${record.thumbnail}" alt="The photo that was analysed (centre square)">` : html`<span aria-hidden="true">${detected?.emoji || '❔'}</span>`}
          <span class="tag">${detected ? `${detected.emoji} ${detected.name}` : 'Fruit not identified'}</span>
        </div>
        <div class="gauge-card">
          ${gauge(record.confidence, thr, cond.tone)}
          ${thr ? html`<p>Threshold ${pct(thr)}</p>` : ''}
        </div>
      </div>

      <div class="facts">
        <span class="chip">${icon('cpu', 'inline-icon')} Detected fruit: ${detected ? detected.name : 'Not identified'}</span>
        ${record.idConfidence !== null && record.idConfidence !== undefined ? html`<span class="chip" data-testid="id-chip">Fruit recogniser <small>(${record.idTopClass})</small> ${pct(record.idConfidence)}</span>`
          : detected ? html`<span class="chip">Fruit score <small>(model)</small> ${pct(record.fruitConfidence)}</span>` : ''}
        ${chosen ? html`<span class="chip">Your selection: ${chosen.emoji} ${chosen.name}</span>` : ''}
        <span class="chip">Top class: <code>${record.topClass}</code></span>
        ${opts.showDate ? html`<span class="chip">${icon('clock', 'inline-icon')} ${formatDate(record.createdAt)}</span>` : ''}
      </div>

      <p class="small muted" style="margin:0">Model confidence is the score the model gave its top class for the whole photo.
        It is <strong>not</strong> a probability that the fruit is fresh or safe to eat.
        ${thr ? `Results below ${pct(thr)} are shown as Uncertain.` : ''}</p>

      ${record.reasons?.length ? html`
        <div class="note" role="note">${icon('question')}<div><strong>Why the result is uncertain</strong>
          <ul class="steps">${record.reasons.map((r) => html`<li>${REASON_TEXT[r] || r}</li>`)}</ul></div></div>` : ''}

      ${opts.quality?.warnings?.length ? html`
        <div class="note warn">${icon('alert')}<ul class="steps">${opts.quality.warnings.map((w) => html`<li>${QUALITY_TEXT[w]}</li>`)}</ul></div>` : ''}

      <div>
        <p class="eyebrow">What to do</p>
        <h3>${guide.title}</h3>
        <p class="muted">${guide.summary}</p>
        <ol class="guide">${guide.steps.map((s) => html`<li>${s}</li>`)}</ol>
        <p class="note warn" style="margin-top:12px">${icon('shield')}<span>${guide.caution}</span></p>
      </div>

      ${fruitTips(detected, cond.id === 'identified')}

      <details>
        <summary><span class="topic-emoji" aria-hidden="true">🔍</span>What does the model look at?</summary>
        <div class="stack">
          <p>The model gives <strong>one answer for the whole photo</strong>. It does not point to a particular spot or patch.
          In the training photos, this category often had features like:</p>
          <ul class="steps">${FEATURES[cond.id].map((f) => html`<li>${f}</li>`)}</ul>
        </div>
      </details>

      <details>
        <summary><span class="topic-emoji" aria-hidden="true">📊</span>All class scores from the model</summary>
        <div>
          <ul class="score-list">
            ${record.scores.map((s) => html`<li><span>${s.className}</span><span>${pct(s.probability, 1)}</span>
              <div class="meter" aria-hidden="true"><span style="width:${(s.probability * 100).toFixed(1)}%"></span></div></li>`)}
          </ul>
          ${opts.ms ? html`<p class="small muted" style="margin-top:10px">Analysis time on this device: ${opts.ms} ms.</p>` : ''}
        </div>
      </details>

      <p class="small muted" style="margin:0">${ALWAYS_NOTE}</p>

      <div class="card tint" data-testid="feedback" style="box-shadow:none">
        <p style="margin-bottom:10px"><strong>Was this result helpful?</strong></p>
        <div class="grid-2">
          <button class="btn secondary" data-feedback="yes" aria-pressed="${record.feedback === 'yes'}">${icon('thumbUp')} Yes</button>
          <button class="btn secondary" data-feedback="no" aria-pressed="${record.feedback === 'no'}">${icon('thumbDown')} No</button>
        </div>
        <p class="small muted" data-feedback-status style="margin:8px 0 0">${record.feedback ? 'Thanks — your answer is saved with this scan on this device.' : ''}</p>
      </div>

      ${opts.saved ? html`<p class="small muted" data-testid="save-status" style="margin:0">${icon('history', 'inline-icon')}${{
        saved: ' Saved automatically to History on this device. You can delete it there.',
        memory: ' Saved for this visit only — this browser is not allowing storage, so it will be lost when you close the page.',
        failed: ' This result could not be saved (storage is full or blocked). Delete old scans in History to free space.',
      }[opts.saved]}</p>` : ''}
    </section>`;
}
