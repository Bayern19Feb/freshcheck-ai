# FreshCheck AI — A Smarter Way to Check Fruit Freshness

*AI for Better Life · Reducing Food Waste Through Artificial Intelligence*

---

### Problem
Fruit spoils quickly, and much of it is wasted. People often can't tell whether a fruit is just **ripe** or actually **spoiling**.

### Aim
To build a phone app that uses artificial intelligence to give a **visual estimate** of fruit freshness, and to teach how ripening, spoilage and AI work.

### Materials and software used
- Android smartphone with Chrome
- 3,600 labelled photos of 8 fruits (fresh and spoiled) from public research datasets: Sultana et al. 2022 (CC BY 4.0), Papaya Freshness Dataset (CC BY 4.0), FruitVision (CC BY-NC-ND 4.0)
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
Tested on **720 dataset photos the model never saw** (confidence threshold 70%, chosen on separate validation photos):

| Fruit | Test photos | Correct when answered | Spoiled shown as fresh | Status |
|---|---|---|---|---|
| Apple | 80 | 96.2% | 0 | Supported |
| Banana | 80 | 98.8% | 1 | Experimental |
| Orange | 80 | 100% | 0 | Supported |
| Mango | 80 | 97.5% | 0 | Supported |
| Grapes | 80 | 98.8% | 0 | Supported |
| Strawberry | 80 | 98.8% | 1 | Experimental |
| Guava | 80 | 100% | 0 | Supported |
| Papaya | 80 | 100% | 0 | Supported |
| **All** | **720** | **98.6%** | **2** | |

Observations:
- The two mistakes were a banana with only a few dark patches and a strawberry that looked whole but was leaking juice — spoilage that is hard to see.
- Test photos came from the same datasets as the training photos, so real phone photos may score lower. *(Add your own phone-photo results here.)*

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
