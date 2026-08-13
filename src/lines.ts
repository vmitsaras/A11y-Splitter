import { A11yTextSplit, type TextSplitLineAddon } from "./index.js";

const STYLE_PROPERTIES = Object.freeze({
  lineIndex: "--a11y-text-split-line-index",
  legacyLineIndex: "--split-line-index",
});

export interface RenderedLine<T extends Pick<Element, "getBoundingClientRect"> = Element> {
  readonly top: number;
  readonly elements: T[];
}

const fontReadyRefreshed = new WeakSet<A11yTextSplit>();

export function groupByRenderedLine<T extends Pick<Element, "getBoundingClientRect">>(
  elements: readonly T[],
  tolerance: number,
): RenderedLine<T>[] {
  const lines: RenderedLine<T>[] = [];

  for (const element of elements) {
    const top = element.getBoundingClientRect().top;
    const line = lines.find((candidate) => Math.abs(candidate.top - top) <= tolerance);
    if (line) line.elements.push(element);
    else lines.push({ top, elements: [element] });
  }

  return lines.sort((a, b) => a.top - b.top);
}

export const installLines: TextSplitLineAddon = (instance) => {
  const visual = instance.visualElement;
  if (!visual) return null;

  const document = visual.ownerDocument;
  const view = document.defaultView;
  const tokens = Array.from(visual.children);
  const lines = groupByRenderedLine(tokens, instance.options.lineTolerance);
  const fragment = document.createDocumentFragment();

  lines.forEach((line, index) => {
    const wrapper = document.createElement("span");
    wrapper.className = "a11y-text-split__line";
    wrapper.dataset.splitLine = "";
    wrapper.style.setProperty(STYLE_PROPERTIES.lineIndex, String(index));
    wrapper.style.setProperty(STYLE_PROPERTIES.legacyLineIndex, String(index));
    wrapper.append(...line.elements);
    fragment.append(wrapper);
  });

  visual.replaceChildren(fragment);
  instance.dispatch("linesReady", { lines: lines.length });

  let frame = 0;
  let width = instance.element.getBoundingClientRect().width;
  const requestFrame = view?.requestAnimationFrame?.bind(view) ?? requestAnimationFrame;
  const cancelFrame = view?.cancelAnimationFrame?.bind(view) ?? cancelAnimationFrame;
  const refreshWhenWidthChanges = (): void => {
    cancelFrame(frame);
    frame = requestFrame(() => {
      const nextWidth = instance.element.getBoundingClientRect().width;
      if (Math.abs(nextWidth - width) > 0.5) {
        width = nextWidth;
        instance.refresh();
      }
    });
  };

  const ResizeObserverConstructor = view?.ResizeObserver ?? globalThis.ResizeObserver;
  const observer = typeof ResizeObserverConstructor === "function"
    ? new ResizeObserverConstructor(refreshWhenWidthChanges)
    : null;

  observer?.observe(instance.element);
  if (!observer) view?.addEventListener("resize", refreshWhenWidthChanges, { passive: true });

  let cancelled = false;
  void document.fonts?.ready.then(() => {
    if (!cancelled && !fontReadyRefreshed.has(instance)) {
      fontReadyRefreshed.add(instance);
      instance.refresh();
    }
  });

  return () => {
    cancelled = true;
    cancelFrame(frame);
    observer?.disconnect();
    if (!observer) view?.removeEventListener("resize", refreshWhenWidthChanges);
  };
};

A11yTextSplit.registerLineAddon(installLines);
