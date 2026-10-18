// Trains the v2 models in headless Chrome with the Teachable Machine library.
//   node tools/train/train_v2.mjs fresh   -> public/models/fruit-freshness/  (fruit × Fresh/Spoiled + Other)
//   node tools/train/train_v2.mjs id      -> public/models/fruit-id/         (fruit names + Not a fruit)
// Input: data/v2/images.csv from tools/dataset/fetch_v2.py. Held-out scores go to data/v2/<task>-scores.json.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startServer } from '../serve.mjs';
import { findBrowser } from '../browser.mjs';
import { parseCSV } from './csv.mjs';
import { getFruit } from '../../public/js/fruits.js';

const TASK = process.argv[2];
if (!['fresh', 'id'].includes(TASK)) {
  console.error('Usage: node tools/train/train_v2.mjs fresh|id');
  process.exit(1);
}
const PORT = TASK === 'fresh' ? 8795 : 8796;
const OUT = TASK === 'fresh' ? 'public/models/fruit-freshness' : 'public/models/fruit-id';
const PARAMS = { epochs: 30, batchSize: 32, learningRate: 0.001, denseUnits: 128 };
const SEED = `freshcheck-v2-${TASK}`;
const OTHER_CAP = 500;


const spread = (items, n) => (n >= items.length ? items : Array.from({ length: n }, (_, i) => items[Math.floor((i * items.length) / n)]));
const shortName = (id) => getFruit(id).name.replace(/\s*\(.*\)\s*/, '').trim();

const all = parseCSV(readFileSync('data/v2/images.csv', 'utf8'));
let rows;
if (TASK === 'fresh') {
  const freshFruits = [...new Set(all.filter((r) => r.use_fresh === '1' && r.fruit !== 'not-a-fruit').map((r) => r.fruit))];
  rows = all.filter((r) => r.use_fresh === '1' && r.fruit !== 'not-a-fruit')
    .map((r) => ({ ...r, class: `${shortName(r.fruit)} - ${r.condition === 'fresh' ? 'Fresh' : 'Spoiled'}` }));
  // "Other": vegetables + fruits that have no freshness data, so the model can say "not one of mine".
  const otherPool = all.filter((r) => r.fruit === 'not-a-fruit' || (r.condition === 'none' && !freshFruits.includes(r.fruit)))
    .sort((a, b) => a.file.localeCompare(b.file));
  for (const split of ['train', 'validation', 'test']) {
    const pool = otherPool.filter((r) => r.split === split);
    const n = Math.round(OTHER_CAP * { train: 0.7, validation: 0.1, test: 0.2 }[split]);
    rows.push(...spread(pool, n).map((r) => ({ ...r, class: 'Other' })));
  }
} else {
  rows = all.filter((r) => r.use_id === '1')
    .map((r) => ({ ...r, class: r.fruit === 'not-a-fruit' ? 'Not a fruit' : shortName(r.fruit) }));
}

const labels = [...new Set(rows.map((r) => r.class))]
  .sort((a, b) => (/^(Other|Not a fruit)$/.test(a)) - (/^(Other|Not a fruit)$/.test(b)) || a.localeCompare(b));
console.log(`[${TASK}] ${rows.length} photos, ${labels.length} classes`);
for (const s of ['train', 'validation', 'test']) console.log(`  ${s}: ${rows.filter((r) => r.split === s).length}`);
const counts = Object.fromEntries(labels.map((l) => [l, rows.filter((r) => r.class === l && r.split === 'train').length]));
console.log('  smallest training classes:', Object.entries(counts).sort((a, b) => a[1] - b[1]).slice(0, 5).map(([k, v]) => `${k} ${v}`).join(', '));

const server = await startServer('.', PORT);
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, protocolTimeout: 0,
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.exposeFunction('nodeLog', (m) => console.log(m));
  page.on('pageerror', (e) => console.error('PAGE ERROR', e));
  await page.goto(`http://localhost:${PORT}/tools/train/train.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.trainingPageReady);

  const slim = rows.map((r) => ({ file: r.file, class: r.class, split: r.split }));
  const result = await page.evaluate((args) => window.runTraining(args), {
    rows: slim, labels, params: PARAMS, flipAugment: TASK === 'fresh', seed: SEED,
    imageRoot: '/data/v2/images/', modelName: TASK === 'fresh' ? 'freshcheck-freshness-v2' : 'freshcheck-fruit-id-v2',
  });

  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/model.json`, result.files['model.json']);
  writeFileSync(`${OUT}/weights.bin`, Buffer.from(result.files['weights.bin'], 'base64'));
  writeFileSync(`${OUT}/metadata.json`, result.files['metadata.json']);
  const meta = Object.fromEntries(rows.map((r) => [r.file, { fruit: r.fruit, condition: r.condition, source: r.source }]));
  writeFileSync(`data/v2/${TASK}-scores.json`, JSON.stringify({
    task: TASK, labels, params: PARAMS, seed: SEED, backend: result.backend, totalMs: result.totalMs,
    metadata: JSON.parse(result.files['metadata.json']), history: result.history,
    scored: result.scored.map((s) => ({ ...s, ...meta[s.file] })),
  }));
  console.log(`Model written to ${OUT}/ (${Math.round(result.totalMs / 60000)} min, backend ${result.backend})`);
} finally {
  await browser.close();
  server.close();
}
