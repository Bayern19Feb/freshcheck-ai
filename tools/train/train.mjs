// Trains the starter model in headless Chrome with the Teachable Machine library,
// installs it in public/models/fruit-freshness/, and saves the held-out scores.
// Needs: data/manifest.csv + data/images (run tools/dataset/fetch_datasets.py first)
// Run:   node tools/train/train.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startServer } from '../serve.mjs';
import { findBrowser } from '../browser.mjs';

const PORT = 8790;
const OUT = 'public/models/fruit-freshness';
const PARAMS = { epochs: 50, batchSize: 16, learningRate: 0.001, denseUnits: 100 }; // Teachable Machine defaults
const SEED = 'freshcheck-2026';

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}

const rows = parseCSV(readFileSync('data/manifest.csv', 'utf8'));
// Class order: fruits alphabetically (Fresh, Spoiled), then "Other" last.
const labels = [...new Set(rows.map((r) => r.class))].sort((a, b) => (a === 'Other') - (b === 'Other') || a.localeCompare(b));
console.log(`${rows.length} photos, ${labels.length} classes:`, labels.join(', '));
for (const s of ['train', 'validation', 'test']) console.log(`  ${s}: ${rows.filter((r) => r.split === s).length}`);

const server = await startServer('.', PORT);
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, protocolTimeout: 0,
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.exposeFunction('nodeLog', (m) => console.log(m));
  page.on('pageerror', (e) => console.error('PAGE ERROR', e));
  await page.goto(`http://localhost:${PORT}/tools/train/train.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.trainingPageReady);

  const result = await page.evaluate((args) => window.runTraining(args),
    { rows, labels, params: PARAMS, flipAugment: true, seed: SEED });

  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/model.json`, result.files['model.json']);
  writeFileSync(`${OUT}/weights.bin`, Buffer.from(result.files['weights.bin'], 'base64'));
  writeFileSync(`${OUT}/metadata.json`, result.files['metadata.json']);
  writeFileSync('data/heldout-scores.json', JSON.stringify({
    labels, params: PARAMS, seed: SEED, flipAugment: true, backend: result.backend, totalMs: result.totalMs,
    metadata: JSON.parse(result.files['metadata.json']), history: result.history, scored: result.scored,
  }, null, 1));
  console.log(`Model written to ${OUT}/ (backend ${result.backend}, ${Math.round(result.totalMs / 1000)} s total)`);
} finally {
  await browser.close();
  server.close();
}
