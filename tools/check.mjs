// "Build check" for a no-build static app: confirms every file the service
// worker pre-caches exists, the JSON files parse, and every JS module's
// relative imports resolve. Run: node tools/check.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = 'public';
let problems = 0;
const fail = (msg) => { problems += 1; console.error('FAIL', msg); };

// 1. Service-worker pre-cache list
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const list = sw.match(/const APP_FILES = \[([\s\S]*?)\];/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
for (const f of list) {
  if (f === './') continue;
  if (!existsSync(join(ROOT, f))) fail(`sw.js pre-caches missing file: ${f}`);
}

// 2. Every JS module is in the pre-cache list, and its imports resolve
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const jsFiles = walk(join(ROOT, 'js')).filter((f) => f.endsWith('.js'));
for (const f of jsFiles) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/');
  if (!list.includes(rel)) fail(`${rel} is not in the sw.js pre-cache list (it would not work offline)`);
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
    if (!existsSync(resolve(dirname(f), m[1]))) fail(`${rel} imports missing module ${m[1]}`);
  }
}

// 3. JSON files parse
for (const f of [join(ROOT, 'manifest.webmanifest'), join(ROOT, 'config', 'model-card.json')]) {
  try { JSON.parse(readFileSync(f, 'utf8')); } catch (err) { fail(`${f} is not valid JSON: ${err.message}`); }
}

// 4. Model files: report (not an error — the app handles a missing model)
const modelDir = join(ROOT, 'models', 'fruit-freshness');
const modelFiles = ['model.json', 'metadata.json', 'weights.bin'].filter((f) => existsSync(join(modelDir, f)));
console.log(modelFiles.length === 3 ? 'Model files: present' : `Model files: NOT present (${modelFiles.length}/3) — the app will show "AI model unavailable" until a trained model is added`);

if (problems) {
  console.error(`\n${problems} problem(s) found`);
  process.exit(1);
}
console.log(`Check passed: ${list.length} pre-cached files, ${jsFiles.length} JS modules.`);
