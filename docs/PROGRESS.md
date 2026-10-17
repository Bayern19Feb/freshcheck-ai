# Progress — FreshCheck AI

Statuses: **Not Started · In Progress · Implemented · Tested · Verified · Blocked**

- *Implemented* = code exists. *Tested* = automated or manual test passed (evidence given). *Verified* = confirmed on a real phone / deployed site / with the real model.
- Nothing is **Verified** yet: no real phone test, no deployment, no phone-photo evaluation.

Last updated: 17 Oct 2026 (session 2).

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 1 | Project setup, tools, structure | Tested | `tools/check.mjs` passes |
| 2 | Welcome screen (A) | Tested | E01 |
| 3 | Responsive navigation, mobile layout | Tested | E23 (360 px, all screens) — Not Verified on a real phone |
| 4 | Camera: live preview (B) | Tested | E20 (fake camera) — **Not Verified on Android** |
| 5 | Camera: phone camera app via `capture` | Implemented | Not testable headless; manual phone test needed |
| 6 | Upload, preview, retake, remove, cancel (B) | Tested | E05–E12 |
| 7 | Camera permission denied / unavailable | Tested | E28 (simulated) |
| 8 | Image preprocessing & validation (C) | Tested | E11, E12; orientation handling Not Verified on a phone |
| 9 | Model loading states (loading / ready / error + retry) | Tested | E02, E03, E04 |
| 10 | Genuine inference pipeline (D) | Tested | E05–E11 with **pipeline test model** |
| 11 | Trained fruit model (starter, public datasets) | Tested | 17 classes; E29 loads it; 720 test photos → MODEL_EVALUATION.md. Own-photo model: Not Started |
| 12 | Confidence display + explanation | Tested | E05, E06, E09 (shown value = model maths) |
| 13 | Uncertain handling (threshold, gap, reject class, poor photo, mismatch) | Tested | Unit tests + E08–E11 |
| 14 | Threshold chosen from validation data | Tested | 70% from 360 dataset validation photos (MODEL_EVALUATION.md §1) — not yet with phone photos |
| 15 | Results screen + guidance (E, F) | Tested | E05–E07 |
| 16 | Feedback "Was this helpful?" | Tested | E15 |
| 17 | Scan history: list, details, delete, clear, persistence (G) | Tested | E14, E15, E22 |
| 18 | History CSV export | Implemented | Not automatically tested |
| 19 | Learning centre (H) | Tested | E23, E24 (renders, no overflow); content reviewed by author only |
| 20 | Dashboard from real data (I) | Tested | E16 |
| 21 | Quiz (J) | Tested | E18, E19, unit tests |
| 22 | Settings & information (K) | Tested | E23 renders; threshold/model-location controls Implemented, not automatically tested |
| 23 | Model information screen | Tested | E04 |
| 24 | Fruit support section (8 fruits) | Tested | E17 |
| 25 | Evaluation tool (confusion matrix, per-fruit, thresholds) | Tested | E21 + unit tests |
| 26 | Per-fruit evaluation of the model | Tested (dataset photos) | 6 passed, Banana/Strawberry Experimental; phone-photo evaluation Not Started |
| 27 | Privacy notice, local-only storage | Implemented | Text present; no network upload code exists |
| 28 | Accessibility (labels, focus, live regions, text + icons for status) | Tested (partly) | E26 keyboard; screen reader Not Tested |
| 29 | PWA manifest + icons + service worker | Implemented | Install prompt Not Tested on a phone |
| 30 | Offline use | Tested | E25 (headless Chrome) — Not Verified on a phone |
| 31 | Production build check | Tested | `tools/check.mjs` |
| 32 | Deployment config (GitHub Actions) | Tested | Run 2 succeeded (17 Oct 2026); run 1 failed until Pages source was set to "GitHub Actions" |
| 33 | Deployed URL verified | Tested (desktop Chrome) | https://bayern19feb.github.io/freshcheck-ai/ — all files 200, AI ready, real inference, service worker active, no installability errors (headless Chrome, 17 Oct 2026). Not yet checked on the Android phone |
| 34 | Real Android phone test | Not Started | — |
| 35 | Performance measured on a phone | Not Started | App shows measured load/analysis times; none recorded yet |
| 36 | Documentation set (14 files) | Implemented | Must be updated after model training |
| 37 | Exhibition materials (poster, script, Q&A, experiment log) | Implemented | Results sections intentionally empty until real tests |
