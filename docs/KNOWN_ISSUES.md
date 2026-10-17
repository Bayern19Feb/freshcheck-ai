# Known Issues — FreshCheck AI

Severity: **High** (blocks the exhibition goal) · **Medium** (affects reliability) · **Low** (minor)

| ID | Issue | Severity | Impact | Workaround | Next action |
|---|---|---|---|---|---|
| K1 | ~~No trained model~~ — **resolved 17 Oct 2026** with the starter model (public datasets) | — | — | — | Replace/extend with the student's own photos for the exhibition (recommended) |
| K2 | Threshold 0.70 was chosen from **dataset** validation photos, not phone photos; gap 0.15 not tuned | Medium | May not suit real phone photos | Adjust in More → Confidence threshold | Re-check with own phone validation photos |
| K3 | Evaluation used only **dataset** test photos (same sources as training); no phone photos tested | **High** | Real-world accuracy unknown and probably lower than 98.6% | Say "on dataset test photos" when quoting numbers | Test with own phone photos (More → Test the model), record in EXPERIMENT_LOG.md |
| K4 | Not tested on a real Android phone | **High** | Unknown: camera behaviour, photo orientation, speed, install prompt | — | Test on the demo phone after deployment (TESTING.md §5) |
| K5 | Not deployed; live camera preview needs HTTPS | Medium | Over plain `http://<pc-ip>:8080` only Upload / Take photo work | Use Take photo / Upload, or deploy | Deploy to GitHub Pages (README) |
| K6 | Image classifiers can give high scores to unfamiliar images (out-of-distribution) | Medium | A non-fruit or unusual photo might get a confident fruit label | Train a varied "Not a fruit" class; threshold; app text explains limitation | Include non-fruit photos in evaluation |
| K7 | Blur score threshold (15) not validated on real photos; blur only warns | Low | Plain backgrounds may trigger a "maybe blurry" warning; real blur may be missed | Warning text is gentle and does not change the result | Tune with real photos, or remove if noisy |
| K8 | "Very dark" rule (brightness < 35) could affect very dark fruit filling the frame (e.g. black grapes) | Low | Such photos become Uncertain | Use lighter background / more light | Check during grape testing |
| K9 | iPhone HEIC photos are rejected | Low | iPhone users must use the live camera or "Most Compatible" format | Message explains this | Optional: accept `image/heic` where Safari decodes it |
| K10 | Teachable Machine's own accuracy screen uses a split of training photos | Medium (honesty) | Overly optimistic numbers if quoted | Use the in-app evaluation with independent photos | Documented in AI_MODEL_GUIDE.md §5 |
| K11 | History CSV export and Settings controls (threshold slider, model location) not covered by automated tests | Low | Small regression risk | Manual check | Add browser tests later |
| K12 | Screen-reader (TalkBack) behaviour not tested | Low | Announcements unverified | — | Manual TalkBack check |
| K13 | Learning-centre facts written from general knowledge, not reviewed by a science teacher | Low | Wording may need adjusting for the syllabus | — | Ask a teacher to review `public/js/views/learn.js` |
| K14 | Starter model has **no Overripe class** (datasets only label fresh/rotten) | Medium | Ripe bananas with sugar spots may be called "Possible Signs of Spoilage" | Explain in the demo; guidance says the model can be wrong | Add own `Banana - Overripe` photos and retrain |
| K15 | Banana and Strawberry each showed 1 spoiled test photo as fresh → Experimental | Medium | These two fruits are less reliable | App shows an "Experimental" warning | More varied spoiled photos, retrain, re-test |
| K16 | "Other" class only contains jujube and pomegranate | Medium | Everyday objects (not fruit) may still get a confident fruit label | Train with own "Not a fruit" photos | Add non-fruit photos and retrain |
| K17 | Mango photos come from FruitVision, licensed CC BY-NC-ND 4.0 (non-commercial) | Low | Fine for a non-commercial school project; do not use the model commercially | — | Replace mango photos with own photos if ever used commercially |
| K18 | Dataset photos are mostly single fruits on plain white/grey backgrounds | Medium | Busy kitchen backgrounds may confuse the model | Photograph fruit on a plain sheet at the exhibition | Add own varied photos |
