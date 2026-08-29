import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Project site on GitHub Pages (https://kemolama89-netizen.github.io/dethar-application/),
  // so production asset URLs must be prefixed with the repo name. `vite
  // preview` serves the already-built dist/ as-is — its index.html has
  // that prefix baked into every asset URL from the build step — so it
  // needs the SAME base as `build`, or every request 404s against the
  // preview server's unprefixed static root (this previously fell through
  // to Vite's SPA fallback, which serves index.html for any unmatched
  // path — the exact "MIME type text/html instead of text/css" symptom).
  // Only the real dev server (Codespaces port forwarding, etc.), served
  // from the domain root, needs base '/'.
  base: command === 'build' || isPreview ? '/dethar-application/' : '/',
  plugins: [react(), tailwindcss()],
  // Without this, `vite`/`vite preview` bind to localhost only (its own
  // startup log even says "Network: use --host to expose") — a listener
  // Codespaces' port forwarding can still detect and mark as forwarded,
  // but nothing outside the container can actually reach, since it's
  // loopback-only. `host: true` binds 0.0.0.0 unconditionally, so the
  // plain `npm run dev` / `npm run preview` commands work through the
  // Codespaces forwarded URL with no extra flags every time — not just
  // when someone remembers to pass `--host` by hand. `strictPort` fails
  // loudly if 5173/4173 is already taken instead of silently moving to
  // the next port, which would otherwise look like this same "forwarded
  // but unreachable" symptom for a different reason (the forwarded port
  // number no longer matching where the server actually is).
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
}))
