//#region src/index.ts
const COMPONENT_NAME = "a11y-text-split";
const TYPE_VALUES = Object.freeze([
	"letters",
	"words",
	"lines"
]);
const MODE_VALUES = Object.freeze(["semantic", "visual"]);
const WHITESPACE_VALUES = Object.freeze([
	"preserve",
	"collapse",
	"trim"
]);
const TRUTHY_DATA_VALUES = Object.freeze([
	"",
	"true",
	"1",
	"yes"
]);
const FALSY_DATA_VALUES = Object.freeze([
	"false",
	"0",
	"no"
]);
const DEFAULT_OPTIONS = Object.freeze({
	type: "words",
	mode: "semantic",
	locale: "auto",
	whitespace: "preserve",
	splitNestedText: false,
	lineTolerance: 2
});
const SELECTORS = Object.freeze({
	root: "[data-a11y-text-split]",
	interactive: "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex=\"-1\"]), [contenteditable=\"true\"]"
});
const CLASSES = Object.freeze({
	root: COMPONENT_NAME,
	source: `${COMPONENT_NAME}__source`,
	visual: `${COMPONENT_NAME}__visual`
});
const ATTRIBUTES = Object.freeze({
	hidden: "aria-hidden",
	ready: "splitReady",
	activeType: "splitActiveType",
	activeMode: "splitActiveMode"
});
const EVENTS = Object.freeze({
	init: `${COMPONENT_NAME}:init`,
	refresh: `${COMPONENT_NAME}:refresh`,
	linesReady: `${COMPONENT_NAME}:lines-ready`,
	destroy: `${COMPONENT_NAME}:destroy`
});
const STYLE_PROPERTIES = Object.freeze({
	index: "--a11y-text-split-index",
	legacyIndex: "--split-index"
});
const SKIPPED_ELEMENTS = Object.freeze([
	"SCRIPT",
	"STYLE",
	"TEXTAREA"
]);
function includesValue(values, value) {
	return typeof value === "string" && values.includes(value);
}
function documentLocale(element) {
	const closestLanguage = element.closest("[lang]")?.lang.trim();
	const documentLanguage = element.ownerDocument.documentElement.lang.trim();
	return closestLanguage || documentLanguage || "en";
}
function toSafeChoice(value, values, fallback) {
	return includesValue(values, value) ? value : fallback;
}
function toSafeBoolean(value, fallback) {
	if (typeof value === "boolean") return value;
	if (value === void 0 || value === null) return fallback;
	const normalized = String(value).trim().toLowerCase();
	if (includesValue(TRUTHY_DATA_VALUES, normalized)) return true;
	if (includesValue(FALSY_DATA_VALUES, normalized)) return false;
	return fallback;
}
function toSafeNumber(value, fallback, minimum = 0) {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}
function toSafeLocale(value, element) {
	const normalized = typeof value === "string" ? value.trim() : "";
	return !normalized || normalized === "auto" ? documentLocale(element) : normalized;
}
function normalizeOptions(element, options = {}) {
	const data = element.dataset;
	const unsafeOptions = options;
	return Object.freeze({
		type: toSafeChoice(unsafeOptions.type ?? data.splitType, TYPE_VALUES, DEFAULT_OPTIONS.type),
		mode: toSafeChoice(unsafeOptions.mode ?? data.splitMode, MODE_VALUES, DEFAULT_OPTIONS.mode),
		locale: toSafeLocale(unsafeOptions.locale ?? data.splitLocale, element),
		whitespace: toSafeChoice(unsafeOptions.whitespace ?? data.splitWhitespace, WHITESPACE_VALUES, DEFAULT_OPTIONS.whitespace),
		splitNestedText: toSafeBoolean(unsafeOptions.splitNestedText ?? data.splitNestedText, DEFAULT_OPTIONS.splitNestedText),
		lineTolerance: toSafeNumber(unsafeOptions.lineTolerance ?? data.splitLineTolerance, DEFAULT_OPTIONS.lineTolerance)
	});
}
function normalizeText(text, whitespace) {
	if (whitespace === "collapse") return text.replace(/\s+/gu, " ");
	if (whitespace === "trim") return text.trim();
	return text;
}
function fallbackSegments(text, type) {
	if (type === "letters") return Array.from(text);
	return text.match(/\s+|[\p{L}\p{N}\p{M}_]+|[^\s\p{L}\p{N}\p{M}_]/gu) ?? [];
}
function classifySegment(segment, isWordLike, type) {
	if (/^\s+$/u.test(segment)) return "space";
	if (type === "words" && isWordLike) return "word";
	if (type === "letters" && !/^\p{P}+$/u.test(segment)) return "letter";
	return "punctuation";
}
function segmentText(text, options = {}) {
	const whitespace = toSafeChoice(options.whitespace, WHITESPACE_VALUES, DEFAULT_OPTIONS.whitespace);
	const normalizedText = normalizeText(String(text), whitespace);
	const requestedType = toSafeChoice(options.type, TYPE_VALUES, DEFAULT_OPTIONS.type);
	const segmentType = requestedType === "lines" ? "words" : requestedType;
	const locale = typeof options.locale === "string" && options.locale.trim() ? options.locale.trim() : "en";
	if (typeof Intl.Segmenter === "function") try {
		const granularity = segmentType === "letters" ? "grapheme" : "word";
		const segmenter = new Intl.Segmenter(locale, { granularity });
		return Array.from(segmenter.segment(normalizedText), ({ segment, isWordLike }) => ({
			text: segment,
			kind: classifySegment(segment, Boolean(isWordLike), segmentType)
		}));
	} catch {}
	return fallbackSegments(normalizedText, segmentType).map((segment) => ({
		text: segment,
		kind: classifySegment(segment, /^[\p{L}\p{N}\p{M}_]+$/u.test(segment), segmentType)
	}));
}
function createToken(document$1, token, index, kindIndex) {
	const span = document$1.createElement("span");
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
function isHTMLElement(value) {
	return Boolean(value && typeof value === "object" && "nodeType" in value && value.nodeType === 1 && "namespaceURI" in value && value.namespaceURI === "http://www.w3.org/1999/xhtml" && "replaceChildren" in value);
}
function containsNestedInteractive(element) {
	return Array.from(element.querySelectorAll(SELECTORS.interactive)).some((candidate) => candidate !== element);
}
var A11yTextSplit = class A11yTextSplit {
	static instances = /* @__PURE__ */ new WeakMap();
	static lineAddon = null;
	element;
	normalizedOptions;
	originalNodes;
	originalText;
	replacements = [];
	addonCleanup = null;
	destroyed = false;
	visualElement = null;
	static create(element, options = {}) {
		return A11yTextSplit.instances.get(element) ?? new A11yTextSplit(element, options);
	}
	static get(element) {
		return A11yTextSplit.instances.get(element);
	}
	static registerLineAddon(addon) {
		A11yTextSplit.lineAddon = typeof addon === "function" ? addon : null;
	}
	constructor(element, options = {}) {
		if (!isHTMLElement(element)) throw new TypeError("A11yTextSplit requires an HTML element.");
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
	get options() {
		return this.normalizedOptions;
	}
	dispatch(name, extra = {}) {
		this.element.dispatchEvent(new CustomEvent(EVENTS[name], {
			bubbles: true,
			detail: {
				instance: this,
				...extra
			}
		}));
	}
	refresh(emit = true) {
		if (this.destroyed) return this;
		this.cleanupAddon();
		this.restoreOriginal();
		if (this.options.type === "lines") {
			if (this.options.mode !== "visual") this.normalizedOptions = Object.freeze({
				...this.options,
				mode: "visual"
			});
			this.renderVisual();
			this.addonCleanup = A11yTextSplit.lineAddon?.(this) ?? null;
		} else if (this.options.mode === "visual") this.renderVisual();
		else this.renderSemantic();
		this.element.classList.add(CLASSES.root);
		this.element.dataset[ATTRIBUTES.ready] = "";
		this.element.dataset[ATTRIBUTES.activeType] = this.options.type;
		this.element.dataset[ATTRIBUTES.activeMode] = this.options.mode;
		if (emit) this.dispatch("refresh");
		return this;
	}
	cleanupAddon() {
		this.addonCleanup?.();
		this.addonCleanup = null;
	}
	renderTokens(text, type = this.options.type) {
		const fragment = this.element.ownerDocument.createDocumentFragment();
		const kindCounts = /* @__PURE__ */ new Map();
		segmentText(text, {
			...this.options,
			type
		}).forEach((token, index) => {
			const kindIndex = kindCounts.get(token.kind) ?? 0;
			fragment.append(createToken(this.element.ownerDocument, token, index, kindIndex));
			kindCounts.set(token.kind, kindIndex + 1);
		});
		return fragment;
	}
	renderVisual() {
		if (containsNestedInteractive(this.element)) throw new Error("Visual splitting is not allowed when the target contains nested interactive content.");
		const document$1 = this.element.ownerDocument;
		const source = document$1.createElement("span");
		source.className = CLASSES.source;
		source.dataset.splitSource = "";
		source.textContent = normalizeText(this.originalText, this.options.whitespace);
		const visual = document$1.createElement("span");
		visual.className = CLASSES.visual;
		visual.dataset.splitVisual = "";
		visual.setAttribute(ATTRIBUTES.hidden, "true");
		visual.append(this.renderTokens(this.originalText, this.options.type));
		this.element.replaceChildren(source, visual);
		this.visualElement = visual;
	}
	renderSemantic() {
		const textNodes = this.options.splitNestedText ? this.collectNestedTextNodes() : Array.from(this.element.childNodes).filter((node) => node.nodeType === 3);
		for (const node of textNodes) {
			const parent = node.parentNode;
			if (!parent) continue;
			const nextSibling = node.nextSibling;
			const fragment = this.renderTokens(node.nodeValue ?? "");
			const generated = Array.from(fragment.childNodes);
			this.replacements.push({
				original: node,
				parent,
				nextSibling,
				generated
			});
			node.replaceWith(fragment);
		}
	}
	collectNestedTextNodes() {
		const nodes = [];
		const visit = (node) => {
			if (node.nodeType === 3) {
				nodes.push(node);
				return;
			}
			if (node.nodeType !== 1) return;
			const element = node;
			if (element !== this.element && element.matches(SELECTORS.interactive)) return;
			if (SKIPPED_ELEMENTS.includes(element.tagName)) return;
			element.childNodes.forEach(visit);
		};
		this.element.childNodes.forEach(visit);
		return nodes;
	}
	restoreOriginal() {
		for (const replacement of [...this.replacements].reverse()) {
			replacement.generated.forEach((node) => node.remove());
			if (replacement.nextSibling?.parentNode === replacement.parent) replacement.parent.insertBefore(replacement.original, replacement.nextSibling);
			else replacement.parent.appendChild(replacement.original);
		}
		this.replacements = [];
		this.element.replaceChildren(...this.originalNodes);
		this.visualElement = null;
	}
	removeState() {
		this.element.classList.remove(CLASSES.root);
		delete this.element.dataset[ATTRIBUTES.ready];
		delete this.element.dataset[ATTRIBUTES.activeType];
		delete this.element.dataset[ATTRIBUTES.activeMode];
	}
	destroy() {
		if (this.destroyed) return;
		this.cleanupAddon();
		this.restoreOriginal();
		this.removeState();
		A11yTextSplit.instances.delete(this.element);
		this.destroyed = true;
		this.dispatch("destroy");
	}
};
function createTextSplit(root, options = {}) {
	return A11yTextSplit.create(root, options);
}
function initTextSplitAll(options = {}, selector = SELECTORS.root) {
	if (typeof document === "undefined") return [];
	return Array.from(document.querySelectorAll(selector)).filter(isHTMLElement).map((element) => createTextSplit(element, options));
}
function splitAll(selector = SELECTORS.root, options = {}) {
	return initTextSplitAll(options, selector);
}

//#endregion
export { normalizeOptions as a, initTextSplitAll as i, DEFAULT_OPTIONS as n, segmentText as o, createTextSplit as r, splitAll as s, A11yTextSplit as t };
//# sourceMappingURL=src-D22P1dQP.js.map