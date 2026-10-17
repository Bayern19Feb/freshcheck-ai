// Copies the TensorFlow.js and Teachable Machine browser bundles from
// node_modules into public/vendor so the app never depends on a CDN.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'public/vendor';
mkdirSync(out, { recursive: true });
const files = [
  ['node_modules/@tensorflow/tfjs/dist/tf.min.js', 'tf.min.js'],
  ['node_modules/@teachablemachine/image/dist/teachablemachine-image.min.js', 'teachablemachine-image.min.js'],
  ['node_modules/@teachablemachine/image/dist/teachablemachine-image.min.js.LICENSE.txt', 'teachablemachine-image.min.js.LICENSE.txt'],
];
// Plus Jakarta Sans (SIL Open Font License 1.1) — bundled so the app looks right offline.
mkdirSync('public/fonts', { recursive: true });
files.push(
  ['node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2', '../fonts/plus-jakarta-sans-latin.woff2'],
  ['node_modules/@fontsource-variable/plus-jakarta-sans/LICENSE', '../fonts/OFL-plus-jakarta-sans.txt'],
);
for (const [from, to] of files) {
  try {
    copyFileSync(from, join(out, to));
    console.log(`copied ${from} -> ${join(out, to)}`);
  } catch (err) {
    console.error(`FAILED to copy ${from}: ${err.message}`);
    process.exitCode = 1;
  }
}

// Both packages are Apache-2.0 licensed (see their package.json files).
writeFileSync(join(out, 'NOTICE.txt'), [
  'tf.min.js: TensorFlow.js 1.3.1, Copyright Google LLC, Apache License 2.0',
  'teachablemachine-image.min.js: @teachablemachine/image 0.8.5, Copyright Google LLC, Apache License 2.0',
  'License text: https://www.apache.org/licenses/LICENSE-2.0',
  '',
].join('\n'));
