# Session Handoff — FreshCheck AI

**Last session:** 5 — 18 Oct 2026 (v0.4.0, 51 fruits, two AI models). Read this first, then the newest entry in `PROJECT_NOTES.md`.

## Online
- Repository: https://github.com/Bayern19Feb/freshcheck-ai (public)
- App URL: https://bayern19feb.github.io/freshcheck-ai/ (GitHub Pages, Source = GitHub Actions; deploys on every push to `main`)

## What is working now
- The complete app in `public/` (all screens, camera/upload, history, learning centre, quiz, evaluation tool, offline support).
- **Two AI models installed:** fruit recogniser (`public/models/fruit-id/`, 51 fruits + Not a fruit) and freshness checker (`public/models/fruit-freshness/`, 16 fruits × Fresh/Spoiled + Other). The app shows freshness only when both agree.
- Whole app on 2,691 dataset test photos: **98.0% correct when answered**, 13 spoiled shown as fresh; recogniser 95.3% top-1. Supported: Apple, Lime, Mango, Papaya, Strawberry; others Experimental. Report: `docs/MODEL_EVALUATION.md`.
- Fruit library (51 fruits, search incl. Hindi names, tips).
- Checks: `tools/check.mjs` passes; 31/31 unit tests; 33/33 browser tests.

## What is incomplete
1. Not tested with **own phone photos** of real fruit, so real-world accuracy is unknown.
2. No **Overripe** class (the datasets only have fresh/rotten).
3. "Other" class has no everyday non-fruit objects.
4. **Not deployed**; not tested on a real Android phone; speed on a phone not measured.
5. Poster/judge answers contain the dataset results; phone-photo results still blank.

## Last tested
17 Oct 2026: `npm test` (22 pass), `node tests/e2e/run-e2e.mjs` (29 pass), `node tools/check.mjs` (pass), `node tools/train/report.mjs` (results above).

## Current blockers
- Phone-photo testing and an Android check need the student.
- GitHub account/repository needs the student (never share passwords).

## Files to inspect first
- `docs/MODEL_EVALUATION.md` — starter model results
- `public/config/model-card.json` — thresholds, per-fruit status
- `data/manifest.csv` — which photo is in which split (local only, git-ignored)
- `docs/KNOWN_ISSUES.md` (K2, K3, K14–K18)

## Exact next action
**Student:** buy a few bananas, apples and one other fruit; take ~20 phone photos each of fresh and spoiled fruit on a plain background; in the app use **More → Test the model** to test them; export the CSV.
**Next agent session:** read that CSV, fill `EXPERIMENT_LOG.md`, compare with the dataset results, and decide whether to retrain with the student's photos (add `Banana - Overripe` and a "Not a fruit" class).

Then: deploy (README → Deploy) and verify on the phone.

## Commands
```bash
npm install                 # once
npm start                   # http://localhost:8080
npm test                    # unit tests
npm run make:test-model     # once, before browser tests
npm run test:e2e            # browser tests
npm run check               # everything
# rebuilding the v2 models (needs the .venv, see AI_MODEL_GUIDE.md §13)
npm run dataset:v2          # ~5 GB download into data/ (resumable)
npm run train:v2            # trains both models (~40 min), tests them, writes MODEL_EVALUATION.md
```

## Manual steps the student must do
1. Test with own phone photos (above). Optionally retrain with own photos in Teachable Machine (AI_MODEL_GUIDE.md §3–7).
2. Create a GitHub account and repository; push; enable Pages (Source: GitHub Actions) — README.
3. Test on the Android phone; install to the Home screen.
4. Ask a teacher to review the learning-centre text and the pass rule.
5. At the exhibition, say clearly: "the starter model was trained on public research datasets" (and name them — see README credits).
