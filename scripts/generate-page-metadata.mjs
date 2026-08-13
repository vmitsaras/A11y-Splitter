import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDirectory = join(rootDirectory, "examples");
const packageJson = JSON.parse(readFileSync(join(rootDirectory, "package.json"), "utf8"));

const pageMetadata = {
  "": {
    title: "Accessible Text Splitting Demos | A11yTextSplit",
    description:
      "Split text into styleable letter, word, or rendered-line tokens for animation while preserving one readable source for assistive technologies.",
  },
  basic: {
    title: "Semantic and Visual Text Splitting | A11yTextSplit",
    description:
      "Compare semantic word splitting with decorative visual letters in a minimal setup that preserves one readable source for assistive technology.",
  },
  "kinetic-poster": {
    title: "Pointer-Reactive Kinetic Type | A11yTextSplit",
    description:
      "Create a kinetic poster whose letters respond to pointer movement while visual mode keeps one clean text source available to assistive technology.",
  },
  "line-reveal": {
    title: "Responsive Line Reveal Demo | A11yTextSplit",
    description:
      "Reveal headings by rendered line and rebuild their visual wrappers after width or font changes without duplicating accessible source text.",
  },
  "word-spotlight": {
    title: "Pointer-Focused Word Spotlight | A11yTextSplit",
    description:
      "Spotlight semantic words under the pointer while every word remains real, readable content without adding unnecessary keyboard stops.",
  },
  "type-wave": {
    title: "Controllable Letter Wave Demo | A11yTextSplit",
    description:
      "Send split letters through a continuous sine wave with a pause control while reduced-motion preferences keep the heading readable.",
  },
  "scroll-letter-cascade": {
    title: "Scroll-Driven Letter Cascade | A11yTextSplit",
    description:
      "Animate decorative letters into and out of view with native view timelines or one IntersectionObserver fallback that preserves accessible source text.",
  },
  "scroll-word-drift": {
    title: "Scroll-Enhanced Semantic Word Drift | A11yTextSplit",
    description:
      "Keep real words in place as CSS sharpens and settles them near the viewport center, using native scroll timelines or an observer fallback.",
  },
  "scroll-line-chapters": {
    title: "Once-Only Scroll Line Reveals | A11yTextSplit",
    description:
      "Stage responsive heading lines across scrolling chapters, then keep each chapter visible and stop observing it after its first reveal.",
  },
  "scroll-exit-echo": {
    title: "Bidirectional Scroll Exit Echo | A11yTextSplit",
    description:
      "Reverse split-word motion as content enters and leaves the viewport, with direction-aware fallback behavior and accessible source text.",
  },
  "orbit-poem": {
    title: "Pointer-Driven Orbit Poem | A11yTextSplit",
    description:
      "Turn decorative split words into a pointer-driven orbital composition while visual mode exposes the original sentence once to assistive technology.",
  },
  "mood-mixer": {
    title: "Rebuildable Mood Mixer Demo | A11yTextSplit",
    description:
      "Switch between sentence variants, restore the previous split instance, and rebuild animated words without leaving stale wrappers behind.",
  },
  "signal-loom": {
    title: "Range-Controlled Signal Loom | A11yTextSplit",
    description:
      "Scrub semantic word emphasis with a real range control, then explore a sticky visual variation that preserves an accessible source heading.",
  },
  "trust-current": {
    title: "Dependency-Free Trust Current | A11yTextSplit",
    description:
      "Navigate a pinned horizontal scroll scene that bends toward pointer or touch input while keeping its split headings accessible and dependency-free.",
  },
  "mouse-mischief": {
    title: "Pointer-Reactive Mouse Mischief | A11yTextSplit",
    description:
      "Watch decorative words scatter from a tiny pointer-driven mouse while one clean source sentence remains available to assistive technology.",
  },
  "neo-brutalism": {
    title: "Live Neo-Brutal Text Controls | A11yTextSplit",
    description:
      "Restage a bold type poster while semantic copy stays readable and decorative split output remains hidden from assistive technology.",
  },
};

const siteUrl = normalizeTrailingSlash(packageJson.homepage);
const repositoryUrl = normalizeRepositoryUrl(packageJson.repository);
const packageName = packageJson.name;
const pluginName = "A11yTextSplit";
const npmUrl = packageJson.private
  ? undefined
  : `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`;
const authorName =
  typeof packageJson.author === "string"
    ? packageJson.author
    : packageJson.author?.name;
const authorUrl =
  authorName === "Vasileios Mitsaras"
    ? "https://github.com/vmitsaras/"
    : packageJson.author?.url;
const authorSameAs =
  authorName === "Vasileios Mitsaras"
    ? ["https://github.com/vmitsaras/", "https://linkedin.com/in/vasilis-mitsaras"]
    : authorUrl
      ? [authorUrl]
      : undefined;
const authorId = authorUrl ? `${authorUrl}#person` : `${siteUrl}#author`;
const licenseUrl = repositoryUrl
  ? `${repositoryUrl}/blob/main/LICENSE`
  : packageJson.license;
const socialImagePath = join(examplesDirectory, "meta-image.png");
const socialImage = existsSync(socialImagePath)
  ? new URL("meta-image.png", siteUrl).href
  : undefined;
const socialImageAlt = socialImage
  ? "A11yTextSplit social card showing a paper ribbon separating into text tokens beside the words: Split the text, not the experience."
  : undefined;

if (!siteUrl || !repositoryUrl || !packageName || !packageJson.description) {
  throw new Error("Cannot generate page metadata: required package metadata is missing.");
}

const sourceFiles = findIndexFiles(examplesDirectory);
const sourceRoutes = sourceFiles.map(routeFromFile);
const configuredRoutes = Object.keys(pageMetadata);
const missingConfiguration = sourceRoutes.filter((route) => !configuredRoutes.includes(route));
const staleConfiguration = configuredRoutes.filter((route) => !sourceRoutes.includes(route));

if (missingConfiguration.length || staleConfiguration.length) {
  throw new Error(
    [
      missingConfiguration.length
        ? `Missing metadata configuration: ${missingConfiguration.join(", ")}`
        : "",
      staleConfiguration.length
        ? `Stale metadata configuration: ${staleConfiguration.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

assertUnique("title", configuredRoutes.map((route) => pageMetadata[route].title));
assertUnique(
  "description",
  configuredRoutes.map((route) => pageMetadata[route].description),
);

for (const sourceFile of sourceFiles) {
  const route = routeFromFile(sourceFile);
  const metadata = pageMetadata[route];
  const pageUrl = route ? new URL(`${route}/`, siteUrl).href : siteUrl;
  const jsonLd = buildJsonLd({ metadata, pageUrl });
  const block = renderMetadataBlock({ metadata, pageUrl, jsonLd });
  const current = readFileSync(sourceFile, "utf8");
  const updated = injectMetadata(current, block);

  if (updated !== current) writeFileSync(sourceFile, updated);
}

console.log(`Generated SEO metadata and JSON-LD for ${sourceFiles.length} example pages.`);

function findIndexFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) return findIndexFiles(absolutePath);
      return entry.name === "index.html" ? [absolutePath] : [];
    })
    .sort();
}

function routeFromFile(file) {
  const relativeDirectory = relative(examplesDirectory, dirname(file));
  return relativeDirectory === "" ? "" : relativeDirectory.split(sep).join("/");
}

function normalizeTrailingSlash(value) {
  if (typeof value !== "string" || !/^https:\/\//u.test(value)) return "";
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeRepositoryUrl(repository) {
  const raw =
    typeof repository === "string"
      ? repository
      : typeof repository?.url === "string"
        ? repository.url
        : "";

  return raw
    .replace(/^git\+/u, "")
    .replace(/\.git$/u, "")
    .replace(/^git@github\.com:/u, "https://github.com/");
}

function assertUnique(label, values) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) {
    throw new Error(`Duplicate page ${label}: ${[...new Set(duplicates)].join(", ")}`);
  }
}

function buildJsonLd({ metadata, pageUrl }) {
  const softwareId = `${pageUrl}#software`;
  const websiteId = `${siteUrl}#website`;

  return cleanJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: metadata.title,
        description: metadata.description,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        mainEntity: { "@id": softwareId },
        primaryImageOfPage: socialImage,
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": softwareId,
        name: pluginName,
        description: packageJson.description,
        codeRepository: repositoryUrl,
        programmingLanguage: ["TypeScript", "JavaScript"],
        runtimePlatform: "Browser",
        version: packageJson.version,
        license: licenseUrl,
        keywords: packageJson.keywords,
        image: socialImage,
        author: authorName ? { "@id": authorId } : undefined,
        targetProduct: {
          "@type": "SoftwareApplication",
          name: pluginName,
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          runtimePlatform: "Browser",
          softwareVersion: packageJson.version,
          url: npmUrl,
        },
        sameAs: [repositoryUrl, npmUrl],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: siteUrl,
        name: `${pluginName} Demos`,
        description: pageMetadata[""].description,
        inLanguage: "en",
        publisher: authorName ? { "@id": authorId } : undefined,
      },
      authorName
        ? {
            "@type": "Person",
            "@id": authorId,
            name: authorName,
            url: authorUrl,
            sameAs: authorSameAs,
          }
        : undefined,
    ],
  });
}

function cleanJsonLd(value) {
  if (Array.isArray(value)) {
    const cleaned = value.map(cleanJsonLd).filter((entry) => entry !== undefined);
    return cleaned.length ? cleaned : undefined;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, nestedValue]) => [key, cleanJsonLd(nestedValue)])
      .filter(([, nestedValue]) => nestedValue !== undefined && nestedValue !== "");
    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  return value === null || value === undefined || value === "" ? undefined : value;
}

function renderMetadataBlock({ metadata, pageUrl, jsonLd }) {
  const tags = [
    '<!-- page-metadata:start -->',
    `<meta name="description" content="${escapeAttribute(metadata.description)}">`,
    '<meta name="robots" content="index,follow">',
    authorName
      ? `<meta name="author" content="${escapeAttribute(authorName)}">`
      : undefined,
    `<link rel="canonical" href="${escapeAttribute(pageUrl)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="en_US">',
    `<meta property="og:site_name" content="${pluginName}">`,
    `<meta property="og:title" content="${escapeAttribute(metadata.title)}">`,
    `<meta property="og:description" content="${escapeAttribute(metadata.description)}">`,
    `<meta property="og:url" content="${escapeAttribute(pageUrl)}">`,
    socialImage ? `<meta property="og:image" content="${socialImage}">` : undefined,
    socialImage ? '<meta property="og:image:type" content="image/png">' : undefined,
    socialImage ? '<meta property="og:image:width" content="1280">' : undefined,
    socialImage ? '<meta property="og:image:height" content="640">' : undefined,
    socialImageAlt
      ? `<meta property="og:image:alt" content="${escapeAttribute(socialImageAlt)}">`
      : undefined,
    socialImage ? '<meta name="twitter:card" content="summary_large_image">' : '<meta name="twitter:card" content="summary">',
    `<meta name="twitter:title" content="${escapeAttribute(metadata.title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(metadata.description)}">`,
    socialImage ? `<meta name="twitter:image" content="${socialImage}">` : undefined,
    socialImageAlt
      ? `<meta name="twitter:image:alt" content="${escapeAttribute(socialImageAlt)}">`
      : undefined,
    `<title>${escapeText(metadata.title)}</title>`,
    '<script type="application/ld+json">',
    JSON.stringify(jsonLd, null, 2),
    '</script>',
    '<!-- page-metadata:end -->',
  ].filter(Boolean);

  return tags
    .flatMap((line) => line.split("\n"))
    .map((line) => `  ${line}`)
    .join("\n");
}

function injectMetadata(source, block) {
  const managedPattern = /  <!-- page-metadata:start -->[\s\S]*?  <!-- page-metadata:end -->\n?/u;
  if (managedPattern.test(source)) {
    return source.replace(managedPattern, `${block}\n`);
  }

  const cleaned = source
    .replace(/^\s*<meta\s+name=["']description["'][^>]*>\s*$/gimu, "")
    .replace(/^\s*<meta\s+name=["']robots["'][^>]*>\s*$/gimu, "")
    .replace(/^\s*<meta\s+name=["']author["'][^>]*>\s*$/gimu, "")
    .replace(/^\s*<link\s+rel=["']canonical["'][^>]*>\s*$/gimu, "")
    .replace(/^\s*<meta\s+property=["']og:[^"']+["'][^>]*>\s*$/gimu, "")
    .replace(/^\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*$/gimu, "")
    .replace(/^\s*<title>[^<]*<\/title>\s*$/gimu, "")
    .replace(/^\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*$/gimu, "");

  const stylesheetIndex = cleaned.search(/^\s*<link\s+rel=["']stylesheet["']/mu);
  const headEndIndex = cleaned.indexOf("</head>");
  const insertionIndex = stylesheetIndex >= 0 ? stylesheetIndex : headEndIndex;

  if (insertionIndex < 0) throw new Error("Cannot inject page metadata: missing </head>.");

  return `${cleaned.slice(0, insertionIndex)}${block}\n${cleaned.slice(insertionIndex)}`;
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
