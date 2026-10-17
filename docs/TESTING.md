# Testing — FreshCheck AI

Rule: a test is marked **Pass** only if it was actually run and passed. Anything not run is **Not Tested**.

## Environment used (session 1, 17 Oct 2026)

- Windows 11 Home, Node.js 22.18.0, npm 11.10.1
- Google Chrome (installed version, headless, driven by puppeteer-core 23.11.1), viewport 360×740 @2x, mobile + touch emulation
- Model used for automated tests: **pipeline test model** (hand-set weights, reacts to colour only — *not a fruit model*). See AI_MODEL_GUIDE.md §11.
- Commands: `npm test`, `node tools/make-test-model.mjs`, `node tests/e2e/run-e2e.mjs`, `node tools/check.mjs`

## 1. Build check

| Command | Result |
|---|---|
| `node tools/check.mjs` | **Pass** — "Check passed: 37 pre-cached files, 27 JS modules." Model files: NOT present (expected) |

## 2. Unit tests (`npm test`) — 22/22 passed

| Area | Tests | Result |
|---|---|---|
| Class-name parsing (`fruits.js`) | Recommended names, aliases, separators, reversed order, reject classes, unknown names never guessed, label summary, support status rules | Pass (6) |
| Interpretation (`interpret.js`) | Exact model score kept, low confidence → uncertain, close call, reject/unknown class, per-fruit threshold, user selection never changes answer + mismatch, experimental flag, poor image, malformed outputs throw | Pass (8) |
| Evaluation maths | Correct/answered/uncertain/dangerous counts, confusion matrix, threshold sweep, CSV escaping | Pass (4) |
| Stats + quiz + wording | Stats from records only, ≥5 valid questions, scoring + final answers, no banned safety phrases in guidance/quiz | Pass (4) |

## 3. End-to-end browser tests (`npm run test:e2e`) — 29/29 passed

Final run: 17 Oct 2026 (results also in `tests/e2e/last-run.json`, screenshots in `tests/e2e/screenshots/`).

| ID | Feature | Input | Expected | Actual | Result |
|---|---|---|---|---|---|
| E01 | Startup | Open `#/` at 360 px | Name, tagline, buttons; no sideways scroll | As expected | Pass |
| E02 | Missing model | No files in `models/fruit-freshness/` | "AI unavailable", Analyse disabled, no result | As expected | Pass |
| E03 | Broken model | `model.json` = "this is not json" | Clear "could not be read" error + Try again | As expected | Pass |
| E04 | Model init | Test model | "AI ready"; classes listed | As expected | Pass |
| E05 | Genuine prediction | Red image | Appears Fresh, Apple, confidence = softmax maths | Shown 100.0%, expected 100.0%; experimental warning shown; saved | Pass |
| E06 | Spoilage result | Light-blue image | Possible Signs of Spoilage + guidance | Shown 88.4% (= expected) | Pass |
| E07 | Overripe result | Cyan image | Overripe Appearance, Banana | As expected | Pass |
| E08 | Not a fruit | Grey image | Uncertain, "not a supported fruit" | As expected | Pass |
| E09 | Low confidence | Ambiguous colour | Uncertain, real score still shown | Shown 34.3% (= expected) | Pass |
| E10 | User selection vs AI | Yellow image, user picks Apple | Detected Banana shown separately; mismatch → Uncertain | As expected | Pass |
| E11 | Poor photo | Very dark image | Dark warning, Uncertain | As expected | Pass |
| E12 | Bad files | Corrupt JPG, .txt, 50×50 PNG | Friendly errors, no result | As expected | Pass |
| E13 | Repeated taps | Two clicks on Analyse | One analysis / one record | As expected | Pass |
| E14 | History + refresh | Reload History | 8 records before and after | 8 / 8 | Pass |
| E15 | Details, feedback, delete | Open record, Yes, reload, delete | Feedback persists; count −1 | As expected | Pass |
| E16 | Dashboard | — | Numbers equal stored records | 7 total, 4 uncertain = stored | Pass |
| E17 | Fruit support | Test model (apple, banana) | Apple/Banana Experimental, other 6 Not supported | As expected | Pass |
| E18 | Quiz scoring | All correct | 8 / 8 | 8 / 8 | Pass |
| E19 | Quiz feedback | Wrong answer | "Not quite", score 0 | As expected | Pass |
| E20 | Live camera | Chrome fake camera | Capture → preview → analyse → result | Result shown (pipeline only) | Pass |
| E21 | Evaluation tool | 4 labelled images incl. 1 deliberate error | 3 correct, 1 "spoiled shown as fresh", matrix | As expected | Pass |
| E22 | Clear history | Cancel, then confirm | Cancel keeps; confirm deletes | As expected | Pass |
| E23 | Mobile layout + wording | All 11 screens, details opened | No overflow; no banned safety claims | As expected | Pass |
| E24 | Refresh nested route | Reload `#/learn/food-waste` | Same topic open | As expected | Pass |
| E25 | Offline | Offline mode after one online visit | App + model load; scan works | As expected | Pass |
| E26 | Keyboard | Tab from top | Reaches Scan button with focus ring | As expected | Pass |
| E27 | Console | Whole run | No uncaught JS errors | None | Pass |
| E28 | Camera denied | Browser denying permission | Message mentions upload; Upload button present | "Camera permission was blocked…" | Pass |
| E29 | Installed starter model | Default model location | AI ready, all classes understood | 17 classes, none unrecognised | Pass |

### Problems found by these tests and fixed
- On a 360 px screen the **Analyse** button could sit under the fixed bottom navigation bar → app now scrolls it into view and sets `scroll-padding` (E05 etc. initially failed).
- Pure blue (0,0,255) test image triggered the app's "very dark photo" rule (brightness ≈ 29) → correct app behaviour; test colour changed to (60,60,255).

## 4. AI model tests

### 4a. Starter model on held-out dataset photos (17 Oct 2026)
Full report: [MODEL_EVALUATION.md](MODEL_EVALUATION.md) (generated by `tools/train/report.mjs`).

| Test | Result |
|---|---|
| Threshold chosen on 360 validation photos | 70% |
| 720 test photos (never used for training or threshold) | correct when answered **98.6%**; answered 87.9% (includes 80 "Other" photos that should be rejected); overall correct 97.6% |
| Spoiled shown as fresh | 2 (`agml-banana-rotten-022`, `agml-strawberry-rotten-056`) |
| Per fruit + confusion matrix | In MODEL_EVALUATION.md — Apple, Orange, Mango, Grapes, Guava, Papaya passed; Banana, Strawberry not passed |
| "Other" (jujube/pomegranate) rejected | 79/80 |
| Same model inside the app (upload → Analyse) | Banana fresh, Mango spoiled, Papaya fresh → correct; Other → "Uncertain — not a supported fruit" |

### 4b. Still Not Tested
| Test | Status |
|---|---|
| Own phone photos of real fruit (independent of the datasets) | Not Tested |
| Overripe fruit | Not Tested (model has no overripe class) |
| Different lighting / busy backgrounds / angles | Not Tested |
| Blurry photos, unusual varieties, everyday non-fruit objects | Not Tested |

## 5. Manual testing still required

| Test | Status |
|---|---|
| Real Android phone (Chrome): install, camera, upload, scan, history, offline | Not Tested |
| Mid-range phone: model load time and analysis time (measure, record) | Not Tested |
| iPhone / Safari | Not Tested |
| Deployed GitHub Pages URL: loads, asset paths, inference, service worker, installability | **Pass** in headless Chrome on 17 Oct 2026 (Papaya-spoiled test photo → "Possible Signs of Spoilage" 99.6%; Chrome reported no installability errors). On the Android phone: Not Tested |
| Screen reader (TalkBack) announcements | Not Tested |
| Real camera permission denial on Android | Not Tested (only simulated) |
| Very large real photo (10–20 MB) on a phone | Not Tested |
| Storage full | Not Tested (handled in code, not simulated) |
| Malformed model output inside the browser | Unit-tested only (`interpret.test.mjs`) |

## 6. Safety-related checks

| Check | Evidence | Status |
|---|---|---|
| Never says "guaranteed safe" / "100% safe" / "certified safe" / "no bacteria detected" | Unit test on all guidance + quiz text; E23 on all screens | Pass |
| Low confidence shown as Uncertain | Unit tests; E09 | Pass |
| Missing model never gives a result | E02, E03 | Pass |
| Explains limits of image-only classification | Home note, result card, Learn, Model info (E05 checks result text) | Pass |
| Unsupported fruit not treated as supported | Support rules unit test; E17 | Pass |
