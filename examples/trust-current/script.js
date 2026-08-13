import { splitAll } from '../../dist/index.js';

splitAll();

const trust = document.querySelector('.trust');
const sticky = document.querySelector('.trust__sticky');
const track = document.querySelector('.trust__track');
const cards = Array.from(document.querySelectorAll('.trust-card'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;

function setTrustProgress(value) {
  trust.style.setProperty('--trust-progress', value.toFixed(3));
}

function maxHorizontalTravel() {
  const stickyStyles = getComputedStyle(sticky);
  const paddingInline = parseFloat(stickyStyles.paddingLeft) + parseFloat(stickyStyles.paddingRight);
  const availableWidth = sticky.clientWidth - paddingInline;
  return Math.max(0, track.scrollWidth - availableWidth);
}

function renderScrollPosition() {
  frame = 0;

  if (reducedMotion.matches) {
    trust.dataset.motion = 'reduced';
    track.style.removeProperty('transform');
    setTrustProgress(1);
    return;
  }

  const bounds = trust.getBoundingClientRect();
  const distance = Math.max(1, trust.offsetHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -bounds.top / distance));
  trust.dataset.motion = 'native';
  track.style.transform = `translate3d(${-maxHorizontalTravel() * progress}px, 0, 0)`;
  setTrustProgress(progress);
}

function queueScrollRender() {
  if (!frame) frame = requestAnimationFrame(renderScrollPosition);
}

function updatePointer(event) {
  if (reducedMotion.matches) return;
  const bounds = sticky.getBoundingClientRect();
  trust.style.setProperty('--pointer-x', ((event.clientX - bounds.left) / bounds.width * 100).toFixed(2));
  trust.style.setProperty('--pointer-y', ((event.clientY - bounds.top) / bounds.height * 100).toFixed(2));
}

function tiltCard(card, event) {
  if (reducedMotion.matches) return;
  const bounds = card.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width;
  const y = (event.clientY - bounds.top) / bounds.height;

  card.style.setProperty('--glow-x', `${(x * 100).toFixed(2)}%`);
  card.style.setProperty('--glow-y', `${(y * 100).toFixed(2)}%`);
  card.style.setProperty('--tilt-x', `${((0.5 - y) * 12).toFixed(2)}deg`);
  card.style.setProperty('--tilt-y', `${((x - 0.5) * 14).toFixed(2)}deg`);
}

function resetCard(card) {
  card.style.setProperty('--tilt-x', '0deg');
  card.style.setProperty('--tilt-y', '0deg');
  card.style.setProperty('--glow-x', '50%');
  card.style.setProperty('--glow-y', '50%');
}

window.addEventListener('scroll', queueScrollRender, { passive: true });
window.addEventListener('resize', queueScrollRender);
sticky.addEventListener('pointermove', updatePointer, { passive: true });

cards.forEach((card) => {
  card.addEventListener('pointermove', (event) => tiltCard(card, event), { passive: true });
  card.addEventListener('pointerleave', () => resetCard(card));
});

reducedMotion.addEventListener('change', () => {
  cards.forEach(resetCard);
  queueScrollRender();
});

queueScrollRender();
