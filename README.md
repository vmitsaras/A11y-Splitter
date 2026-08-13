# A11yTextSplit

Accessible, dependency-free text splitting for graphemes, words, and rendered
lines. The package is framework-agnostic, ESM-only, safe to initialize more than
once, and designed so decorative animation markup does not duplicate the source
text in the accessibility tree.

Current release: `1.0.0`.

## Installation

```bash
npm install a11y-text-split
pnpm add a11y-text-split
yarn add a11y-text-split
```

## Usage

```ts
import { createTextSplit } from "a11y-text-split";
import "a11y-text-split/styles.css";

const heading = document.querySelector("[data-a11y-text-split]");

if (heading instanceof HTMLElement) {
  const split = createTextSplit(heading, {
    type: "letters",
    mode: "visual",
  });

  split.refresh();
  split.destroy();
}
```

Initialize every matching element explicitly:

```ts
import { initTextSplitAll } from "a11y-text-split";

const instances = initTextSplitAll();
```

Nothing initializes automatically when the package is imported.

### Build artifacts

Each TypeScript entry ships as readable ESM and as a minified ESM counterpart:

| TypeScript entry | Readable bundle | Minified bundle |
| --- | --- | --- |
| `src/index.ts` | `dist/index.js` | `dist/index.min.js` |
| `src/lines.ts` | `dist/lines.js` | `dist/lines.min.js` |
| `src/scroll.ts` | `dist/scroll.js` | `dist/scroll.min.js` |
| `src/docs.ts` | `dist/docs.js` | `dist/docs.min.js` |

Normal package imports use the readable files. Consumers that explicitly need
pre-minified ESM can use the matching filename export, for example:

```ts
import { createTextSplit } from "a11y-text-split/index.min.js";
import "a11y-text-split/lines.min.js";
```

Keep the core and addon imports in the same readable or minified family so they
share one bundled runtime. Source maps and the shared chunks referenced by the
entry files are included in the published `dist/` directory.

## CSS

The stylesheet is required for visual mode and rendered line wrappers:

```ts
import "a11y-text-split/styles.css";
```

Generated tokens expose these animation hooks:

- `--a11y-text-split-index`
- `--a11y-text-split-word-index`
- `--a11y-text-split-letter-index`
- `--a11y-text-split-punctuation-index`
- `--a11y-text-split-space-index`
- `--a11y-text-split-line-index`
- `--a11y-text-split-scroll-timeline`

The earlier `--split-*` properties remain as compatibility aliases. New code
should use the prefixed properties.

## HTML structure

```html
<h1
  data-a11y-text-split
  data-split-type="letters"
  data-split-mode="visual"
>
  Accessible motion
</h1>
```

The supported data attributes are:

- `data-split-type`: `words`, `letters`, or `lines`
- `data-split-mode`: `semantic` or `visual`
- `data-split-locale`: an `Intl.Segmenter` locale or `auto`
- `data-split-whitespace`: `preserve`, `collapse`, or `trim`
- `data-split-nested-text`: boolean-like `true`, `false`, `1`, `0`, `yes`, or `no`
- `data-split-line-tolerance`: a finite non-negative pixel value

Invalid dataset values fall back to documented defaults.

## Modes

### Semantic mode

Semantic mode is the default. It replaces eligible text nodes with real token
spans and does not add ARIA. Nested links and controls retain their accessible
names and node identity. Set `splitNestedText: true` only when text inside
non-interactive descendants should also be split.

### Visual mode

Visual mode creates one visually hidden clean-text source and marks only the
decorative token wrapper `aria-hidden="true"`. It rejects targets containing
nested interactive elements rather than hiding controls or duplicating their
names.

Rendered line splitting always uses visual mode because line wrappers depend on
layout measurements.

## API

### `createTextSplit(root, options?)`

Creates or returns the existing `A11yTextSplit` instance for one HTML element.

### `initTextSplitAll(options?, selector?)`

Creates instances for every matching element. The default selector is
`[data-a11y-text-split]`.

### `A11yTextSplit`

The plugin-specific class implements `TextSplitInstance` and exposes:

- `element`: the initialized HTML element
- `options`: frozen normalized options
- `refresh()`: rebuilds generated output
- `destroy()`: removes generated state and restores the original DOM nodes
- static `create()` and `get()` helpers

Duplicate initialization is prevented with a static `WeakMap`. `destroy()` is
idempotent, preserves original descendant identity and listeners, and permits a
fresh instance to be created later.

### Compatibility exports

`splitAll(selector?, options?)`, `DEFAULT_OPTIONS`, `normalizeOptions()`, and
`segmentText()` remain available. Prefer `createTextSplit()` and
`initTextSplitAll()` for new integrations.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `type` | `words` | Split into words, grapheme-like letters, or rendered lines. |
| `mode` | `semantic` | Use semantic tokens or a clean source plus decorative visual tokens. |
| `locale` | `auto` | Locale passed to `Intl.Segmenter`; `auto` uses the nearest `lang`. |
| `whitespace` | `preserve` | Preserve, collapse, or trim whitespace before splitting. |
| `splitNestedText` | `false` | Split non-interactive descendant text nodes. |
| `lineTolerance` | `2` | Pixel tolerance for grouping tokens into rendered lines. |

## Line addon

Line grouping is opt-in and registers only when its subpath is imported:

```ts
import { createTextSplit } from "a11y-text-split";
import "a11y-text-split/lines";
import "a11y-text-split/styles.css";

const heading = document.querySelector("h1");
if (heading instanceof HTMLElement) {
  createTextSplit(heading, { type: "lines" });
}
```

The addon observes width changes, waits once for `document.fonts.ready`, and
removes its observer, resize fallback, and pending animation frame during
refresh or destroy.

## Scroll reveal addon

```ts
import { scrollRevealAll } from "a11y-text-split/scroll";

const cleanupScrollReveal = scrollRevealAll("[data-split-scroll]", {
  threshold: 0.15,
  once: false,
});

cleanupScrollReveal();
```

The addon uses CSS view timelines only when the required timeline features are
detected. Otherwise it uses one `IntersectionObserver`. Browsers without either
feature receive static visible content. `data-scroll-once` or `once: true`
reveals a target once and then unobserves it.

## Lifecycle events

Events bubble from the initialized element and include the instance in `detail`
unless noted:

- `a11y-text-split:init`
- `a11y-text-split:refresh`
- `a11y-text-split:lines-ready` (`detail.lines` contains the line count)
- `a11y-text-split:destroy`
- `a11y-text-split:scroll` (`detail.visible` and `detail.ratio` describe the target)

## Accessibility notes

- Source content remains semantic and readable before JavaScript runs.
- Visual-only duplicate tokens are hidden from accessibility APIs.
- The focusable target itself is never hidden.
- Semantic nested splitting skips links, buttons, controls, summaries, and
  editable or focusable descendants.
- The plugin does not move focus or add keyboard behavior because it does not
  create an interactive widget.
- Examples keep all meaningful content available with reduced motion and when
  scroll-timeline, observer, or segmentation enhancements are unavailable.

This package does not claim blanket WCAG conformance. Integrations remain
responsible for semantic source markup, readable motion choices, contrast, and
testing with their supported browsers and assistive technologies.

## Browser support and limitations

The build targets ES2022 and Baseline 2024. `Intl.Segmenter` provides
locale-aware word and grapheme segmentation where supported; the dependency-free
fallback is best effort and is less linguistically precise. CSS scroll timelines
are progressive enhancement only.

Rendered lines depend on width, fonts, zoom, and user spacing. Use line mode for
short decorative headings or quotes, not article bodies or interactive content.

## Examples

- [Basic](./examples/basic/)
- [Full example gallery](./examples/)
- [Published GitHub Pages gallery](https://vmitsaras.github.io/A11y-Splitter/)

The gallery contains 14 creative demos plus the basic integration example. It
uses the compiled package and has no framework, CDN, or runtime dependency.

## Docs metadata

Documentation aggregators can import structured metadata without scraping this
README:

```ts
import { docs } from "a11y-text-split/docs";
```

## License

MIT © 2026 Vasileios Mitsaras
