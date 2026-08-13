import { splitAll } from '../dist/index.js';

splitAll();

const orbit = document.querySelector('.orbit');
const tokens = Array.from(orbit.querySelectorAll('[data-split-word], [data-split-punctuation]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pointer = {
  currentX: 0.5,
  currentY: 0.5,
  targetX: 0.5,
  targetY: 0.5,
  frame: 0,
  previousTime: 0,
};

function renderOrbit() {
  orbit.style.setProperty('--field-x', `${pointer.currentX * 100}%`);
  orbit.style.setProperty('--field-y', `${pointer.currentY * 100}%`);

  tokens.forEach((token, index) => {
    const count = Math.max(tokens.length, 1);
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + (pointer.currentX - 0.5) * 0.9;
    const pulse = Math.sin(angle * 2 + pointer.currentY * Math.PI) * 0.12;
    const layer = index % 3;

    token.style.setProperty('--orbit-x', (Math.cos(angle) * (0.78 + layer * 0.1 + pulse)).toFixed(4));
    token.style.setProperty('--orbit-y', (Math.sin(angle) * (0.7 + layer * 0.08 - pulse)).toFixed(4));
    token.style.setProperty('--orbit-rotation', `${(Math.sin(angle) * 11).toFixed(3)}deg`);
    token.style.setProperty('--orbit-scale', (0.86 + pointer.currentY * 0.18 + layer * 0.035).toFixed(4));
    token.style.setProperty('--orbit-hue', `${Math.round(166 + index * 24 + pointer.currentX * 54)}`);
  });
}

function animateOrbit(time) {
  const elapsed = Math.min(time - (pointer.previousTime || time), 64);
  const easing = 1 - Math.exp(-elapsed * 0.01);

  pointer.currentX += (pointer.targetX - pointer.currentX) * easing;
  pointer.currentY += (pointer.targetY - pointer.currentY) * easing;
  pointer.previousTime = time;
  renderOrbit();

  const distance = Math.hypot(
    pointer.targetX - pointer.currentX,
    pointer.targetY - pointer.currentY,
  );

  if (distance > 0.0005) {
    pointer.frame = requestAnimationFrame(animateOrbit);
  } else {
    pointer.currentX = pointer.targetX;
    pointer.currentY = pointer.targetY;
    pointer.frame = 0;
    pointer.previousTime = 0;
    renderOrbit();
  }
}

function moveField(x, y) {
  pointer.targetX = Math.min(1, Math.max(0, x));
  pointer.targetY = Math.min(1, Math.max(0, y));

  if (reducedMotion.matches) {
    pointer.currentX = pointer.targetX;
    pointer.currentY = pointer.targetY;
    renderOrbit();
    return;
  }

  if (!pointer.frame) pointer.frame = requestAnimationFrame(animateOrbit);
}

renderOrbit();

orbit.addEventListener('pointermove', (event) => {
  const bounds = orbit.getBoundingClientRect();
  moveField(
    (event.clientX - bounds.left) / bounds.width,
    (event.clientY - bounds.top) / bounds.height,
  );
});

orbit.addEventListener('pointerleave', () => moveField(0.5, 0.5));

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    cancelAnimationFrame(pointer.frame);
    pointer.frame = 0;
    pointer.previousTime = 0;
    pointer.currentX = pointer.targetX;
    pointer.currentY = pointer.targetY;
    renderOrbit();
  }
});
