// Renders the SVG logo to the PNG app icons using a locally installed
// Chrome or Edge (through puppeteer-core). Run: npm run make:icons
import { readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { findBrowser } from './browser.mjs';

const svg = readFileSync('public/img/logo.svg', 'utf8');
const browser = await puppeteer.launch({ executablePath: findBrowser(), headless: true });
const page = await browser.newPage();

async function render(size, out, { maskable = false } = {}) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  // Maskable icons need the artwork inside the central "safe zone" (80%).
  const pad = maskable ? Math.round(size * 0.12) : 0;
  const inner = maskable ? svg.replace('<rect width="128" height="128" rx="30" fill="#238049"/>', '') : svg;
  await page.setContent(`<html><body style="margin:0;background:${maskable ? '#238049' : 'transparent'}">
    <div style="width:${size}px;height:${size}px;padding:${pad}px;box-sizing:border-box">${inner.replace('<svg ', `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `)}</div></body></html>`);
  const buf = await page.screenshot({ omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(out, buf);
  console.log('wrote', out);
}

await render(192, 'public/icons/icon-192.png');
await render(512, 'public/icons/icon-512.png');
await render(512, 'public/icons/icon-maskable-512.png', { maskable: true });
await browser.close();
