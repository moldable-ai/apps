import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import './globals.css'
import GitWidgetPage from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <GitWidgetPage />
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
