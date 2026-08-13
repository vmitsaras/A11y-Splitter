import { splitAll } from '../dist/index.js';

splitAll();

const status = document.querySelector('.spotlight__status');
const words = document.querySelectorAll('[data-split-word]');

function activateWord(word) {
  words.forEach((candidate) => candidate.classList.toggle('is-active', candidate === word));
  status.textContent = word ? `Spotlight: ${word.textContent}` : 'Explore the sentence';
}

words.forEach((word) => {
  word.addEventListener('pointerenter', () => activateWord(word));
});

document.querySelector('.spotlight__text').addEventListener('pointerleave', () => activateWord(null));
