import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ScriptPulseApp from './ScriptPulseApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScriptPulseApp />
  </StrictMode>,
)
