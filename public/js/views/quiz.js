// Quiz screen with immediate feedback and a final score.

import { html, icon, announce } from '../ui.js';
import { createQuiz } from '../quiz.js';
import { getPref, setPref } from '../prefs.js';

export function render(main) {
  const quiz = createQuiz();
  let index = 0;

  function drawQuestion() {
    const q = quiz.questions[index];
    const answered = quiz.answers[index];
    main.innerHTML = String(html`
      <div class="stack">
        <div class="page-head"><p class="eyebrow">Quiz</p><h1>Fruit &amp; AI quiz</h1></div>
        <div class="row" style="justify-content:space-between"><p class="progress-text" data-testid="quiz-progress">Question ${index + 1} of ${quiz.questions.length} · Score ${quiz.score()}</p></div>
        <div class="quiz-progress" aria-hidden="true"><span style="width:${((index + (answered !== null ? 1 : 0)) / quiz.questions.length) * 100}%"></span></div>
        <section class="card" aria-labelledby="q-text">
          <h2 id="q-text">${q.q}</h2>
          <div role="group" aria-labelledby="q-text">
            ${q.options.map((o, i) => {
              let cls = '';
              if (answered !== null) cls = i === q.answer ? 'correct' : i === answered ? 'wrong' : '';
              return html`<button class="quiz-option ${cls}" data-i="${i}" ${answered !== null ? 'disabled' : ''}><span class="letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span>${o}${
                answered !== null && i === q.answer ? ' ✓ (correct answer)' : answered === i ? ' ✗ (your answer)' : ''}</span></button>`;
            })}
          </div>
          <div id="feedback" aria-live="polite">${answered !== null ? html`
            <p class="note ${answered === q.answer ? 'good' : 'warn'}" style="margin-top:12px">${icon(answered === q.answer ? 'check' : 'info')}<span><strong>${answered === q.answer ? 'Correct!' : 'Not quite.'}</strong> ${q.explain}</span></p>` : ''}</div>
        </section>
        ${answered !== null ? html`<button class="btn big block" id="next">${index + 1 < quiz.questions.length ? 'Next question' : 'See my score'}</button>` : ''}
      </div>`);
    main.querySelectorAll('.quiz-option').forEach((b) => b.addEventListener('click', () => {
      const ok = quiz.answer(index, Number(b.dataset.i));
      announce(ok ? 'Correct!' : 'Not quite.');
      drawQuestion();
      main.querySelector('#next')?.focus();
    }));
    main.querySelector('#next')?.addEventListener('click', () => {
      if (index + 1 < quiz.questions.length) { index += 1; drawQuestion(); } else drawScore();
    });
  }

  function drawScore() {
    const score = quiz.score();
    const total = quiz.questions.length;
    const best = Math.max(score, getPref('quizBest', 0));
    setPref('quizBest', best);
    const msg = score === total ? 'Perfect score! You are a freshness expert.'
      : score >= total * 0.6 ? 'Great job! Read the Learning centre to learn even more.'
      : 'Good try! Read the Learning centre and try again.';
    main.innerHTML = String(html`
      <div class="stack">
        <section class="score-hero">
          <h1>Your score</h1>
          <p class="big-score" data-testid="quiz-score">${score} / ${total}</p>
          <p>${msg}</p>
          <p class="small" style="margin:0;opacity:.75">Best score on this device: ${best} / ${total}</p>
        </section>
        <div class="grid-2"><button class="btn" id="again">${icon('retry')} Try again</button><a class="btn secondary" href="#/learn">${icon('book')} Learn more</a></div>
      </div>`);
    announce(`Quiz finished. You scored ${score} out of ${total}.`);
    main.querySelector('#again').addEventListener('click', () => render(main));
  }

  drawQuestion();
}
