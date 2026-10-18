// End-to-end tests in a real (headless) Chrome/Edge.
// Uses the PIPELINE TEST MODEL from tests/fixtures (hand-set weights, colour-based,
// NOT a fruit model) to exercise genuine TensorFlow.js loading + inference.
// Run: npm run make:test-model && npm run test:e2e

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { startServer } from '../../tools/serve.mjs';
import { findBrowser } from '../../tools/browser.mjs';

const PORT = 8765;
const BASE = `http://localhost:${PORT}/`;
const FIX = resolve('tests/fixtures');
const IMG = join(FIX, 'images');
const SHOTS = resolve('tests/e2e/screenshots');
const TEST_MODEL = '/__test__/pipeline-test-model/';

if (!existsSync(join(FIX, 'pipeline-test-model', 'model.json'))) {
  console.error('Pipeline test model missing. Run: npm run make:test-model');
  process.exit(1);
}
mkdirSync(IMG, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
mkdirSync(join(FIX, 'broken-model'), { recursive: true });
writeFileSync(join(FIX, 'broken-model', 'model.json'), 'this is not json');
writeFileSync(join(FIX, 'broken-model', 'metadata.json'), '{"labels":["A","B"]}');

// Expected fruit status depends on the evaluation records in the model card.
const CARD = JSON.parse(readFileSync('public/config/model-card.json', 'utf8'));
const expectedStatus = (id) => (CARD.fruits?.[id]?.evaluation === 'passed' ? 'supported' : 'experimental');

const results = [];
async function check(id, name, fn) {
  try {
    const note = await fn();
    results.push({ id, name, ok: true, note: note || '' });
    console.log(`PASS ${id} ${name}${note ? ` — ${note}` : ''}`);
  } catch (err) {
    results.push({ id, name, ok: false, note: err.message });
    console.log(`FAIL ${id} ${name} — ${err.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const softmax = (z) => { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b); return e.map((v) => v / s); };
// Same maths as tools/make-test-model.mjs, applied to a solid colour, using
// Teachable Machine's preprocessing (x / 127 - 1).
function expectedScores([R, G, Bc]) {
  const r = R / 127 - 1; const g = G / 127 - 1; const b = Bc / 127 - 1;
  return softmax([5 * r - 5 * g, 10 * b - 5, 5 * r + 5 * g - 5, -5 * r + 5 * g + 5 * b - 2.5, 2]);
}

const server = await startServer('public', PORT, { '/__test__/': 'tests/fixtures' });
const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('dialog', (d) => d.dismiss());

// Full page load every time (a hash-only change would not reload the app).
async function go(hash) {
  await page.goto('about:blank');
  await page.goto(BASE + hash, { waitUntil: 'networkidle0' });
}
// Tap like a user: scroll the element to the middle of the screen first so the
// fixed bottom navigation bar cannot cover it.
async function tap(selector, p = page) {
  await p.waitForSelector(selector);
  await p.$eval(selector, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.click(selector);
}
async function setPref(name, value) {
  await page.evaluate((n, v) => {
    const all = JSON.parse(localStorage.getItem('freshcheck.prefs.v1') || '{}');
    all[n] = v;
    localStorage.setItem('freshcheck.prefs.v1', JSON.stringify(all));
  }, name, value);
}
async function modelStatus() {
  return page.$eval('#model-pill', (el) => el.textContent.trim());
}
async function waitModel(text) {
  await page.waitForFunction((t) => document.querySelector('#model-pill')?.textContent.includes(t), { timeout: 30000 }, text);
}
async function upload(file) {
  const input = await page.$('#file-upload');
  await input.uploadFile(join(IMG, file));
}
async function scanFile(file, fruit = '') {
  await go('#/scan');
  await waitModel('AI ready');
  if (fruit) await page.select('#fruit-select', fruit);
  await upload(file);
  await page.waitForSelector('#btn-analyse:not([disabled])', { timeout: 10000 });
  await tap('#btn-analyse');
  await page.waitForSelector('[data-testid=result]', { timeout: 20000 });
  return page.evaluate(() => ({
    condition: document.querySelector('.verdict').dataset.condition,
    label: document.querySelector('.verdict span').textContent,
    confidence: document.querySelector('[data-testid=confidence]').textContent,
    text: document.querySelector('[data-testid=result]').innerText,
    saved: document.querySelector('[data-testid=save-status]')?.innerText || '',
  }));
}
async function noOverflow() {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

// ---------- create test images in the browser ----------
await go('');
const COLOURS = { red: [255, 0, 0], yellow: [255, 255, 0], blue: [60, 60, 255], cyan: [0, 255, 255], grey: [128, 128, 128], tie: [242, 191, 0], dark: [10, 10, 10], green: [0, 200, 0] };
for (const [name, rgb] of Object.entries(COLOURS)) {
  const data = await page.evaluate((c) => {
    const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
    const ctx = cv.getContext('2d'); ctx.fillStyle = `rgb(${c.join(',')})`; ctx.fillRect(0, 0, 400, 300);
    return cv.toDataURL('image/png').split(',')[1];
  }, rgb);
  writeFileSync(join(IMG, `${name}.png`), Buffer.from(data, 'base64'));
}
const tiny = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 50; c.height = 50; return c.toDataURL('image/png').split(',')[1]; });
writeFileSync(join(IMG, 'tiny.png'), Buffer.from(tiny, 'base64'));
writeFileSync(join(IMG, 'corrupt.jpg'), Buffer.from('this is definitely not a jpeg file'.repeat(20)));
writeFileSync(join(IMG, 'notes.txt'), 'hello');

// ---------- tests ----------
await check('E01', 'Home screen loads with name, tagline and buttons; no horizontal overflow at 360px', async () => {
  await go('#/');
  const t = await page.evaluate(() => document.body.innerText);
  assert(t.includes('FreshCheck AI') && t.includes('A Smarter Way to Check Fruit Freshness'), 'title/tagline missing');
  assert(t.includes('Scan a Fruit') && t.includes('Upload a Photo') && t.includes('How It Works'), 'buttons missing');
  assert(await noOverflow(), 'horizontal overflow');
  await page.screenshot({ path: join(SHOTS, '01-home.png'), fullPage: true });
});

await check('E02', 'Missing model files -> "AI unavailable", Analyse disabled, no fake result', async () => {
  // Point the app at an empty folder (the real model may be installed in public/).
  await setPref('modelUrl', '/__test__/no-model-here/');
  await go('#/scan');
  await waitModel('AI unavailable');
  const msg = await page.$eval('#model-status', (el) => el.innerText);
  assert(/not been added|not found/i.test(msg), `unexpected message: ${msg}`);
  await upload('red.png');
  await page.waitForSelector('#btn-analyse');
  assert(await page.$eval('#btn-analyse', (b) => b.disabled), 'Analyse should be disabled');
  assert(!(await page.$('[data-testid=result]')), 'a result appeared without a model');
  await page.screenshot({ path: join(SHOTS, '02-no-model.png'), fullPage: true });
});

await check('E03', 'Broken model files -> clear error + retry button', async () => {
  await setPref('modelUrl', '/__test__/broken-model/');
  await go('#/scan');
  await waitModel('AI unavailable');
  const msg = await page.$eval('#model-status', (el) => el.innerText);
  assert(/could not be read|re-export/i.test(msg), `unexpected message: ${msg}`);
  assert(await page.$('#retry-model'), 'no retry button');
});

await setPref('modelUrl', TEST_MODEL);
// The colour test models were designed around a 75% threshold; keep tests independent of the real model card.
await setPref('thresholdOverride', 0.75);

await check('E04', 'Test model loads -> "AI ready"; classes listed on Model information', async () => {
  await go('#/model');
  await waitModel('AI ready');
  const t = await page.evaluate(() => document.body.innerText);
  assert(t.includes('Banana - Overripe') && t.includes('reject class'), 'classes not listed');
});

let shownRed;
await check('E05', 'Red photo -> genuine inference "Appears Fresh" (apple); confidence equals model maths', async () => {
  const r = await scanFile('red.png');
  shownRed = r;
  assert(r.condition === 'fresh', `got ${r.condition}`);
  assert(r.text.includes('Apple'), 'apple not detected');
  const exp = (expectedScores(COLOURS.red)[0] * 100).toFixed(1) + '%';
  assert(r.confidence === exp, `confidence ${r.confidence} != expected ${exp}`);
  assert(r.text.includes('Experimental fruit') === (expectedStatus('apple') === 'experimental'), 'experimental warning wrong');
  assert(r.text.includes('not a probability'), 'confidence explanation missing');
  assert(/saved automatically/i.test(r.saved), 'not saved');
  await page.screenshot({ path: join(SHOTS, '05-result-fresh.png'), fullPage: true });
  return `shown ${r.confidence}, expected ${exp}`;
});

await check('E06', 'Blue photo -> "Possible Signs of Spoilage" with spoilage guidance', async () => {
  const r = await scanFile('blue.png');
  const exp = (expectedScores(COLOURS.blue)[1] * 100).toFixed(1) + '%';
  assert(r.condition === 'spoiled', `got ${r.condition}`);
  assert(r.confidence === exp, `confidence ${r.confidence} != ${exp}`);
  assert(r.text.includes('Do not just cut away'), 'spoilage guidance missing');
  await page.screenshot({ path: join(SHOTS, '06-result-spoiled.png'), fullPage: true });
  return `shown ${r.confidence}`;
});

await check('E07', 'Cyan photo -> "Overripe Appearance" (banana)', async () => {
  const r = await scanFile('cyan.png');
  assert(r.condition === 'overripe', `got ${r.condition}`);
  assert(r.text.includes('Banana'), 'banana not detected');
});

await check('E08', 'Grey photo -> Uncertain because the model chose "Not a fruit"', async () => {
  const r = await scanFile('grey.png');
  assert(r.condition === 'uncertain', `got ${r.condition}`);
  assert(r.text.includes('does not show a fruit it knows'), 'reason missing');
});

await check('E09', 'Ambiguous photo -> Uncertain (low confidence), real score still shown', async () => {
  const r = await scanFile('tie.png');
  const exp = (Math.max(...expectedScores(COLOURS.tie)) * 100).toFixed(1) + '%';
  assert(r.condition === 'uncertain', `got ${r.condition}`);
  assert(r.text.includes('below the threshold'), 'low-confidence reason missing');
  assert(r.confidence === exp, `confidence ${r.confidence} != ${exp}`);
  await page.screenshot({ path: join(SHOTS, '09-result-uncertain.png'), fullPage: true });
  return `shown ${r.confidence}`;
});

await check('E10', 'User selects Apple but model detects Banana -> mismatch, Uncertain, both shown separately', async () => {
  const r = await scanFile('yellow.png', 'apple');
  assert(r.condition === 'uncertain', `got ${r.condition}`);
  assert(r.text.includes('Your selection') && r.text.includes('Banana'), 'selection/detection not both shown');
  assert(r.text.includes('different from the fruit the model detected'), 'mismatch reason missing');
});

await check('E11', 'Very dark photo -> quality warning and Uncertain', async () => {
  // dark is closest to "Not a fruit" anyway; check the quality message is shown
  const r = await scanFile('dark.png');
  assert(r.condition === 'uncertain', `got ${r.condition}`);
  assert(/very dark/i.test(r.text), 'dark warning missing');
});

await check('E12', 'Bad files: corrupt JPG, text file, tiny image -> friendly errors, no result', async () => {
  const out = [];
  for (const [f, re] of [['corrupt.jpg', /could not be opened/i], ['notes.txt', /not supported/i], ['tiny.png', /too small/i]]) {
    await go('#/scan');
    await upload(f);
    await page.waitForFunction(() => document.querySelector('#message')?.innerText.trim().length > 0, { timeout: 10000 });
    const msg = await page.$eval('#message', (el) => el.innerText);
    assert(re.test(msg), `${f}: unexpected message "${msg}"`);
    assert(!(await page.$('[data-testid=result]')), `${f}: result shown`);
    out.push(f);
  }
  return out.join(', ');
});

await check('E13', 'Double-tapping Analyse runs only one analysis (one history record)', async () => {
  const before = await page.evaluate(async () => (await import('./js/history.js')).listScans().then((s) => s.length));
  await go('#/scan');
  await waitModel('AI ready');
  await upload('red.png');
  await page.waitForSelector('#btn-analyse:not([disabled])');
  await page.evaluate(() => { const b = document.querySelector('#btn-analyse'); b.click(); b.click(); });
  await page.waitForSelector('[data-testid=result]');
  const after = await page.evaluate(async () => (await import('./js/history.js')).listScans().then((s) => s.length));
  assert(after === before + 1, `expected ${before + 1} records, got ${after}`);
});

let historyCount;
await check('E14', 'History lists all analysed scans and survives a page reload', async () => {
  await go('#/history');
  const n1 = await page.$eval('[data-testid=history-count]', (e) => parseInt(e.textContent, 10));
  await page.reload({ waitUntil: 'networkidle0' });
  const n2 = await page.$eval('[data-testid=history-count]', (e) => parseInt(e.textContent, 10));
  // 7 single scans (E05-E11) + 1 from the double-tap test (E13)
  assert(n1 === 8 && n2 === 8, `expected 8 then 8, got ${n1} then ${n2}`);
  historyCount = n2;
  await page.screenshot({ path: join(SHOTS, '14-history.png'), fullPage: true });
  return `${n2} records`;
});

await check('E15', 'History details, feedback saved, single delete', async () => {
  await go('#/history');
  await tap('.list-item');
  await page.waitForSelector('[data-feedback=yes]');
  await tap('[data-feedback=yes]');
  await page.waitForFunction(() => document.querySelector('[data-feedback-status]').textContent.includes('saved'));
  const url = page.url();
  await page.goto(url, { waitUntil: 'networkidle0' });
  assert(await page.$eval('[data-feedback=yes]', (b) => b.getAttribute('aria-pressed')) === 'true', 'feedback not persisted');
  await tap('#delete');
  await page.waitForSelector('dialog[open]');
  await tap('dialog [data-act=ok]');
  await page.waitForFunction(() => location.hash === '#/history');
  await page.waitForSelector('[data-testid=history-count]');
  const n = await page.$eval('[data-testid=history-count]', (e) => parseInt(e.textContent, 10));
  assert(n === historyCount - 1, `expected ${historyCount - 1}, got ${n}`);
  historyCount = n;
});

await check('E16', 'Dashboard numbers equal the stored records', async () => {
  await go('#/dashboard');
  const total = await page.$eval('[data-testid=stat-total]', (e) => Number(e.textContent));
  const stored = await page.evaluate(async () => {
    const s = await (await import('./js/history.js')).listScans();
    return { n: s.length, unc: s.filter((r) => r.conditionId === 'uncertain').length };
  });
  const unc = await page.$eval('[data-testid=stat-uncertain]', (e) => Number(e.textContent));
  assert(total === stored.n && unc === stored.unc, `dashboard ${total}/${unc} vs stored ${stored.n}/${stored.unc}`);
  await page.screenshot({ path: join(SHOTS, '16-dashboard.png'), fullPage: true });
  return `${total} total, ${unc} uncertain`;
});

await check('E17', 'Supported fruits: apple + banana status follows the model card; other six "Not supported yet"', async () => {
  await go('#/fruits');
  await waitModel('AI ready');
  await page.waitForSelector(`[data-fruit=apple][data-status=${expectedStatus('apple')}]`);
  const statuses = await page.$$eval('[data-fruit]', (els) => Object.fromEntries(els.map((e) => [e.dataset.fruit, e.dataset.status])));
  assert(statuses.apple === expectedStatus('apple') && statuses.banana === expectedStatus('banana'), JSON.stringify(statuses));
  for (const f of ['orange', 'mango', 'grapes', 'strawberry', 'guava', 'papaya']) assert(statuses[f] === 'not-in-model', `${f}: ${statuses[f]}`);
  await page.screenshot({ path: join(SHOTS, '17-fruits.png'), fullPage: true });
});

await check('E18', 'Quiz: answering every question correctly scores full marks', async () => {
  await go('#/quiz');
  const { QUESTIONS } = await page.evaluate(async () => ({ QUESTIONS: (await import('./js/quiz.js')).QUESTIONS.map((q) => q.answer) }));
  for (let i = 0; i < QUESTIONS.length; i++) {
    await tap(`.quiz-option[data-i="${QUESTIONS[i]}"]`);
    await page.waitForSelector('#next');
    await tap('#next');
  }
  const score = await page.$eval('[data-testid=quiz-score]', (e) => e.textContent.trim());
  assert(score === `${QUESTIONS.length} / ${QUESTIONS.length}`, score);
  return score;
});

await check('E19', 'Quiz: a wrong answer shows feedback and is not counted', async () => {
  await go('#/quiz');
  const ans = await page.evaluate(async () => (await import('./js/quiz.js')).QUESTIONS[0].answer);
  await tap(`.quiz-option[data-i="${(ans + 1) % 4}"]`);
  const fb = await page.$eval('#feedback', (e) => e.innerText);
  const prog = await page.$eval('[data-testid=quiz-progress]', (e) => e.innerText);
  assert(fb.includes('Not quite') && prog.includes('Score 0'), `${fb} / ${prog}`);
});

await check('E20', 'Live camera (fake device): capture -> preview -> analyse -> result', async () => {
  await go('#/scan');
  await waitModel('AI ready');
  await tap('#btn-live');
  await page.waitForSelector('#btn-shoot:not([disabled])', { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
  await tap('#btn-shoot');
  await page.waitForSelector('#btn-analyse:not([disabled])');
  await tap('#btn-analyse');
  await page.waitForSelector('[data-testid=result]');
  const c = await page.$eval('.verdict', (e) => e.dataset.condition);
  return `fake camera frame classified as "${c}" (meaningless for the colour test model; checks the pipeline only)`;
});

await check('E21', 'Evaluation tool: labelled test photos -> per-fruit table and confusion matrix', async () => {
  await go('#/evaluate');
  await waitModel('AI ready');
  await page.waitForSelector('#ev-pick:not([disabled])');
  const addBatch = async (fruit, cond, files) => {
    await page.select('#ev-fruit', fruit);
    if (fruit) await page.select('#ev-cond', cond);
    const input = await page.$('#ev-files');
    await input.uploadFile(...files.map((f) => join(IMG, f)));
    await page.waitForFunction((n) => {
      const el = document.querySelector('[data-testid=ev-total] dd');
      return el && Number(el.textContent) >= n;
    }, { timeout: 20000 }, files.length);
  };
  await addBatch('apple', 'fresh', ['red.png']);
  await addBatch('apple', 'spoiled', ['blue.png', 'red.png']);   // red labelled spoiled -> a real "dangerous" error
  await addBatch('', '', ['grey.png']);
  await page.waitForFunction(() => Number(document.querySelector('[data-testid=ev-total] dd').textContent) === 4, { timeout: 20000 });
  const t = await page.$eval('[data-testid=ev-total]', (e) => e.innerText);
  assert(/Correct\s+3/.test(t), `totals: ${t}`);
  assert(/Spoiled shown as fresh\s+1/.test(t), `dangerous count: ${t}`);
  assert(await page.$('[data-testid=confusion]'), 'no confusion matrix');
  await page.screenshot({ path: join(SHOTS, '21-evaluate.png'), fullPage: true });
});

await check('E22', 'Clear all history needs confirmation; cancel keeps data, confirm deletes', async () => {
  await go('#/history');
  await tap('#clear');
  await page.waitForSelector('dialog[open]');
  await tap('dialog [data-act=cancel]');
  assert(await page.$('[data-testid=history-count]'), 'data deleted on cancel');
  await tap('#clear');
  await page.waitForSelector('dialog[open]');
  await tap('dialog [data-act=ok]');
  await page.waitForFunction(() => document.body.innerText.includes('No scans yet'));
});

await check('E23', 'Every screen: no horizontal overflow at 360px, no banned safety claims', async () => {
  const banned = [/100% safe/i, /guaranteed (safe|rotten)/i, /certified safe/i, /no bacteria detected/i, /safe to eat\b(?!.*not)/i];
  for (const r of ['#/', '#/scan', '#/history', '#/learn', '#/quiz', '#/dashboard', '#/fruits', '#/model', '#/settings', '#/evaluate', '#/learn/how-ai', '#/fruits/kiwi']) {
    await go(r);
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    assert(await noOverflow(), `overflow on ${r}`);
    const text = await page.evaluate(() => document.body.innerText);
    for (const b of banned.slice(0, 4)) assert(!b.test(text), `${r} contains ${b}`);
  }
  await go('#/learn');
  await page.screenshot({ path: join(SHOTS, '23-learn.png'), fullPage: true });
  await go('#/settings');
  await page.screenshot({ path: join(SHOTS, '23-settings.png'), fullPage: true });
});

await check('E24', 'Refreshing a nested route keeps the page', async () => {
  await go('#/learn/food-waste');
  await page.reload({ waitUntil: 'networkidle0' });
  assert((await page.evaluate(() => document.querySelector('#topic-food-waste')?.open)) === true, 'topic not open after reload');
});

await check('E25', 'Offline: after one online visit, the app and model load and scan with no network', async () => {
  await go('#/scan');
  await waitModel('AI ready');
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready), { timeout: 15000 });
  // one more online load so the controlling service worker caches everything it serves
  await go('#/scan');
  await waitModel('AI ready');
  await page.setOfflineMode(true);
  try {
    const r = await scanFile('red.png');
    assert(r.condition === 'fresh', `offline result ${r.condition}`);
  } finally {
    await page.setOfflineMode(false);
  }
});

await check('E26', 'Keyboard: Tab reaches the main buttons with a visible focus style', async () => {
  await go('#/');
  const seen = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    seen.push(await page.evaluate(() => {
      const el = document.activeElement;
      return { text: el.textContent.trim().slice(0, 30), shadow: getComputedStyle(el).boxShadow };
    }));
  }
  const scan = seen.find((s) => s.text.includes('Scan a Fruit'));
  assert(scan, `Scan button not reached: ${JSON.stringify(seen.map((s) => s.text))}`);
  assert(scan.shadow && scan.shadow !== 'none', 'no visible focus ring');
});

await check('E27', 'No uncaught JavaScript errors during the whole run', async () => {
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

// ---------- camera permission denied (separate browser without fake camera) ----------
await check('E28', 'Camera blocked/unavailable -> clear message, upload still offered', async () => {
  const b2 = await puppeteer.launch({ executablePath: findBrowser(), headless: true, args: ['--deny-permission-prompts'] });
  try {
    const p2 = await b2.newPage();
    await p2.goto(BASE + '#/scan', { waitUntil: 'networkidle0' });
    await tap('#btn-live', p2);
    await p2.waitForFunction(() => document.querySelector('#message')?.innerText.trim().length > 0, { timeout: 15000 });
    const msg = await p2.$eval('#message', (e) => e.innerText);
    assert(/upload/i.test(msg), `message: ${msg}`);
    assert(await p2.$('#btn-upload'), 'upload button missing');
    return msg.slice(0, 90);
  } finally {
    await b2.close();
  }
});

// ---------- two-model pipeline (freshness test model + recogniser test model) ----------
await check('E30', 'Recogniser agrees with freshness model -> freshness answer + recogniser chip', async () => {
  await setPref('modelUrl', TEST_MODEL);
  await setPref('idModelUrl', '/__test__/pipeline-test-id-model/');
  const r = await scanFile('red.png');
  assert(r.condition === 'fresh', `got ${r.condition}`);
  assert(await page.$('[data-testid=id-chip]'), 'no recogniser chip');
  assert(/Fruit recogniser/.test(r.text) && /Apple/.test(r.text), 'recogniser info missing');
});

await check('E31', 'Fruit without freshness data (kiwi) -> "identified", tips shown, no freshness claim', async () => {
  const r = await scanFile('green.png');
  assert(r.condition === 'identified', `got ${r.condition}`);
  assert(/Kiwi/.test(r.text), 'kiwi not named');
  assert(/no freshness data/i.test(r.text), 'no-freshness explanation missing');
  assert(await page.$('[data-testid=fruit-tips][open]'), 'fruit tips not open');
  assert(!/Appears Fresh|Possible Signs of Spoilage/.test(r.label), 'freshness claimed for kiwi');
  await page.screenshot({ path: join(SHOTS, '31-identified.png'), fullPage: true });
});

await check('E32', 'Recogniser says "Not a fruit" -> Uncertain', async () => {
  const r = await scanFile('grey.png');
  assert(r.condition === 'uncertain', `got ${r.condition}`);
  assert(/does not show a fruit it knows/.test(r.text), 'reason missing');
});

await check('E33', 'Fruit library: 50+ fruits, search, detail page with tips', async () => {
  await go('#/fruits');
  await waitModel('AI ready');
  const n = await page.$$eval('[data-testid=fruit-list] li', (els) => els.length);
  assert(n >= 50, `only ${n} fruits listed`);
  await page.type('#fruit-search', 'anaar');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid=fruit-list] li').length === 1);
  await tap('[data-fruit=pomegranate]');
  await page.waitForSelector('[data-testid=fruit-detail]');
  const t = await page.evaluate(() => document.body.innerText);
  assert(/Pomegranate/.test(t) && /Warning signs/i.test(t), 'detail/tips missing');
  assert(await noOverflow(), 'overflow on detail page');
  await page.screenshot({ path: join(SHOTS, '33-fruit-detail.png'), fullPage: true });
  return `${n} fruits`;
});
await setPref('idModelUrl', '');

// ---------- the real installed model (skipped if none is installed) ----------
if (existsSync('public/models/fruit-freshness/model.json')) {
  await check('E29', 'Installed fruit model loads from the default location; every class is understood', async () => {
    await setPref('modelUrl', '');
    await go('#/model');
    await waitModel('AI ready');
    const info = await page.evaluate(() => document.body.innerText);
    assert(!info.includes('NOT RECOGNISED'), 'a class name is not understood by the app');
    const st = await page.evaluate(async () => { const m = (await import('./js/model.js')).modelState; return { n: m.labels.length, id: m.id.status, idn: m.id.labels?.length }; });
    if (existsSync('public/models/fruit-id/model.json')) assert(st.id === 'ready', `recogniser status ${st.id}`);
    return `freshness ${st.n} classes, recogniser ${st.id} (${st.idn || 0} classes)`;
  });
} else {
  console.log('SKIP E29 no trained model installed in public/models/fruit-freshness/');
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} end-to-end checks passed.`);
writeFileSync(resolve('tests/e2e/last-run.json'), JSON.stringify({ date: new Date().toISOString(), browser: findBrowser(), results }, null, 2));
process.exit(failed.length ? 1 : 0);
