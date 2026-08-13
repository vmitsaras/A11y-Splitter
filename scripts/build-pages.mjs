import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDirectory = join(rootDirectory, "examples");
const distDirectory = join(rootDirectory, "dist");
const docsDirectory = join(rootDirectory, "docs");
const requiredSourceFiles = [
  join(examplesDirectory, "index.html"),
  join(distDirectory, "index.js"),
  join(distDirectory, "index.min.js"),
  join(distDirectory, "lines.js"),
  join(distDirectory, "lines.min.js"),
  join(distDirectory, "scroll.js"),
  join(distDirectory, "scroll.min.js"),
  join(distDirectory, "docs.js"),
  join(distDirectory, "docs.min.js"),
  join(distDirectory, "styles.css"),
];

for (const requiredFile of requiredSourceFiles) {
  if (!existsSync(requiredFile)) {
    throw new Error(`Cannot generate GitHub Pages: missing ${relative(rootDirectory, requiredFile)}.`);
  }
}

rmSync(docsDirectory, { recursive: true, force: true });
mkdirSync(docsDirectory, { recursive: true });
cpSync(examplesDirectory, docsDirectory, { recursive: true });

const docsDistDirectory = join(docsDirectory, "dist");
mkdirSync(docsDistDirectory, { recursive: true });
const runtimeFilenames = readdirSync(distDirectory).filter(
  (filename) => filename.endsWith(".js") || filename === "styles.css",
);

for (const filename of runtimeFilenames) {
  cpSync(join(distDirectory, filename), join(docsDistDirectory, filename));
}

const textExtensions = new Set([".css", ".html", ".js", ".md"]);

function rewriteGeneratedPaths(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (absolutePath !== docsDistDirectory) rewriteGeneratedPaths(absolutePath);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;

    const relativePath = relative(docsDirectory, absolutePath);
    const relativeDirectory = dirname(relativePath);
    const depth = relativeDirectory === "." ? 0 : relativeDirectory.split(sep).length;
    const sourcePrefix = `${"../".repeat(depth + 1)}dist/`;
    const generatedPrefix = depth === 0 ? "./dist/" : `${"../".repeat(depth)}dist/`;
    const current = readFileSync(absolutePath, "utf8");
    const rewritten = current.replaceAll(sourcePrefix, generatedPrefix);
    writeFileSync(absolutePath, rewritten);
  }
}

rewriteGeneratedPaths(docsDirectory);
writeFileSync(join(docsDirectory, ".nojekyll"), "");

const generatedIndex = join(docsDirectory, "index.html");
if (!existsSync(generatedIndex)) {
  throw new Error("GitHub Pages generation did not produce docs/index.html.");
}

function assertSafeGeneratedPaths(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      assertSafeGeneratedPaths(absolutePath);
      continue;
    }
    if (!textExtensions.has(extname(entry.name))) continue;

    const contents = readFileSync(absolutePath, "utf8");
    if (contents.includes("../../dist/") || /(?:href|src)=["']\//u.test(contents)) {
      throw new Error(`Generated file has a Pages-unsafe path: ${relative(rootDirectory, absolutePath)}.`);
    }
  }
}

assertSafeGeneratedPaths(docsDirectory);
