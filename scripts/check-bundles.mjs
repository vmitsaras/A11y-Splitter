import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = join(rootDirectory, "dist");
const entries = ["index", "lines", "scroll", "docs"];

function requireArtifact(filename) {
  const absolutePath = join(distDirectory, filename);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing bundle artifact: ${relative(rootDirectory, absolutePath)}`);
  }
  return absolutePath;
}

for (const entry of entries) {
  requireArtifact(`${entry}.js`);
  requireArtifact(`${entry}.min.js`);
  requireArtifact(`${entry}.d.ts`);
}

const javascriptFiles = readdirSync(distDirectory).filter((filename) => filename.endsWith(".js"));
const readableFiles = javascriptFiles.filter((filename) => !filename.endsWith(".min.js"));
const minifiedFiles = javascriptFiles.filter((filename) => filename.endsWith(".min.js"));
const totalBytes = (filenames) => filenames.reduce(
  (total, filename) => total + statSync(join(distDirectory, filename)).size,
  0,
);
const readableBytes = totalBytes(readableFiles);
const minifiedBytes = totalBytes(minifiedFiles);

if (minifiedBytes >= readableBytes) {
  throw new Error(
    `Expected minified JavaScript (${minifiedBytes} bytes) to be smaller than readable JavaScript (${readableBytes} bytes).`,
  );
}

for (const entry of entries.slice(1)) {
  const sourceMapReference = `//# sourceMappingURL=${entry}.min.js.map`;
  const contents = readFileSync(join(distDirectory, `${entry}.min.js`), "utf8");
  if (!contents.includes(sourceMapReference)) {
    throw new Error(`Missing source map reference in dist/${entry}.min.js.`);
  }
}

const readableCore = await import(pathToFileURL(join(distDirectory, "index.js")).href);
const readableLines = await import(pathToFileURL(join(distDirectory, "lines.js")).href);
const readableScroll = await import(pathToFileURL(join(distDirectory, "scroll.js")).href);
const readableDocs = await import(pathToFileURL(join(distDirectory, "docs.js")).href);

const minifiedCore = await import(pathToFileURL(join(distDirectory, "index.min.js")).href);
const minifiedLines = await import(pathToFileURL(join(distDirectory, "lines.min.js")).href);
const minifiedScroll = await import(pathToFileURL(join(distDirectory, "scroll.min.js")).href);
const minifiedDocs = await import(pathToFileURL(join(distDirectory, "docs.min.js")).href);

for (const [label, module, exportName] of [
  ["readable core", readableCore, "createTextSplit"],
  ["readable lines addon", readableLines, "installLines"],
  ["readable scroll addon", readableScroll, "scrollRevealAll"],
  ["readable docs", readableDocs, "docs"],
  ["minified core", minifiedCore, "createTextSplit"],
  ["minified lines addon", minifiedLines, "installLines"],
  ["minified scroll addon", minifiedScroll, "scrollRevealAll"],
  ["minified docs", minifiedDocs, "docs"],
]) {
  if (!(exportName in module)) {
    throw new Error(`Missing ${exportName} export from the ${label} bundle.`);
  }
}

console.log(
  `Verified ${entries.length} readable and ${entries.length} minified ESM entries (${readableBytes} -> ${minifiedBytes} bytes).`,
);
