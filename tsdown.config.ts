import { defineConfig } from "tsdown";

const entry = {
  index: "./src/index.ts",
  lines: "./src/lines.ts",
  scroll: "./src/scroll.ts",
  docs: "./src/docs.ts",
};

const sharedConfig = {
  entry,
  format: "esm" as const,
  sourcemap: true,
  target: "es2022",
  platform: "neutral" as const,
  outDir: "dist",
  hash: true,
};

export default defineConfig([{
  ...sharedConfig,
  name: "readable",
  dts: true,
  clean: true,
}, {
  ...sharedConfig,
  name: "minified",
  dts: false,
  clean: false,
  minify: true,
  outExtensions: () => ({ js: ".min.js" }),
}]);
