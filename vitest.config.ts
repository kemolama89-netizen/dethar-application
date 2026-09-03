import { defineConfig } from "vitest/config";

// Deliberately standalone — NOT merged with vite.config.ts, which carries
// app-specific build/dev-server concerns (the GitHub Pages base URL logic,
// React/Tailwind plugins) that a unit-test run has no reason to load and
// no reason to risk interacting with. Most tests are plain TypeScript or
// use react-dom/client directly against jsdom (each such file opts in
// per-file via its own `// @vitest-environment jsdom` pragma), so a plain
// Node default suffices globally — `.tsx` is included in the glob for
// component-level tests (e.g. src/components/TasbeehScreen.test.tsx) that
// also opt into jsdom the same way.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
