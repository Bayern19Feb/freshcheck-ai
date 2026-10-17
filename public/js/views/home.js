// Welcome screen.

import { html, icon } from '../ui.js';
import { FRUITS } from '../fruits.js';
import { handoff } from '../state.js';
import { loadModel } from '../model.js';

export function render(main) {
  main.innerHTML = String(html`
    <section class="hero" aria-labelledby="home-title">
      <div class="hero-art" aria-hidden="true"><span>🍎</span><span>🥭</span><span>🍌</span></div>
      <div class="badge"><span class="dot"></span>AI that runs on your phone</div>
      <h1 id="home-title">FreshCheck <span>AI</span></h1>
      <p class="tagline">A Smarter Way to Check Fruit Freshness</p>
      <div class="actions">
        <a class="btn big lime" href="#/scan?start=camera" id="home-scan">${icon('camera')} Scan a Fruit</a>
        <button type="button" class="btn big glass" id="home-upload-btn">${icon('upload')} Upload a Photo</button>
        <input id="home-upload" class="visually-hidden" type="file" accept="image/*" tabindex="-1" aria-hidden="true">
      </div>
      <div class="links">
        <a href="#/learn/how-ai">${icon('cpu')} How It Works</a>
        <a href="#/learn/food-waste">${icon('leaf')} Learn About Food Waste</a>
      </div>
    </section>

    <div class="trust" style="margin-top:14px">
      <div>${icon('apple')}<strong>8 fruits</strong><span>Fresh or spoiled</span></div>
      <div>${icon('shield')}<strong>Private</strong><span>Photos stay on this phone</span></div>
      <div>${icon('download')}<strong>Offline</strong><span>Works without internet</span></div>
    </div>

    <p class="note" style="margin-top:14px">${icon('info')}<span><strong>An AI visual estimate, not a safety test.</strong> FreshCheck AI looks at the outside of a fruit in one photo. It cannot see inside the fruit or detect germs, so always check fruit yourself and ask an adult when unsure.</span></p>

    <div class="section-title"><h2>How it works</h2><a href="#/learn/how-ai">Learn more</a></div>
    <ol class="how">
      <li><strong>Snap</strong><span>Photograph one fruit in good light</span></li>
      <li><strong>Analyse</strong><span>The AI scores the photo on your phone</span></li>
      <li><strong>Decide</strong><span>Read the result and check the fruit yourself</span></li>
    </ol>

    <div class="section-title"><h2 id="explore-title">Explore</h2></div>
    <div class="grid-2" role="group" aria-labelledby="explore-title">
      <a class="tile" href="#/learn"><span class="icon-chip">${icon('book')}</span><strong>Learning centre</strong><span>Ripening, spoilage and how AI works</span></a>
      <a class="tile" href="#/quiz"><span class="icon-chip mango">${icon('star')}</span><strong>Quiz</strong><span>Test what you have learned</span></a>
      <a class="tile" href="#/dashboard"><span class="icon-chip sky">${icon('chart')}</span><strong>My dashboard</strong><span>Counts from your saved scans</span></a>
      <a class="tile" href="#/fruits"><span class="icon-chip berry">${icon('apple')}</span><strong>Supported fruits</strong><span>Which fruits the model can check</span></a>
    </div>

    <section class="card tint center" aria-label="Target fruits" style="margin-top:16px">
      <p class="eyebrow">Target fruits</p>
      <div class="fruit-strip" aria-hidden="true">${FRUITS.map((f) => html`<span title="${f.name}">${f.emoji}</span>`)}</div>
      <p class="small muted" style="margin:12px 0 0">A fruit is only "supported" after the model passes testing. <a href="#/fruits">See status</a></p>
    </section>
  `);

  main.querySelector('#home-scan').addEventListener('click', () => { loadModel(); });
  main.querySelector('#home-upload-btn').addEventListener('click', () => main.querySelector('#home-upload').click());
  main.querySelector('#home-upload').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handoff.file = file;
    location.hash = '#/scan';
  });
}
