// Creates a PIPELINE TEST MODEL for automated tests ONLY.
//
// It is a real TensorFlow.js layers model in Teachable Machine format, but its
// weights are set by hand so the output depends only on the average colour of
// the photo. It knows nothing about fruit freshness. It lets the automated
// tests exercise the genuine loading + inference code before a trained model
// exists. It is written to tests/fixtures/ and is never copied into public/.
//
// Colour -> expected top class (see tests/e2e/run-e2e.mjs):
//   red     (255,0,0)     -> "Apple - Fresh"
//   yellow  (255,255,0)   -> "Banana - Fresh"
//   blue    (60,60,255)   -> "Apple - Spoiled"  (pure 0,0,255 is too dark for the app's quality check)
//   cyan    (0,255,255)   -> "Banana - Overripe"
//   grey    (128,128,128) -> "Not a fruit"
//   (242,191,0)           -> three-way tie (low confidence)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as tf from '@tensorflow/tfjs';

const OUT = 'tests/fixtures/pipeline-test-model';
const LABELS = ['Apple - Fresh', 'Apple - Spoiled', 'Banana - Fresh', 'Banana - Overripe', 'Not a fruit'];

// inputs (r, g, b in roughly -1..1) x outputs (5 classes)
const W = [
  // AF   AS   BF   BO    NF
  [5, 0, 5, -5, 0],   // r
  [-5, 0, 5, 5, 0],   // g
  [0, 10, 0, 5, 0],   // b
];
const B = [0, -5, -5, -2.5, 2];

const model = tf.sequential();
model.add(tf.layers.globalAveragePooling2d({ inputShape: [224, 224, 3] }));
model.add(tf.layers.dense({ units: LABELS.length, activation: 'softmax' }));
model.layers[1].setWeights([tf.tensor2d(W), tf.tensor1d(B)]);

mkdirSync(OUT, { recursive: true });
await model.save(tf.io.withSaveHandler(async (artifacts) => {
  writeFileSync(join(OUT, 'weights.bin'), Buffer.from(artifacts.weightData));
  writeFileSync(join(OUT, 'model.json'), JSON.stringify({
    modelTopology: artifacts.modelTopology,
    format: 'layers-model',
    generatedBy: `TensorFlow.js tfjs-layers v${tf.version.tfjs}`,
    convertedBy: null,
    weightsManifest: [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }],
  }));
  return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
}));

writeFileSync(join(OUT, 'metadata.json'), JSON.stringify({
  tfjsVersion: tf.version.tfjs,
  tmVersion: 'n/a',
  packageVersion: '0.8.5',
  packageName: '@teachablemachine/image',
  timeStamp: '2026-01-01T00:00:00.000Z',
  userMetadata: { note: 'PIPELINE TEST MODEL - hand-set weights, NOT trained on fruit. For automated tests only.' },
  modelName: 'pipeline-test-model',
  labels: LABELS,
  imageSize: 224,
}, null, 2));

console.log(`Wrote pipeline test model to ${OUT}`);
