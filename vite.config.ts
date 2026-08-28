import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Project site on GitHub Pages (https://kemolama89-netizen.github.io/dethar-application/),
  // so production asset URLs must be prefixed with the repo name. The dev
  // server (Codespaces port forwarding, etc.) is served from the domain
  // root, so it needs base '/' there or every request 404s.
  base: command === 'build' ? '/dethar-application/' : '/',
  plugins: [react(), tailwindcss()],
}))
