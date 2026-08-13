export interface PluginDocs {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo?: string;
  npm?: string;
  install: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
  usage: string;
  selectors?: string[];
  keyboard?: Array<{
    key: string;
    description: string;
  }>;
  api: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  examples?: Array<{
    name: string;
    description: string;
    path: string;
  }>;
}

export const docs = {
  slug: "a11y-text-split",
  name: "A11yTextSplit",
  packageName: "a11y-text-split",
  description:
    "Accessible, dependency-free text splitting for graphemes, words, and rendered lines.",
  repo: "https://github.com/vmitsaras/A11y-Splitter",
  npm: "https://www.npmjs.com/package/a11y-text-split",
  install: {
    npm: "npm install a11y-text-split",
    pnpm: "pnpm add a11y-text-split",
    yarn: "yarn add a11y-text-split",
  },
  usage: `import { createTextSplit } from "a11y-text-split";
import "a11y-text-split/styles.css";

const root = document.querySelector("[data-a11y-text-split]");
if (root instanceof HTMLElement) {
  createTextSplit(root, { type: "words" });
}`,
  selectors: [
    "[data-a11y-text-split]",
    "[data-split-word]",
    "[data-split-letter]",
    "[data-split-line]",
    "[data-split-scroll]",
  ],
  api: [
    {
      name: "createTextSplit(root, options)",
      type: "(root: HTMLElement, options?: TextSplitOptions) => A11yTextSplit",
      description: "Initializes or returns the existing text-split instance for one element.",
    },
    {
      name: "initTextSplitAll(options, selector)",
      type: "(options?: TextSplitOptions, selector?: string) => A11yTextSplit[]",
      description: "Initializes every matching element without running automatically on import.",
    },
    {
      name: "refresh()",
      type: "() => TextSplitInstance",
      description: "Rebuilds the split output while preserving the original DOM nodes.",
    },
    {
      name: "destroy()",
      type: "() => void",
      description: "Removes generated state, observers, and listeners, then restores original content.",
    },
    {
      name: "scrollRevealAll(selector, options)",
      type: "(selector?: string, options?: ScrollRevealOptions) => () => void",
      description: "Adds optional scroll-reveal behavior from the /scroll entry.",
    },
  ],
  examples: [
    { name: "Basic", description: "Core semantic and visual splitting.", path: "examples/basic" },
    { name: "Kinetic poster", description: "Pointer-reactive letters.", path: "examples/kinetic-poster" },
    { name: "Line reveal", description: "Responsive rendered lines.", path: "examples/line-reveal" },
    { name: "Word spotlight", description: "Pointer-focused semantic words.", path: "examples/word-spotlight" },
    { name: "Type wave", description: "A controllable letter wave.", path: "examples/type-wave" },
    { name: "Letter cascade", description: "Scroll-driven decorative letters.", path: "examples/scroll-letter-cascade" },
    { name: "Word drift", description: "Scroll-enhanced semantic words.", path: "examples/scroll-word-drift" },
    { name: "Line chapters", description: "Once-only line reveals.", path: "examples/scroll-line-chapters" },
    { name: "Exit echo", description: "Bidirectional scroll reveals.", path: "examples/scroll-exit-echo" },
    { name: "Orbit poem", description: "Pointer-driven word orbit.", path: "examples/orbit-poem" },
    { name: "Mood mixer", description: "User-selected sentence variants.", path: "examples/mood-mixer" },
    { name: "Signal loom", description: "Range-controlled word emphasis.", path: "examples/signal-loom" },
    { name: "Trust current", description: "Dependency-free horizontal scroll scene.", path: "examples/trust-current" },
    { name: "Mouse mischief", description: "Pointer-reactive decorative words.", path: "examples/mouse-mischief" },
    { name: "Neo-brutal split", description: "Live poster controls.", path: "examples/neo-brutalism" },
  ],
} satisfies PluginDocs;
