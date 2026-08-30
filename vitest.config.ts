import { defineConfig } from "vitest/config";

// Deliberately standalone — NOT merged with vite.config.ts, which carries
// app-specific build/dev-server concerns (the GitHub Pages base URL logic,
// React/Tailwind plugins) that a unit-test run has no reason to load and
// no reason to risk interacting with. Everything under test so far
// (src/lib/voiceTasbeehMatch.ts) is plain TypeScript with no DOM/React
// dependency, so a plain Node test environment is all this needs.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
