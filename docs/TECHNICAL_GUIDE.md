# Technical Guide — FreshCheck AI

Written for a beginner who knows basic computer ideas but not machine learning.

## 1. Architecture at a glance

FreshCheck AI is a **static web app**: plain HTML, CSS and JavaScript files. There is no server-side code and no database server. Everything — including the AI — runs inside the browser on the phone.

```
Phone browser
 ├─ index.html + css/app.css            (page shell, styles)
 ├─ js/main.js                          (start-up + router)
 ├─ js/views/*.js                       (one file per screen)
 ├─ js/image.js, js/camera.js           (getting and preparing photos)
 ├─ js/model.js                         (loading the model, running it)
 │    └─ vendor/tf.min.js + vendor/teachablemachine-image.min.js
 │    └─ models/fruit-freshness/model.json, metadata.json, weights.bin
 ├─ js/interpret.js + js/fruits.js      (turning scores into a result)
 ├─ js/guidance.js                      (advice text)
 ├─ js/history.js + js/db.js            (IndexedDB storage)
 ├─ js/evaluation.js, js/stats.js, js/quiz.js   (pure logic)
 └─ sw.js                               (offline cache)
```

Why no framework (React etc.)? The app has ~10 screens, and plain ES modules keep it small, fast on phones, free of a build step, and easy for a student to read. Each screen is a `render(main, params, query)` function in `js/views/`.

## 2. Folder structure

```
School_project/
├─ public/                  ← the app (this folder is what gets deployed)
│  ├─ index.html, manifest.webmanifest, sw.js
│  ├─ css/app.css
│  ├─ js/                   ← logic modules
│  │  └─ views/             ← screens
│  ├─ config/model-card.json  ← model info, thresholds, evaluation results (edit this)
│  ├─ models/fruit-freshness/ ← put the trained model files here
│  ├─ vendor/               ← TensorFlow.js + Teachable Machine library (Apache-2.0)
│  ├─ img/logo.svg, icons/*.png
├─ tests/
│  ├─ unit/*.test.mjs       ← Node unit tests
│  ├─ e2e/run-e2e.mjs       ← browser tests (puppeteer-core)
│  └─ fixtures/             ← generated test model + images (git-ignored)
├─ tools/                   ← serve, check, vendor, icons, test-model scripts
├─ docs/                    ← documentation
└─ .github/workflows/deploy.yml  ← GitHub Pages deployment
```

## 3. Main modules

| File | Responsibility |
|---|---|
| `js/config.js` | Constants: version, model folder, file-size limits, image sizes, timeouts |
| `js/fruits.js` | The 8 fruits, the 4 conditions, `parseLabel()` (class name → fruit + condition), `fruitSupport()` |
| `js/interpret.js` | `validatePredictions()` and `interpret()` — turns model scores into a result (or Uncertain) |
| `js/guidance.js` | Advice text and "features" text per condition |
| `js/model.js` | Loads libraries + model lazily, state machine (idle/loading/ready/error), `classify()` |
| `js/image.js` | File checks, decoding with orientation, resizing, thumbnail, brightness/blur check |
| `js/camera.js` | Live camera (getUserMedia) and its error messages |
| `js/state.js` | Model card, active thresholds, fruit-support map, Home → Scan hand-over |
| `js/db.js` | Tiny IndexedDB wrapper with in-memory fallback |
| `js/history.js` | Scan records: create, save, list, delete, feedback |
| `js/evaluation.js` | Accuracy, coverage, confusion matrix, threshold sweep, CSV |
| `js/stats.js` | Dashboard counts |
| `js/quiz.js` | Questions + scoring |
| `js/prefs.js` | localStorage preferences (threshold override, model location, best quiz score) |
| `js/ui.js` | Safe HTML templates (escaping), icons, toast, confirm dialog, downloads |
| `js/main.js` | Hash router (`#/scan`, `#/history/abc`…), header model pill, service worker registration |

## 4. Prediction flow (data flow)

1. **Get a photo** — `views/scan.js`
   - *Use camera*: `camera.startCamera()` shows a live preview; *Capture* copies a frame.
   - *Take photo*: `<input type="file" accept="image/*" capture="environment">` opens the phone's camera app.
   - *Upload*: `<input type="file" accept="image/*">`.
2. **Prepare it** — `image.loadPhoto(file)`
   - Rejects: no file, empty, > 25 MB, non-image type (e.g. HEIC/text), undecodable, < 100 px.
   - Decodes with `createImageBitmap(file, {imageOrientation: 'from-image'})` (keeps phone rotation), falling back to `<img>`.
   - Draws it into a canvas no larger than **640 px**; the full-size image is released.
   - `checkQuality()` measures brightness and an edge-sharpness score on a 64×64 grey copy.
3. **Run the model** — `model.classify(canvas)`
   - The Teachable Machine library crops the **centre square**, resizes to 224×224, scales colours to −1…1 and runs the network with TensorFlow.js (WebGL on most phones).
   - Returns `[{className, probability}, …]` for every class.
4. **Interpret** — `interpret(predictions, options)`
   - Validates the output (right number of classes, numbers between 0 and 1, sum ≈ 1). Bad output → error, **no result**.
   - Sorts classes; the top class gives the condition; **fruit score** = sum of that fruit's classes.
   - Marks the result **Uncertain** if any of: top class is `Not a fruit`; class name not understood; top score < threshold for that fruit; gap to second class < minimum gap (0.15); photo very dark/bright; user-selected fruit ≠ detected fruit.
   - Flags *experimental* if the fruit has not passed evaluation.
5. **Show + save** — `result-card.js` renders the result; `history.saveScan()` stores a record with a 160 px thumbnail and all class scores.

The user's fruit selection is **never** used to change the AI's answer; it is stored and shown separately as "Your selection".

## 5. Confidence scores and thresholds

- *Model confidence* = the top class's softmax score from the model, shown with one decimal place.
- Thresholds live in `public/config/model-card.json`:
  ```json
  "thresholds": { "default": 0.75, "perFruit": { "banana": 0.8 } },
  "minMargin": 0.15
  ```
- A device-only override can be set in **More → Confidence threshold** (stored in localStorage) for experiments.
- 0.75 is a provisional starting value; the procedure for choosing it from validation data is in `AI_MODEL_GUIDE.md` §7.1.

## 6. Fruit support status

`fruitSupport(labels, modelCard)` combines the **loaded model's classes** with the **model card's evaluation records**:

| Model has classes for the fruit? | Model card `evaluation` | Status shown |
|---|---|---|
| No model loaded | — | Model not loaded |
| No | anything | Not supported yet |
| Yes | not `passed` | Experimental |
| Yes | `passed` | Supported (evaluated) |

So a fruit can never be shown as supported just by editing the model card, and a new model must be re-evaluated.

## 7. Data storage

| What | Where | Notes |
|---|---|---|
| Scan history | IndexedDB `freshcheck-ai` → store `scans` | Thumbnail (JPEG data URL ≈ 5–10 KB), scores, result, date, feedback. No full-size photos. |
| Evaluation results | IndexedDB → store `evaluations` | Real fruit/condition label, lighting, file name, all scores, model version |
| Preferences | localStorage `freshcheck.prefs.v1` | Threshold override, model location, best quiz score |

If IndexedDB is unavailable (some private modes), `db.js` keeps records in memory and the app says they will be lost when the page closes. Storage-full errors show a message and do not crash the app.

## 8. Error handling

| Situation | What the user sees |
|---|---|
| Model files missing | "AI model unavailable … A trained model has not been added yet" + Try again; Analyse disabled |
| Model files damaged / mismatched | "could not be read … re-export" + Try again |
| Library/network failure, timeout (45 s) | Network message + Try again (no endless spinner) |
| Malformed model output | "The AI model gave an unexpected answer, so no result is shown" |
| Inference throws | "The analysis did not work on this device" |
| Camera blocked / missing / busy / not HTTPS | Specific message; Upload and Take photo stay available |
| Bad image file | Specific message (unsupported type, corrupt, too large, too small) |
| Leaving the page during analysis | Analysis is ignored; camera stopped |
| Double tap on Analyse | Second tap ignored |

Technical details go to the browser console (`[FreshCheck] …`), never to the screen.

## 9. Offline support (service worker)

`sw.js` pre-caches all app files and the vendor libraries on first visit. Model files and `config/` use **network-first** (fresh when online, cached copy when offline). Other files use cache-first. **Bump `CACHE_VERSION` whenever app files change**, otherwise phones may keep old files. Tested offline in headless Chrome with the test model (see TESTING.md E25).

## 10. Deployment

GitHub Actions (`.github/workflows/deploy.yml`) runs `tools/check.mjs` and publishes `public/` to GitHub Pages on each push to `main`. All paths in the app are relative, so it works under `https://user.github.io/repo/`. Hash routing (`#/history`) means refreshing any screen works on a static host.

## 11. How to add a new fruit

1. Add it to `FRUITS` in `public/js/fruits.js` (id, name, emoji, aliases).
2. Add an entry in `public/config/model-card.json` → `fruits`.
3. Train classes named `<Fruit> - <Condition>` (AI_MODEL_GUIDE.md), export, evaluate.
4. Add a unit test in `tests/unit/fruits.test.mjs` for its name parsing.

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| Changes don't appear on the phone | Bump `CACHE_VERSION` in `sw.js`; or Chrome → Site settings → Clear & reset |
| "AI model unavailable" | Check the 3 files are in `public/models/fruit-freshness/`; open DevTools → Network for 404s |
| A class shows "NOT RECOGNISED" | Rename the class in Teachable Machine to `Fruit - Condition` and re-export |
| Live camera button missing | Not on HTTPS/localhost, or browser lacks getUserMedia — use Take photo / Upload |
| Tests can't find a browser | Set `CHROME_PATH` to your Chrome/Edge `.exe` |
| `npm test` finds no tests | Use Node 18+ |
