import { splitAll } from '../dist/index.js';

splitAll();

const stage = document.querySelector('.mischief');
const status = stage.querySelector('.mischief__status');
const tokens = Array.from(stage.querySelectorAll('[data-split-word], [data-split-punctuation]'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const REST_MOUSE = Object.freeze({ x: 0.78, y: 0.26, tilt: 7 });
const FORCE_RADIUS = 260;
const STATUS_DELAY = 1400;
const quips = [
  'The mouse is conducting snack-adjacent research.',
  'The punchline has entered witness protection.',
  'Several words have filed tiny complaints.',
  'The mouse says this is performance cheese.',
];
let quipIndex = 0;
let lastQuipAt = -Infinity;
let animationFrame = 0;
let centersNeedRefresh = true;

const mouseState = {
  x: REST_MOUSE.x,
  y: REST_MOUSE.y,
  tilt: REST_MOUSE.tilt,
  targetX: REST_MOUSE.x,
  targetY: REST_MOUSE.y,
  targetTilt: REST_MOUSE.tilt,
};

const pointerState = {
  inside: false,
  clientX: null,
  clientY: null,
};

const tokenStates = tokens.map((token, index) => ({
  token,
  baseHue: (42 + index * 9) % 360,
  centerX: 0,
  centerY: 0,
  x: 0,
  y: 0,
  rotate: 0,
  hue: (42 + index * 9) % 360,
  targetX: 0,
  targetY: 0,
  targetRotate: 0,
  targetHue: (42 + index * 9) % 360,
}));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function moveToward(value, target, amount, snap = 0.01) {
  const next = value + (target - value) * amount;
  return Math.abs(next - target) < snap ? target : next;
}

function setMousePosition(x, y, tilt = 0) {
  stage.style.setProperty('--mouse-x', `${x * 100}%`);
  stage.style.setProperty('--mouse-y', `${y * 100}%`);
  stage.style.setProperty('--mouse-tilt', `${tilt}deg`);
}

function setWordPosition(state) {
  state.token.style.setProperty('--scamper-x', `${state.x.toFixed(2)}px`);
  state.token.style.setProperty('--scamper-y', `${state.y.toFixed(2)}px`);
  state.token.style.setProperty('--scamper-rotate', `${state.rotate.toFixed(2)}deg`);
  state.token.style.setProperty('--word-hue', `${Math.round(state.hue)}`);
}

function measureTokenCenters() {
  const stageBounds = stage.getBoundingClientRect();
  const layoutRoot = stage.querySelector('.mischief__copy') || stage;
  const layoutBounds = layoutRoot.getBoundingClientRect();
  const originX = layoutBounds.left - stageBounds.left;
  const originY = layoutBounds.top - stageBounds.top;

  tokenStates.forEach((state) => {
    state.centerX = originX + state.token.offsetLeft + state.token.offsetWidth / 2;
    state.centerY = originY + state.token.offsetTop + state.token.offsetHeight / 2;
  });
  centersNeedRefresh = false;
}

function calmWords({ instant = false } = {}) {
  tokenStates.forEach((state) => {
    state.targetX = 0;
    state.targetY = 0;
    state.targetRotate = 0;
    state.targetHue = state.baseHue;
    if (instant) {
      state.x = 0;
      state.y = 0;
      state.rotate = 0;
      state.hue = state.baseHue;
      setWordPosition(state);
    }
  });
  status.textContent = 'The mouse is pretending to be normal.';
}

function pointIsInsideStage(bounds, clientX, clientY) {
  return clientX >= bounds.left
    && clientX <= bounds.right
    && clientY >= bounds.top
    && clientY <= bounds.bottom;
}

function updateTargetFromPointer(clientX, clientY) {
  const stageBounds = stage.getBoundingClientRect();
  if (!pointIsInsideStage(stageBounds, clientX, clientY)) return false;

  const normalizedX = clamp((clientX - stageBounds.left) / stageBounds.width, 0, 1);
  const normalizedY = clamp((clientY - stageBounds.top) / stageBounds.height, 0, 1);

  pointerState.inside = true;
  pointerState.clientX = clientX;
  pointerState.clientY = clientY;
  mouseState.targetX = normalizedX;
  mouseState.targetY = normalizedY;
  mouseState.targetTilt = (normalizedX - 0.5) * 18;

  return true;
}

function updateWords(normalizedX, normalizedY) {
  if (centersNeedRefresh) measureTokenCenters();

  const stageBounds = stage.getBoundingClientRect();
  const pointerX = normalizedX * stageBounds.width;
  const pointerY = normalizedY * stageBounds.height;
  const wordsCanMove = pointerState.inside && !reducedMotion.matches;
  const easing = reducedMotion.matches ? 1 : 0.32;

  tokenStates.forEach((state, index) => {
    let targetX = 0;
    let targetY = 0;
    let targetRotate = 0;
    let targetHue = state.baseHue;

    if (wordsCanMove) {
      const deltaX = state.centerX - pointerX;
      const deltaY = state.centerY - pointerY;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const force = Math.max(0, 1 - distance / FORCE_RADIUS);
      const wobble = Math.sin(index + normalizedX * Math.PI * 4) * 8;

      targetX = deltaX / distance * force * 70;
      targetY = deltaY / distance * force * 48;
      targetRotate = wobble * force;
      targetHue = (36 + force * 285 + index * 7) % 360;
    }

    state.targetX = targetX;
    state.targetY = targetY;
    state.targetRotate = targetRotate;
    state.targetHue = targetHue;
    state.x = moveToward(state.x, targetX, easing);
    state.y = moveToward(state.y, targetY, easing);
    state.rotate = moveToward(state.rotate, targetRotate, easing);
    state.hue = moveToward(state.hue, targetHue, easing, 0.5);

    setWordPosition(state);
  });
}

function hasMotionRemaining() {
  const mouseIsMoving = Math.abs(mouseState.x - mouseState.targetX) > 0.001
    || Math.abs(mouseState.y - mouseState.targetY) > 0.001
    || Math.abs(mouseState.tilt - mouseState.targetTilt) > 0.01;
  const wordsAreMoving = tokenStates.some((state) => (
    Math.abs(state.x - state.targetX) > 0.01
    || Math.abs(state.y - state.targetY) > 0.01
    || Math.abs(state.rotate - state.targetRotate) > 0.01
    || Math.abs(state.hue - state.targetHue) > 0.5
  ));

  return mouseIsMoving || wordsAreMoving;
}

function renderFrame() {
  animationFrame = 0;

  const mouseEase = reducedMotion.matches ? 1 : (pointerState.inside ? 0.24 : 0.16);
  mouseState.x = moveToward(mouseState.x, mouseState.targetX, mouseEase, 0.001);
  mouseState.y = moveToward(mouseState.y, mouseState.targetY, mouseEase, 0.001);
  mouseState.tilt = moveToward(mouseState.tilt, mouseState.targetTilt, mouseEase, 0.01);

  setMousePosition(mouseState.x, mouseState.y, mouseState.tilt);
  updateWords(mouseState.x, mouseState.y);

  if (hasMotionRemaining()) scheduleFrame();
}

function scheduleFrame() {
  if (!animationFrame) animationFrame = requestAnimationFrame(renderFrame);
}

function setRestTarget() {
  pointerState.inside = false;
  pointerState.clientX = null;
  pointerState.clientY = null;
  mouseState.targetX = REST_MOUSE.x;
  mouseState.targetY = REST_MOUSE.y;
  mouseState.targetTilt = REST_MOUSE.tilt;
  calmWords();
  scheduleFrame();
}

function updateStatusQuip() {
  const now = Date.now();
  if (!reducedMotion.matches && now - lastQuipAt > STATUS_DELAY) {
    status.textContent = quips[quipIndex % quips.length];
    quipIndex += 1;
    lastQuipAt = now;
  }
}

function scamperWords(event) {
  if (!updateTargetFromPointer(event.clientX, event.clientY)) return;
  updateStatusQuip();
  scheduleFrame();
}

function handleScroll() {
  if (!pointerState.inside) return;
  if (!updateTargetFromPointer(pointerState.clientX, pointerState.clientY)) {
    setRestTarget();
    return;
  }
  scheduleFrame();
}

function handleResize() {
  centersNeedRefresh = true;
  if (pointerState.inside) {
    if (!updateTargetFromPointer(pointerState.clientX, pointerState.clientY)) setRestTarget();
  }
  scheduleFrame();
}

measureTokenCenters();
calmWords({ instant: true });
setMousePosition(REST_MOUSE.x, REST_MOUSE.y, REST_MOUSE.tilt);

stage.addEventListener('pointermove', scamperWords, { passive: true });
stage.addEventListener('pointerleave', setRestTarget);
stage.addEventListener('pointercancel', setRestTarget);
window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('resize', handleResize);

document.fonts?.ready?.then(() => {
  centersNeedRefresh = true;
  scheduleFrame();
});

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) calmWords();
  scheduleFrame();
});
