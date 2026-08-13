import { splitAll } from './dist/index.js';
import './dist/lines.js';
import { scrollRevealAll } from './dist/scroll.js';

function prepareTokens(element) {
  let tokens = element.querySelectorAll('[data-split-line]');
  if (!tokens.length) {
    const letters = element.querySelectorAll('[data-split-letter]');
    tokens = letters.length
      ? element.querySelectorAll('[data-split-letter], [data-split-punctuation]')
      : element.querySelectorAll('[data-split-word], [data-split-punctuation]');
  }

  tokens.forEach((token, index) => {
    token.classList.add('reveal-token');
    token.style.setProperty('--reveal-index', index);
  });
}

document.addEventListener('a11y-text-split:lines-ready', (event) => {
  if (event.target.matches('[data-split-scroll]')) prepareTokens(event.target);
});

splitAll();

document.querySelectorAll('[data-split-scroll]').forEach(prepareTokens);

scrollRevealAll(undefined, {
  native: !document.body.hasAttribute('data-scroll-fallback'),
});
