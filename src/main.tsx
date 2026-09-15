import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DevLocationDiagnostics } from './components/DevLocationDiagnostics.tsx'

// DevLocationDiagnostics is a floating overlay OUTSIDE the App tree
// entirely (see its own doc comment) — `import.meta.env.DEV` is
// statically replaced with `false` in a production build, so this whole
// branch (and the component) is dead-code-eliminated from what real
// users ever receive.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {import.meta.env.DEV && <DevLocationDiagnostics />}
  </StrictMode>,
)
