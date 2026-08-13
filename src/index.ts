const COMPONENT_NAME = "a11y-text-split";

export type TextSplitType = "letters" | "words" | "lines";
export type TextSplitMode = "semantic" | "visual";
export type TextSplitWhitespace = "preserve" | "collapse" | "trim";
export type TextSplitSegmentKind = "letter" | "word" | "space" | "punctuation";

export interface TextSplitOptions {
  type?: TextSplitType;
  mode?: TextSplitMode;
  locale?: string;
  whitespace?: TextSplitWhitespace;
  splitNestedText?: boolean;
  lineTolerance?: number;
}

export interface NormalizedTextSplitOptions {
  readonly type: TextSplitType;
  readonly mode: TextSplitMode;
  readonly locale: string;
  readonly whitespace: TextSplitWhitespace;
  readonly splitNestedText: boolean;
  readonly lineTolerance: number;
}

export interface TextSplitSegment {
  readonly text: string;
  readonly kind: TextSplitSegmentKind;
}

export interface SegmentTextOptions {
  type?: TextSplitType;
  locale?: string;
  whitespace?: TextSplitWhitespace;
}

export interface TextSplitInstance {
  readonly element: HTMLElement;
  readonly options: Readonly<NormalizedTextSplitOptions>;
  refresh(): TextSplitInstance;
  destroy(): void;
}

export interface TextSplitLifecycleEventDetail {
  readonly instance: A11yTextSplit;
}

export interface TextSplitLinesReadyEventDetail extends TextSplitLifecycleEventDetail {
  readonly lines: number;
}

export type TextSplitLineAddon = (instance: A11yTextSplit) => (() => void) | null | undefined;

const TYPE_VALUES = Object.freeze(["letters", "words", "lines"] as const);
const MODE_VALUES = Object.freeze(["semantic", "visual"] as const);
const WHITESPACE_VALUES = Object.freeze(["preserve", "collapse", "trim"] as const);
const TRUTHY_DATA_VALUES = Object.freeze(["", "true", "1", "yes"] as const);
const FALSY_DATA_VALUES = Object.freeze(["false", "0", "no"] as const);

export const DEFAULT_OPTIONS: Readonly<NormalizedTextSplitOptions> = Object.freeze({
  type: "words",
  mode: "semantic",
  locale: "auto",
  whitespace: "preserve",
  splitNestedText: false,
  lineTolerance: 2,
});

const SELECTORS = Object.freeze({
  root: "[data-a11y-text-split]",
  interactive:
    'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]',
});

const CLASSES = Object.freeze({
  root: COMPONENT_NAME,
  source: `${COMPONENT_NAME}__source`,
  visual: `${COMPONENT_NAME}__visual`,
});

const ATTRIBUTES = Object.freeze({
  hidden: "aria-hidden",
  ready: "splitReady",
  activeType: "splitActiveType",
  activeMode: "splitActiveMode",
});

const EVENTS = Object.freeze({
  init: `${COMPONENT_NAME}:init`,
  refresh: `${COMPONENT_NAME}:refresh`,
  linesReady: `${COMPONENT_NAME}:lines-ready`,
  destroy: `${COMPONENT_NAME}:destroy`,
});

const STYLE_PROPERTIES = Object.freeze({
  index: "--a11y-text-split-index",
  legacyIndex: "--split-index",
});

const SKIPPED_ELEMENTS = Object.freeze(["SCRIPT", "STYLE", "TEXTAREA"] as const);

interface TextNodeReplacement {
  readonly original: Text;
  readonly parent: Node;
  readonly nextSibling: ChildNode | null;
  readonly generated: readonly ChildNode[];
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function documentLocale(element: HTMLElement): string {
  const closestLanguage = element.closest<HTMLElement>("[lang]")?.lang.trim();
  const documentLanguage = element.ownerDocument.documentElement.lang.trim();
  return closestLanguage || documentLanguage || "en";
}

function toSafeChoice<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return includesValue(values, value) ? value : fallback;
}

function toSafeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (includesValue(TRUTHY_DATA_VALUES, normalized)) return true;
  if (includesValue(FALSY_DATA_VALUES, normalized)) return false;
  return fallback;
}

function toSafeNumber(value: unknown, fallback: number, minimum = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function toSafeLocale(value: unknown, element: HTMLElement): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return !normalized || normalized === "auto" ? documentLocale(element) : normalized;
}

export function normalizeOptions(
  element: HTMLElement,
  options: TextSplitOptions = {},
): Readonly<NormalizedTextSplitOptions> {
  const data = element.dataset;
  const unsafeOptions = options as Record<string, unknown>;

  return Object.freeze({
    type: toSafeChoice(
      unsafeOptions.type ?? data.splitType,
      TYPE_VALUES,
      DEFAULT_OPTIONS.type,
    ),
    mode: toSafeChoice(
      unsafeOptions.mode ?? data.splitMode,
      MODE_VALUES,
      DEFAULT_OPTIONS.mode,
    ),
    locale: toSafeLocale(unsafeOptions.locale ?? data.splitLocale, element),
    whitespace: toSafeChoice(
      unsafeOptions.whitespace ?? data.splitWhitespace,
      WHITESPACE_VALUES,
      DEFAULT_OPTIONS.whitespace,
    ),
    splitNestedText: toSafeBoolean(
      unsafeOptions.splitNestedText ?? data.splitNestedText,
      DEFAULT_OPTIONS.splitNestedText,
    ),
    lineTolerance: toSafeNumber(
      unsafeOptions.lineTolerance ?? data.splitLineTolerance,
      DEFAULT_OPTIONS.lineTolerance,
    ),
  });
}

function normalizeText(text: string, whitespace: TextSplitWhitespace): string {
  if (whitespace === "collapse") return text.replace(/\s+/gu, " ");
  if (whitespace === "trim") return text.trim();
  return text;
}

function fallbackSegments(text: string, type: Exclude<TextSplitType, "lines">): string[] {
  if (type === "letters") return Array.from(text);
  return text.match(/\s+|[\p{L}\p{N}\p{M}_]+|[^\s\p{L}\p{N}\p{M}_]/gu) ?? [];
}

function classifySegment(
  segment: string,
  isWordLike: boolean,
  type: Exclude<TextSplitType, "lines">,
): TextSplitSegmentKind {
  if (/^\s+$/u.test(segment)) return "space";
  if (type === "words" && isWordLike) return "word";
  if (type === "letters" && !/^\p{P}+$/u.test(segment)) return "letter";
  return "punctuation";
}

export function segmentText(
  text: string,
  options: SegmentTextOptions = {},
): TextSplitSegment[] {
  const whitespace = toSafeChoice(
    options.whitespace,
    WHITESPACE_VALUES,
    DEFAULT_OPTIONS.whitespace,
  );
  const normalizedText = normalizeText(String(text), whitespace);
  const requestedType = toSafeChoice(options.type, TYPE_VALUES, DEFAULT_OPTIONS.type);
  const segmentType = requestedType === "lines" ? "words" : requestedType;
  const locale = typeof options.locale === "string" && options.locale.trim()
    ? options.locale.trim()
    : "en";

  if (typeof Intl.Segmenter === "function") {
    try {
      const granularity = segmentType === "letters" ? "grapheme" : "word";
      const segmenter = new Intl.Segmenter(locale, { granularity });
      return Array.from(segmenter.segment(normalizedText), ({ segment, isWordLike }) => ({
        text: segment,
        kind: classifySegment(segment, Boolean(isWordLike), segmentType),
      }));
    } catch {
      // Fall through to the dependency-free best-effort segmenter.
    }
  }

  return fallbackSegments(normalizedText, segmentType).map((segment) => ({
    text: segment,
    kind: classifySegment(segment, /^[\p{L}\p{N}\p{M}_]+$/u.test(segment), segmentType),
  }));
}

function createToken(
  document: Document,
  token: TextSplitSegment,
  index: number,
  kindIndex: number,
): HTMLSpanElement {
  const span = document.createElement("span");
  const kindName = `${token.kind[0]?.toUpperCase() ?? ""}${token.kind.slice(1)}`;
  const canonicalKindProperty = `--a11y-text-split-${token.kind}-index`;
  const legacyKindProperty = `--split-${token.kind}-index`;

  span.dataset[`split${kindName}`] = "";
  span.className = `${COMPONENT_NAME}__${token.kind}`;
  span.style.setProperty(STYLE_PROPERTIES.index, String(index));
  span.style.setProperty(STYLE_PROPERTIES.legacyIndex, String(index));
  span.style.setProperty(canonicalKindProperty, String(kindIndex));
  span.style.setProperty(legacyKindProperty, String(kindIndex));
  span.textContent = token.text;
  return span;
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return Boolean(
    value
      && typeof value === "object"
      && "nodeType" in value
      && (value as Node).nodeType === 1
      && "namespaceURI" in value
      && (value as Element).namespaceURI === "http://www.w3.org/1999/xhtml"
      && "replaceChildren" in value,
  );
}

function containsNestedInteractive(element: HTMLElement): boolean {
  return Array.from(element.querySelectorAll(SELECTORS.interactive)).some(
    (candidate) => candidate !== element,
  );
}

export class A11yTextSplit implements TextSplitInstance {
  private static readonly instances = new WeakMap<HTMLElement, A11yTextSplit>();
  private static lineAddon: TextSplitLineAddon | null = null;

  readonly element!: HTMLElement;
  private normalizedOptions!: Readonly<NormalizedTextSplitOptions>;
  private originalNodes!: readonly ChildNode[];
  private originalText!: string;
  private replacements: TextNodeReplacement[] = [];
  private addonCleanup: (() => void) | null = null;
  private destroyed = false;
  visualElement: HTMLElement | null = null;

  static create(element: HTMLElement, options: TextSplitOptions = {}): A11yTextSplit {
    return A11yTextSplit.instances.get(element) ?? new A11yTextSplit(element, options);
  }

  static get(element: HTMLElement): A11yTextSplit | undefined {
    return A11yTextSplit.instances.get(element);
  }

  static registerLineAddon(addon: TextSplitLineAddon | null): void {
    A11yTextSplit.lineAddon = typeof addon === "function" ? addon : null;
  }

  constructor(element: HTMLElement, options: TextSplitOptions = {}) {
    if (!isHTMLElement(element)) {
      throw new TypeError("A11yTextSplit requires an HTML element.");
    }

    const existingInstance = A11yTextSplit.instances.get(element);
    if (existingInstance) return existingInstance;

    this.element = element;
    this.normalizedOptions = normalizeOptions(element, options);
    this.originalNodes = Array.from(element.childNodes);
    this.originalText = element.textContent ?? "";

    try {
      this.refresh(false);
      A11yTextSplit.instances.set(element, this);
    } catch (error) {
      this.cleanupAddon();
      this.restoreOriginal();
      this.removeState();
      throw error;
    }

    this.dispatch("init");
  }

  get options(): Readonly<NormalizedTextSplitOptions> {
    return this.normalizedOptions;
  }

  dispatch(name: keyof typeof EVENTS, extra: Record<string, unknown> = {}): void {
    this.element.dispatchEvent(
      new CustomEvent(EVENTS[name], {
        bubbles: true,
        detail: { instance: this, ...extra },
      }),
    );
  }

  refresh(emit = true): this {
    if (this.destroyed) return this;

    this.cleanupAddon();
    this.restoreOriginal();

    if (this.options.type === "lines") {
      if (this.options.mode !== "visual") {
        this.normalizedOptions = Object.freeze({ ...this.options, mode: "visual" });
      }
      this.renderVisual();
      this.addonCleanup = A11yTextSplit.lineAddon?.(this) ?? null;
    } else if (this.options.mode === "visual") {
      this.renderVisual();
    } else {
      this.renderSemantic();
    }

    this.element.classList.add(CLASSES.root);
    this.element.dataset[ATTRIBUTES.ready] = "";
    this.element.dataset[ATTRIBUTES.activeType] = this.options.type;
    this.element.dataset[ATTRIBUTES.activeMode] = this.options.mode;
    if (emit) this.dispatch("refresh");
    return this;
  }

  private cleanupAddon(): void {
    this.addonCleanup?.();
    this.addonCleanup = null;
  }

  private renderTokens(text: string, type: TextSplitType = this.options.type): DocumentFragment {
    const fragment = this.element.ownerDocument.createDocumentFragment();
    const kindCounts = new Map<TextSplitSegmentKind, number>();
    const tokens = segmentText(text, { ...this.options, type });

    tokens.forEach((token, index) => {
      const kindIndex = kindCounts.get(token.kind) ?? 0;
      fragment.append(createToken(this.element.ownerDocument, token, index, kindIndex));
      kindCounts.set(token.kind, kindIndex + 1);
    });
    return fragment;
  }

  private renderVisual(): void {
    if (containsNestedInteractive(this.element)) {
      throw new Error("Visual splitting is not allowed when the target contains nested interactive content.");
    }

    const document = this.element.ownerDocument;
    const source = document.createElement("span");
    source.className = CLASSES.source;
    source.dataset.splitSource = "";
    source.textContent = normalizeText(this.originalText, this.options.whitespace);

    const visual = document.createElement("span");
    visual.className = CLASSES.visual;
    visual.dataset.splitVisual = "";
    visual.setAttribute(ATTRIBUTES.hidden, "true");
    visual.append(this.renderTokens(this.originalText, this.options.type));

    this.element.replaceChildren(source, visual);
    this.visualElement = visual;
  }

  private renderSemantic(): void {
    const textNodes = this.options.splitNestedText
      ? this.collectNestedTextNodes()
      : Array.from(this.element.childNodes).filter((node): node is Text => node.nodeType === 3);

    for (const node of textNodes) {
      const parent = node.parentNode;
      if (!parent) continue;

      const nextSibling = node.nextSibling;
      const fragment = this.renderTokens(node.nodeValue ?? "");
      const generated = Array.from(fragment.childNodes);
      this.replacements.push({ original: node, parent, nextSibling, generated });
      node.replaceWith(fragment);
    }
  }

  private collectNestedTextNodes(): Text[] {
    const nodes: Text[] = [];

    const visit = (node: Node): void => {
      if (node.nodeType === 3) {
        nodes.push(node as Text);
        return;
      }
      if (node.nodeType !== 1) return;

      const element = node as HTMLElement;
      if (element !== this.element && element.matches(SELECTORS.interactive)) return;
      if (SKIPPED_ELEMENTS.includes(element.tagName as (typeof SKIPPED_ELEMENTS)[number])) return;
      element.childNodes.forEach(visit);
    };

    this.element.childNodes.forEach(visit);
    return nodes;
  }

  private restoreOriginal(): void {
    for (const replacement of [...this.replacements].reverse()) {
      replacement.generated.forEach((node) => node.remove());
      if (replacement.nextSibling?.parentNode === replacement.parent) {
        replacement.parent.insertBefore(replacement.original, replacement.nextSibling);
      } else {
        replacement.parent.appendChild(replacement.original);
      }
    }

    this.replacements = [];
    this.element.replaceChildren(...this.originalNodes);
    this.visualElement = null;
  }

  private removeState(): void {
    this.element.classList.remove(CLASSES.root);
    delete this.element.dataset[ATTRIBUTES.ready];
    delete this.element.dataset[ATTRIBUTES.activeType];
    delete this.element.dataset[ATTRIBUTES.activeMode];
  }

  destroy(): void {
    if (this.destroyed) return;

    this.cleanupAddon();
    this.restoreOriginal();
    this.removeState();
    A11yTextSplit.instances.delete(this.element);
    this.destroyed = true;
    this.dispatch("destroy");
  }
}

export function createTextSplit(
  root: HTMLElement,
  options: TextSplitOptions = {},
): A11yTextSplit {
  return A11yTextSplit.create(root, options);
}

export function initTextSplitAll(
  options: TextSplitOptions = {},
  selector = SELECTORS.root,
): A11yTextSplit[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll(selector))
    .filter(isHTMLElement)
    .map((element) => createTextSplit(element, options));
}

export function splitAll(
  selector = SELECTORS.root,
  options: TextSplitOptions = {},
): A11yTextSplit[] {
  return initTextSplitAll(options, selector);
}
