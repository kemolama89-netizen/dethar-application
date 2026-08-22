import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Project site on GitHub Pages (https://kemolama89-netizen.github.io/dethar-application/),
  // so all built asset URLs must be prefixed with the repo name.
  base: '/dethar-application/',
  plugins: [react(), tailwindcss()],
})
