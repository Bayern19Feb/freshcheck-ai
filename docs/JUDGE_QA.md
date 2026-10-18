# Judge Questions and Answers — FreshCheck AI

Simple answers that match how the app actually works. Numbers below are from the v2 models' test on dataset photos (18 Oct 2026). Replace them if you retrain or test with your own photos.

1. **What is artificial intelligence?**
   Computer programs that learn to do tasks from examples instead of being told every rule. My app learned from labelled fruit photos.

2. **What is image classification?**
   Looking at a whole picture and choosing which group (class) it belongs to — for example "Banana - Fresh" or "Banana - Spoiled".

3. **How did you train the model?**
   With the Google Teachable Machine library I trained **two** models from 34,257 photos in public research datasets: a fruit recogniser for 51 fruits (plus "Not a fruit"), and a freshness checker for 16 fruits with up to 500 fresh and 500 spoiled photos each. 70% of the photos were for training, 10% to choose the confidence levels and 20% for the final test.

4. **What is transfer learning?**
   Starting from a network that has already learned from over a million everyday photos, and training only the last part on my fruit photos. That's why I didn't need millions of photos.

5. **What is a confidence score?**
   The model gives every class a score; they add up to 100%. The confidence is the score of the top class. It shows how strongly the model prefers that answer — it is **not** the chance that the fruit is safe.

6. **How do you know the model works?**
   I tested it on 2,691 freshness photos and 4,963 fruit photos it had **never seen during training**. When the app gave a freshness answer it was right 98% of the time, and it named the fruit correctly 95% of the time. But 13 spoiled fruits (about 1%) were called fresh, so banana and orange are still "Experimental". The test photos came from the same datasets, so real phone photos may be harder — that's why I also test with my own photos.

7. **What is a confusion matrix?**
   A table showing what each photo really was (rows) and what the app answered (columns). It shows which classes get mixed up.

8. **Can the app detect internal rot?**
   No. It only sees the outside of one side of the fruit.

9. **Can it identify harmful bacteria?**
   No. Bacteria are microscopic — far too small for a photo. That's why the app never says a fruit is safe.

10. **Why can a ripe banana have brown spots?**
    As bananas ripen, their skin ages and gets small brown "sugar spots". The inside gets sweeter. That's ripening, not spoiling.

11. **What is the difference between ripening and spoilage?**
    Ripening is the fruit's own chemical change (ethylene gas, starch to sugar). Spoilage is mostly microbes like mould and bacteria breaking the fruit down.

12. **What happens when the model is uncertain?**
    If the top score is below the threshold (90% for freshness, 70% for naming the fruit), or two classes are close, or the photo is too dark, or it looks like "Not a fruit", the app shows "Uncertain — Inspect Manually" and tells you to check the fruit yourself or ask an adult.

13. **How did you choose the threshold?**
    I tried thresholds from 50% to 95% on separate validation photos and picked 90% for freshness, because it gave no spoiled fruit marked fresh on those photos. For the fruit recogniser I picked 70%, the lowest level where it was right at least 95% of the time.

14. **What if I show it a shoe?**
    It might still give a score to a fruit class — classifiers only know the classes they were trained on. I added a "Not a fruit" class and a threshold to reduce this, but it can still make mistakes. That's a known limitation.

15. **How does the app protect privacy?**
    The AI runs inside the phone's browser, so photos are never uploaded. History is saved only on the phone as small thumbnails. No login, no name, no location, no ads.

16. **How does this help reduce food waste?**
    It helps people look carefully, tells them overripe fruit is usually still useful (smoothies, cooking), and teaches the difference between ripe and spoiled. We don't claim to measure food saved — a scan doesn't prove anything was eaten.

17. **Which fruits does it support?**
    It can name 51 fruits. It checks freshness for 16; five passed every test (apple, lime, mango, papaya, strawberry) and the rest are "Experimental". For the other 35 fruits it names the fruit and shows tips instead of guessing.

18. **Why did you start with only a few fruits?**
    Each fruit needs many varied photos for every condition, and testing. Doing a few fruits properly is better than many badly.

19. **What are the limitations?**
    Outside only; one side only; no germs or toxins; can be wrong in new lighting; natural spots can look like spoilage; only tested fruits are supported.

20. **Can the AI be biased?**
    Yes — if all my spoiled photos were on one dark plate, it might learn "dark plate = spoiled". I used the same mix of backgrounds and lighting for every class to reduce this.

21. **Why does it work without internet?**
    The app and the model are saved in the phone's browser after the first visit (using a service worker), and the AI runs on the phone.

22. **How much did it cost?**
    ₹0 for software — Teachable Machine, TensorFlow.js, GitHub Pages and the public datasets are free. Only the fruit cost money.

25. **Where did your training photos come from?**
    From free research datasets whose licences allow reuse with credit: Sultana et al. 2022 (6 fruits), a Papaya Freshness dataset, and FruitVision for mango (non-commercial use only). I credited them on my poster and in the app's Model information screen.

26. **Why can't it say "overripe"?**
    The datasets only labelled fruit as fresh or rotten, so the model never learned "overripe". A spotty ripe banana might be called spoiled — that's a known limitation I would fix by adding my own overripe photos.

23. **What would you improve next?**
    More fruits and photos, Marathi/Hindi language, a model that highlights the damaged area, and maybe a gas sensor to "smell" ripening.

24. **Did you write the code yourself?**
    *(Answer honestly — e.g. "I worked with an AI coding assistant to write the app; I collected and labelled the photos, trained and tested the model, and I can explain how each part works.")*

27. **Why only 16 fruits for freshness when it knows 51?**
    I could only find legal, free research photos of *rotten* fruit for 16 fruits. Copying random internet photos would break their licences, so for the other fruits the app is honest and says it cannot check freshness yet.

28. **What happens if the two AIs disagree?**
    The app says "Uncertain" and asks you to check the fruit yourself. It only gives a freshness answer when both agree on which fruit it is.
