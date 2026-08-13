import { A11yTextSplit, splitAll } from '../../dist/index.js';

const phrases = {
  curious: {
    text: 'Curious minds leave windows open for thunder.',
    status: 'Curious mood selected. Curious minds leave windows open for thunder.',
  },
  electric: {
    text: 'Neon thoughts sprint through the midnight grid.',
    status: 'Electric mood selected. Neon thoughts sprint through the midnight grid.',
  },
  quiet: {
    text: 'Soft focus turns the room into a low tide.',
    status: 'Quiet mood selected. Soft focus turns the room into a low tide.',
  },
  wild: {
    text: 'Bright plans kick sparks across the kitchen table.',
    status: 'Wild mood selected. Bright plans kick sparks across the kitchen table.',
  },
};

splitAll();

const mixer = document.querySelector('.mixer');
const title = document.querySelector('.mixer__text');
const status = document.querySelector('.mixer__status');
const buttons = Array.from(document.querySelectorAll('[data-mood-option]'));

function splitPhrase(mood) {
  const phrase = phrases[mood] || phrases.curious;

  A11yTextSplit.get(title)?.destroy();
  title.textContent = phrase.text;
  new A11yTextSplit(title, { type: 'words' });

  mixer.dataset.mood = mood;
  status.textContent = phrase.status;
  buttons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.moodOption === mood));
  });
}

buttons.forEach((button) => {
  button.addEventListener('click', () => splitPhrase(button.dataset.moodOption));
});
