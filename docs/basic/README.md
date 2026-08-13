# Basic example

This example demonstrates semantic word splitting and visual letter splitting.
Build the package with `npm run build:dist`, then serve the repository root so
the page can import `../dist/index.js` and `../dist/styles.css`.

Semantic mode wraps the real text. Visual mode exposes one clean visually hidden
source and marks only the decorative split output as `aria-hidden="true"`.
