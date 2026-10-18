# FreshCheck AI — A Smarter Way to Check Fruit Freshness

*AI for Better Life · Reducing Food Waste Through Artificial Intelligence*

---

### Problem
Fruit spoils quickly, and much of it is wasted. People often can't tell whether a fruit is just **ripe** or actually **spoiling**.

### Aim
To build a phone app that uses artificial intelligence to give a **visual estimate** of fruit freshness, and to teach how ripening, spoilage and AI work.

### Materials and software used
- Android smartphone with Chrome
- 34,257 labelled photos from six public research datasets (Sultana et al. 2022, FruitNet, Papaya Freshness, FruQ, FruitVision, Fruits-360) — 51 fruits to recognise, 16 fruits with up to 500 fresh + 500 spoiled photos each
- Real fruits for testing and the live demo
- Google Teachable Machine (free) — to train the AI
- TensorFlow.js (free, open-source) — to run the AI on the phone
- HTML, CSS, JavaScript — to build the app
- GitHub Pages (free) — to put the app online
- **Software cost: ₹0**

### Scientific principle
- **Ripening** = the fruit's own changes (ethylene gas, starch → sugar, softening, colour change).
- **Spoilage** = mostly microbes (mould, yeast, bacteria) breaking the fruit down.
- **Image classification** = a neural network learns colour, texture and shape patterns from labelled example photos, then scores new photos.

### AI workflow
📷 Photo → ✂️ centre square, 224 × 224 pixels → 🧠 neural network (MobileNet + our training) → 📊 score for each class → ✅ top class **or** ❔ "Uncertain"

### Results and observations
Two AIs: a **fruit recogniser** (51 fruits) and a **freshness checker** (16 fruits). Tested on photos they never saw during training (thresholds chosen on separate validation photos):

| Test | Photos | Result |
|---|---|---|
| Whole app, freshness (16 fruits) | 2,691 | **98.0% correct when it answered**; 93% answered, 7% "Uncertain" |
| Spoiled fruit shown as fresh | ~1,350 spoiled | 13 (about 1%) — most were bananas and oranges |
| Fruit recogniser (51 fruits + not a fruit) | 4,963 | **95.3%** named correctly (94.3% on real photos) |

Supported freshness fruits (passed all rules): Apple, Lime, Mango, Papaya, Strawberry. Others are marked Experimental.

Observations:
- Spoiled bananas with only a few dark patches are the hardest — ripe and rotten bananas look alike.
- Test photos come from the same datasets as the training photos, so real phone photos may score lower. *(Add your own phone-photo results here.)*

### Benefits
- Helps people look carefully at fruit and use ripe fruit instead of throwing it away
- Teaches the difference between ripe and spoiled
- Private (photos stay on the phone), free, works offline

### Limitations
- Sees only the outside of one side of the fruit
- Cannot detect germs, toxins or rot inside — **never proves food is safe**
- Can be wrong in new lighting or with unfamiliar fruit
- Only fruits that passed our tests are marked "Supported"

### Conclusion
*(Write after testing.)* AI can help us notice visible signs of freshness and spoilage, but it is a helper, not a judge: people must still look, smell and ask an adult.
