import { A11yTextSplit, splitAll } from '../dist/index.js';
import '../dist/lines.js';

splitAll();

const title = document.querySelector('.hero__title');
const titleVisual = title.querySelector('[data-split-visual]');
const tokens = Array.from(titleVisual.children);
let wordGroup = null;

for (const token of tokens) {
  if (token.matches('[data-split-space]')) {
    wordGroup = null;
    continue;
  }

  if (token.matches('[data-split-word]') || !wordGroup) {
    wordGroup = document.createElement('span');
    wordGroup.className = 'hero__word';
    token.before(wordGroup);
  }

  wordGroup.append(token);
}

document.querySelectorAll('.hero__word').forEach((word) => {
  new A11yTextSplit(word, {
    type: 'letters',
    mode: 'semantic',
    splitNestedText: true,
  });
});

title.querySelectorAll('[data-split-letter]').forEach((letter, index) => {
  letter.style.setProperty('--title-letter-index', index);
});
