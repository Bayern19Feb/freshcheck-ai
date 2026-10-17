# Experiment Log — FreshCheck AI

Record **real** test results only. Use photos that were **not** used for training. The in-app **More → Test the model → Export CSV** produces rows in this format.

## Starter model — dataset test photos (17 Oct 2026)

The starter model (`starter-v1`) was tested automatically on **720 held-out photos from the public datasets** (not phone photos). Full per-photo scores are in `data/heldout-scores.json` (local), and the summary, per-fruit table and confusion matrix are in [MODEL_EVALUATION.md](MODEL_EVALUATION.md).

| Fruit | Test photos | Correct when answered | Spoiled → fresh | Passed? |
|---|---|---|---|---|
| Apple | 80 | 96.2% | 0 | Yes |
| Banana | 80 | 98.8% | 1 | No (Experimental) |
| Orange | 80 | 100.0% | 0 | Yes |
| Mango | 80 | 97.5% | 0 | Yes |
| Grapes | 80 | 98.8% | 0 | Yes |
| Strawberry | 80 | 98.8% | 1 | No (Experimental) |
| Guava | 80 | 100.0% | 0 | Yes |
| Papaya | 80 | 100.0% | 0 | Yes |
| Other (jujube, pomegranate) | 80 | 79/80 rejected | — | — |

Threshold 70% (chosen on 360 validation photos). These are dataset photos from the same sources as the training photos, so they are likely **easier** than real phone photos.

## Own phone photos

No results yet — fill in the tables below after testing real fruit with the phone.

## Model under test

| Item | Value |
|---|---|
| Model version (model-card.json) | |
| Export date (metadata.json timeStamp) | |
| Classes | |
| Threshold / minimum gap used | |
| Phone / browser | |
| Date of test | |
| Tested by | |

## Individual test photos

Outcome: **Correct**, **Incorrect**, or **Uncertain** (for non-fruit photos, Uncertain = correct rejection).

| Test image ID | Fruit type | Actual observed condition | Model prediction | Model confidence | Correct / Incorrect / Uncertain | Lighting condition | Notes |
|---|---|---|---|---|---|---|---|
| T001 | | | | | | | |
| T002 | | | | | | | |
| T003 | | | | | | | |

## Summary per fruit (copy from the app's per-fruit table)

| Fruit | Test photos | Correct (all) | Answered | Correct when answered | Spoiled → fresh | Passed? |
|---|---|---|---|---|---|---|
| | | | | | | |

## Confusion matrix (copy from the app)

| Real ↓ / App → | | | | Uncertain |
|---|---|---|---|---|
| | | | | |

## Threshold choice (validation photos)

| Threshold | Correct | Answered | Correct when answered | Spoiled → fresh |
|---|---|---|---|---|
| | | | | |

Chosen threshold: ____ because ____.

## Observations
- 
