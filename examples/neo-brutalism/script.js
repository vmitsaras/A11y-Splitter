import { A11yTextSplit, splitAll } from '../../dist/index.js';

const tones = {
  acid: {
    title: 'Split hard. Read easy.',
    deck: 'Every block can shout while the original sentence stays intact.',
  },
  ink: {
    title: 'Black ink. Bright markup.',
    deck: 'Decorative letters hit the page without hiding the real heading.',
  },
  paper: {
    title: 'Paper cuts. Soft landing.',
    deck: 'Semantic words keep the supporting line editable, readable, and direct.',
  },
  alarm: {
    title: 'Urgent type. Steady access.',
    deck: 'Motion restages the poster while assistive tech receives one clean source.',
  },
};

splitAll();

const brutal = document.querySelector('.brutal');
const title = document.querySelector('.brutal__title');
const deck = document.querySelector('.brutal__deck');
const status = document.querySelector('.brutal__status');
const buttons = Array.from(document.querySelectorAll('[data-tone-option]'));

function groupTitleWords() {
  const visual = title.querySelector('[data-split-visual]');
  if (!visual) return;

  const tokens = Array.from(visual.children);
  let wordGroup = null;

  for (const token of tokens) {
    if (token.matches('[data-split-space]')) {
      wordGroup = null;
      continue;
    }

    if (!wordGroup) {
      wordGroup = document.createElement('span');
      wordGroup.className = 'brutal__word';
      token.before(wordGroup);
    }

    wordGroup.append(token);
  }
}

function resplit(element, text, options) {
  A11yTextSplit.get(element)?.destroy();
  element.textContent = text;
  new A11yTextSplit(element, options);
}

function setTone(tone) {
  const next = tones[tone] || tones.acid;

  brutal.dataset.tone = tone;
  resplit(title, next.title, { type: 'letters', mode: 'visual' });
  groupTitleWords();
  resplit(deck, next.deck, { type: 'words' });
  status.textContent = `${tone} tone selected. ${next.title}`;

  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.toneOption === tone));
  });
}

buttons.forEach((button) => {
  button.addEventListener('click', () => setTone(button.dataset.toneOption));
});

groupTitleWords();
