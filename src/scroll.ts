const COMPONENT_NAME = "a11y-text-split";

const SELECTORS = Object.freeze({
  root: "[data-split-scroll]",
});

const EVENTS = Object.freeze({
  scroll: `${COMPONENT_NAME}:scroll`,
});

const STYLE_PROPERTIES = Object.freeze({
  timeline: "--a11y-text-split-scroll-timeline",
  legacyTimeline: "--split-scroll-timeline",
  viewTimelineName: "view-timeline-name",
  viewTimelineAxis: "view-timeline-axis",
});

export interface ScrollRevealOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number;
  native?: boolean;
  once?: boolean;
}

export interface ScrollRevealEventDetail {
  readonly visible: boolean;
  readonly ratio: number;
}

export type ScrollRevealCleanup = () => void;

interface TimelineCapableWindow extends Window {
  ViewTimeline?: unknown;
  CSS?: {
    supports?: (query: string) => boolean;
  };
  IntersectionObserver?: typeof IntersectionObserver;
}

const DEFAULT_OPTIONS: Readonly<Required<Omit<ScrollRevealOptions, "root">> & { root: null }> =
  Object.freeze({
    root: null,
    rootMargin: "0px 0px -12% 0px",
    threshold: 0.15,
    native: true,
    once: false,
  });

let timelineId = 0;

function normalizeOptions(options: ScrollRevealOptions): Required<ScrollRevealOptions> {
  const threshold = Number(options.threshold);
  return {
    root: options.root ?? DEFAULT_OPTIONS.root,
    rootMargin:
      typeof options.rootMargin === "string" && options.rootMargin.trim()
        ? options.rootMargin
        : DEFAULT_OPTIONS.rootMargin,
    threshold: Number.isFinite(threshold) && threshold >= 0 && threshold <= 1
      ? threshold
      : DEFAULT_OPTIONS.threshold,
    native: typeof options.native === "boolean" ? options.native : DEFAULT_OPTIONS.native,
    once: typeof options.once === "boolean" ? options.once : DEFAULT_OPTIONS.once,
  };
}

function removeState(elements: readonly HTMLElement[]): void {
  elements.forEach((element) => {
    delete element.dataset.scrollDriver;
    delete element.dataset.scrollReady;
    delete element.dataset.scrollExit;
    delete element.dataset.scrollComplete;
    element.removeAttribute("data-scroll-visible");
    element.style.removeProperty(STYLE_PROPERTIES.timeline);
    element.style.removeProperty(STYLE_PROPERTIES.legacyTimeline);
    element.style.removeProperty(STYLE_PROPERTIES.viewTimelineName);
    element.style.removeProperty(STYLE_PROPERTIES.viewTimelineAxis);
  });
}

export function supportsViewTimeline(
  view: TimelineCapableWindow = window as TimelineCapableWindow,
): boolean {
  return Boolean(
    typeof view.ViewTimeline === "function"
      && view.CSS?.supports?.("animation-timeline: view()")
      && view.CSS.supports("animation-range: cover 0% cover 100%"),
  );
}

function setFallbackState(
  entry: IntersectionObserverEntry,
  threshold: number,
  once: boolean,
): boolean {
  const element = entry.target as HTMLElement;
  const rootTop = entry.rootBounds?.top ?? 0;
  const visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
  const revealOnce = once || element.hasAttribute("data-scroll-once");

  element.dataset.scrollExit = entry.boundingClientRect.top < rootTop ? "above" : "below";
  element.toggleAttribute("data-scroll-visible", visible);
  if (visible && revealOnce) element.dataset.scrollComplete = "";
  element.dispatchEvent(
    new CustomEvent<ScrollRevealEventDetail>(EVENTS.scroll, {
      bubbles: true,
      detail: { visible, ratio: entry.intersectionRatio },
    }),
  );

  return visible && revealOnce;
}

export function scrollRevealAll(
  selector = SELECTORS.root,
  options: ScrollRevealOptions = {},
): ScrollRevealCleanup {
  if (typeof document === "undefined") return () => undefined;

  const normalized = normalizeOptions(options);
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (!elements.length) return () => undefined;

  const view = document.defaultView as TimelineCapableWindow | null;
  const hasOnceElements = normalized.once
    || elements.some((element) => element.hasAttribute("data-scroll-once"));

  if (normalized.native && !hasOnceElements && view && supportsViewTimeline(view)) {
    elements.forEach((element) => {
      const timeline = `--a11y-text-split-scroll-${timelineId}`;
      timelineId += 1;
      element.dataset.scrollDriver = "native";
      element.dataset.scrollReady = "";
      element.style.setProperty(STYLE_PROPERTIES.timeline, timeline);
      element.style.setProperty(STYLE_PROPERTIES.legacyTimeline, timeline);
      element.style.setProperty(STYLE_PROPERTIES.viewTimelineName, timeline);
      element.style.setProperty(STYLE_PROPERTIES.viewTimelineAxis, "block");
    });
    return () => removeState(elements);
  }

  const IntersectionObserverConstructor = view?.IntersectionObserver
    ?? globalThis.IntersectionObserver;

  if (typeof IntersectionObserverConstructor !== "function") {
    elements.forEach((element) => {
      element.dataset.scrollDriver = "static";
      element.dataset.scrollReady = "";
      element.dataset.scrollVisible = "";
    });
    return () => removeState(elements);
  }

  const observer = new IntersectionObserverConstructor((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry: IntersectionObserverEntry) => {
      if (setFallbackState(entry, normalized.threshold, normalized.once)) {
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: normalized.root,
    rootMargin: normalized.rootMargin,
    threshold: normalized.threshold,
  });

  elements.forEach((element) => {
    element.dataset.scrollDriver = "fallback";
    element.dataset.scrollReady = "";
    observer.observe(element);
  });

  return () => {
    observer.disconnect();
    removeState(elements);
  };
}
