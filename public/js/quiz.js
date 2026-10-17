// Quiz questions and a small scoring engine (no network needed).

export const QUESTIONS = [
  {
    q: 'A banana has turned yellow with a few small brown spots. What is most likely happening?',
    options: ['It is ripening normally', 'It is definitely rotten', 'It has been painted', 'It is unripe'],
    answer: 0,
    explain: 'Brown "sugar spots" are a normal part of banana ripening. The fruit is getting sweeter and softer.',
  },
  {
    q: 'Which of these is a sign that a fruit may be spoiled?',
    options: ['Shiny skin', 'Fuzzy mould and a sour smell', 'A bright colour', 'A firm feel'],
    answer: 1,
    explain: 'Mould (fuzzy patches), sour or strange smells, sliminess and leaking juice are signs of spoilage.',
  },
  {
    q: 'What is the difference between ripening and spoiling?',
    options: [
      'There is no difference',
      'Ripening is the fruit\'s own natural change; spoiling is mostly caused by microbes like mould and bacteria',
      'Spoiling only happens in the fridge',
      'Ripening only happens to apples',
    ],
    answer: 1,
    explain: 'Ripening is controlled by the fruit itself (for example by a gas called ethylene). Spoilage is mostly caused by microbes breaking the fruit down.',
  },
  {
    q: 'How does FreshCheck AI decide what to show?',
    options: [
      'It searches the internet for your photo',
      'It asks a person to look at the photo',
      'A model trained on example photos compares patterns in your photo with what it learned',
      'It picks an answer at random',
    ],
    answer: 2,
    explain: 'The model learned patterns (colours, textures, shapes) from labelled training photos and uses them to score new photos.',
  },
  {
    q: 'The app shows "92% model confidence". What does that mean?',
    options: [
      'The fruit is 92% safe to eat',
      'The fruit is 92% fresh',
      'The model gave its top answer a score of 0.92 — it does NOT prove the answer is right',
      '92% of the fruit is good',
    ],
    answer: 2,
    explain: 'Confidence is the model\'s own score for its answer. Models can be confidently wrong, so it is not a safety percentage.',
  },
  {
    q: 'Why can the AI make mistakes?',
    options: [
      'Because photos can have bad lighting, unusual backgrounds or fruit it never saw in training',
      'AI never makes mistakes',
      'Because the phone is too new',
      'Because fruit changes colour at night',
    ],
    answer: 0,
    explain: 'A model only knows what its training photos taught it. New lighting, backgrounds or fruit varieties can confuse it.',
  },
  {
    q: 'Can a photo show whether a fruit has harmful bacteria?',
    options: ['Yes, always', 'Only if the photo is sharp', 'No — bacteria are far too small to see in a photo', 'Only for apples'],
    answer: 2,
    explain: 'Bacteria are microscopic. A photo can only show the outside appearance, so it can never prove a fruit is safe.',
  },
  {
    q: 'What is a good way to reduce fruit waste at home?',
    options: [
      'Throw away fruit at the first brown spot',
      'Buy much more fruit than you need',
      'Use overripe fruit in smoothies or cooking, and compost spoiled fruit',
      'Keep fruit in a closed, wet bag',
    ],
    answer: 2,
    explain: 'Using ripe fruit quickly, buying only what you need and composting spoiled fruit all help reduce food waste.',
  },
];

export function createQuiz(questions = QUESTIONS) {
  const answers = new Array(questions.length).fill(null);
  return {
    questions,
    answers,
    answer(index, choice) {
      if (index < 0 || index >= questions.length) throw new RangeError('No such question');
      if (answers[index] !== null) return answers[index] === questions[index].answer; // answers are final
      answers[index] = choice;
      return choice === questions[index].answer;
    },
    score() {
      return answers.reduce((n, a, i) => n + (a === questions[i].answer ? 1 : 0), 0);
    },
    answeredCount() {
      return answers.filter((a) => a !== null).length;
    },
    isFinished() {
      return answers.every((a) => a !== null);
    },
  };
}
