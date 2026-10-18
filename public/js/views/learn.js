// Fruit freshness learning centre.

import { html, icon, raw } from '../ui.js';

const PIPELINE_SVG = raw(`
<svg class="diagram" viewBox="0 0 640 170" role="img" aria-labelledby="pipe-t pipe-d">
  <title id="pipe-t">How FreshCheck AI makes a prediction</title>
  <desc id="pipe-d">Photo, then resize to 224 by 224 pixels, then the neural network, then a score for each class, then the app shows the top class or Uncertain.</desc>
  <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#4a5850"/></marker></defs>
  <g font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" fill="#1d2721">
    <rect x="8" y="40" width="100" height="80" rx="14" fill="#e3f3e8" stroke="#238049"/>
    <text x="58" y="76" font-weight="700">1. Photo</text><text x="58" y="96">📷 🍌</text>
    <rect x="136" y="40" width="100" height="80" rx="14" fill="#e7eef7" stroke="#50606e"/>
    <text x="186" y="76" font-weight="700">2. Resize</text><text x="186" y="96">224 × 224 px</text>
    <rect x="264" y="40" width="112" height="80" rx="14" fill="#fff3d9" stroke="#f2a516"/>
    <text x="320" y="70" font-weight="700">3. Neural</text><text x="320" y="88" font-weight="700">network</text><text x="320" y="106">finds patterns</text>
    <rect x="404" y="40" width="100" height="80" rx="14" fill="#e7eef7" stroke="#50606e"/>
    <text x="454" y="70" font-weight="700">4. Scores</text><text x="454" y="90">Fresh 0.86</text><text x="454" y="106">Spoiled 0.09…</text>
    <rect x="532" y="40" width="100" height="80" rx="14" fill="#e3f3e8" stroke="#238049"/>
    <text x="582" y="70" font-weight="700">5. Answer</text><text x="582" y="90">top class</text><text x="582" y="106">or "Uncertain"</text>
    <g stroke="#4a5850" stroke-width="2" marker-end="url(#arr)">
      <line x1="110" y1="80" x2="132" y2="80"/><line x1="238" y1="80" x2="260" y2="80"/>
      <line x1="378" y1="80" x2="400" y2="80"/><line x1="506" y1="80" x2="528" y2="80"/>
    </g>
    <text x="320" y="152" font-size="12" fill="#4a5850">Example numbers only — real scores come from the model for each photo.</text>
  </g>
</svg>`);

const RIPEN_SVG = raw(`
<svg class="diagram" viewBox="0 0 640 140" role="img" aria-labelledby="rip-t rip-d">
  <title id="rip-t">Banana ripening stages</title>
  <desc id="rip-d">A banana changes from green, to yellow, to yellow with brown sugar spots, which are normal ripening. Mould, leaking and a bad smell are signs of spoilage.</desc>
  <g font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">
    <ellipse cx="80" cy="60" rx="56" ry="20" fill="#7cb342"/><text x="80" y="110">Unripe (green)</text>
    <ellipse cx="240" cy="60" rx="56" ry="20" fill="#fdd835"/><text x="240" y="110">Ripe (yellow)</text>
    <ellipse cx="400" cy="60" rx="56" ry="20" fill="#f9c74f"/>
    <circle cx="380" cy="55" r="4" fill="#6d4c41"/><circle cx="400" cy="66" r="3" fill="#6d4c41"/><circle cx="420" cy="54" r="4" fill="#6d4c41"/><circle cx="430" cy="64" r="3" fill="#6d4c41"/>
    <text x="400" y="110">Overripe (sugar spots)</text>
    <ellipse cx="560" cy="60" rx="56" ry="20" fill="#5d4037"/>
    <circle cx="545" cy="52" r="9" fill="#e0e0e0" opacity="0.9"/><circle cx="572" cy="62" r="7" fill="#9ccc65" opacity="0.9"/>
    <text x="560" y="110">Spoiled (mould, leaking)</text>
    <text x="240" y="132" fill="#1c6b3f" font-weight="700">← normal ripening →</text>
    <text x="560" y="132" fill="#c6383d" font-weight="700">spoilage</text>
  </g>
</svg>`);

const TOPICS = [
  {
    id: 'ripening', title: 'What is fruit ripening?',
    body: html`<p>Ripening is a natural change that happens inside a fruit. The fruit becomes <strong>softer, sweeter and more colourful</strong>, and it starts to smell nice.</p>
      <p>Many fruits, like bananas, mangoes, papayas and apples, release a gas called <strong>ethylene</strong>. Ethylene tells the fruit to ripen faster — that is why a ripe banana in a bag can make other fruit ripen quickly.</p>
      <p>Inside the fruit, starch turns into sugar, the green colour (chlorophyll) breaks down, and the walls of the cells become softer.</p>
      ${RIPEN_SVG}`,
  },
  {
    id: 'spoilage', title: 'What is fruit spoilage?',
    body: html`<p>Spoilage is when fruit becomes unpleasant or unsafe to eat. It is mostly caused by <strong>microbes</strong> — tiny living things such as <strong>moulds, yeasts and bacteria</strong> — that grow on the fruit and break it down.</p>
      <p>Signs of spoilage you can see or smell:</p>
      <ul class="steps"><li>Fuzzy patches of mould (white, green, blue or black)</li><li>Large soft, dark, wet or sunken areas</li><li>Leaking juice or a slimy surface</li><li>A sour, alcoholic or rotten smell</li></ul>
      <p>Bruises, warmth and moisture help microbes grow faster.</p>`,
  },
  {
    id: 'ripe-vs-spoiled', title: 'Ripening vs spoilage',
    body: html`<div class="table-wrap"><table><thead><tr><th scope="col"></th><th scope="col">Ripening</th><th scope="col">Spoilage</th></tr></thead><tbody>
      <tr><th scope="row">Caused by</th><td>The fruit itself (natural chemical changes, ethylene)</td><td>Mostly microbes: mould, yeast, bacteria</td></tr>
      <tr><th scope="row">Looks like</th><td>Colour change, small brown "sugar spots" on bananas</td><td>Mould, big rotten patches, leaking</td></tr>
      <tr><th scope="row">Smells</th><td>Sweet and fruity</td><td>Sour, rotten or strange</td></tr>
      <tr><th scope="row">Usually</th><td>Fine to eat — overripe fruit is great for smoothies and cooking</td><td>Should not be eaten</td></tr></tbody></table></div>
      <p class="small muted" style="margin-top:8px">These are general rules. When unsure, ask an adult.</p>`,
  },
  {
    id: 'brown-spots', title: 'Why do fruits get brown spots?',
    body: html`<ul class="steps">
      <li><strong>Ripening:</strong> ripe bananas get small brown "sugar spots" as their skin ages. This is normal.</li>
      <li><strong>Bruising:</strong> when fruit is bumped, cells break. An enzyme called <em>polyphenol oxidase</em> reacts with oxygen and makes brown colours — the same thing that happens when a cut apple turns brown.</li>
      <li><strong>Cold damage:</strong> bananas and mangoes kept too cold can get dark skin.</li>
      <li><strong>Spoilage:</strong> rot caused by microbes often makes spots that grow, become soft and wet, and may have mould.</li>
    </ul>
    <p>Because natural spots and rot can look alike in a photo, an AI can confuse them. This is one reason FreshCheck AI may be wrong.</p>`,
  },
  {
    id: 'food-waste', title: 'Food waste and the environment',
    body: html`<p>A large amount of the food produced in the world is lost or thrown away. Fruit is one of the foods wasted most, because it spoils quickly.</p>
      <p>When food is wasted, the <strong>water, land, fertiliser, fuel and work</strong> used to grow and transport it are wasted too. Food rotting in landfill also produces <strong>methane</strong>, a gas that warms the planet.</p>
      <p><strong>What you can do:</strong></p>
      <ul class="steps"><li>Buy only the fruit you will use.</li><li>Store fruit properly and eat the ripest first.</li><li>Use overripe fruit in smoothies, milkshakes, halwa or cakes.</li><li>Compost fruit that has spoiled instead of putting it in the dustbin.</li></ul>`,
  },
  {
    id: 'how-ai', title: 'How does AI image classification work?',
    body: html`<p><strong>Artificial intelligence (AI)</strong> means computer programs that can learn from examples. FreshCheck AI uses a kind of AI called an <strong>image classifier</strong>: it looks at a photo and chooses which group, or <em>class</em>, the photo belongs to — for example "Banana - Fresh" or "Banana - Spoiled".</p>
      ${PIPELINE_SVG}
      <ol class="steps">
        <li><strong>Training:</strong> we showed the computer many labelled photos of each class. It adjusted millions of numbers inside a <em>neural network</em> until it could tell the classes apart.</li>
        <li><strong>Transfer learning:</strong> Teachable Machine starts from a network called <em>MobileNet</em> that already learned shapes, colours and textures from over a million everyday photos. Only the last part is trained on our fruit photos, so we need far fewer photos.</li>
        <li><strong>Prediction:</strong> a new photo is shrunk to 224 × 224 pixels and passed through the network. It produces a <strong>score for every class</strong>, and the scores add up to 100%.</li>
        <li><strong>Decision:</strong> the app shows the class with the highest score — but only if that score is above a <em>threshold</em>. Otherwise it says "Uncertain".</li>
      </ol>
      <p>All of this happens <strong>on the phone</strong>, using TensorFlow.js. The photo is never sent to the internet.</p>`,
  },
  {
    id: 'two-ais', title: 'Two AIs working together',
    body: html`<p>FreshCheck AI uses <strong>two</strong> image classifiers, like asking two experts:</p>
      <ol class="steps">
        <li><strong>The fruit recogniser</strong> answers "Which fruit is this?" It was trained on photos of about 50 kinds of fruit, plus vegetables and nuts as "Not a fruit".</li>
        <li><strong>The freshness checker</strong> answers "Does it look fresh or spoiled?" It only knows fruits for which scientists have shared photos of both fresh and rotten fruit.</li>
      </ol>
      <p>The app only shows a freshness answer when <strong>both experts agree</strong> on the fruit. If they disagree, it says <em>Uncertain</em>. If the fruit is one the freshness checker never learned (like kiwi), the app names the fruit and shows tips for checking it yourself — it does not guess.</p>`,
  },
  {
    id: 'ai-mistakes', title: 'Why can AI make mistakes?',
    body: html`<ul class="steps">
      <li><strong>It only knows its training photos.</strong> A fruit variety, background or light it has never seen can confuse it.</li>
      <li><strong>It sees only one side.</strong> The bad part might be on the back.</li>
      <li><strong>It can be confidently wrong.</strong> A high confidence score means the model strongly prefers one class — not that it is right. Even a photo of a shoe might get a high score for some fruit class.</li>
      <li><strong>Spots can look similar.</strong> Natural ripening spots, bruises and rot can look alike.</li>
      <li><strong>Bias in data:</strong> if most "spoiled" training photos were taken on a dark table, the model might learn "dark table = spoiled". This is why varied photos matter.</li>
    </ul>`,
  },
  {
    id: 'safety', title: 'Why a photo cannot prove food is safe',
    body: html`<p>Germs like bacteria are <strong>microscopic</strong> — far too small to see in a photo. Some moulds grow <strong>inside</strong> soft fruit before they show on the skin, and some harmful substances have no colour at all.</p>
      <p>So FreshCheck AI can only say how the outside of a fruit <em>looks</em>. It never says a fruit is "safe". Always look, smell and feel the fruit yourself, wash it, and ask an adult when you are unsure.</p>`,
  },
];

const EMOJI = { 'two-ais': '🤝', ripening: '🍌', spoilage: '🦠', 'ripe-vs-spoiled': '⚖️', 'brown-spots': '🟤', 'food-waste': '🌍', 'how-ai': '🧠', 'ai-mistakes': '🤔', safety: '🛡️' };

export function render(main, params) {
  const active = params[0];
  main.innerHTML = String(html`
    <div class="stack">
      <div class="page-head"><p class="eyebrow">Learn</p><h1>Learning centre</h1>
        <p>Ripening, spoilage, food waste and how the AI works.</p></div>
      ${TOPICS.map((t) => html`
        <details id="topic-${t.id}" ${t.id === active ? 'open' : ''}>
          <summary><span class="topic-emoji" aria-hidden="true">${EMOJI[t.id] || '📘'}</span>${t.title}</summary>
          <div class="stack">${t.body}</div>
        </details>`)}
      <a class="btn big block" href="#/quiz">${icon('star')} Take the quiz</a>
    </div>`);
  if (active) main.querySelector(`#topic-${active}`)?.scrollIntoView({ block: 'start' });
}
