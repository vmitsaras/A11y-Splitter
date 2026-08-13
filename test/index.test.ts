import { afterEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";
import {
  A11yTextSplit,
  DEFAULT_OPTIONS,
  createTextSplit,
  initTextSplitAll,
  normalizeOptions,
  segmentText,
  splitAll,
} from "../src/index.js";
import { groupByRenderedLine } from "../src/lines.js";
import { scrollRevealAll, supportsViewTimeline } from "../src/scroll.js";

interface TestDOM {
  document: Document;
  window: Window & typeof globalThis & {
    ViewTimeline?: unknown;
  };
}

function installDOM(html = "<main></main>"): TestDOM {
  const parsed = parseHTML(`<!doctype html><html lang="en"><body>${html}</body></html>`);
  const document = parsed.document as unknown as Document;
  const window = parsed.window as unknown as TestDOM["window"];
  const requestFrame = (callback: FrameRequestCallback): number => window.setTimeout(
    () => callback(performance.now()),
    0,
  );
  const cancelFrame = (frame: number): void => window.clearTimeout(frame);
  const ResizeObserverMock = class implements Pick<ResizeObserver, "observe" | "disconnect"> {
    observe(): void {}
    disconnect(): void {}
  };

  Object.assign(window, {
    requestAnimationFrame: requestFrame,
    cancelAnimationFrame: cancelFrame,
    ResizeObserver: ResizeObserverMock,
  });
  Object.assign(globalThis, {
    document,
    window,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    CustomEvent: window.CustomEvent,
    requestAnimationFrame: requestFrame,
    cancelAnimationFrame: cancelFrame,
    ResizeObserver: ResizeObserverMock,
  });

  return { document, window };
}

function element<T extends HTMLElement = HTMLElement>(
  document: Document,
  selector: string,
): T {
  const match = document.querySelector(selector);
  if (!(match instanceof (document.defaultView?.HTMLElement ?? HTMLElement))) {
    throw new Error(`Missing test element: ${selector}`);
  }
  return match as T;
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("text segmentation and options", () => {
  it("freezes semantic word defaults", () => {
    expect(DEFAULT_OPTIONS).toMatchObject({
      type: "words",
      mode: "semantic",
      whitespace: "preserve",
    });
    expect(Object.isFrozen(DEFAULT_OPTIONS)).toBe(true);
  });

  it("keeps emoji and combining grapheme sequences intact", () => {
    const segments = segmentText("A👩🏽‍💻e\u0301", { type: "letters" });
    expect(segments.map(({ text }) => text)).toEqual(["A", "👩🏽‍💻", "é"]);
  });

  it("preserves repeated and non-breaking spaces", () => {
    const segments = segmentText("Hello  world\u00a0!", {
      type: "words",
      locale: "en",
      whitespace: "preserve",
    });
    expect(segments.map(({ text }) => text).join("")).toBe("Hello  world\u00a0!");
    expect(segments.filter(({ kind }) => kind === "space").map(({ text }) => text)).toEqual([
      "  ",
      "\u00a0",
    ]);
  });

  it("applies collapse and trim only when requested", () => {
    expect(segmentText("  one\n\ttwo  ", {
      type: "words",
      locale: "en",
      whitespace: "collapse",
    }).map(({ text }) => text).join("")).toBe(" one two ");
    expect(segmentText("  one two  ", {
      type: "words",
      locale: "en",
      whitespace: "trim",
    }).map(({ text }) => text).join("")).toBe("one two");
  });

  it("normalizes unsafe dataset values and uses the nearest language", () => {
    const { document } = installDOM(
      '<section lang="el"><p data-split-type="sentences" data-split-mode="loud" '
        + 'data-split-whitespace="erase" data-split-locale="auto" '
        + 'data-split-nested-text="yes" data-split-line-tolerance="-2">Text</p></section>',
    );
    const options = normalizeOptions(element(document, "p"));
    expect(options).toEqual({
      type: "words",
      mode: "semantic",
      locale: "el",
      whitespace: "preserve",
      splitNestedText: true,
      lineTolerance: 2,
    });
    expect(Object.isFrozen(options)).toBe(true);
  });
});

describe("core lifecycle", () => {
  it("exposes creation helpers and reuses duplicate initialization", () => {
    const { document } = installDOM('<p data-a11y-text-split>Hello world</p>');
    const root = element(document, "p");
    const first = createTextSplit(root);
    const second = createTextSplit(root, { type: "letters" });
    expect(second).toBe(first);
    expect(splitAll()[0]).toBe(first);
    expect(initTextSplitAll()[0]).toBe(first);
    first.destroy();
  });

  it("wraps direct semantic text while preserving nested markup", () => {
    const { document } = installDOM("<p>Hello <strong>bold</strong> world</p>");
    const root = element(document, "p");
    const split = new A11yTextSplit(root);
    expect(root.querySelectorAll("[data-split-word]")).toHaveLength(2);
    expect(root.querySelector("strong")?.textContent).toBe("bold");
    expect(root.textContent).toBe("Hello bold world");
    expect(root.dataset.splitActiveMode).toBe("semantic");
    split.destroy();
  });

  it("keeps one clean visual source and hides decorative tokens", () => {
    const { document } = installDOM("<h1>Accessible motion</h1>");
    const root = element(document, "h1");
    const split = new A11yTextSplit(root, { type: "letters", mode: "visual" });
    expect(root.querySelector("[data-split-source]")?.textContent).toBe("Accessible motion");
    expect(root.querySelector("[data-split-visual]")?.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelectorAll("[data-split-letter]")).toHaveLength(16);
    expect((root.querySelector("[data-split-letter]") as HTMLElement).style.getPropertyValue(
      "--a11y-text-split-letter-index",
    )).toBe("0");
    split.destroy();
  });

  it("rolls back failed visual initialization and permits retry", () => {
    const { document } = installDOM("<div>Label <button>Action</button></div>");
    const root = element(document, "div");
    const originalButton = element<HTMLButtonElement>(document, "button");
    expect(() => createTextSplit(root, { mode: "visual" })).toThrow(/nested interactive content/u);
    expect(A11yTextSplit.get(root)).toBeUndefined();
    expect(root.querySelector("button")).toBe(originalButton);
    const split = createTextSplit(root, { mode: "semantic" });
    expect(A11yTextSplit.get(root)).toBe(split);
    split.destroy();
  });

  it("mirrors normalized whitespace in visual mode", () => {
    const { document } = installDOM("<h1>  Accessible   motion  </h1>");
    const root = element(document, "h1");
    const split = createTextSplit(root, { mode: "visual", whitespace: "trim" });
    expect(root.querySelector("[data-split-source]")?.textContent).toBe("Accessible   motion");
    expect(root.querySelector("[data-split-visual]")?.textContent).toBe("Accessible   motion");
    split.destroy();
  });

  it("skips interactive descendants during nested semantic splitting", () => {
    const { document } = installDOM('<p>Read <a href="/docs">the guide</a> first</p>');
    const root = element(document, "p");
    const link = element<HTMLAnchorElement>(document, "a");
    const split = createTextSplit(root, { splitNestedText: true });
    expect(link.querySelector("[data-split-word]")).toBeNull();
    expect(link.textContent).toBe("the guide");
    expect(root.querySelectorAll("[data-split-word]")).toHaveLength(2);
    split.destroy();
  });

  it("preserves descendant identity and listeners through refresh and destroy", () => {
    const { document, window } = installDOM("<p>Hello <strong>there</strong></p>");
    const root = element(document, "p");
    const strong = element(document, "strong");
    const listener = vi.fn();
    strong.addEventListener("click", listener);
    const split = createTextSplit(root, { splitNestedText: true });
    split.refresh();
    strong.dispatchEvent(new window.Event("click"));
    split.destroy();
    expect(root.querySelector("strong")).toBe(strong);
    expect(strong.textContent).toBe("there");
    strong.dispatchEvent(new window.Event("click"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("dispatches bubbling lifecycle events in order and reinitializes after destroy", () => {
    const { document } = installDOM("<section><p>Hello there</p></section>");
    const parent = element(document, "section");
    const root = element(document, "p");
    const events: string[] = [];
    for (const name of ["init", "refresh", "destroy"]) {
      parent.addEventListener(`a11y-text-split:${name}`, (event) => {
        const detail = (event as CustomEvent).detail as { instance: A11yTextSplit };
        expect(detail.instance.element).toBe(root);
        events.push(name);
      });
    }
    const first = createTextSplit(root);
    first.refresh();
    first.destroy();
    const second = createTextSplit(root);
    expect(second).not.toBe(first);
    second.destroy();
    expect(events).toEqual(["init", "refresh", "destroy", "init", "destroy"]);
  });
});

describe("line addon", () => {
  it("groups rendered tokens by top position within tolerance", () => {
    const elements = [
      { getBoundingClientRect: () => ({ top: 21 }) as DOMRect },
      { getBoundingClientRect: () => ({ top: 10 }) as DOMRect },
      { getBoundingClientRect: () => ({ top: 11.5 }) as DOMRect },
    ];
    const lines = groupByRenderedLine(elements, 2);
    expect(lines.map(({ top, elements: members }) => [top, members.length])).toEqual([
      [10, 2],
      [21, 1],
    ]);
  });

  it("refreshes once after fonts are ready and cleans up", async () => {
    const { document } = installDOM("<h2>Words on lines</h2>");
    let fontsReady: (() => void) | undefined;
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        ready: new Promise<void>((resolve) => {
          fontsReady = resolve;
        }),
      },
    });
    const root = element(document, "h2");
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({ width: 320 } as DOMRect);
    const events: string[] = [];
    root.addEventListener("a11y-text-split:refresh", () => events.push("refresh"));
    const split = createTextSplit(root, { type: "lines" });
    expect(root.querySelectorAll("[data-split-line]")).toHaveLength(1);
    fontsReady?.();
    await nextTask();
    await nextTask();
    expect(events).toEqual(["refresh"]);
    split.destroy();
  });
});

describe("scroll addon", () => {
  it("uses native view timelines only when both features are supported", () => {
    const { document, window } = installDOM("<h2 data-split-scroll>Native reveal</h2>");
    Object.assign(window, {
      CSS: { supports: (query: string) => query.startsWith("animation-") },
      ViewTimeline: class {},
    });
    expect(supportsViewTimeline(window)).toBe(true);
    const cleanup = scrollRevealAll();
    const root = element(document, "h2");
    expect(root.dataset.scrollDriver).toBe("native");
    expect(root.style.getPropertyValue("--a11y-text-split-scroll-timeline")).toMatch(
      /^--a11y-text-split-scroll-\d+$/u,
    );
    cleanup();
    expect(root.style.getPropertyValue("--a11y-text-split-scroll-timeline")).toBeFalsy();
  });

  it("toggles observer fallback state and cleans up", () => {
    const { document, window } = installDOM("<h2 data-split-scroll>Fallback reveal</h2>");
    Object.assign(window, { CSS: { supports: () => false } });
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    const Observer = class {
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe(): void {}
      unobserve(): void {}
      disconnect = disconnect;
    } as unknown as typeof IntersectionObserver;
    Object.assign(window, { IntersectionObserver: Observer });
    Object.assign(globalThis, { IntersectionObserver: Observer });
    const cleanup = scrollRevealAll();
    const root = element(document, "h2");
    expect(root.dataset.scrollDriver).toBe("fallback");
    callback?.([{
      target: root,
      isIntersecting: true,
      intersectionRatio: 0.6,
      boundingClientRect: { top: 200 },
      rootBounds: { top: 0 },
    } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(root.hasAttribute("data-scroll-visible")).toBe(true);
    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(root.hasAttribute("data-scroll-ready")).toBe(false);
  });

  it("uses the static visible fallback without IntersectionObserver", () => {
    const { document, window } = installDOM("<h2 data-split-scroll>Static reveal</h2>");
    Reflect.deleteProperty(window, "IntersectionObserver");
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
    const root = element(document, "h2");
    const cleanup = scrollRevealAll();
    expect(root.dataset.scrollDriver).toBe("static");
    expect(root.hasAttribute("data-scroll-visible")).toBe(true);
    cleanup();
    expect(root.hasAttribute("data-scroll-visible")).toBe(false);
  });

  it("forces observer mode and unobserves once-only targets", () => {
    const { document, window } = installDOM(
      "<h2 data-split-scroll data-scroll-once>Reveal once</h2>",
    );
    Object.assign(window, {
      CSS: { supports: () => true },
      ViewTimeline: class {},
    });
    let callback: IntersectionObserverCallback | undefined;
    const unobserve = vi.fn();
    const Observer = class {
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe(): void {}
      unobserve = unobserve;
      disconnect(): void {}
    } as unknown as typeof IntersectionObserver;
    Object.assign(window, { IntersectionObserver: Observer });
    Object.assign(globalThis, { IntersectionObserver: Observer });
    const cleanup = scrollRevealAll();
    const root = element(document, "h2");
    expect(root.dataset.scrollDriver).toBe("fallback");
    callback?.([{
      target: root,
      isIntersecting: true,
      intersectionRatio: 0.8,
      boundingClientRect: { top: 180 },
      rootBounds: { top: 0 },
    } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(root.dataset.scrollComplete).toBe("");
    expect(unobserve).toHaveBeenCalledWith(root);
    cleanup();
  });
});
