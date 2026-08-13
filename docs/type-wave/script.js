import { splitAll } from '../dist/index.js';

splitAll();

const wave = document.querySelector('.wave');
const button = document.querySelector('.wave__button');
const letters = Array.from(wave.querySelectorAll('[data-split-letter]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
let frame = 0;
let previousTime = 0;
let animationTime = 0;

function renderWave(time) {
  if (previousTime) animationTime += Math.min(time - previousTime, 64);
  previousTime = time;

  letters.forEach((letter, index) => {
    const phase = animationTime * 0.0042 - index * 0.52;
    const primary = Math.sin(phase);
    const elastic = Math.sin(phase * 2 + 0.45) * 0.18;

    letter.style.setProperty('--wave-y', (primary * 0.22 + elastic * 0.08).toFixed(4));
    letter.style.setProperty('--wave-rotation', (Math.cos(phase) * -3.4).toFixed(3));
    letter.style.setProperty('--wave-scale', (1 - primary * 0.035).toFixed(4));
  });

  frame = paused || reducedMotion.matches ? 0 : requestAnimationFrame(renderWave);
}

function playWave() {
  if (!frame && !paused && !reducedMotion.matches) {
    previousTime = 0;
    frame = requestAnimationFrame(renderWave);
  }
}

function handleMotionPreference() {
  if (reducedMotion.matches) {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    letters.forEach((letter) => {
      letter.style.removeProperty('--wave-y');
      letter.style.removeProperty('--wave-rotation');
      letter.style.removeProperty('--wave-scale');
    });
    return;
  }

  playWave();
}

handleMotionPreference();

button.addEventListener('click', () => {
  paused = !paused;
  wave.classList.toggle('is-paused', paused);
  button.textContent = paused ? 'Play wave' : 'Pause wave';
  playWave();
});

reducedMotion.addEventListener('change', handleMotionPreference);
