# Changelog — FreshCheck AI

## 0.3.0 — 17 Oct 2026

### Changed (visual redesign)
- New design system: Plus Jakarta Sans font (bundled, SIL OFL 1.1), deep-green + lime palette, softer shadows, larger radii, subtle page animations (disabled when the device asks for reduced motion).
- Home: gradient hero, trust badges (8 fruits / Private / Offline), "How it works" steps, icon tiles.
- Scan: step indicator (Photo → Analyse → Result), camera-style corner viewfinder, scanning-line animation while the AI runs, compact AI-status line.
- Result: coloured verdict banner, circular confidence gauge with the threshold marked, photo card with detected fruit, numbered guidance.
- Floating glass bottom navigation; polished History (status pills), Dashboard (icon stats, coloured bars), Learn (topic icons), Quiz (progress bar, letter options, score banner), More.

### Fixed
- A focus ring was drawn around the whole page after navigation.
- Service-worker cache bumped to v0.3.0 so installed apps fetch the new design.

## 0.2.0 — 17 Oct 2026

### Added
- **Starter model** in `public/models/fruit-freshness/`: 17 classes (8 fruits × Fresh/Spoiled + Other), trained from openly licensed public datasets with the Teachable Machine library.
- `tools/dataset/` (download with partial zip reading, near-duplicate grouping, train/validation/test split) and `tools/train/` (headless-Chrome training, threshold choice, evaluation report).
- `docs/MODEL_EVALUATION.md` (auto-generated); dataset credits in README.
- Browser test E29 for the installed model; npm scripts `dataset` and `train`.

### Changed
- Model card: threshold 0.70 (chosen on validation photos), per-fruit evaluation records, limitations.
- Supported-fruits screen says "correct when answered" instead of "accuracy".
- Browser tests no longer assume that no model is installed.

## 0.1.0 — 17 Oct 2026

### Added
- Mobile-first PWA: Welcome, Scan, Result, History (+ details), Learning centre, Quiz, Dashboard, Supported fruits, Model information, Settings ("More"), Test the model.
- Teachable Machine / TensorFlow.js model loading with loading / ready / unavailable states and retry; libraries bundled locally.
- Combined fruit-condition classification for 8 target fruits (Apple, Banana, Orange, Mango, Grapes, Strawberry, Guava, Papaya); class-name parser with aliases and a reject class.
- Uncertain results for low confidence, close calls, "Not a fruit", unrecognised classes, very dark/bright photos and fruit mismatch.
- Detected fruit shown separately from the user's fruit selection.
- Model confidence with threshold marker and "not a safety probability" explanation; all class scores.
- Guidance for Fresh / Overripe / Spoilage / Uncertain; visual-feature explanations.
- Live camera, phone camera capture, gallery upload; image validation, orientation, downscaling, quality warnings.
- IndexedDB history with feedback, delete, clear-all confirmation, CSV export; in-memory fallback.
- Dashboard computed from saved scans only.
- Evaluation tool with per-fruit metrics, confusion matrix, threshold sweep, CSV export; results tied to model version.
- `config/model-card.json` for model details, thresholds and per-fruit evaluation status.
- Service worker (offline), manifest, icons, GitHub Pages workflow.
- Unit tests (22), browser tests (28), pipeline test model generator, file check script.
- Documentation set and exhibition materials.

### Fixed (during development)
- Analyse button could be hidden behind the bottom navigation on small screens.
- Result card now appears directly under the photo; long button labels no longer wrap awkwardly.

### Known not done
- No trained fruit model; not deployed; not tested on a real phone.
