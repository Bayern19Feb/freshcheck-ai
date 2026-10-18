# Exhibition Guide — FreshCheck AI

A guide for the student presenting the project.

## Problem statement
A lot of fruit is thrown away at home because people are not sure if it is still good — and sometimes spoiled fruit is eaten by mistake. Many people, especially children, don't know the difference between a fruit that is simply **ripe** and one that is **spoiling**.

## Project objectives
1. Build a phone app that uses AI to give a **visual estimate** of fruit freshness from a photo.
2. Teach the difference between ripening and spoilage.
3. Show how AI image classification works — and where it fails.
4. Encourage people to use ripe fruit instead of wasting it.

## Scientific principles
- **Ripening:** the fruit's own chemical changes. Starch → sugar, chlorophyll breaks down (green → yellow), cell walls soften. Many fruits release **ethylene** gas, which speeds up ripening.
- **Spoilage:** mostly caused by **microbes** (moulds, yeasts, bacteria) that grow on the fruit and break it down; helped by bruises, warmth and moisture.
- **Browning:** when cells are damaged, the enzyme *polyphenol oxidase* reacts with oxygen and makes brown pigments.
- **Computer vision:** a photo is a grid of numbers (pixel colours). A **neural network** learns which patterns of numbers match each class.

## How AI is used
- **Model:** an image classifier trained in **Google Teachable Machine** with **transfer learning** from MobileNet.
- **Classes:** e.g. *Banana - Fresh*, *Banana - Overripe*, *Banana - Spoiled*, *Apple - Fresh*, *Apple - Spoiled*, *Not a fruit*.
- **On the phone:** TensorFlow.js runs the model inside the browser. The photo never leaves the phone.
- **Output:** a score for every class (they add up to 100%). The app shows the top class only if its score is above a **threshold**; otherwise it says **Uncertain — Inspect Manually**.

## How the model was trained
**Version 2 (18 Oct 2026):** two models — a fruit recogniser (51 fruits) and a freshness checker (16 fruits, up to 500 fresh + 500 spoiled photos each) from 34,257 licensed photos; whole app 98.0% correct when answered on 2,691 unseen dataset photos, recogniser 95.3%. Details: MODEL_EVALUATION.md.

**Earlier starter model (17 Oct 2026, replaced):**
- Fruits and classes: Apple, Banana, Orange, Mango, Grapes, Strawberry, Guava, Papaya — each *Fresh* and *Spoiled* — plus *Other* (17 classes).
- Training photos: 140 per class (280 for Other), plus mirrored copies.
- Where the photos came from: public research datasets — Sultana et al. 2022 (CC BY 4.0), Papaya Freshness Classification Dataset (CC BY 4.0), FruitVision (CC BY-NC-ND 4.0, mango).
- Confidence level chosen on 20 validation photos per class → 70%.
- Final test: 40 photos per class never used in training → correct when answered 98.6% (see MODEL_EVALUATION.md).
- *If you retrain with your own photos, update this section.*

## Application workflow
1. Open FreshCheck AI → **Scan a Fruit**.
2. Put one fruit in the dashed square → **Capture** (or upload a photo).
3. **Analyse photo** → the model runs on the phone.
4. See: result, detected fruit, model confidence, why it may be uncertain, advice.
5. The scan is saved in **History**; the **Dashboard** counts real scans.
6. **Learn** and **Quiz** teach the science.

## Advantages
- Free: built only with free tools (₹0 software cost).
- Private: photos stay on the phone; no account.
- Works offline after the first visit.
- Honest: shows "Uncertain" instead of guessing; explains its limits.
- Educational: learning centre and quiz.

## Limitations (say these confidently — judges like honesty)
- It sees only the **outside** of one side of the fruit.
- It **cannot** detect germs, toxins or internal rot, so it never says a fruit is safe.
- It can be wrong with new lighting, backgrounds or fruit varieties.
- Natural spots (like banana sugar spots) can look like spoilage.
- It only supports fruits we trained **and tested**.

## Future improvements
- More fruits and more varied photos.
- Marathi and Hindi language options.
- A model that points to the damaged area (object detection).
- Combining with other sensors (smell/gas sensor, firmness) for better accuracy.

## Demonstration procedure
**Before the exhibition:**
- Open the app on the phone with internet once (so it works offline), install it to the Home screen.
- Charge the phone; carry a power bank.
- Bring: 1 fresh banana, 1 overripe (spotted) banana, 1 apple, and if possible 1 spoiled fruit in a **closed clear box**; a plain white sheet as background.
- Clear History (More → Delete all scan history) so the dashboard starts at zero.

**At the table:** follow `DEMO_SCRIPT.md`. If the AI says "Uncertain", that is a good moment to explain thresholds — it's a feature, not a failure.

**Backup:** if the camera fails, use *Upload* with photos already on the phone; if everything fails, show the Learning centre, the Test-the-model results and the poster.
