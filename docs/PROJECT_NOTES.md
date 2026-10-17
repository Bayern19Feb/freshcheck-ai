# Project Notes (diary) — FreshCheck AI

Append a new entry for every working session. Do not delete old entries.

---

## Session 1 — 17 Oct 2026

**Goal:** Build FreshCheck AI from an empty folder: working app, genuine model integration, tests and documentation. (Earlier the same day an "EcoLens AI" waste-scanner idea was started and then deleted at the user's request before any app code was written; this folder was empty when FreshCheck AI began.)

**Environment found:** Windows 11, Node 22.18.0, npm 11.10.1, Python 3.12, git 2.37, Chrome and Edge installed. Folder empty, not a git repository.

### Work completed
- Static PWA in `public/` (no framework, no build step): 10 screens, hash router, mobile-first CSS, SVG logo, PNG icons.
- Genuine model integration with Teachable Machine format via TensorFlow.js 1.3.1 + @teachablemachine/image 0.8.5 (copied locally into `public/vendor/`).
- Combined fruit-condition classifier design; class-name parser; fruit support status (supported / experimental / not in model).
- Uncertainty rules: threshold (per fruit possible), minimum top-2 gap, reject class, poor-photo check, fruit-mismatch check, malformed-output validation.
- Live camera + `capture` input + upload; image validation, orientation, downscaling; quality check.
- IndexedDB history with feedback, delete, clear, CSV export; dashboard from real records.
- In-app "Test the model" evaluation tool: per-fruit table, confusion matrix, threshold sweep, CSV export.
- Learning centre (8 topics, 2 SVG diagrams), 8-question quiz, settings, model information.
- Service worker (offline), manifest, GitHub Pages workflow.
- Unit tests (22) and browser tests (28); pipeline test model generator.
- All documentation files.

### Files created
`package.json`, `.gitignore`, `README.md`, `.github/workflows/deploy.yml`,
`public/index.html`, `public/manifest.webmanifest`, `public/sw.js`, `public/css/app.css`, `public/img/logo.svg`, `public/icons/*.png`, `public/config/model-card.json`, `public/models/fruit-freshness/README.txt`, `public/vendor/*`,
`public/js/{main,ui,state,config,prefs,db,fruits,interpret,guidance,stats,quiz,history,evaluation,image,camera,model}.js`,
`public/js/views/{home,scan,result-card,history,learn,quiz,dashboard,fruits,model-info,settings,evaluate}.js`,
`tools/{serve,vendor,check,browser,make-icons,make-test-model}.mjs`,
`tests/unit/{fruits,interpret,evaluation,stats-quiz}.test.mjs`, `tests/e2e/run-e2e.mjs`,
`docs/*.md` (13 files).

### Technical decisions and reasons
| Decision | Alternatives | Reason |
|---|---|---|
| Plain JS ES modules, no build | React + Vite | Small app; easier for a student to read; nothing to compile; fewer dependencies |
| Teachable Machine + TF.js 1.3.1 | Custom Python training; paid APIs | Free, student can train it, runs on the phone; 1.3.1 is the version @teachablemachine/image 0.8.5 declares as its peer dependency |
| Vendor libraries locally | CDN | Exhibition reliability, offline use |
| One combined classifier ("Fruit - Condition" classes) | Two-stage fruit → condition models | One model to train/test/load; fruit identity still derived from summed class scores |
| IndexedDB for history | localStorage | Larger quota, as the brief requested; in-memory fallback |
| Thumbnail only (160 px) | Store full photos | Privacy and storage limits |
| Hash routing | History API routes | Refresh works on GitHub Pages without server config |
| Threshold 0.75 + gap 0.15 (provisional) | — | Placeholder until validation data exists; clearly labelled provisional in the app and docs |
| Pipeline test model with hand-set colour weights | Wait for real model to test | Lets automated tests run the real TF.js loading/inference code now; clearly labelled, never shipped |
| Only "very dark/bright" photos forced to Uncertain; blur only warns | Also block blurry | Blur threshold not validated on real photos; avoid false alarms |
| puppeteer-core with installed Chrome | Playwright (downloads browsers) | No extra browser download |

### Problems encountered and solutions
1. `tools/vendor.mjs` expected LICENSE files that the npm packages don't ship → copied the bundled `.LICENSE.txt` and wrote `NOTICE.txt` (both packages Apache-2.0 per package.json).
2. `node --test tests/unit/` fails on Node 22 (treats folder as a module) → script uses glob `"tests/unit/*.test.mjs"`.
3. A bash heredoc broke on quotes when writing tests → wrote files with the editor instead.
4. E2E: Analyse button hidden under the fixed bottom nav on 360 px screens → scroll into view + `scroll-padding`. Real usability fix.
5. E2E: hash-only navigation didn't reload the app, so model state leaked between tests → test helper loads `about:blank` first.
6. E2E: pure-blue test image was (correctly) judged "very dark" → test colour changed.
7. Visual review of screenshots: result appeared below the form, long button labels wrapped → result moved directly under the controls, form hidden while a result is shown, stacked buttons, single-column details next to the thumbnail.

### Current state
App builds and passes 22 unit + 28 browser checks. **No real fruit model**, **not deployed**, **not tested on a phone**.

### Next steps
See `SESSION_HANDOFF.md`. In short: student collects photos → trains model in Teachable Machine → copies 3 files → evaluates with independent photos → updates model card → deploys to GitHub Pages → tests on Android.

---

## Session 2 — 17 Oct 2026 (afternoon)

**Goal:** The user asked the agent to download fruit photos (200 fresh + 200 rotten per fruit) and build a starter model.

### Work completed
- Searched for openly licensed datasets. Chosen: Project-AgML / Sultana et al. 2022 (CC BY 4.0; apple, banana, orange, grape, strawberry, guava + jujube, pomegranate), Papaya Freshness (Mendeley, CC BY 4.0), FruitVision mango (Mendeley, CC BY-NC-ND 4.0). Kaggle sources avoided (login needed, unclear licences).
- `tools/dataset/fetch_datasets.py`: downloads the 4 AgML parquet shards (2.86 GB), reads only the needed photos from the two Mendeley zips with HTTP range requests, resizes to 448 px, groups near-duplicates (dHash ≤ 6 bits), splits 140/20/40 per class. 3,600 photos; 140 duplicate groups kept together.
- `tools/train/train.html` + `train.mjs`: trains with `tmImage.createTeachable` (MobileNet v2 α 0.35) in headless Chrome (WebGL), Teachable Machine default settings + mirrored copies; about 9 minutes.
- `tools/train/report.mjs`: threshold chosen on validation (70%), test evaluation with the app's own evaluation.js, writes MODEL_EVALUATION.md, updates the model card.
- Results on 720 test photos: correct when answered 98.6%; 2 spoiled→fresh errors (banana, strawberry), so those two stay Experimental under the pre-agreed rule; 6 fruits passed.

### Files created / changed
Created: `tools/dataset/{fetch_datasets.py,remote_zip.py}`, `tools/train/{train.html,train.mjs,report.mjs}`, `docs/MODEL_EVALUATION.md`, `public/models/fruit-freshness/{model.json,metadata.json,weights.bin}`.
Changed: `public/config/model-card.json`, `public/js/config.js` (v0.2.0), `public/sw.js` (cache v0.2.0), `public/js/views/fruits.js`, `tests/e2e/run-e2e.mjs`, `package.json`, `.gitignore`, docs.

### Decisions
| Decision | Reason |
|---|---|
| Train with the Teachable Machine library in Chrome, not Python/TensorFlow | Same method and file format as the website the student will use; nothing extra to install |
| "Other" class from jujube + pomegranate | Only licensed non-target photos available in the same dataset; gives the model a reject option |
| No Overripe class | Datasets only label fresh/rotten; inventing labels is not allowed |
| Pass rule not changed after seeing results | Changing it afterwards would be dishonest; Banana/Strawberry stay Experimental |
| Photos kept in git-ignored `data/` | Licences (especially NC-ND) and size; only the trained model is published |

### Problems and solutions
1. Mendeley blocked Python's HTTP client (403) → resolve the S3 redirect with curl, then range-read from S3 directly.
2. Git Bash rewrote `/__test__/…` arguments into Windows paths → `MSYS_NO_PATHCONV=1` for that script.
3. Two browser tests assumed Apple would be Experimental → tests now read the expected status from the model card.

### Current state
v0.2.0. Starter model installed and working in the app. 22/22 unit tests and 29/29 browser checks pass. Not deployed, not tested on a phone, not tested with the student's own photos.

### Next steps
See SESSION_HANDOFF.md.

---

## Session 3 — 17 Oct 2026 (evening): visual redesign

**Goal:** User asked for a "top-tier", professional look.

**Work completed:** rewrote `public/css/app.css` as a design system; redesigned Home, Scan (stepper, viewfinder corners, scan-line), result card (verdict banner, SVG confidence gauge), and polished History, Dashboard, Learn, Quiz, More, Fruits, Model info and Evaluate headers. Bundled the Plus Jakarta Sans font in `public/fonts/` (SIL Open Font License; copied by `tools/vendor.mjs`). Version 0.3.0 (app, package, service-worker cache).

**Checks:** reviewed screenshots at 390 px and 1280 px (`tests/fixtures/shots-design.mjs`, output in `tests/e2e/screenshots/design/`); fixed overlapping hero decoration, a focus ring around `<main>`, awkward chip wrapping and extra spacing. `tools/check.mjs` pass, 22/22 unit, 29/29 browser tests.

**Not done:** dark mode; testing the new design on a real phone.
