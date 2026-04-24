# Function Lab

Function Lab is a small single-page React app for exploring functions as mappings from an input set to an output set. Learners can start from polynomial and geometry-inspired presets, edit the rule, choose input values, and see the matching table and graph update immediately.

## What It Does

- Builds polynomial-style rules from editable coefficients and powers.
- Supports custom input sets as comma-separated values or ranges like `from -10 to 10 by 0.5`.
- Shows output sets, ordered pairs, and a responsive canvas graph.
- Includes presets for linear, quadratic, constant, square-area, and cube-volume examples.
- Keeps the interface keyboard-friendly with native controls, visible focus states, and labeled fields.

## Tech Stack

- React 19
- TypeScript 5
- Vite 7
- Plain CSS
- Canvas 2D rendering

The app intentionally has no backend and no client-side routing. It can be deployed as static files after a production build.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Vite serves the app on `127.0.0.1` by default for this project. Open the URL printed in the terminal.

## Available Scripts

```bash
npm run dev
```

Runs the Vite development server.

```bash
npm run typecheck
```

Runs the TypeScript project checks without creating a production bundle.

```bash
npm run build
```

Runs the TypeScript project build and creates the production bundle in `dist/`.

```bash
npm run preview
```

Serves the production build locally for a final smoke test.

## Quality Bar

Before shipping a change, run:

```bash
npm run typecheck
npm run build
```

The TypeScript configuration uses strict mode plus additional checks for unchecked indexed access, optional property exactness, implicit returns, unused code, and switch fallthrough. Keep new code compatible with those checks.

For UI changes, smoke test these paths:

- Change each preset and confirm the expression, table, and graph update.
- Enter comma-separated inputs such as `-2, -1, 0, 1, 2`.
- Enter a range such as `from -6 to 6 by 1`.
- Try an invalid input and confirm the helper text explains the accepted format.
- Resize the viewport and confirm the graph redraws cleanly.

## Project Structure

```text
src/main.tsx     React components, input parsing, formula evaluation, and graph drawing
src/styles.css   Layout, responsive styles, focus states, and visual styling
index.html       App shell and document metadata
vite.config.ts   Vite React configuration
```

## Deployment

Build the app:

```bash
npm run build
```

Deploy the generated `dist/` directory to any static host.

## Notes For Future Work

- Add focused tests for `parseInputSet`, `evaluate`, and `niceTicks` if the app grows beyond a single-file demo.
- Consider extracting graph drawing into its own module before adding more graph types.
- Add an accessibility pass with a browser-based checker before publishing for classroom use.
