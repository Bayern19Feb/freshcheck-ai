# AI Model Guide — FreshCheck AI

This guide explains the model the app expects, how to collect photos, how to train it in Google Teachable Machine, how to test it honestly, and how to install it.

> **Status (17 Oct 2026):** a **starter model** trained from public datasets is installed (section 12, results in [MODEL_EVALUATION.md](MODEL_EVALUATION.md)). Sections 3–10 describe how to train **your own** model from your own photos, which is still recommended for the exhibition. Never write an accuracy number you did not measure.

---

## 1. Model type

| Item | Value |
|---|---|
| Task | Image classification (one answer for the whole photo) |
| Tool | Google Teachable Machine → *Image Project → Standard image model* |
| How it works | **Transfer learning**: a pre-trained **MobileNet** network turns the photo into a list of features; Teachable Machine trains a small final layer on your photos |
| Input | Centre square of the photo, resized to 224 × 224 pixels, colour values scaled to −1…1 (done by the Teachable Machine library) |
| Output | One score per class; the scores add up to 1 (softmax) |
| Runs on | The phone/computer browser, with TensorFlow.js 1.3.1 (WebGL or CPU) |
| Files | `model.json`, `metadata.json`, `weights.bin` |
| Location in app | `public/models/fruit-freshness/` |

**Architecture choice: one combined classifier.** Each class is a *fruit + condition* pair (e.g. `Banana - Overripe`). We chose this over a two-stage pipeline (fruit model → separate condition model per fruit) because:

- Teachable Machine produces one model per project; a two-stage pipeline would need up to 9 separate models to train, export, test and load.
- One model is easier for a student to train, explain and maintain.
- The app still answers "which fruit?" separately: the **fruit score** is the sum of the scores of that fruit's classes.

Trade-off: with many fruits, the number of classes grows (up to 25). If accuracy suffers, train fewer fruits first (recommended) — unsupported fruits are simply shown as *Not supported yet*.

## 2. Class names (important)

The app reads the class names from `metadata.json`. Names must follow:

```
<Fruit> - <Condition>
```

- **Fruit:** `Apple`, `Banana`, `Orange`, `Mango`, `Grapes`, `Strawberry`, `Guava`, `Papaya`
- **Condition:** `Fresh`, `Overripe`, `Spoiled`
- Plus one reject class: **`Not a fruit`** (strongly recommended)

Mapping from model classes to what the app shows:

| Model class condition | App shows |
|---|---|
| `Fresh` (also accepts `Good`) | **Appears Fresh** |
| `Overripe` (also `Over-ripe`) | **Overripe Appearance** |
| `Spoiled` (also `Rotten`, `Bad`, `Mouldy`) | **Possible Signs of Spoilage** |
| `Not a fruit` (also `Background`, `Other`, `Unsupported`) | **Uncertain — Inspect Manually** ("not a supported fruit") |
| Any name the app does not understand (e.g. `Class 1`) | **Uncertain** + a warning on the *Model information* screen |
| *(any class, low score / close call / poor photo / fruit mismatch)* | **Uncertain — Inspect Manually** |

Only include **Overripe** for a fruit if you can photograph and label overripe-but-not-spoiled examples reliably (bananas are the clearest case). If you cannot tell overripe from spoiled confidently, use only `Fresh` and `Spoiled` for that fruit — the app handles any subset.

You can check how the app understood your class names at **More → Model information → Classes in the model**.

## 3. Recommended plan (start small)

| Stage | Classes | Why |
|---|---|---|
| 1 | `Banana - Fresh`, `Banana - Overripe`, `Banana - Spoiled`, `Apple - Fresh`, `Apple - Spoiled`, `Not a fruit` | Easy to buy, clear visual differences, covers all three conditions |
| 2 | Add `Orange`, `Mango`, `Guava` (Fresh / Spoiled) | Common in Maharashtra |
| 3 | Add `Grapes`, `Strawberry`, `Papaya` | Grapes and strawberries are small/soft and harder to photograph consistently |

A fruit counts as **Supported** in the app only after it passes the evaluation in section 7. Until then it shows as **Experimental** (or **Not supported yet** if it is not in the model).

## 4. Training data

### 4.1 Preferred source: your own photos

Photos you take yourself have no licence problems and match the phone and lighting you will use at the exhibition.

**How many:**
- Training: at least **100 photos per class** (150–300 is better).
- Separate **test** photos: at least **20–30 per class**, kept in a different folder and **never uploaded to Teachable Machine**.

**Avoid data leakage (very important):**
- Use **different physical fruits** for training and testing. Example: buy 12 bananas; photograph 9 for training and keep 3 only for testing.
- Or take test photos on a **different day** with different backgrounds.
- Never put near-identical burst photos in both sets.

**Include variety in every class:**
- Lighting: daylight near a window, indoor tube light, slightly dim.
- Backgrounds: plain table, steel plate, cloth, kitchen counter, hand holding the fruit.
- Angles and distances: top, side, close, medium; rotate the fruit.
- Appearance: different sizes, varieties (e.g. Alphonso and Kesar mango), natural marks, stickers.
- Ripeness: for bananas photograph green-yellow, yellow, spotted (overripe), and spoiled.

**Avoid accidental shortcuts:** if all spoiled photos are on the same dark plate, the model may learn "dark plate = spoiled". Use the same mix of backgrounds for every class.

**Spoiled fruit safely:** let a few fruits spoil in a closed container, photograph them without touching mould, do not sniff mould closely, wash hands afterwards, ask an adult to help, and compost the fruit when finished.

**`Not a fruit` class:** photos of empty tables, hands, spoons, plates, bottles, vegetables like tomato/onion, books, faces are **not** needed (and avoid photographing people).

### 4.2 Optional public datasets

Public datasets can add variety, but **you must check the licence on the dataset page before using it**, and record it below. Do not scrape random images from the web.

Examples to investigate (licences **not yet verified** for this project):
- *FruitNet: Indian fruits dataset with quality (Good, Bad & Mixed quality)* — Mendeley Data. Reported to include apple, banana, guava, orange and others. Check the licence shown on the Mendeley page.
- *Fruits fresh and rotten for classification* — Kaggle (apple, banana, orange). Check the licence on the Kaggle page; some Kaggle datasets have unclear sources.

Before using any dataset, check that its "rotten/bad" labels match our meaning (visible spoilage), and look through the images yourself — filenames or folder names are not proof of the label. Dataset photos are often on plain studio backgrounds, which differ from real kitchens, so always **test on your own phone photos**.

### 4.3 Dataset record (fill this in)

| Class | Training photos | Source (own / dataset name) | Licence | Number of physical fruits | Notes |
|---|---|---|---|---|---|
| Banana - Fresh | | | | | |
| Banana - Overripe | | | | | |
| Banana - Spoiled | | | | | |
| Apple - Fresh | | | | | |
| Apple - Spoiled | | | | | |
| Not a fruit | | | | | |

## 5. Train in Teachable Machine (step by step)

1. Open <https://teachablemachine.withgoogle.com/train> in **Chrome on a laptop/desktop**.
2. Click **Image Project → Standard image model**.
3. Rename *Class 1* by clicking the pencil icon → type `Banana - Fresh`. Rename *Class 2* → `Banana - Overripe`.
4. Click **Add a class** for each remaining class (`Banana - Spoiled`, `Apple - Fresh`, `Apple - Spoiled`, `Not a fruit`). Spell them exactly.
5. In each class click **Upload** → *Choose images from your files* → select that class's **training** folder. (You can also use **Webcam**, but uploading phone photos gives better variety.)
6. Click **Train Model**. Keep the tab open until it finishes. (Default *Advanced* settings — 50 epochs, batch size 16, learning rate 0.001 — are fine to start.)
7. Optional: **Advanced → Under the hood** shows *accuracy per class* and a *confusion matrix*. Note: these use 15% of **your training photos**, which are similar to the rest, so they are usually **too optimistic**. Use them only as a first check.
8. Use the **Preview** panel with *File* input to try one or two photos.
9. **Save the project**: the menu (☰) → *Download project to file* (keeps your photos and classes so you can retrain later).

## 6. Export and install

1. Click **Export Model** → **Tensorflow.js** tab → select **Download** → **Download my model**.
2. Unzip the downloaded file. It contains `model.json`, `metadata.json` and `weights.bin`.
3. Copy all three into `public/models/fruit-freshness/` (replace old files; do not rename).
4. Run `npm start` and open <http://localhost:8080>.
5. The header should say **AI ready**. Open **More → Model information** and check:
   - *Status: Ready*
   - Every class is mapped to a fruit and condition (no "NOT RECOGNISED").
6. Open **More → Supported fruits**: your fruits should show **Experimental**.
7. Update `public/config/model-card.json`: `modelName`, `modelVersion` (e.g. `"v1"`), `exportDate`, `source` ("Trained by … in Teachable Machine on …"), `trainingData` (summary of the table in 4.3).

**How the app loads the model** (`public/js/model.js`): when a scan screen opens it loads `vendor/tf.min.js` and `vendor/teachablemachine-image.min.js`, fetches `model.json` and `metadata.json` (clear message if missing → "AI model unavailable"), calls `tmImage.load()`, checks the number of outputs equals the number of labels, and runs one warm-up prediction. Any failure shows an error with a **Try again** button — never a made-up result.

**How to verify the app is using your model:** *Model information* shows your class names and the export date from `metadata.json`; *All class scores from the model* on each result lists your classes with their real scores.

Alternative: in Teachable Machine you can choose **Upload (shareable link)** and paste the link into **More → AI model → Model setup help → Model location**. The model is then downloaded from Google's server (photos still stay on the phone). For the exhibition, the local copy is more reliable.

## 7. Evaluation (testing honestly)

Use photos that were **never uploaded to Teachable Machine**.

### 7.1 Choose the threshold (validation photos)

1. Split your held-out photos into two groups: **validation** (≈ one third) and **test** (≈ two thirds).
2. In the app: **More → Test the model**. Choose the real fruit and condition, then *Choose test photos* and pick the validation photos of that class. Repeat for every class (and *Not a fruit*).
3. Look at the **Threshold table**. Choose the lowest threshold where *Spoiled → fresh* is 0 (or as low as possible) and *Correct when answered* is acceptable, while still answering a reasonable share of photos.
4. Write the threshold into `public/config/model-card.json` → `thresholds.default` (and `perFruit` if one fruit needs a different value) and change `thresholdNote` to say how it was chosen.
5. Press **Delete test results**.

### 7.2 Final test (test photos)

1. Reload the app so the new threshold is used.
2. Add the **test** photos for every class the same way.
3. Record the results: **Export CSV** and copy the numbers into `docs/EXPERIMENT_LOG.md` (per-fruit table and confusion matrix).
4. Include tricky cases in separate rows: blurry photos, dim light, unusual backgrounds, a fruit variety not used in training, non-fruit objects.

### 7.3 Pass criteria (project's own rule — agree it with your teacher)

A fruit is marked **passed** only if, on its independent test photos:
- at least **20 test photos per class** for that fruit,
- **Correct when answered ≥ 80%**,
- **Spoiled shown as fresh = 0**, and
- the photos came from fruits not used in training.

If a fruit passes, edit `public/config/model-card.json`:

```json
"banana": { "evaluation": "passed", "testImages": 75, "accuracy": 0.84, "notes": "Tested 20 Oct 2026, 75 photos from 3 bananas not used in training." }
```

Use the real numbers you measured. Set `lastVerified` to the date. Fruits that do not pass stay `"not-evaluated"` or `"failed"` and appear as **Experimental**.

## 8. Confidence scores — how to explain them

- The model gives every class a score between 0 and 1; they add up to 1.
- The app shows the top score as **"Model confidence"**, e.g. 87%.
- It means "the model prefers this class strongly" — **not** "87% chance the fruit is safe or fresh".
- Models can be confidently wrong, especially on photos unlike the training photos. This is why the app has a threshold, a *Not a fruit* class, and honest guidance.

Current settings (from `public/config/model-card.json`): threshold **0.70**, chosen on 17 Oct 2026 from 360 validation photos of the starter model's datasets (re-check with your own phone photos); minimum gap between the top two classes **0.15**.

## 9. Limitations

- Whole-image classifier: it does not locate spots, mould or damage.
- Cannot see inside the fruit, or the hidden side.
- Cannot detect bacteria, toxins, pesticide or chemical ripening.
- Out-of-distribution photos (new objects, unusual lighting) may still get high scores.
- Natural ripening spots can be confused with spoilage.
- Accuracy depends entirely on the training photos; results on one phone/lighting may not transfer to another.

## 10. Retraining

1. Open the saved project file in Teachable Machine (☰ → *Open project from file*).
2. Add more photos, especially for classes that were confused in the confusion matrix.
3. Train, export, replace the three files, bump `modelVersion` in the model card.
4. **Re-run the evaluation** — old results do not apply to a new model (the app automatically hides test results from other model versions).

## 11. Automated tests and the "pipeline test model"

`npm run make:test-model` creates `tests/fixtures/pipeline-test-model/`, a tiny TensorFlow.js model in Teachable Machine format whose weights are **set by hand so it reacts only to the average colour** of an image. It is **not trained on fruit and has no meaning for freshness**. It is used only by the automated browser tests to prove that the app's loading, inference, threshold and history code works with a real model file. It is never copied into `public/`.

## 12. The starter model (built 17 Oct 2026)

Built automatically so the app works before your own photos are ready.

**Data** (licences checked on the dataset pages on 17 Oct 2026; photos stay in the git-ignored `data/` folder and are never published):

| Classes | Source | Licence | Photos used |
|---|---|---|---|
| Apple, Banana, Orange, Grapes, Strawberry, Guava — Fresh / Spoiled | Sultana et al. 2022, *Data in Brief* 44:108552, via Hugging Face `Project-AgML/fresh_rotten_fruit_classification` ("raw") — "rotten" mapped to *Spoiled* | CC BY 4.0 | all 200 + 200 per fruit |
| Papaya — Fresh / Spoiled | *Papaya Freshness Classification Dataset*, Mendeley Data 7mgj5bvp5h ("GOOD" → Fresh, "BAD" → Spoiled) | CC BY 4.0 | 200 + 200 random (seeded) |
| Mango — Fresh / Spoiled | *FruitVision*, Mendeley Data xkbjx8959c v2, "Original Image.zip" | **CC BY-NC-ND 4.0** (non-commercial) | 200 + 200 random (seeded) |
| Other (not a supported fruit) | Sultana et al. — jujube and pomegranate, fresh and rotten | CC BY 4.0 | 400 |

**Split per class:** 140 train / 20 validation / 40 test (Other: 280 / 40 / 80). Near-identical photos (difference hash, ≤ 6 bits apart) were grouped and each group was kept in one split — 140 such groups. The full list is in `data/manifest.csv`.

**Training:** `tools/train/train.mjs` runs `tools/train/train.html` in headless Chrome and uses the Teachable Machine library itself (`tmImage.createTeachable`, MobileNet v2 α 0.35, same centre-crop as the website). Settings = the website's defaults (50 epochs, batch 16, learning rate 0.001, 100 dense units) plus a mirrored copy of every training photo. Training took about 9 minutes on this PC.

**Testing:** `tools/train/report.mjs` scores validation and test photos with the finished model, chooses the threshold on **validation** only (fewest spoiled-shown-as-fresh, then best accuracy → **70%**), then reports **test** results with the app's own `evaluation.js`, writes [MODEL_EVALUATION.md](MODEL_EVALUATION.md) and updates the model card.

**Results (720 test photos):** correct when answered **98.6%**; 2 spoiled photos shown as fresh (1 banana with dark patches, 1 leaking strawberry). Passed: Apple, Orange, Mango, Grapes, Guava, Papaya. Experimental: Banana, Strawberry. 79 of 80 jujube/pomegranate photos were rejected as "Other".

**Why these numbers are probably too high for real use:** test photos come from the same datasets as the training photos (same cameras, plain backgrounds, often the same fruit batches). Your phone photos in a kitchen will be different. Before quoting any accuracy at the exhibition, test with your own photos in **More → Test the model** and record them in EXPERIMENT_LOG.md.

**No Overripe class:** the datasets only label fresh and rotten. Train your own `Banana - Overripe` class to add it.

**Rebuild:** `python -m venv .venv && .venv/Scripts/python -m pip install pillow pyarrow requests`, then `npm run dataset` (≈ 4 GB download, ≈ 30 min) and `npm run train`.

## 13. Version 2 (18 Oct 2026): fruit recogniser + freshness checker

**Why two models?** Licensed photos of *rotten* fruit exist for only ~16 fruits, but photos for recognising fruit exist for 50+. So:

| Model | Folder | Classes | Training photos |
|---|---|---|---|
| Fruit recogniser | `public/models/fruit-id/` | 51 fruit names + `Not a fruit` | Fruits-360 (≤400 per fruit) + 300 real freshness photos per freshness fruit; vegetables/nuts as "Not a fruit" |
| Freshness checker | `public/models/fruit-freshness/` | 16 fruits × `Fresh` / `Spoiled` + `Other` | Up to 500 fresh + 500 spoiled per fruit |

**App logic** (`combine()` in `public/js/interpret.js`): recogniser sure + both agree → freshness answer; fruit has no freshness data → "Fruit Identified — Check Freshness Yourself" + tips; they disagree or the recogniser is unsure → Uncertain; recogniser says "Not a fruit" → Uncertain. If you install your own single Teachable Machine model (Settings → Model location), the recogniser is switched off automatically unless you also set `idModelUrl`.

**Data sources** (all checked on their dataset pages, 18 Oct 2026): Sultana et al. 2022 / AgML (CC BY 4.0), FruitNet (CC BY 4.0), Papaya Freshness (CC BY 4.0), FruQ-multi (CC BY 4.0, time-lapse frames), FruitVision (CC BY-NC-ND 4.0), Fruits-360 (CC BY-SA 4.0). Every photo, its source, licence and split are listed in `data/v2/images.csv` (local).

**Splits:** 70 / 10 / 20 per fruit + condition + source. Near-identical photos (dHash ≤ 6 bits) stay together; time-lapse and rotating-fruit frames are split in contiguous blocks.

**Training:** Teachable Machine library, MobileNet v2 α 0.35; 30 epochs, batch 32, learning rate 0.001, 128 dense units; mirrored copies for the freshness model.

**Results:** see [MODEL_EVALUATION.md](MODEL_EVALUATION.md). Freshness fruits from a single time-lapse video (peach, pear, persimmon, tomato, watermelon) stay Experimental regardless of score.

**Rebuild:** `npm run dataset:v2` then `npm run train:v2`.
