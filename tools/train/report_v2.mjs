// v2 evaluation report. Uses the app's own code (interpret + combine) on the scores
// from eval_pipeline.mjs, so the numbers describe what the app really shows.
//   1. Freshness threshold   -> chosen on VALIDATION photos (fewest spoiled->fresh, then best accuracy)
//   2. Identifier threshold  -> chosen on VALIDATION photos (lowest with >= 95% correct when answered)
//   3. Final results         -> TEST photos only (never used for training or for choosing thresholds)
// Writes docs/MODEL_EVALUATION.md and updates public/config/model-card.json.
// Run: node tools/train/report_v2.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { interpret, combine } from '../../public/js/interpret.js';
import { thresholdSweep } from '../../public/js/evaluation.js';
import { FRUITS, getFruit, parseLabel, parseFruitName } from '../../public/js/fruits.js';
import { parseCSV } from './csv.mjs';

const PASS = { minPerClass: 20, minPrecision: 0.8, maxDangerous: 0 };
const STEPS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
const ID_STEPS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const ID_TARGET = 0.95;
const pct = (x) => (x === null || x === undefined || Number.isNaN(x) ? '—' : `${(x * 100).toFixed(1)}%`);
const today = new Date().toISOString().slice(0, 10);

const scored = JSON.parse(readFileSync('data/v2/pipeline-scores.json', 'utf8'));
const freshMeta = JSON.parse(readFileSync('public/models/fruit-freshness/metadata.json', 'utf8'));
const idMeta = JSON.parse(readFileSync('public/models/fruit-id/metadata.json', 'utf8'));
const card = JSON.parse(readFileSync('public/config/model-card.json', 'utf8'));
const minMargin = card.minMargin ?? 0.15;
const freshFruits = new Set(freshMeta.labels.map(parseLabel).filter((p) => p.kind === 'fruit-condition').map((p) => p.fruitId));
const idFruits = new Set(idMeta.labels.map(parseFruitName).filter((p) => p.kind === 'fruit').map((p) => p.fruitId));

const isFreshItem = (s) => s.use_fresh === '1' && (s.condition === 'fresh' || s.condition === 'spoiled');
const toFreshItem = (s) => (s.fruit === 'not-a-fruit'
  ? { trueFruitId: null, trueConditionId: 'not-fruit', scores: s.fresh }
  : { trueFruitId: s.fruit, trueConditionId: s.condition, scores: s.fresh });

// ---------- 1. freshness threshold (validation, freshness model alone)
const valFresh = scored.filter((s) => s.split === 'validation' && isFreshItem(s)).map(toFreshItem);
const sweep = thresholdSweep(valFresh, { minMargin, steps: STEPS });
const minDanger = Math.min(...sweep.map((r) => r.dangerous));
const chosen = sweep.filter((r) => r.dangerous === minDanger).sort((a, b) => b.accuracy - a.accuracy || a.threshold - b.threshold)[0];
const thresholds = { default: chosen.threshold, perFruit: {} };

// ---------- 2. identifier threshold (validation)
const top = (preds) => [...preds].sort((a, b) => b.probability - a.probability)[0];
const idTruth = (s) => (s.fruit === 'not-a-fruit' ? 'reject' : s.fruit);
const idGuess = (p) => { const x = parseFruitName(p.className); return x.kind === 'fruit' ? x.fruitId : 'reject'; };
const valId = scored.filter((s) => s.split === 'validation' && s.use_id === '1');
const idSweep = ID_STEPS.map((t) => {
  const answered = valId.filter((s) => top(s.id).probability >= t);
  const right = answered.filter((s) => idGuess(top(s.id)) === idTruth(s)).length;
  return { t, coverage: answered.length / valId.length, precision: answered.length ? right / answered.length : null };
});
const idPick = idSweep.find((r) => r.precision !== null && r.precision >= ID_TARGET) || [...idSweep].sort((a, b) => b.precision - a.precision)[0];
const idThreshold = idPick.t;

// ---------- 3a. end-to-end on TEST freshness photos (what the app shows)
const appResult = (s) => {
  const opts = { thresholds, minMargin };
  return combine(interpret(s.fresh, opts), s.id, { ...opts, idThreshold, freshFruits });
};
const testFresh = scored.filter((s) => s.split === 'test' && isFreshItem(s));
const perFruit = {};
const matrix = {};
for (const s of testFresh) {
  const truth = s.fruit === 'not-a-fruit' ? 'not-fruit' : `${s.fruit}:${s.condition}`;
  const r = appResult(s);
  const answer = r.conditionId === 'uncertain' ? 'uncertain' : r.conditionId === 'identified' ? `${r.detectedFruitId}:identified` : `${r.detectedFruitId}:${r.conditionId}`;
  (matrix[truth] ||= {})[answer] = (matrix[truth][answer] || 0) + 1;
  const key = s.fruit;
  const b = (perFruit[key] ||= { n: 0, correct: 0, answered: 0, answeredCorrect: 0, dangerous: 0, perCond: {}, sources: new Set() });
  b.n += 1;
  b.sources.add(s.source);
  b.perCond[s.condition] = (b.perCond[s.condition] || 0) + 1;
  const ok = truth === 'not-fruit' ? r.conditionId === 'uncertain' : answer === truth;
  if (ok) b.correct += 1;
  if (r.conditionId !== 'uncertain') { b.answered += 1; if (ok) b.answeredCorrect += 1; }
  if (s.condition === 'spoiled' && r.conditionId === 'fresh') b.dangerous += 1;
}
const total = Object.entries(perFruit).filter(([k]) => k !== 'not-a-fruit').reduce((t, [, b]) => {
  for (const k of ['n', 'correct', 'answered', 'answeredCorrect', 'dangerous']) t[k] += b[k];
  return t;
}, { n: 0, correct: 0, answered: 0, answeredCorrect: 0, dangerous: 0 });

// Sources used for TRAINING each freshness fruit (single time-lapse video => not independent)
const trainSources = {};
for (const r of parseCSV(readFileSync('data/v2/images.csv', 'utf8'))) {
  if (r.split === 'train' && (r.condition === 'fresh' || r.condition === 'spoiled')) (trainSources[r.fruit] ||= new Set()).add(r.source);
}

// ---------- 3b. identifier on TEST photos
const testId = scored.filter((s) => s.split === 'test' && s.use_id === '1');
const idPer = {};
for (const s of testId) {
  const t = top(s.id);
  const b = (idPer[s.fruit] ||= { n: 0, top1: 0, answered: 0, answeredCorrect: 0, real: 0, realTop1: 0, frames: 0, framesTop1: 0 });
  const ok = idGuess(t) === idTruth(s);
  b.n += 1; if (ok) b.top1 += 1;
  if (t.probability >= idThreshold) { b.answered += 1; if (ok) b.answeredCorrect += 1; }
  if (s.source === 'fruits360') { b.frames += 1; if (ok) b.framesTop1 += 1; } else { b.real += 1; if (ok) b.realTop1 += 1; }
}
const idTot = Object.values(idPer).reduce((t, b) => { for (const k of Object.keys(t)) t[k] += b[k]; return t; },
  { n: 0, top1: 0, answered: 0, answeredCorrect: 0, real: 0, realTop1: 0, frames: 0, framesTop1: 0 });

// ---------- model card
for (const f of FRUITS) {
  const b = perFruit[f.id];
  const idb = idPer[f.id];
  const idNote = idb ? `Recogniser: ${pct(idb.top1 / idb.n)} top-1 on ${idb.n} test photos` : (idFruits.has(f.id) ? 'Recogniser: no test photos' : 'Not in the recogniser');
  if (freshFruits.has(f.id) && b) {
    const singleSource = (trainSources[f.id]?.size || 0) === 1 && trainSources[f.id].has('fruq');
    const perClassOk = ['fresh', 'spoiled'].every((c) => (b.perCond[c] || 0) >= PASS.minPerClass);
    const prec = b.answered ? b.answeredCorrect / b.answered : 0;
    const passed = perClassOk && prec >= PASS.minPrecision && b.dangerous <= PASS.maxDangerous && !singleSource;
    card.fruits[f.id] = {
      evaluation: passed ? 'passed' : 'failed',
      testImages: b.n,
      accuracy: Number(prec.toFixed(3)),
      idAccuracy: idb ? Number((idb.top1 / idb.n).toFixed(3)) : null,
      notes: `${today}, whole app on dataset test photos: correct when answered ${pct(prec)}, answered ${pct(b.answered / b.n)}, spoiled shown as fresh ${b.dangerous}.${singleSource ? ' Trained from a single time-lapse video, so test photos show the same fruit — kept Experimental.' : ''} ${idNote}.`,
    };
  } else {
    card.fruits[f.id] = {
      evaluation: 'not-applicable',
      testImages: idb ? idb.n : 0,
      accuracy: null,
      idAccuracy: idb ? Number((idb.top1 / idb.n).toFixed(3)) : null,
      notes: `${today}: no freshness check (no licensed fresh/rotten photos found). ${idNote}${idb && idb.frames === idb.n ? ' (rotating-fruit photos on a white background only)' : ''}.`,
    };
  }
}
card.modelName = 'freshcheck-v2 (fruit recogniser + freshness checker)';
card.modelVersion = 'v2';
card.exportDate = freshMeta.timeStamp;
card.source = 'Trained by the project with the Teachable Machine library (same method as the Teachable Machine website) from openly licensed public datasets. See docs/MODEL_EVALUATION.md.';
card.architecture = 'Two Teachable Machine image models (MobileNet v2 transfer learning) run in the browser with TensorFlow.js: a fruit recogniser (fruit names + "Not a fruit") and a freshness checker (fruit × Fresh/Spoiled + "Other"). The app only shows a freshness answer when both agree.';
card.trainingData = 'Sultana et al. 2022 (CC BY 4.0), FruitNet (CC BY 4.0), Papaya Freshness Dataset (CC BY 4.0), FruQ-DB/FruQ-multi (CC BY 4.0), FruitVision (CC BY-NC-ND 4.0, mango + some grapes), Fruits-360 (CC BY-SA 4.0, fruit recogniser). Up to 500 fresh + 500 spoiled photos per freshness fruit. Full list: data/v2/images.csv (local).';
card.testProcedure = `Thresholds chosen on validation photos; final results on ${testFresh.length} freshness test photos and ${testId.length} recogniser test photos never used for training. Near-identical photos and neighbouring video frames were kept on one side of the split.`;
card.lastVerified = today;
card.thresholds = thresholds;
card.idThreshold = idThreshold;
card.thresholdNote = `Freshness threshold chosen on ${today} from ${valFresh.length} validation photos; recogniser threshold ${pct(idThreshold)} chosen from ${valId.length} validation photos (lowest with ≥95% correct when answered). Dataset photos only — re-check with your own phone photos.`;
card.knownLimitations = [
  'The models look only at the outside of the fruit in one photo. They cannot see inside the fruit, detect bacteria or toxins, or decide whether food is safe to eat.',
  'Whole-image classifiers: they do not point to particular spots, mould patches or defects.',
  'Trained and tested only on public dataset photos. Accuracy on your own phone photos is likely lower and has not been measured yet.',
  'Freshness is checked only for fruits with licensed fresh/rotten photos; other fruits are only named.',
  'Many recogniser photos (Fruits-360) show single fruits rotating on a white background, so recognition of those fruits in real kitchens may be weaker.',
  'No "overripe" class: the datasets label fresh and rotten only.',
  'Everyday objects that are not fruit can still be mistaken for a fruit.',
];
writeFileSync('public/config/model-card.json', `${JSON.stringify(card, null, 2)}\n`);

// ---------- report
const keyName = (k) => {
  if (k === 'uncertain') return 'Uncertain';
  if (k === 'not-fruit') return 'Other';
  const [f, c] = k.split(':');
  return `${getFruit(f)?.name.replace(/\s*\(.*\)/, '') || f} ${c === 'fresh' ? 'F' : c === 'spoiled' ? 'S' : c === 'identified' ? 'id' : c}`;
};
const passedList = FRUITS.filter((f) => card.fruits[f.id].evaluation === 'passed').map((f) => f.name);
const expList = FRUITS.filter((f) => card.fruits[f.id].evaluation === 'failed').map((f) => f.name);

const md = `# Model Evaluation — FreshCheck AI v2 (auto-generated)

Generated by \`node tools/train/report_v2.mjs\` on ${today}. **Do not edit by hand — re-run the script.**

## Models
| | Fruit recogniser | Freshness checker |
|---|---|---|
| Classes | ${idMeta.labels.length} (${idFruits.size} fruits + Not a fruit) | ${freshMeta.labels.length} (${freshFruits.size} fruits × Fresh/Spoiled + Other) |
| Folder | public/models/fruit-id/ | public/models/fruit-freshness/ |
| Threshold (chosen on validation) | ${pct(idThreshold)} | ${pct(chosen.threshold)} (+ ${pct(minMargin)} minimum gap) |

## 1. Whole app on freshness test photos (${testFresh.length} photos never used for training)
These are the answers the app would actually show (both models + all uncertainty rules).

| | Value |
|---|---|
| Correct (uncertain counts as not correct) | ${total.correct}/${total.n} = ${pct(total.correct / total.n)} |
| Answered (not uncertain) | ${pct(total.answered / total.n)} |
| **Correct when answered** | **${pct(total.answeredCorrect / total.answered)}** |
| Spoiled shown as fresh | ${total.dangerous} |

Pass rule (project's own): ≥ ${PASS.minPerClass} test photos per condition, correct when answered ≥ ${PASS.minPrecision * 100}%, spoiled shown as fresh = 0, and not trained from a single time-lapse video.

| Fruit | Test photos | Correct (all) | Answered | Correct when answered | Spoiled → fresh | Training sources | Result |
|---|---|---|---|---|---|---|---|
${[...freshFruits].sort().map((id) => { const b = perFruit[id]; if (!b) return `| ${getFruit(id).name} | 0 | | | | | | no test photos |`; const ev = card.fruits[id]; return `| ${getFruit(id).name} | ${b.n} | ${pct(b.correct / b.n)} | ${pct(b.answered / b.n)} | ${pct(b.answered ? b.answeredCorrect / b.answered : null)} | ${b.dangerous} | ${[...(trainSources[id] || [])].join(', ')} | ${ev.evaluation === 'passed' ? '✅ Supported' : '⚠️ Experimental'} |`; }).join('\n')}
${perFruit['not-a-fruit'] ? `| Vegetables (should be Uncertain) | ${perFruit['not-a-fruit'].n} | ${pct(perFruit['not-a-fruit'].correct / perFruit['not-a-fruit'].n)} rejected | | | | | |` : ''}

**Supported:** ${passedList.join(', ') || '—'}
**Experimental:** ${expList.join(', ') || '—'}

### Confusion matrix (test photos, whole app)
Rows = real label. Columns = app answer. F = fresh, S = spoiled, id = "identified, no freshness check".

| Real ↓ / App → | ${(() => { const cols = [...new Set(Object.values(matrix).flatMap((m) => Object.keys(m)))].sort(); return `${cols.map(keyName).join(' | ')} |\n|---|${cols.map(() => '---').join('|')}|\n${Object.keys(matrix).sort().map((r) => `| **${keyName(r)}** | ${cols.map((c) => matrix[r][c] || 0).join(' | ')} |`).join('\n')}`; })()}

## 2. Fruit recogniser on test photos (${testId.length} photos)
| | Value |
|---|---|
| Top-1 correct (all test photos) | ${pct(idTot.top1 / idTot.n)} |
| Top-1 correct on real photos (freshness datasets) | ${pct(idTot.realTop1 / idTot.real)} (${idTot.real} photos) |
| Top-1 correct on Fruits-360 frames | ${pct(idTot.framesTop1 / idTot.frames)} (${idTot.frames} photos) |
| Correct when answered (score ≥ ${pct(idThreshold)}) | ${pct(idTot.answeredCorrect / idTot.answered)}, answered ${pct(idTot.answered / idTot.n)} |

| Fruit | Test photos | Top-1 correct | Real photos (correct) | Fruits-360 frames (correct) |
|---|---|---|---|---|
${Object.keys(idPer).sort().map((id) => { const b = idPer[id]; return `| ${id === 'not-a-fruit' ? 'Not a fruit (vegetables, nuts…)' : getFruit(id).name} | ${b.n} | ${pct(b.top1 / b.n)} | ${b.real ? `${pct(b.realTop1 / b.real)} of ${b.real}` : '—'} | ${b.frames ? `${pct(b.framesTop1 / b.frames)} of ${b.frames}` : '—'} |`; }).join('\n')}

## 3. Threshold choice (validation photos)
Freshness model alone (${valFresh.length} photos):

| Threshold | Correct (all) | Answered | Correct when answered | Spoiled → fresh |
|---|---|---|---|---|
${sweep.map((r) => `| ${r.threshold === chosen.threshold ? `**${pct(r.threshold)}** ✔` : pct(r.threshold)} | ${pct(r.accuracy)} | ${pct(r.coverage)} | ${pct(r.precisionCovered)} | ${r.dangerous} |`).join('\n')}

Recogniser (${valId.length} photos):

| Threshold | Answered | Correct when answered |
|---|---|---|
${idSweep.map((r) => `| ${r.t === idThreshold ? `**${pct(r.t)}** ✔` : pct(r.t)} | ${pct(r.coverage)} | ${pct(r.precision)} |`).join('\n')}

## 4. Important limitations of these numbers
- All test photos come from the **same public datasets** as the training photos. Near-identical photos and neighbouring video frames were kept apart, but **results on your own phone photos will very likely be lower**.
- Persimmon, peach, pear, tomato and watermelon freshness photos come from single time-lapse videos (one fruit each), so they stay **Experimental** whatever their score.
- Recogniser photos for most fruits are Fruits-360 frames (one fruit rotating on white). Real-kitchen recognition of those fruits has **not** been measured.
- No "overripe" class; everyday non-fruit objects were not in the training data.
`;
writeFileSync('docs/MODEL_EVALUATION.md', md);
console.log(`Freshness threshold ${pct(chosen.threshold)}, recogniser threshold ${pct(idThreshold)}`);
console.log(`Whole app, freshness test: correct when answered ${pct(total.answeredCorrect / total.answered)}, answered ${pct(total.answered / total.n)}, spoiled->fresh ${total.dangerous}`);
console.log(`Recogniser test top-1: ${pct(idTot.top1 / idTot.n)} (real photos ${pct(idTot.realTop1 / idTot.real)}, frames ${pct(idTot.framesTop1 / idTot.frames)})`);
console.log('Supported:', passedList.join(', '));
console.log('Experimental:', expList.join(', '));
