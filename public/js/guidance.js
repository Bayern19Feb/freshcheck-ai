// Food-handling guidance shown with each result. Edit the wording here.
// Rules: never say "safe to eat", never say "guaranteed". The AI only looks
// at the outside of the fruit in one photo.

export const GUIDANCE = {
  fresh: {
    title: 'The outside looks fresh to the model',
    summary: 'The model\'s answer is based only on how the outside of the fruit looks in this photo.',
    steps: [
      'Wash the fruit with clean running water before eating or cutting it.',
      'Look at the whole fruit yourself — turn it around, because the photo shows only one side.',
      'Smell it and feel it. Do not eat it if it smells sour, feels slimy, or is leaking juice.',
    ],
    caution: 'Looking fresh does not prove a fruit is safe. Germs and some kinds of rot cannot be seen in a photo.',
  },
  overripe: {
    title: 'The fruit looks overripe',
    summary: 'Overripe means the fruit has ripened a lot — it is softer and sweeter, and may have brown spots. Overripe is not the same as spoiled.',
    steps: [
      'Ask an adult to check it. Many overripe fruits, like spotty bananas, are still used for cooking, smoothies or baking.',
      'Check for mould (fuzzy white, green, blue or black patches), a bad smell, or leaking juice. If you see any of these, do not eat it.',
      'Use overripe fruit soon instead of throwing it away — this helps reduce food waste.',
    ],
    caution: 'The model cannot tell whether an overripe fruit has started to spoil inside.',
  },
  spoiled: {
    title: 'The model sees possible signs of spoilage',
    summary: 'The photo has patterns that the model learned from fruit with visible spoilage, such as mould, large dark soft patches or wrinkled, leaking skin.',
    steps: [
      'Do not eat fruit that has mould, a lot of rotting, leaking juice, or a strange smell.',
      'Do not just cut away the bad part. In soft fruits like strawberries, grapes, papaya and ripe mango, mould and germs can spread inside where you cannot see them.',
      'Ask an adult. Spoiled fruit can often go into compost instead of the dustbin.',
    ],
    caution: 'The model could be wrong. A fruit with natural spots or marks may also be labelled this way.',
  },
  identified: {
    title: 'The AI knows this fruit, but cannot check its freshness yet',
    summary: 'The fruit recogniser named the fruit, but the freshness checker was never trained on photos of this fruit, so the app does not guess whether it is fresh.',
    steps: [
      'Use the tips below for this fruit: look, smell and gently feel it.',
      'If you are a child, ask an adult to help you decide.',
      'Do not eat fruit with mould, leaking juice or a strange smell.',
    ],
    caution: 'Naming a fruit is not the same as checking it. Always inspect fruit yourself.',
  },
  uncertain: {
    title: 'The AI is not sure',
    summary: 'The result is inconclusive, so the app is not making a guess.',
    steps: [
      'Inspect the fruit yourself: look, smell and gently feel it.',
      'If you are a child, ask an adult to help you decide.',
      'Try another photo: one fruit, in the middle of the frame, in good light, on a plain background.',
    ],
    caution: 'When in doubt, ask an adult. Do not eat fruit you are unsure about.',
  },
};

export const ALWAYS_NOTE = 'FreshCheck AI gives a visual estimate from one photo. It cannot see inside the fruit, detect germs or toxins, or tell you a fruit is safe to eat.';

// Visual features commonly associated with each category in training photos.
// The model is a whole-image classifier: it does NOT point at these features,
// it only gives one score per class for the whole photo.
export const FEATURES = {
  fresh: ['Even, bright colour typical for the fruit', 'Smooth, tight-looking skin', 'No fuzzy patches or large dark areas'],
  overripe: ['Darker or deeper colour than usual', 'Many brown or dark spots (for example banana "sugar spots")', 'Slightly wrinkled or soft-looking skin'],
  spoiled: ['Fuzzy patches that look like mould (white, green, blue or black)', 'Large dark, sunken or wet-looking areas', 'Shrivelled, split or leaking skin'],
  identified: ['Shape, colour and texture typical of this fruit'],
  uncertain: ['The photo did not match any category clearly enough'],
};
