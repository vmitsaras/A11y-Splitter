import { splitAll } from '../dist/index.js';
import { scrollRevealAll } from '../dist/scroll.js';

splitAll();

const slider = document.querySelector('.loom__slider');
const output = document.querySelector('.loom__output');
const status = document.querySelector('.loom__status');
const words = Array.from(document.querySelectorAll('.loom__text [data-split-word]'));
const scrollTokens = Array.from(document.querySelectorAll(
  '.loom-scroll__text [data-split-word], .loom-scroll__text [data-split-punctuation]',
));

slider.max = String(Math.max(words.length - 1, 0));
scrollTokens.forEach((token, index) => {
  token.classList.add('loom-scroll__token');
  token.style.setProperty('--scroll-thread-index', index);
});

function updateFocus(index) {
  const activeIndex = Math.min(words.length - 1, Math.max(0, index));
  const activeWord = words[activeIndex];

  words.forEach((word, wordIndex) => {
    const distance = Math.abs(wordIndex - activeIndex);

    word.classList.toggle('is-active', wordIndex === activeIndex);
    word.style.setProperty('--focus-distance', distance);
    word.style.setProperty('--focus-strength', Math.max(0, 1 - distance / 4).toFixed(4));
  });

  if (activeWord) {
    output.textContent = activeWord.textContent;
    status.textContent = `Focused word: ${activeWord.textContent}`;
  }
}

slider.addEventListener('input', () => updateFocus(Number(slider.value)));
updateFocus(Number(slider.value));
scrollRevealAll('.loom-scroll', { rootMargin: '0px', threshold: 0.05 });
