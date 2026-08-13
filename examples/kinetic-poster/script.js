import { splitAll } from '../../dist/index.js';

splitAll();

const poster = document.querySelector('.poster');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const pointer = {
  currentX: 0.5,
  currentY: 0.5,
  targetX: 0.5,
  targetY: 0.5,
  frame: 0,
  previousTime: 0,
};

function renderPointer() {
  poster.style.setProperty('--pointer-x', `${pointer.currentX * 100}%`);
  poster.style.setProperty('--pointer-y', `${pointer.currentY * 100}%`);
  poster.style.setProperty('--pointer-rx', pointer.currentX);
  poster.style.setProperty('--pointer-ry', pointer.currentY);
}

function animatePointer(time) {
  const elapsed = Math.min(time - (pointer.previousTime || time), 64);
  const easing = 1 - Math.exp(-elapsed * 0.009);

  pointer.currentX += (pointer.targetX - pointer.currentX) * easing;
  pointer.currentY += (pointer.targetY - pointer.currentY) * easing;
  pointer.previousTime = time;
  renderPointer();

  const distance = Math.hypot(
    pointer.targetX - pointer.currentX,
    pointer.targetY - pointer.currentY,
  );

  if (distance > 0.0005) {
    pointer.frame = requestAnimationFrame(animatePointer);
  } else {
    pointer.currentX = pointer.targetX;
    pointer.currentY = pointer.targetY;
    pointer.frame = 0;
    pointer.previousTime = 0;
    renderPointer();
  }
}

function moveToward(x, y) {
  pointer.targetX = Math.min(1, Math.max(0, x));
  pointer.targetY = Math.min(1, Math.max(0, y));

  if (reducedMotion.matches) {
    pointer.currentX = pointer.targetX;
    pointer.currentY = pointer.targetY;
    renderPointer();
    return;
  }

  if (!pointer.frame) pointer.frame = requestAnimationFrame(animatePointer);
}

poster.addEventListener('pointermove', (event) => {
  const bounds = poster.getBoundingClientRect();
  moveToward(
    (event.clientX - bounds.left) / bounds.width,
    (event.clientY - bounds.top) / bounds.height,
  );
});

poster.addEventListener('pointerleave', () => moveToward(0.5, 0.5));
