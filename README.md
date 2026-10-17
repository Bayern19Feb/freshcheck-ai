# FreshCheck AI

**A Smarter Way to Check Fruit Freshness** — a school science exhibition project (Standards 5–7, theme: *AI for Better Life — Reducing Food Waste Through Artificial Intelligence*).

FreshCheck AI is a mobile-first web app (installable as a phone app / PWA). You take or upload a photo of a fruit, and a **trained image-classification model running on the phone** estimates whether the fruit *appears fresh*, *appears overripe*, or shows *possible signs of spoilage* — or says **Uncertain** when it cannot tell. It always explains that a photo cannot prove a fruit is safe to eat.

> **Current state (17 Oct 2026, v0.2.0):** a **starter model** trained from openly licensed public fruit photo datasets is installed (8 fruits × fresh/spoiled + "Other"). On 720 held-out dataset photos it was correct **98.6% of the time when it answered** (threshold 70%); 6 fruits passed the project's test rule, Banana and Strawberry are *Experimental* — see [docs/MODEL_EVALUATION.md](docs/MODEL_EVALUATION.md). It has **not** yet been tested on real phone photos, the app is **not deployed**, and it has not been tried on a real Android phone. See [docs/SESSION_HANDOFF.md](docs/SESSION_HANDOFF.md).

---

## Features

| Feature | What it does |
|---|---|
| Welcome screen | Logo, tagline, *Scan a Fruit*, *Upload a Photo*, *How It Works*, *Learn About Food Waste*, AI-estimate note |
| Camera & upload | Live camera preview (back camera), phone camera app, or gallery upload; preview, retake, remove, cancel; clear permission messages |
| Image checks | Rejects empty/corrupt/unsupported/very large/tiny files; downsizes before analysis; uses photo orientation; warns about dark, washed-out or blurry photos |
| AI analysis | Genuine TensorFlow.js inference with a Teachable Machine model, on the device; one analysis at a time; cancel; no fake results |
| Results | Detected fruit (from the model) shown separately from your own fruit selection, freshness category, **model confidence** with the threshold marked, all class scores, reasons for "Uncertain", guidance, feedback |
| Uncertain handling | Configurable threshold (per fruit possible), "close call" check, *Not a fruit* class, poor-photo check, fruit-mismatch check |
| Guidance | Child-friendly advice for Fresh / Overripe / Spoilage / Uncertain — never claims food is safe |
| History | Saved automatically on the device (IndexedDB): list, details, feedback, delete one, clear all (with confirmation), CSV export |
| Dashboard | Counts from real saved scans only (totals, by category, uncertain, most-scanned fruit) |
| Supported fruits | Status of all 8 target fruits: *Supported (evaluated)*, *Experimental*, *Not supported yet* |
| Test the model | In-app evaluation on labelled test photos: per-fruit accuracy, confusion matrix, threshold table, CSV export |
| Learning centre | Ripening, spoilage, ripening vs spoilage, brown spots, food waste, how AI works, why AI makes mistakes, why photos can't prove safety |
| Quiz | 8 questions with instant feedback and a score |
| Settings | Model status & setup help, model location, threshold, privacy, delete data, troubleshooting, version |
| PWA | Installable, works offline after the first visit (app + model cached) |

## Technology

- **HTML, CSS, JavaScript (ES modules)** — no framework and no build step, so the code is easy to read and explain.
- **TensorFlow.js 1.3.1** + **@teachablemachine/image 0.8.5** — copied into `public/vendor/` so no CDN is needed at the exhibition.
- **Google Teachable Machine** — free, browser-based model training.
- **IndexedDB** (history, test results) and **localStorage** (small preferences).
- **Service worker + web manifest** — offline use and "Add to Home screen".
- **GitHub Pages** — free HTTPS hosting (workflow in `.github/workflows/deploy.yml`).
- **Node.js** (development only) — local server, unit tests (`node --test`), browser tests (`puppeteer-core` driving your installed Chrome/Edge).

Total software cost: **₹0**.

## Prerequisites

- A computer with **Node.js 18+** (tested with Node 22.18.0) — only needed to run the local server and tests.
- **Google Chrome or Microsoft Edge** (used by the automated browser tests).
- An Android phone with Chrome for the real demonstration.
- A free Google account is **not** required for Teachable Machine training; a free **GitHub account** is needed for hosting.

## Install and run locally

```bash
cd School_project
npm install            # installs dev tools only (tests, icon maker)
npm start              # serves the app at http://localhost:8080
```

Open <http://localhost:8080> in Chrome. The app itself is just the `public/` folder; any static web server works.

**Testing on a phone over Wi-Fi:** run `npm start`, find your computer's IP address (`ipconfig`), and open `http://<that-ip>:8080` on the phone. *Upload* and *Take photo* work; the **live camera preview needs HTTPS**, so it only works on the deployed GitHub Pages site (or `localhost`).

## Development commands

| Command | What it does |
|---|---|
| `npm start` | Local server on port 8080 |
| `npm test` | Unit tests for the logic (labels, thresholds, evaluation maths, stats, quiz) |
| `npm run make:test-model` | Creates the *pipeline test model* used by browser tests (not a fruit model) |
| `npm run test:e2e` | 28 browser checks in headless Chrome (needs the test model) |
| `npm run check` | File check + unit tests + browser tests (the "build check") |
| `npm run vendor` | Re-copies TensorFlow.js / Teachable Machine files into `public/vendor/` |
| `npm run make:icons` | Re-draws the PNG app icons from `public/img/logo.svg` |
| `npm run dataset` | Downloads and prepares the public training photos into `data/` (git-ignored) |
| `npm run train` | Trains the starter model, installs it, writes `docs/MODEL_EVALUATION.md`, updates the model card |

**Build:** there is no compile step. `node tools/check.mjs` verifies that every file the app needs exists, JSON files are valid, and all module imports resolve. The `public/` folder *is* the production build.

## AI model setup (summary)

**Starter model (already installed):** rebuild it with `npm run dataset` (downloads ~4 GB once; needs the Python venv, see AI_MODEL_GUIDE.md §12) and `npm run train`.

**Your own model (recommended for the exhibition):**

1. Train an **Image Project** in [Teachable Machine](https://teachablemachine.withgoogle.com/train/image) with classes named like `Banana - Fresh`, `Banana - Overripe`, `Banana - Spoiled`, `Apple - Fresh`, `Apple - Spoiled`, … and `Not a fruit`.
2. **Export Model → Tensorflow.js → Download my model**, unzip.
3. Copy `model.json`, `metadata.json`, `weights.bin` into `public/models/fruit-freshness/`.
4. Reload the app → the header shows **AI ready**.
5. Test with photos **not used for training** in **More → Test the model**, then record results in `public/config/model-card.json` and `docs/EXPERIMENT_LOG.md`.

Full step-by-step guide: **[docs/AI_MODEL_GUIDE.md](docs/AI_MODEL_GUIDE.md)**.

## Deploy (free, GitHub Pages)

1. Create a free account at <https://github.com> and a new **public** repository, e.g. `freshcheck-ai`.
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "FreshCheck AI"
   git branch -M main
   git remote add origin https://github.com/<your-username>/freshcheck-ai.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to turn green.
5. Your app is at `https://<your-username>.github.io/freshcheck-ai/`. Open it on the phone, check that **AI ready** appears, and do a test scan.

**Updating later:** change files, then `git add . && git commit -m "describe change" && git push`. After changing app files, also bump `CACHE_VERSION` in `public/sw.js` so phones fetch the new version.

## How to use the app

1. Tap **Scan a Fruit** (live camera) or **Upload a Photo**.
2. Put one fruit inside the dashed square, in good light, on a plain background.
3. Optionally choose the fruit — this does **not** change the AI's answer; it only warns you if the AI sees a different fruit.
4. Tap **Analyse photo**. Read the result, the model confidence and the guidance.
5. The result is saved in **History** on the phone. Answer *Was this helpful?* if you like.

## Known limitations

- No trained model is included yet; until one is added the scanner cannot analyse photos.
- A photo shows only the outside of one side of a fruit. The app **cannot** detect internal rot, bacteria or toxins and never says food is safe.
- The model gives one answer for the whole photo; it does not locate spots or mould.
- Image classifiers can give high scores to things they were never trained on; the *Not a fruit* class and threshold reduce, but do not remove, this risk.
- Only fruits that pass testing on independent photos are labelled *Supported*.
- Full list: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).

## Documentation

| File | Purpose |
|---|---|
| [docs/SESSION_HANDOFF.md](docs/SESSION_HANDOFF.md) | **Start here** — current state and exact next steps |
| [docs/PROJECT_NOTES.md](docs/PROJECT_NOTES.md) | Project diary |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Feature checklist with statuses and evidence |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Version history |
| [docs/TECHNICAL_GUIDE.md](docs/TECHNICAL_GUIDE.md) | How the code works |
| [docs/AI_MODEL_GUIDE.md](docs/AI_MODEL_GUIDE.md) | Training, testing and installing the model |
| [docs/TESTING.md](docs/TESTING.md) | Test plan and actual results |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Open problems and workarounds |
| [docs/EXHIBITION_GUIDE.md](docs/EXHIBITION_GUIDE.md) | Student guide for the exhibition |
| [docs/EXHIBITION_POSTER.md](docs/EXHIBITION_POSTER.md) | Poster content |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Two-minute demonstration script |
| [docs/JUDGE_QA.md](docs/JUDGE_QA.md) | Likely judge questions and answers |
| [docs/EXPERIMENT_LOG.md](docs/EXPERIMENT_LOG.md) | Table for recording real test results |
| [docs/MODEL_EVALUATION.md](docs/MODEL_EVALUATION.md) | Auto-generated test report of the starter model |

## Licence and credits

**Training photos (not included in this repository; downloaded by `tools/dataset/fetch_datasets.py`):**
- Sultana et al., *An extensive dataset for successful recognition of fresh and rotten fruits*, Data in Brief 44 (2022) 108552, doi:10.1016/j.dib.2022.108552 — via Hugging Face `Project-AgML/fresh_rotten_fruit_classification`, CC BY 4.0.
- *Papaya Freshness Classification Dataset*, Mendeley Data, doi:10.17632/7mgj5bvp5h.1, CC BY 4.0.
- *FruitVision: A Benchmark Dataset for Fresh, Rotten, and Formalin-mixed Fruit Detection*, Mendeley Data, doi:10.17632/xkbjx8959c.2, CC BY-NC-ND 4.0 (non-commercial; mango photos only).

The photos were resized; no photos are redistributed. Font: Plus Jakarta Sans, SIL Open Font License 1.1 (`public/fonts/`). App code: MIT. TensorFlow.js and @teachablemachine/image: © Google LLC, Apache License 2.0 (see `public/vendor/NOTICE.txt`). This project is not affiliated with or endorsed by Google, TensorFlow, or any government, scientific or food-safety body.
