// Runs BOTH installed models (public/models/fruit-freshness + fruit-id) on every
// validation and test photo from data/v2/images.csv, the same way the app does
// (tmImage.load + predict on the image), and saves all scores for report_v2.mjs.
// Run: node tools/train/eval_pipeline.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startServer } from '../serve.mjs';
import { findBrowser } from '../browser.mjs';
import { parseCSV } from './csv.mjs';


const rows = parseCSV(readFileSync('data/v2/images.csv', 'utf8'))
  .filter((r) => r.split !== 'train' && (r.use_fresh === '1' || r.use_id === '1'));
console.log(`Scoring ${rows.length} held-out photos with both models`);

const server = await startServer('.', 8797);
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true, protocolTimeout: 0,
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.exposeFunction('nodeLog', (m) => console.log(m));
  await page.goto('http://localhost:8797/tools/train/train.html', { waitUntil: 'load' });
  const scored = await page.evaluate(async (list) => {
    const fresh = await tmImage.load('/public/models/fruit-freshness/model.json', '/public/models/fruit-freshness/metadata.json');
    const id = await tmImage.load('/public/models/fruit-id/model.json', '/public/models/fruit-id/metadata.json');
    const out = [];
    for (const [i, r] of list.entries()) {
      const img = await new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = `/data/v2/images/${encodeURI(r.file)}`; });
      const f = await fresh.predict(img);
      const d = await id.predict(img);
      out.push({ ...r, fresh: f.map((p) => ({ className: p.className, probability: p.probability })), id: d.map((p) => ({ className: p.className, probability: p.probability })) });
      if ((i + 1) % 1000 === 0) window.nodeLog(`  ${i + 1}/${list.length}`);
    }
    return out;
  }, rows.map((r) => ({ file: r.file, fruit: r.fruit, condition: r.condition, split: r.split, source: r.source, use_fresh: r.use_fresh, use_id: r.use_id })));
  writeFileSync('data/v2/pipeline-scores.json', JSON.stringify(scored));
  console.log(`Saved data/v2/pipeline-scores.json (${scored.length} photos)`);
} finally {
  await browser.close();
  server.close();
}
